"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

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
  description?: string;
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
  handler: async (ctx, args) => {
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

    // Only active opportunities
    params.append("ptype", "o,p,k"); // Opportunities, Presolicitations, Combined

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

      // Process opportunities - store and auto-evaluate for eligibility
      let newCount = 0;
      let updatedCount = 0;
      let evaluatedCount = 0;
      const errors: string[] = [];

      for (const opp of data.opportunitiesData ?? []) {
        try {
          const normalized = normalizeOpportunity(opp);
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

      // Update source health
      await ctx.runMutation(internal.sources.updateHealth, {
        name: "sam.gov",
        status: errors.length > 0 ? "warning" : "healthy",
        errorCount: errors.length,
        lastFetchAt: Date.now(),
        fetchedCount: data.opportunitiesData?.length ?? 0,
        lastError: errors.length > 0 ? errors[0] : undefined,
      });

      // Log ingestion
      await ctx.runMutation(internal.ingestion.logs.create, {
        source: "sam.gov",
        status: errors.length > 0 ? "partial" : "success",
        fetchedCount: data.opportunitiesData?.length ?? 0,
        newCount,
        updatedCount,
        duplicateCount: 0,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      });

      return {
        success: true,
        totalRecords: data.totalRecords,
        fetched: data.opportunitiesData?.length ?? 0,
        new: newCount,
        updated: updatedCount,
        evaluated: evaluatedCount,
        errors: errors.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update source health
      await ctx.runMutation(internal.sources.updateHealth, {
        name: "sam.gov",
        status: "error",
        errorCount: 1,
        lastError: errorMessage,
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
        errors: [errorMessage],
      });

      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Public action to trigger SAM.gov fetch
 *
 * TODO: PRODUCTION - Re-enable auth check before deploying to production!
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
    // DEV MODE: Auth check disabled for development
    // TODO: Uncomment for production:
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }

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
