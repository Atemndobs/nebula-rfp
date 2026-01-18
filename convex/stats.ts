/**
 * Stats Aggregation - BANDWIDTH OPTIMIZATION
 *
 * Pre-computed stats to avoid querying thousands of documents.
 * Stats are updated incrementally when evaluations change.
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ============================================
// Queries
// ============================================

/**
 * Get eligibility stats from the aggregation table
 * Falls back to computing if not yet initialized
 */
export const getEligibilityStats = query({
  args: {},
  handler: async (ctx) => {
    // Try to get pre-computed stats first
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
        lastUpdatedAt: cached.lastUpdatedAt,
        isCached: true,
      };
    }

    // Fallback: compute stats (will be slow, but only happens once)
    // Use limited queries to avoid bandwidth explosion
    const [eligible, partnerRequired, rejected] = await Promise.all([
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "ELIGIBLE"))
        .take(1000),
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "PARTNER_REQUIRED"))
        .take(1000),
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "REJECTED"))
        .take(1000),
    ]);

    return {
      total: eligible.length + partnerRequired.length + rejected.length,
      eligible: eligible.length,
      partnerRequired: partnerRequired.length,
      rejected: rejected.length,
      lastUpdatedAt: null,
      isCached: false,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Initialize or recalculate eligibility stats
 * Call this once to set up the aggregation, or to recalculate after bulk changes
 */
export const initializeEligibilityStats = mutation({
  args: {},
  handler: async (ctx) => {
    // Count evaluations by status using limited batches
    const [eligible, partnerRequired, rejected] = await Promise.all([
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "ELIGIBLE"))
        .take(10000),
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "PARTNER_REQUIRED"))
        .take(10000),
      ctx.db
        .query("evaluations")
        .withIndex("by_eligibility_status", (q) => q.eq("eligibility.status", "REJECTED"))
        .take(10000),
    ]);

    const counts = {
      total: eligible.length + partnerRequired.length + rejected.length,
      eligible: eligible.length,
      partnerRequired: partnerRequired.length,
      rejected: rejected.length,
    };

    // Check if record exists
    const existing = await ctx.db
      .query("statsAggregation")
      .withIndex("by_key", (q) => q.eq("key", "eligibility"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        counts,
        lastUpdatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("statsAggregation", {
        key: "eligibility",
        counts,
        lastUpdatedAt: Date.now(),
      });
    }

    return { success: true, counts };
  },
});

/**
 * Internal mutation to increment a status count
 * Called when an evaluation is created
 */
export const incrementStatus = internalMutation({
  args: {
    status: v.union(
      v.literal("ELIGIBLE"),
      v.literal("PARTNER_REQUIRED"),
      v.literal("REJECTED")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("statsAggregation")
      .withIndex("by_key", (q) => q.eq("key", "eligibility"))
      .first();

    if (!existing) {
      // Initialize with this single count
      await ctx.db.insert("statsAggregation", {
        key: "eligibility",
        counts: {
          total: 1,
          eligible: args.status === "ELIGIBLE" ? 1 : 0,
          partnerRequired: args.status === "PARTNER_REQUIRED" ? 1 : 0,
          rejected: args.status === "REJECTED" ? 1 : 0,
        },
        lastUpdatedAt: Date.now(),
      });
      return;
    }

    // Increment the appropriate counter
    const counts = { ...existing.counts };
    counts.total = (counts.total ?? 0) + 1;

    if (args.status === "ELIGIBLE") {
      counts.eligible = (counts.eligible ?? 0) + 1;
    } else if (args.status === "PARTNER_REQUIRED") {
      counts.partnerRequired = (counts.partnerRequired ?? 0) + 1;
    } else if (args.status === "REJECTED") {
      counts.rejected = (counts.rejected ?? 0) + 1;
    }

    await ctx.db.patch(existing._id, {
      counts,
      lastUpdatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to decrement a status count
 * Called when an evaluation is deleted
 */
export const decrementStatus = internalMutation({
  args: {
    status: v.union(
      v.literal("ELIGIBLE"),
      v.literal("PARTNER_REQUIRED"),
      v.literal("REJECTED")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("statsAggregation")
      .withIndex("by_key", (q) => q.eq("key", "eligibility"))
      .first();

    if (!existing) return;

    // Decrement the appropriate counter
    const counts = { ...existing.counts };
    counts.total = Math.max(0, (counts.total ?? 0) - 1);

    if (args.status === "ELIGIBLE") {
      counts.eligible = Math.max(0, (counts.eligible ?? 0) - 1);
    } else if (args.status === "PARTNER_REQUIRED") {
      counts.partnerRequired = Math.max(0, (counts.partnerRequired ?? 0) - 1);
    } else if (args.status === "REJECTED") {
      counts.rejected = Math.max(0, (counts.rejected ?? 0) - 1);
    }

    await ctx.db.patch(existing._id, {
      counts,
      lastUpdatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to change status count (from one status to another)
 * Called when an evaluation is updated
 */
export const changeStatus = internalMutation({
  args: {
    oldStatus: v.union(
      v.literal("ELIGIBLE"),
      v.literal("PARTNER_REQUIRED"),
      v.literal("REJECTED")
    ),
    newStatus: v.union(
      v.literal("ELIGIBLE"),
      v.literal("PARTNER_REQUIRED"),
      v.literal("REJECTED")
    ),
  },
  handler: async (ctx, args) => {
    if (args.oldStatus === args.newStatus) return;

    const existing = await ctx.db
      .query("statsAggregation")
      .withIndex("by_key", (q) => q.eq("key", "eligibility"))
      .first();

    if (!existing) return;

    const counts = { ...existing.counts };

    // Decrement old status
    if (args.oldStatus === "ELIGIBLE") {
      counts.eligible = Math.max(0, (counts.eligible ?? 0) - 1);
    } else if (args.oldStatus === "PARTNER_REQUIRED") {
      counts.partnerRequired = Math.max(0, (counts.partnerRequired ?? 0) - 1);
    } else if (args.oldStatus === "REJECTED") {
      counts.rejected = Math.max(0, (counts.rejected ?? 0) - 1);
    }

    // Increment new status
    if (args.newStatus === "ELIGIBLE") {
      counts.eligible = (counts.eligible ?? 0) + 1;
    } else if (args.newStatus === "PARTNER_REQUIRED") {
      counts.partnerRequired = (counts.partnerRequired ?? 0) + 1;
    } else if (args.newStatus === "REJECTED") {
      counts.rejected = (counts.rejected ?? 0) + 1;
    }

    await ctx.db.patch(existing._id, {
      counts,
      lastUpdatedAt: Date.now(),
    });
  },
});

/**
 * Reset stats to zero (called when all evaluations are deleted)
 */
export const resetStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("statsAggregation")
      .withIndex("by_key", (q) => q.eq("key", "eligibility"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        counts: {
          total: 0,
          eligible: 0,
          partnerRequired: 0,
          rejected: 0,
        },
        lastUpdatedAt: Date.now(),
      });
    }
  },
});
