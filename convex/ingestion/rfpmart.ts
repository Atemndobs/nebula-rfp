"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

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

interface RfpMartResponse {
  results: RfpMartOpportunity[];
  total?: number;
  page?: number;
  page_size?: number;
}

/**
 * Fetch opportunities from RFPMart/FastAPI backend
 */
export const fetchOpportunities = internalAction({
  args: {
    categories: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use existing FastAPI backend
    const baseUrl = "https://fastapi.curator.atemkeng.eu";

    // Default categories for IT services
    const categories = args.categories ?? [
      "Web Development",
      "Mobile App Development",
      "Software Development",
      "IT Services",
      "Cloud Services",
    ];

    let allOpportunities: RfpMartOpportunity[] = [];
    const errors: string[] = [];

    for (const category of categories) {
      try {
        const url = `${baseUrl}/rfps?category=${encodeURIComponent(category)}&limit=${args.limit ?? 50}`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          errors.push(`Failed to fetch ${category}: ${response.status}`);
          continue;
        }

        const data: RfpMartResponse = await response.json();
        allOpportunities = allOpportunities.concat(data.results || []);

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        errors.push(`Error fetching ${category}: ${error}`);
      }
    }

    // Process opportunities and auto-evaluate for eligibility
    let newCount = 0;
    let updatedCount = 0;
    let evaluatedCount = 0;

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
    await ctx.runMutation(internal.sources.updateHealth, {
      name: "rfpmart",
      status: errors.length > 5 ? "warning" : "healthy",
      errorCount: errors.length,
      lastFetchAt: Date.now(),
      fetchedCount: allOpportunities.length,
      lastError: errors.length > 0 ? errors[0] : undefined,
    });

    // Log ingestion
    await ctx.runMutation(internal.ingestion.logs.create, {
      source: "rfpmart",
      status: errors.length > 0 ? "partial" : "success",
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
  },
});

/**
 * Public action to trigger RFPMart fetch (requires auth)
 */
export const triggerFetch = action({
  args: {
    categories: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    fetched: number;
    new: number;
    updated: number;
    errors: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.runAction(internal.ingestion.rfpmart.fetchOpportunities, args);
  },
});

/**
 * Normalize RFPMart opportunity to canonical schema
 */
function normalizeOpportunity(raw: RfpMartOpportunity) {
  const now = Date.now();

  // Parse dates
  const postedDate = raw.posted_date
    ? new Date(raw.posted_date).getTime()
    : now;
  const dueDate = raw.due_date
    ? new Date(raw.due_date).getTime()
    : now + 30 * 24 * 60 * 60 * 1000;

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
