"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireActionManagerOrAdmin } from "../lib/auth";

// SAM.gov API response types
interface SamGovOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber?: string;
  department?: { name: string };
  subtier?: { name: string };
  office?: { name: string };
  postedDate: string;
  responseDeadLine: string;
  archiveType?: string;
  archiveDate?: string;
  typeOfSetAsideDescription?: string;
  typeOfSetAside?: string;
  naicsCode?: string;
  classificationCode?: string;
  active?: string;
  description?: string; // NOTE: This is a URL to fetch full description, not inline text
  additionalInfoLink?: string; // Additional info URL
  organizationType?: string;
  uiLink?: string;
  placeOfPerformance?: {
    city?: { name: string };
    state?: { code: string; name: string };
    country?: { code: string; name: string };
  };
  pointOfContact?: Array<{
    fullName?: string;
    email?: string;
    phone?: string;
    type?: string;
  }>;
  award?: {
    amount?: number;
  };
  resourceLinks?: Array<{
    url: string;
    description?: string;
  }>;
}

interface SamGovResponse {
  totalRecords: number;
  limit: number;
  offset: number;
  opportunitiesData: SamGovOpportunity[];
}

/**
 * Fetch full description text from SAM.gov description URL
 *
 * SAM.gov API returns description and additionalInfoLink as URLs, not inline text.
 * This function fetches the actual description content from those URLs.
 *
 * @param descriptionUrl - URL from the description or additionalInfoLink field
 * @param apiKey - SAM.gov API key to append to the URL
 * @returns Full description text, or null if fetch fails
 */
async function fetchDescriptionFromUrl(
  descriptionUrl: string,
  apiKey: string
): Promise<string | null> {
  try {
    // Append API key as query parameter
    const url = descriptionUrl.includes('?')
      ? `${descriptionUrl}&api_key=${apiKey}`
      : `${descriptionUrl}?api_key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to fetch description from ${descriptionUrl}: ${response.status} ${response.statusText}`);
      return null;
    }

    // Get the text content
    const text = await response.text();

    // Basic validation - ensure we got meaningful content
    if (!text || text.trim().length < 10) {
      console.warn(`Description URL returned empty or minimal content: ${descriptionUrl}`);
      return null;
    }

    return text.trim();
  } catch (error) {
    console.error(`Error fetching description from URL ${descriptionUrl}:`, error);
    return null;
  }
}

/**
 * Fetch opportunities from SAM.gov API
 */
export const fetchOpportunities = internalAction({
  args: {
    keywords: v.optional(v.array(v.string())),
    naicsCodes: v.optional(v.array(v.string())),
    postedFrom: v.optional(v.string()),
    postedTo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    totalRecords?: number;
    fetched?: number;
    new?: number;
    updated?: number;
    evaluated?: number;
    descriptionsFetched?: number;
    descriptionsFailed?: number;
    errors?: number;
  }> => {
    const apiKey = process.env.SAM_GOV_API_KEY;

    if (!apiKey) {
      // Log error and return
      await ctx.runMutation(internal.ingestion.logs.create, {
        source: "sam.gov",
        status: "failed",
        fetchedCount: 0,
        newCount: 0,
        updatedCount: 0,
        duplicateCount: 0,
        errorCount: 1,
        errors: ["SAM_GOV_API_KEY not configured"],
      });

      await ctx.runMutation(internal.sources.updateHealth, {
        name: "sam.gov",
        status: "error",
        errorCount: 1,
        lastError: "SAM_GOV_API_KEY not configured",
      });

      return { success: false, error: "SAM_GOV_API_KEY not configured" };
    }

    // Check daily quota before making API request
    const sourceRecord = await ctx.runQuery(internal.sources.getByNameInternal, { name: "sam.gov" });
    if (sourceRecord && sourceRecord.rateLimitPerDay) {
      const requestsRemaining: number = sourceRecord.rateLimitPerDay - sourceRecord.fetchedToday;
      console.log(`SAM.gov Daily Quota: ${sourceRecord.fetchedToday}/${sourceRecord.rateLimitPerDay} requests used (${requestsRemaining} remaining)`);

      if (sourceRecord.fetchedToday >= sourceRecord.rateLimitPerDay) {
        const errorMsg: string = `Daily API quota exceeded (${sourceRecord.fetchedToday}/${sourceRecord.rateLimitPerDay}). Quota resets at midnight UTC.`;

        await ctx.runMutation(internal.ingestion.logs.create, {
          source: "sam.gov",
          status: "failed",
          fetchedCount: 0,
          newCount: 0,
          updatedCount: 0,
          duplicateCount: 0,
          errorCount: 1,
          errors: [errorMsg],
        });

        await ctx.runMutation(internal.sources.updateHealth, {
          name: "sam.gov",
          status: "warning",
          errorCount: 1,
          lastError: errorMsg,
        });

        return { success: false, error: errorMsg };
      }
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append("api_key", apiKey);
    params.append("limit", String(args.limit ?? 100));

    // Default to last 30 days if no date specified
    // SAM.gov API requires both postedFrom AND postedTo in MM/dd/yyyy format
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Format date as MM/dd/yyyy for SAM.gov API
    const formatDate = (date: Date): string => {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    if (args.postedFrom) {
      params.append("postedFrom", args.postedFrom);
    } else {
      params.append("postedFrom", formatDate(thirtyDaysAgo));
    }

    if (args.postedTo) {
      params.append("postedTo", args.postedTo);
    } else {
      params.append("postedTo", formatDate(today));
    }

    // Add NAICS codes filter for IT services
    const naicsCodes = args.naicsCodes ?? [
      "541511", // Custom Computer Programming Services
      "541512", // Computer Systems Design Services
      "541513", // Computer Facilities Management Services
      "541519", // Other Computer Related Services
      "518210", // Data Processing and Hosting
      "541330", // Engineering Services
      "541611", // Administrative Management Consulting
    ];

    if (naicsCodes.length > 0) {
      params.append("naics", naicsCodes.join(","));
    }

    // Keywords filter
    if (args.keywords && args.keywords.length > 0) {
      params.append("q", args.keywords.join(" OR "));
    }

    // Only active opportunities (not presolicitations or combined)
    params.append("ptype", "o"); // Opportunities only

    try {
      const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SAM.gov API error: ${response.status} - ${errorText}`);
      }

      const data: SamGovResponse = await response.json();

      // DEBUG: Log sample opportunity to see what fields we actually get
      if (data.opportunitiesData && data.opportunitiesData.length > 0) {
        const sample = data.opportunitiesData[0];
        console.log("=== SAM.gov API Sample Record ===");
        console.log("Fields present:", Object.keys(sample));
        console.log("archiveType:", sample.archiveType);
        console.log("active:", sample.active);
        console.log("archiveDate:", sample.archiveDate);
        console.log("description length:", sample.description?.length ?? 0);
        console.log("Has description:", !!sample.description);
        console.log("================================");
      }

      // DEBUG: Log filtering statistics
      const statsBeforeFilter = {
        total: data.opportunitiesData?.length ?? 0,
        withArchiveType: 0,
        withActive: 0,
        withDescription: 0,
        isICRFP: 0,
        isActive: 0,
      };

      (data.opportunitiesData ?? []).forEach((opp) => {
        if (opp.archiveType) statsBeforeFilter.withArchiveType++;
        if (opp.active) statsBeforeFilter.withActive++;
        if (opp.description) statsBeforeFilter.withDescription++;
        if (opp.archiveType === "ICRFP") statsBeforeFilter.isICRFP++;
        if (opp.active === "Yes" || opp.active === "Y") statsBeforeFilter.isActive++;
      });

      console.log("=== Pre-filter Statistics ===");
      console.log("Total records from API:", statsBeforeFilter.total);
      console.log("With archiveType field:", statsBeforeFilter.withArchiveType);
      console.log("With active field:", statsBeforeFilter.withActive);
      console.log("With description field:", statsBeforeFilter.withDescription);
      console.log("Marked as ICRFP:", statsBeforeFilter.isICRFP);
      console.log("Marked as Active:", statsBeforeFilter.isActive);
      console.log("=============================");

      // Filter out ICRFPs and inactive opportunities
      const activeOpportunities = (data.opportunitiesData ?? []).filter((opp) => {
        // Exclude ICRFPs (archived/closed RFPs)
        if (opp.archiveType === "ICRFP") return false;

        // Only include active opportunities
        if (opp.active !== "Yes" && opp.active !== "Y") return false;

        return true;
      });

      const filteredCount = (data.opportunitiesData?.length ?? 0) - activeOpportunities.length;
      console.log(`Filtered out ${filteredCount} ICRFP/inactive opportunities (${activeOpportunities.length} remaining)`);

      // Process opportunities - store and auto-evaluate for eligibility
      let newCount = 0;
      let updatedCount = 0;
      let evaluatedCount = 0;
      let descriptionFetchSuccessCount = 0;
      let descriptionFetchFailCount = 0;
      const errors: string[] = [];

      for (const opp of activeOpportunities) {
        try {
          // CRITICAL: SAM.gov API returns description as a URL, not inline text
          // Fetch the full description content before processing
          let fullDescriptionText: string | null = null;
          let needsDetailFetch = false;

          if (opp.description && opp.description.startsWith('http')) {
            // Rate limit: 100ms delay between description fetches (10 req/sec)
            if (descriptionFetchSuccessCount + descriptionFetchFailCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            fullDescriptionText = await fetchDescriptionFromUrl(opp.description, apiKey);

            if (fullDescriptionText) {
              descriptionFetchSuccessCount++;
              // Replace URL with actual text content
              opp.description = fullDescriptionText;
            } else {
              descriptionFetchFailCount++;
              needsDetailFetch = true;
              // Keep empty string if fetch failed
              opp.description = '';
            }
          } else if (opp.description && !opp.description.startsWith('http')) {
            // Description is inline text (rare case) - use as-is
            fullDescriptionText = opp.description;
          } else {
            // No description field at all
            opp.description = '';
            needsDetailFetch = true;
          }

          const normalized = normalizeOpportunity(opp);

          // Add needsDetailFetch flag if description fetch failed
          if (needsDetailFetch) {
            (normalized as any).needsDetailFetch = true;
          }

          const result = await ctx.runMutation(internal.opportunities.upsert, normalized);

          if (result.action === "inserted") {
            newCount++;
          } else {
            updatedCount++;
          }

          // Auto-evaluate the opportunity for eligibility
          try {
            await ctx.runMutation(internal.eligibilityRules.evaluateOpportunityInternal, {
              opportunityId: result.id,
            });
            evaluatedCount++;
          } catch (evalError) {
            // Don't fail the whole ingest if evaluation fails
            console.error(`Evaluation failed for ${opp.noticeId}:`, evalError);
          }
        } catch (error) {
          errors.push(`Failed to process ${opp.noticeId}: ${error}`);
        }
      }

      // Log description fetch statistics
      console.log("=== Description Fetch Results ===");
      console.log(`Successfully fetched: ${descriptionFetchSuccessCount}`);
      console.log(`Failed to fetch: ${descriptionFetchFailCount}`);
      console.log(`Success rate: ${activeOpportunities.length > 0 ? Math.round((descriptionFetchSuccessCount / activeOpportunities.length) * 100) : 0}%`);
      console.log("=================================");

      // Update source health
      await ctx.runMutation(internal.sources.updateHealth, {
        name: "sam.gov",
        status: errors.length > 0 ? "warning" : "healthy",
        errorCount: errors.length,
        lastFetchAt: Date.now(),
        fetchedCount: activeOpportunities.length,
        lastError: errors.length > 0 ? errors[0] : undefined,
      });

      // Log ingestion
      await ctx.runMutation(internal.ingestion.logs.create, {
        source: "sam.gov",
        status: errors.length > 0 ? "partial" : "success",
        fetchedCount: activeOpportunities.length,
        newCount,
        updatedCount,
        duplicateCount: filteredCount, // Report filtered ICRFPs as duplicates
        errorCount: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      });

      return {
        success: true,
        totalRecords: data.totalRecords,
        fetched: activeOpportunities.length,
        new: newCount,
        updated: updatedCount,
        evaluated: evaluatedCount,
        descriptionsFetched: descriptionFetchSuccessCount,
        descriptionsFailed: descriptionFetchFailCount,
        errors: errors.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isThrottled = errorMessage.includes("429") || errorMessage.toLowerCase().includes("throttled");
      const isNetworkError = errorMessage.toLowerCase().includes("fetch failed") || errorMessage.toLowerCase().includes("network");

      let formattedError = errorMessage;
      if (isThrottled) {
        // Try to extract date from error message if possible
        // Expected format: "You can access API after 2026-Feb-06 00:00:00+0000 UTC"
        const nextAccessMatch = errorMessage.match(/after\s+([0-9]{4}-[A-Za-z]{3}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2})/);
        if (nextAccessMatch) {
          formattedError = `SAM.gov Throttled until ${nextAccessMatch[1]} UTC`;
        } else {
          formattedError = "SAM.gov API rate limit exceeded (429)";
        }
      } else if (isNetworkError) {
        formattedError = `Network error contacting SAM.gov: ${errorMessage}`;
      }

      // Update source health
      await ctx.runMutation(internal.sources.updateHealth, {
        name: "sam.gov",
        status: "error",
        errorCount: 1,
        lastError: formattedError,
      });

      // Log failure
      await ctx.runMutation(internal.ingestion.logs.create, {
        source: "sam.gov",
        status: "failed",
        fetchedCount: 0,
        newCount: 0,
        updatedCount: 0,
        duplicateCount: 0,
        errorCount: 1,
        errors: [formattedError],
      });

      return { success: false, error: formattedError };
    }
  },
});

/**
 * Public action to trigger SAM.gov fetch
 */
export const triggerFetch = action({
  args: {
    keywords: v.optional(v.array(v.string())),
    naicsCodes: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    totalRecords?: number;
    fetched?: number;
    new?: number;
    updated?: number;
    errors?: number;
  }> => {
    await requireActionManagerOrAdmin(ctx);

    return await ctx.runAction(internal.ingestion.samGov.fetchOpportunities, args);
  },
});

/**
 * Normalize SAM.gov opportunity to canonical schema
 */
function normalizeOpportunity(raw: SamGovOpportunity) {
  const now = Date.now();

  // Extract buyer name from available fields
  const buyerName =
    raw.department?.name ||
    raw.subtier?.name ||
    raw.office?.name ||
    "Unknown Federal Agency";

  // Parse dates
  const postedDate = raw.postedDate
    ? new Date(raw.postedDate).getTime()
    : now;
  const dueDate = raw.responseDeadLine
    ? new Date(raw.responseDeadLine).getTime()
    : now + 30 * 24 * 60 * 60 * 1000; // Default 30 days from now

  // Extract evidence snippets from description
  const evidenceSnippets = extractEvidenceSnippets(raw.description || "");

  // Determine if remote work is allowed based on description
  const description = raw.description?.toLowerCase() || "";
  const isRemoteAllowed =
    description.includes("remote") ||
    description.includes("telework") ||
    description.includes("work from home");

  return {
    externalIds: [
      {
        source: "sam.gov",
        externalId: raw.noticeId,
        url: raw.uiLink || `https://sam.gov/opp/${raw.noticeId}/view`,
        fetchedAt: now,
      },
    ],
    title: raw.title || "Untitled Opportunity",
    fullDescription: raw.description || "",
    buyer: {
      name: buyerName,
      type: "federal" as const,
    },
    location: {
      state: raw.placeOfPerformance?.state?.code,
      city: raw.placeOfPerformance?.city?.name,
      isRemoteAllowed,
    },
    postedDate,
    dueDate,
    estimatedValue: raw.award?.amount,
    contractType: raw.typeOfSetAsideDescription || undefined,
    contact: raw.pointOfContact?.[0]
      ? {
        // Only include fields that have actual string values (not null/undefined)
        ...(raw.pointOfContact[0].fullName && { name: raw.pointOfContact[0].fullName }),
        ...(raw.pointOfContact[0].email && { email: raw.pointOfContact[0].email }),
        ...(raw.pointOfContact[0].phone && { phone: raw.pointOfContact[0].phone }),
      }
      : undefined,
    categories: raw.naicsCode ? [raw.naicsCode] : [],
    setAside: raw.typeOfSetAside || undefined,
    attachments: (raw.resourceLinks || [])
      .filter((link) => link.url) // Filter out links without URLs
      .map((link) => ({
        name: link.description || "Attachment",
        url: link.url,
      })),
    sourceUrl: raw.uiLink || `https://sam.gov/opp/${raw.noticeId}/view`,
    evidenceSnippets,
    source: "sam.gov",
  };
}

/**
 * Extract key sentences from description for eligibility/scoring evidence
 */
function extractEvidenceSnippets(text: string): string[] {
  if (!text) return [];

  const snippets: string[] = [];

  // Key terms that indicate important eligibility/scoring information
  const keyTerms = [
    "clearance",
    "secret",
    "top secret",
    "ts/sci",
    "onsite",
    "on-site",
    "remote",
    "telework",
    "us citizen",
    "u.s. citizen",
    "domestic",
    "8(a)",
    "small business",
    "set-aside",
    "sdvosb",
    "hubzone",
    "wosb",
    "edwosb",
    "experience required",
    "years of experience",
    "certification",
    "aws",
    "azure",
    "cloud",
    "agile",
    "devops",
    "cybersecurity",
  ];

  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (keyTerms.some((term) => lower.includes(term))) {
      const trimmed = sentence.trim();
      if (trimmed.length < 500) {
        // Avoid very long sentences
        snippets.push(trimmed);
      }
    }
  }

  // Limit to 10 most relevant snippets
  return snippets.slice(0, 10);
}
