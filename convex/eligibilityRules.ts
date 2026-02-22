/**
 * Eligibility Rules - Convex Queries & Mutations
 * Phase 2: Eligibility Gate (P0 HIGHEST PRIORITY)
 *
 * Manage eligibility rules configuration and run eligibility evaluations.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  evaluateEligibility,
  DEFAULT_ELIGIBILITY_RULES,
  DEFAULT_ORGANIZATION_CAPABILITIES,
  type EligibilityEngineConfig,
} from "./eligibility";

// Helper type for eligibility status
type EligibilityStatus = "ELIGIBLE" | "PARTNER_REQUIRED" | "REJECTED";

// Helper to increment stats when a new evaluation is created
async function updateStatsOnIncrement(
  ctx: { db: any },
  status: EligibilityStatus
) {
  const existing = await ctx.db
    .query("statsAggregation")
    .withIndex("by_key", (q: any) => q.eq("key", "eligibility"))
    .first();

  if (!existing) {
    await ctx.db.insert("statsAggregation", {
      key: "eligibility",
      counts: {
        total: 1,
        eligible: status === "ELIGIBLE" ? 1 : 0,
        partnerRequired: status === "PARTNER_REQUIRED" ? 1 : 0,
        rejected: status === "REJECTED" ? 1 : 0,
      },
      lastUpdatedAt: Date.now(),
    });
    return;
  }

  const counts = { ...existing.counts };
  counts.total = (counts.total ?? 0) + 1;
  if (status === "ELIGIBLE") counts.eligible = (counts.eligible ?? 0) + 1;
  else if (status === "PARTNER_REQUIRED") counts.partnerRequired = (counts.partnerRequired ?? 0) + 1;
  else if (status === "REJECTED") counts.rejected = (counts.rejected ?? 0) + 1;

  await ctx.db.patch(existing._id, { counts, lastUpdatedAt: Date.now() });
}

// Helper to update stats when an evaluation status changes
async function updateStatsOnChange(
  ctx: { db: any },
  oldStatus: EligibilityStatus,
  newStatus: EligibilityStatus
) {
  if (oldStatus === newStatus) return;

  const existing = await ctx.db
    .query("statsAggregation")
    .withIndex("by_key", (q: any) => q.eq("key", "eligibility"))
    .first();

  if (!existing) return;

  const counts = { ...existing.counts };

  // Decrement old status
  if (oldStatus === "ELIGIBLE") counts.eligible = Math.max(0, (counts.eligible ?? 0) - 1);
  else if (oldStatus === "PARTNER_REQUIRED") counts.partnerRequired = Math.max(0, (counts.partnerRequired ?? 0) - 1);
  else if (oldStatus === "REJECTED") counts.rejected = Math.max(0, (counts.rejected ?? 0) - 1);

  // Increment new status
  if (newStatus === "ELIGIBLE") counts.eligible = (counts.eligible ?? 0) + 1;
  else if (newStatus === "PARTNER_REQUIRED") counts.partnerRequired = (counts.partnerRequired ?? 0) + 1;
  else if (newStatus === "REJECTED") counts.rejected = (counts.rejected ?? 0) + 1;

  await ctx.db.patch(existing._id, { counts, lastUpdatedAt: Date.now() });
}

// ============================================
// Queries
// ============================================

/**
 * Get all eligibility rules
 * Note: Rules are a small set (typically 8-20), so .take(50) is safe
 */
export const listRules = query({
  args: {},
  handler: async (ctx) => {
    // Rules are a small, bounded set - .take(50) prevents unbounded reads
    const rules = await ctx.db.query("eligibilityRules").take(50);

    // If no rules exist, return defaults
    if (rules.length === 0) {
      return DEFAULT_ELIGIBILITY_RULES.map((rule) => ({
        ...rule,
        _id: null as unknown as Id<"eligibilityRules">,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    }

    return rules;
  },
});

/**
 * Get eligibility stats across all evaluated opportunities
 * BANDWIDTH OPTIMIZED: Uses pre-computed stats from aggregation table
 */
export const getEligibilityStats = query({
  args: {},
  handler: async (ctx) => {
    // Try to get pre-computed stats first (single document read!)
    const cached = await ctx.db
      .query("statsAggregation")
      .withIndex("by_key", (q) => q.eq("key", "eligibility"))
      .first();

    if (cached) {
      return {
        total: cached.counts.total,
        eligible: cached.counts.eligible ?? 0,
        partnerRequired: cached.counts.partnerRequired ?? 0,
        rejected: cached.counts.rejected ?? 0,
      };
    }

    // Fallback: limited count (only happens before stats are initialized)
    const [eligible, partnerRequired, rejected] = await Promise.all([
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "ELIGIBLE"))
        .take(500),
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "PARTNER_REQUIRED"))
        .take(500),
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "REJECTED"))
        .take(500),
    ]);

    return {
      total: eligible.length + partnerRequired.length + rejected.length,
      eligible: eligible.length,
      partnerRequired: partnerRequired.length,
      rejected: rejected.length,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Initialize default eligibility rules
 */
export const initializeRules = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if rules already exist
    const existingRules = await ctx.db.query("eligibilityRules").take(1);
    if (existingRules.length > 0) {
      return { success: false, message: "Rules already initialized" };
    }

    const now = Date.now();

    // Insert default rules
    for (const rule of DEFAULT_ELIGIBILITY_RULES) {
      await ctx.db.insert("eligibilityRules", {
        ruleId: rule.ruleId,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        defaultOutcome: rule.defaultOutcome,
        allowOverride: rule.allowOverride,
        keywords: rule.keywords,
        isRegex: rule.isRegex,
        severity: rule.severity,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, message: "Initialized 8 eligibility rules" };
  },
});

/**
 * Update a single eligibility rule
 */
export const updateRule = mutation({
  args: {
    ruleId: v.string(),
    enabled: v.optional(v.boolean()),
    defaultOutcome: v.optional(
      v.union(
        v.literal("REJECTED"),
        v.literal("PARTNER_REQUIRED"),
        v.literal("FLAG")
      )
    ),
    keywords: v.optional(v.array(v.string())),
    allowOverride: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eligibilityRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();

    if (!existing) {
      // Create from default
      const defaultRule = DEFAULT_ELIGIBILITY_RULES.find(
        (r) => r.ruleId === args.ruleId
      );
      if (!defaultRule) {
        throw new Error(`Unknown rule: ${args.ruleId}`);
      }

      const now = Date.now();
      await ctx.db.insert("eligibilityRules", {
        ruleId: defaultRule.ruleId,
        name: defaultRule.name,
        description: defaultRule.description,
        enabled: args.enabled ?? defaultRule.enabled,
        defaultOutcome: args.defaultOutcome ?? defaultRule.defaultOutcome,
        allowOverride: args.allowOverride ?? defaultRule.allowOverride,
        keywords: args.keywords ?? defaultRule.keywords,
        isRegex: defaultRule.isRegex,
        severity: defaultRule.severity,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true };
    }

    // Update existing
    await ctx.db.patch(existing._id, {
      ...(args.enabled !== undefined && { enabled: args.enabled }),
      ...(args.defaultOutcome !== undefined && {
        defaultOutcome: args.defaultOutcome,
      }),
      ...(args.keywords !== undefined && { keywords: args.keywords }),
      ...(args.allowOverride !== undefined && {
        allowOverride: args.allowOverride,
      }),
      updatedAt: Date.now(),
      version: existing.version + 1,
    });

    return { success: true };
  },
});

/**
 * Add keyword to a rule
 */
export const addKeyword = mutation({
  args: {
    ruleId: v.string(),
    keyword: v.string(),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db
      .query("eligibilityRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();

    if (!rule) {
      throw new Error(`Rule not found: ${args.ruleId}`);
    }

    const normalizedKeyword = args.keyword.toLowerCase().trim();
    if (rule.keywords.includes(normalizedKeyword)) {
      return { success: false, message: "Keyword already exists" };
    }

    await ctx.db.patch(rule._id, {
      keywords: [...rule.keywords, normalizedKeyword],
      updatedAt: Date.now(),
      version: rule.version + 1,
    });

    return { success: true };
  },
});

/**
 * Remove keyword from a rule
 */
export const removeKeyword = mutation({
  args: {
    ruleId: v.string(),
    keyword: v.string(),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db
      .query("eligibilityRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();

    if (!rule) {
      throw new Error(`Rule not found: ${args.ruleId}`);
    }

    const normalizedKeyword = args.keyword.toLowerCase().trim();
    const newKeywords = rule.keywords.filter((k) => k !== normalizedKeyword);

    await ctx.db.patch(rule._id, {
      keywords: newKeywords,
      updatedAt: Date.now(),
      version: rule.version + 1,
    });

    return { success: true };
  },
});

/**
 * Evaluate eligibility for a single opportunity and store result
 */
export const evaluateOpportunity = mutation({
  args: { opportunityId: v.id("opportunities") },
  handler: async (ctx, args) => {
    // Get the opportunity
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }

    // Get configured rules - bounded set, .take(50) is safe
    const rules = await ctx.db.query("eligibilityRules").take(50);
    const disabledRules = rules
      .filter((r) => !r.enabled)
      .map((r) => r.ruleId);

    // Build config
    const config: EligibilityEngineConfig = {
      organization: DEFAULT_ORGANIZATION_CAPABILITIES,
      minimumDaysToDeadline: 5,
      disabledRules,
    };

    // Run evaluation
    const result = evaluateEligibility(opportunity, config);

    // Check if evaluation already exists
    const existing = await ctx.db
      .query("evaluations")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId))
      .first();

    const eligibilityData = {
      status: result.status,
      reasons: result.reasons,
      evidenceSnippets: result.evidenceSnippets,
      rulesVersion: result.rulesVersion,
    };

    if (existing) {
      const oldStatus = existing.eligibility.status as EligibilityStatus;
      await ctx.db.patch(existing._id, {
        eligibility: eligibilityData,
        evaluatedAt: Date.now(),
        evaluatedBy: "system",
      });
      // Update stats if status changed
      if (oldStatus !== result.status) {
        await updateStatsOnChange(ctx, oldStatus, result.status);
      }
    } else {
      await ctx.db.insert("evaluations", {
        opportunityId: args.opportunityId,
        eligibility: eligibilityData,
        evaluatedAt: Date.now(),
        evaluatedBy: "system",
      });
      // Increment stats for new evaluation
      await updateStatsOnIncrement(ctx, result.status);
    }

    return {
      success: true,
      status: result.status,
      reasons: result.reasons.length,
    };
  },
});

/**
 * Internal version - evaluate eligibility for a single opportunity
 * Called from ingestion actions to auto-evaluate on ingest
 */
export const evaluateOpportunityInternal = internalMutation({
  args: { opportunityId: v.id("opportunities") },
  handler: async (ctx, args) => {
    // Get the opportunity
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) {
      return { success: false, error: "Opportunity not found" };
    }

    // Get configured rules - bounded set, .take(50) is safe
    const rules = await ctx.db.query("eligibilityRules").take(50);
    const disabledRules = rules
      .filter((r) => !r.enabled)
      .map((r) => r.ruleId);

    // Build config
    const config: EligibilityEngineConfig = {
      organization: DEFAULT_ORGANIZATION_CAPABILITIES,
      minimumDaysToDeadline: 5,
      disabledRules,
    };

    // Run evaluation
    const result = evaluateEligibility(opportunity, config);

    // Check if evaluation already exists
    const existing = await ctx.db
      .query("evaluations")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId))
      .first();

    const eligibilityData = {
      status: result.status,
      reasons: result.reasons,
      evidenceSnippets: result.evidenceSnippets,
      rulesVersion: result.rulesVersion,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        eligibility: eligibilityData,
        evaluatedAt: Date.now(),
        evaluatedBy: "system",
      });
    } else {
      await ctx.db.insert("evaluations", {
        opportunityId: args.opportunityId,
        eligibility: eligibilityData,
        evaluatedAt: Date.now(),
        evaluatedBy: "system",
      });
    }

    return {
      success: true,
      status: result.status,
      reasons: result.reasons.length,
    };
  },
});

/**
 * Evaluate eligibility for all opportunities without evaluations
 * BANDWIDTH OPTIMIZED: Uses indexed lookups instead of loading all evaluations
 */
export const evaluateAllPending = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get opportunities - limit to what we need
    const opportunities = await ctx.db.query("opportunities").take(limit * 2);

    // Get configured rules - bounded set, .take(50) is safe
    const rules = await ctx.db.query("eligibilityRules").take(50);
    const disabledRules = rules.filter((r) => !r.enabled).map((r) => r.ruleId);

    const config: EligibilityEngineConfig = {
      organization: DEFAULT_ORGANIZATION_CAPABILITIES,
      minimumDaysToDeadline: 5,
      disabledRules,
    };

    const evaluated: string[] = [];

    // Check each opportunity individually using the index instead of loading all evaluations
    for (const opportunity of opportunities) {
      if (evaluated.length >= limit) break;

      // Use indexed lookup to check if already evaluated - much more efficient
      const existingEval = await ctx.db
        .query("evaluations")
        .withIndex("by_opportunity", (q) => q.eq("opportunityId", opportunity._id))
        .first();

      if (existingEval) continue;

      const result = evaluateEligibility(opportunity, config);

      await ctx.db.insert("evaluations", {
        opportunityId: opportunity._id,
        eligibility: {
          status: result.status,
          reasons: result.reasons,
          evidenceSnippets: result.evidenceSnippets,
          rulesVersion: result.rulesVersion,
        },
        evaluatedAt: Date.now(),
        evaluatedBy: "system",
      });

      // Update stats for new evaluation
      await updateStatsOnIncrement(ctx, result.status);

      evaluated.push(opportunity._id);
    }

    return {
      evaluated: evaluated.length,
      total: opportunities.length,
    };
  },
});

// Helper to decrement stats when an evaluation is deleted
async function updateStatsOnDecrement(
  ctx: { db: any },
  status: EligibilityStatus
) {
  const existing = await ctx.db
    .query("statsAggregation")
    .withIndex("by_key", (q: any) => q.eq("key", "eligibility"))
    .first();

  if (!existing) return;

  const counts = { ...existing.counts };
  counts.total = Math.max(0, (counts.total ?? 0) - 1);
  if (status === "ELIGIBLE") counts.eligible = Math.max(0, (counts.eligible ?? 0) - 1);
  else if (status === "PARTNER_REQUIRED") counts.partnerRequired = Math.max(0, (counts.partnerRequired ?? 0) - 1);
  else if (status === "REJECTED") counts.rejected = Math.max(0, (counts.rejected ?? 0) - 1);

  await ctx.db.patch(existing._id, { counts, lastUpdatedAt: Date.now() });
}

/**
 * Reset all eligibility evaluations (for re-evaluation after rule changes)
 * BANDWIDTH OPTIMIZED: Batch delete with limits instead of loading all at once
 */
export const resetAllEvaluations = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;

    // Delete in batches to avoid loading entire table
    const evaluations = await ctx.db.query("evaluations").take(batchSize);
    let deleted = 0;

    for (const evaluation of evaluations) {
      // Decrement stats for deleted evaluation
      const status = evaluation.eligibility?.status as EligibilityStatus;
      if (status) {
        await updateStatsOnDecrement(ctx, status);
      }
      await ctx.db.delete(evaluation._id);
      deleted++;
    }

    // Return info about whether more batches are needed
    const hasMore = evaluations.length === batchSize;

    return { deleted, hasMore };
  },
});

/**
 * Export all eligibility rules in a structured format
 * Returns rules with all details for external review/analysis
 * BANDWIDTH OPTIMIZED: Uses bounded queries and indexed status counts
 */
export const exportRules = query({
  args: {},
  handler: async (ctx) => {
    // Get configured rules from DB - bounded set, .take(50) is safe
    const storedRules = await ctx.db.query("eligibilityRules").take(50);

    // Use stored rules or defaults
    const rulesToExport = storedRules.length > 0
      ? storedRules.map((rule) => ({
          ruleId: rule.ruleId,
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          severity: rule.severity,
          defaultOutcome: rule.defaultOutcome,
          allowOverride: rule.allowOverride,
          keywords: rule.keywords,
          keywordCount: rule.keywords.length,
          isRegex: rule.isRegex,
          version: rule.version,
          updatedAt: rule.updatedAt ? new Date(rule.updatedAt).toISOString() : null,
        }))
      : DEFAULT_ELIGIBILITY_RULES.map((rule) => ({
          ruleId: rule.ruleId,
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          severity: rule.severity,
          defaultOutcome: rule.defaultOutcome,
          allowOverride: rule.allowOverride,
          keywords: rule.keywords,
          keywordCount: rule.keywords.length,
          isRegex: rule.isRegex,
          version: 1,
          updatedAt: null,
        }));

    // Get evaluation stats from aggregation table - BANDWIDTH OPTIMIZED
    const cached = await ctx.db
      .query("statsAggregation")
      .withIndex("by_key", (q) => q.eq("key", "eligibility"))
      .first();

    const stats = cached
      ? {
          total: cached.counts.total,
          eligible: cached.counts.eligible ?? 0,
          partnerRequired: cached.counts.partnerRequired ?? 0,
          rejected: cached.counts.rejected ?? 0,
        }
      : { total: 0, eligible: 0, partnerRequired: 0, rejected: 0 };

    // Get organization capabilities
    const orgConfig = DEFAULT_ORGANIZATION_CAPABILITIES;

    return {
      exportedAt: new Date().toISOString(),
      rulesVersion: "1.0.0",
      totalRules: rulesToExport.length,
      evaluationStats: stats,
      organizationCapabilities: orgConfig,
      rules: rulesToExport,
    };
  },
});
