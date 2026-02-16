"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireActionManagerOrAdmin } from "../lib/auth";

// RFPMart API response types (from existing FastAPI backend)
interface RfpMartOpportunity {
  id: string;
  title: string;
  description: string;
  agency?: string;
  location?: string;
  state?: string;
  city?: string;
  posted_date?: string;
  due_date?: string;
  expiry_date?: string;
  budget?: string;
  category?: string;
  url?: string;
  source?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  set_aside?: string;
  naics_code?: string;
}

const FASTAPI_RFP_BASE_URL = "https://fastapi.curator.atemkeng.eu/api/v1/rfp";

const SOURCE_URL_CANDIDATES = {
  web: [
    "https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html",
  ],
  mobile: [
    "https://www.rfpmart.com/mobile-application-development-rfp-government-contract.html",
  ],
} as const;

interface FeedSelection {
  name: string;
  urls: string[];
}

interface FeedFetchResult {
  results: RfpMartOpportunity[];
  usedUrl?: string;
}

function selectFeeds(categories?: string[]): FeedSelection[] {
  if (!categories || categories.length === 0) {
    return [
      { name: "web", urls: [...SOURCE_URL_CANDIDATES.web] },
      { name: "mobile", urls: [...SOURCE_URL_CANDIDATES.mobile] },
    ];
  }

  const lower = categories.map((category) => category.toLowerCase());

  const includeWeb = lower.some((category) =>
    category.includes("web") ||
    category.includes("software") ||
    category.includes("cloud") ||
    category.includes("it") ||
    category.includes("data") ||
    category.includes("cyber")
  );

  const includeMobile = lower.some((category) =>
    category.includes("mobile") || category.includes("app")
  );

  const selected: FeedSelection[] = [];
  if (includeWeb) {
    selected.push({ name: "web", urls: [...SOURCE_URL_CANDIDATES.web] });
  }
  if (includeMobile) {
    selected.push({ name: "mobile", urls: [...SOURCE_URL_CANDIDATES.mobile] });
  }

  if (selected.length === 0) {
    return [
      { name: "web", urls: [...SOURCE_URL_CANDIDATES.web] },
      { name: "mobile", urls: [...SOURCE_URL_CANDIDATES.mobile] },
    ];
  }

  return selected;
}

function parseRfpMartResults(data: unknown): RfpMartOpportunity[] {
  if (Array.isArray(data)) {
    return data as RfpMartOpportunity[];
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: RfpMartOpportunity[] }).results;
  }

  return [];
}

function dedupeOpportunities(opportunities: RfpMartOpportunity[]): RfpMartOpportunity[] {
  const seen = new Set<string>();
  const unique: RfpMartOpportunity[] = [];

  for (const opportunity of opportunities) {
    const key = opportunity.id || opportunity.url || JSON.stringify(opportunity);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(opportunity);
  }

  return unique;
}

async function fetchFeedWithFallback(
  feed: FeedSelection,
  limit: number,
  errors: string[]
): Promise<FeedFetchResult> {
  for (const urlCandidate of feed.urls) {
    try {
      const response = await fetch(`${FASTAPI_RFP_BASE_URL}/rfps_by_url`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: urlCandidate,
          limit,
          skip: 0,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const shortError = errorBody ? ` ${errorBody.slice(0, 200)}` : "";
        errors.push(
          `Failed ${feed.name} feed (${urlCandidate}): ${response.status}${shortError}`
        );
        continue;
      }

      const payload: unknown = await response.json();
      const results = parseRfpMartResults(payload);
      if (results.length > 0) {
        return { results, usedUrl: urlCandidate };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Error fetching ${feed.name} feed (${urlCandidate}): ${message}`);
    }
  }

  return { results: [] };
}

function parseDateOrFallback(rawDate: string | undefined, fallback: number): number {
  if (!rawDate) return fallback;
  const parsed = new Date(rawDate).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Fetch opportunities from RFPMart/FastAPI backend
 */
export const fetchOpportunities = internalAction({
  args: {
    categories: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    urls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let allOpportunities: RfpMartOpportunity[] = [];
    const errors: string[] = [];
    const limit = args.limit ?? 50;
    const feeds: FeedSelection[] =
      args.urls && args.urls.length > 0
        ? [{ name: "custom", urls: args.urls }]
        : selectFeeds(args.categories);
    const usedUrls: string[] = [];

    let newCount = 0;
    let updatedCount = 0;
    let evaluatedCount = 0;

    try {
      for (const feed of feeds) {
        const feedResult = await fetchFeedWithFallback(feed, limit, errors);
        if (feedResult.results.length > 0) {
          allOpportunities = allOpportunities.concat(feedResult.results);
          if (feedResult.usedUrl) {
            usedUrls.push(`${feed.name}:${feedResult.usedUrl}`);
          }
        } else {
          errors.push(
            `No opportunities returned for ${feed.name} after trying ${feed.urls.length} URL candidate(s).`
          );
        }

        // Small delay between feed requests to avoid hammering the upstream service
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (allOpportunities.length === 0) {
        errors.push(
          `No RFPMart opportunities returned from selected feeds (${feeds.map((feed) => feed.name).join(", ")}).`
        );
      }

      allOpportunities = dedupeOpportunities(allOpportunities);

      // Process opportunities and auto-evaluate for eligibility
      for (const opp of allOpportunities) {
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
            console.error(`Evaluation failed for ${opp.id}:`, evalError);
          }
        } catch (error) {
          errors.push(`Failed to process ${opp.id}: ${error}`);
        }
      }

      // Update source health
      const healthStatus = errors.length > 0 ? "warning" : "healthy";
      await ctx.runMutation(internal.sources.updateHealth, {
        name: "rfpmart",
        status: healthStatus,
        errorCount: errors.length,
        lastFetchAt: Date.now(),
        fetchedCount: allOpportunities.length,
        lastError:
          errors.length > 0
            ? errors[0]
            : usedUrls.length > 0
              ? `Fetched via ${usedUrls.join(", ")}`
              : undefined,
      });

      // Log ingestion
      const ingestionStatus = errors.length > 0 ? "partial" : "success";
      await ctx.runMutation(internal.ingestion.logs.create, {
        source: "rfpmart",
        status: ingestionStatus,
        fetchedCount: allOpportunities.length,
        newCount,
        updatedCount,
        duplicateCount: 0,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      });

      return {
        success: true,
        fetched: allOpportunities.length,
        new: newCount,
        updated: updatedCount,
        evaluated: evaluatedCount,
        errors: errors.length,
      };
    } catch (globalError) {
      const errorMessage = globalError instanceof Error ? globalError.message : String(globalError);
      console.error("Critical error in RFPMart ingestion:", globalError);

      try {
        // Attempt to log the failure
        await ctx.runMutation(internal.sources.updateHealth, {
          name: "rfpmart",
          status: "error",
          errorCount: 1,
          lastError: `Critical failure: ${errorMessage}`,
        });

        await ctx.runMutation(internal.ingestion.logs.create, {
          source: "rfpmart",
          status: "failed",
          fetchedCount: allOpportunities.length,
          newCount,
          updatedCount,
          duplicateCount: 0,
          errorCount: 1,
          errors: [`Critical failure: ${errorMessage}`],
        });
      } catch (logError) {
        console.error("Failed to log error to DB:", logError);
      }

      return {
        success: false,
        fetched: allOpportunities.length,
        new: newCount,
        updated: updatedCount,
        evaluated: evaluatedCount,
        errors: 1,
      };
    }
  },
});

/**
 * Public action to trigger RFPMart fetch (requires auth)
 */
export const triggerFetch = action({
  args: {
    categories: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    urls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    fetched: number;
    new: number;
    updated: number;
    errors: number;
  }> => {
    await requireActionManagerOrAdmin(ctx);

    return await ctx.runAction(internal.ingestion.rfpmart.fetchOpportunities, args);
  },
});

/**
 * Normalize RFPMart opportunity to canonical schema
 */
function normalizeOpportunity(raw: RfpMartOpportunity) {
  const now = Date.now();

  // Parse dates
  const postedDate = parseDateOrFallback(raw.posted_date, now);
  const dueDate = parseDateOrFallback(
    raw.due_date || raw.expiry_date,
    now + 30 * 24 * 60 * 60 * 1000
  );

  // Parse budget to number
  let estimatedValue: number | undefined;
  if (raw.budget) {
    const budgetMatch = raw.budget.match(/[\d,]+/);
    if (budgetMatch) {
      estimatedValue = parseInt(budgetMatch[0].replace(/,/g, ""), 10);
    }
  }

  // Determine buyer type based on source/agency
  let buyerType: "federal" | "state" | "local" | "other" = "other";
  const agencyLower = (raw.agency || "").toLowerCase();
  if (
    agencyLower.includes("federal") ||
    agencyLower.includes("department of") ||
    agencyLower.includes("u.s.") ||
    agencyLower.includes("united states")
  ) {
    buyerType = "federal";
  } else if (
    agencyLower.includes("state") ||
    agencyLower.includes("commonwealth")
  ) {
    buyerType = "state";
  } else if (
    agencyLower.includes("city") ||
    agencyLower.includes("county") ||
    agencyLower.includes("municipal")
  ) {
    buyerType = "local";
  }

  // Extract evidence snippets
  const evidenceSnippets = extractEvidenceSnippets(raw.description || "");

  return {
    externalIds: [
      {
        source: "rfpmart",
        externalId: raw.id,
        url: raw.url || `https://rfpmart.com/rfp/${raw.id}`,
        fetchedAt: now,
      },
    ],
    title: raw.title || "Untitled Opportunity",
    fullDescription: raw.description || "",
    buyer: {
      name: raw.agency || "Unknown",
      type: buyerType,
    },
    location: {
      state: raw.state,
      city: raw.city,
      isRemoteAllowed: (raw.description || "").toLowerCase().includes("remote"),
    },
    postedDate,
    dueDate,
    estimatedValue,
    contact: raw.contact_name || raw.contact_email
      ? {
        name: raw.contact_name,
        email: raw.contact_email,
        phone: raw.contact_phone,
      }
      : undefined,
    categories: raw.naics_code
      ? [raw.naics_code]
      : raw.category
        ? [raw.category]
        : [],
    setAside: raw.set_aside,
    attachments: [],
    sourceUrl: raw.url || `https://rfpmart.com/rfp/${raw.id}`,
    evidenceSnippets,
    source: "rfpmart",
  };
}

/**
 * Extract key sentences from description for eligibility/scoring evidence
 */
function extractEvidenceSnippets(text: string): string[] {
  if (!text) return [];

  const snippets: string[] = [];
  const keyTerms = [
    "clearance",
    "onsite",
    "remote",
    "experience",
    "certification",
    "small business",
    "set-aside",
    "budget",
    "timeline",
    "deadline",
  ];

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (keyTerms.some((term) => lower.includes(term))) {
      const trimmed = sentence.trim();
      if (trimmed.length < 500) {
        snippets.push(trimmed);
      }
    }
  }

  return snippets.slice(0, 10);
}
