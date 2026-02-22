import { query, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create an ingestion log entry
 */
export const create = internalMutation({
  args: {
    source: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed")
    ),
    fetchedCount: v.number(),
    newCount: v.number(),
    updatedCount: v.number(),
    duplicateCount: v.number(),
    errorCount: v.number(),
    errors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("ingestionLogs", {
      source: args.source,
      startedAt: now,
      completedAt: args.status !== "running" ? now : undefined,
      status: args.status,
      fetchedCount: args.fetchedCount,
      newCount: args.newCount,
      updatedCount: args.updatedCount,
      duplicateCount: args.duplicateCount,
      errorCount: args.errorCount,
      errors: args.errors,
    });
  },
});

/**
 * List recent ingestion logs
 */
export const list = query({
  args: {
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q;

    if (args.source) {
      q = ctx.db
        .query("ingestionLogs")
        .withIndex("by_source", (q) => q.eq("source", args.source!))
        .order("desc");
    } else {
      q = ctx.db
        .query("ingestionLogs")
        .withIndex("by_started_at")
        .order("desc");
    }

    return await q.take(args.limit ?? 50);
  },
});

/**
 * Get ingestion statistics
 */
export const getStats = query({
  args: {
    source: v.optional(v.string()),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack ?? 7;
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    let q;
    if (args.source) {
      q = ctx.db
        .query("ingestionLogs")
        .withIndex("by_source", (q) => q.eq("source", args.source!));
    } else {
      q = ctx.db.query("ingestionLogs");
    }

    const logs = await q.filter((q) => q.gte(q.field("startedAt"), cutoff)).take(500);

    const stats = {
      totalRuns: logs.length,
      successfulRuns: 0,
      failedRuns: 0,
      partialRuns: 0,
      totalFetched: 0,
      totalNew: 0,
      totalUpdated: 0,
      totalErrors: 0,
    };

    for (const log of logs) {
      if (log.status === "success") stats.successfulRuns++;
      else if (log.status === "failed") stats.failedRuns++;
      else if (log.status === "partial") stats.partialRuns++;

      stats.totalFetched += log.fetchedCount;
      stats.totalNew += log.newCount;
      stats.totalUpdated += log.updatedCount;
      stats.totalErrors += log.errorCount;
    }

    return stats;
  },
});
