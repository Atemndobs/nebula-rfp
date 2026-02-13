import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all data sources
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sources").order("desc").take(50);
  },
});

/**
 * List only enabled sources (for filtering displayed opportunities)
 */
export const listEnabled = query({
  args: {},
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").take(50);
    return sources
      .filter((s) => s.enabled)
      .map((s) => ({
        name: s.name,
        displayName: s.displayName,
      }));
  },
});

/**
 * Get a source by name
 */
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sources")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

/**
 * Internal query to get a source by name (for use in actions)
 */
export const getByNameInternal = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sources")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

/**
 * Get source health status summary
 */
export const getHealthSummary = query({
  args: {},
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").take(50);

    const summary = {
      total: sources.length,
      healthy: 0,
      warning: 0,
      error: 0,
      disabled: 0,
      totalFetchedToday: 0,
    };

    for (const source of sources) {
      summary[source.status]++;
      summary.totalFetchedToday += source.fetchedToday;
    }

    return summary;
  },
});

/**
 * Initialize default sources (run once on setup)
 *
 * TODO: PRODUCTION - Re-enable auth check before deploying to production!
 */
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    // DEV MODE: Auth check disabled for development
    // TODO: Uncomment for production:
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }

    // Check if sources already exist
    const existing = await ctx.db.query("sources").take(1);
    if (existing.length > 0) {
      return { message: "Sources already initialized" };
    }

    const defaultSources = [
      {
        name: "sam.gov",
        displayName: "SAM.gov",
        enabled: true,
        refreshIntervalMinutes: 360, // 6 hours
        rateLimitPerMinute: 0, // Not applicable - uses daily quota
        rateLimitPerHour: 0, // Not applicable - uses daily quota
        rateLimitPerDay: 1000, // SAM.gov API daily quota
        status: "healthy" as const,
        errorCount: 0,
        totalFetched: 0,
        fetchedToday: 0,
      },
      {
        name: "emma",
        displayName: "Maryland eMMA",
        enabled: false, // Disabled until connector is built
        refreshIntervalMinutes: 720, // 12 hours
        rateLimitPerMinute: 5,
        rateLimitPerHour: 50,
        status: "disabled" as const,
        errorCount: 0,
        totalFetched: 0,
        fetchedToday: 0,
      },
      {
        name: "rfpmart",
        displayName: "RFPMart",
        enabled: true,
        refreshIntervalMinutes: 360,
        rateLimitPerMinute: 20,
        rateLimitPerHour: 200,
        status: "healthy" as const,
        errorCount: 0,
        totalFetched: 0,
        fetchedToday: 0,
      },
      {
        name: "rfpmart-csv",
        displayName: "RFPMart CSV Upload",
        enabled: true,
        refreshIntervalMinutes: 0, // Manual upload only
        rateLimitPerMinute: 0,
        rateLimitPerHour: 0,
        status: "healthy" as const,
        errorCount: 0,
        totalFetched: 0,
        fetchedToday: 0,
      },
    ];

    for (const source of defaultSources) {
      await ctx.db.insert("sources", source);
    }

    return { message: "Default sources initialized", count: defaultSources.length };
  },
});

/**
 * Update source configuration
 *
 * TODO: PRODUCTION - Re-enable auth check before deploying to production!
 */
export const update = mutation({
  args: {
    id: v.id("sources"),
    enabled: v.optional(v.boolean()),
    refreshIntervalMinutes: v.optional(v.number()),
    rateLimitPerMinute: v.optional(v.number()),
    rateLimitPerHour: v.optional(v.number()),
    rateLimitPerDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // DEV MODE: Auth check disabled for development
    // TODO: Uncomment for production:
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }
    // const user = await ctx.db
    //   .query("users")
    //   .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    //   .first();
    // if (!user || user.role !== "admin") {
    //   throw new Error("Admin access required");
    // }

    const { id, ...updates } = args;

    // Update status based on enabled flag
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.enabled === false) {
      updateData.status = "disabled";
    } else if (updates.enabled === true) {
      // Check current status
      const source = await ctx.db.get(id);
      if (source?.status === "disabled") {
        updateData.status = "healthy";
      }
    }

    await ctx.db.patch(id, updateData);
    return { success: true };
  },
});

/**
 * Internal mutation to update source health (used by ingestion)
 */
export const updateHealth = internalMutation({
  args: {
    name: v.string(),
    status: v.union(
      v.literal("healthy"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("disabled")
    ),
    errorCount: v.optional(v.number()),
    lastError: v.optional(v.string()),
    lastErrorAt: v.optional(v.number()),
    lastFetchAt: v.optional(v.number()),
    fetchedCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db
      .query("sources")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!source) {
      return { success: false, error: "Source not found" };
    }

    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.errorCount !== undefined) {
      updates.errorCount = args.errorCount;
    }

    if (args.lastError !== undefined) {
      updates.lastError = args.lastError;
      updates.lastErrorAt = args.lastErrorAt ?? Date.now();
    }

    if (args.lastFetchAt !== undefined) {
      updates.lastFetchAt = args.lastFetchAt;
      updates.nextFetchAt = args.lastFetchAt + source.refreshIntervalMinutes * 60 * 1000;
    }

    if (args.fetchedCount !== undefined) {
      updates.totalFetched = source.totalFetched + args.fetchedCount;
      updates.fetchedToday = source.fetchedToday + args.fetchedCount;
    }

    await ctx.db.patch(source._id, updates);
    return { success: true };
  },
});

/**
 * Reset daily fetch counts (called by cron at midnight)
 */
export const resetDailyCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").take(50);

    for (const source of sources) {
      await ctx.db.patch(source._id, { fetchedToday: 0 });
    }

    return { success: true, count: sources.length };
  },
});

/**
 * Migrate SAM.gov source to use daily quota
 * Run this once to update existing SAM.gov source record
 *
 * TODO: PRODUCTION - Re-enable auth check before deploying to production!
 */
export const migrateSamGovToDaily = mutation({
  args: {},
  handler: async (ctx) => {
    // DEV MODE: Auth check disabled for development
    // TODO: Uncomment for production:
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }

    const samGov = await ctx.db
      .query("sources")
      .withIndex("by_name", (q) => q.eq("name", "sam.gov"))
      .first();

    if (!samGov) {
      return { success: false, error: "SAM.gov source not found" };
    }

    await ctx.db.patch(samGov._id, {
      rateLimitPerMinute: 0, // Not applicable - uses daily quota
      rateLimitPerHour: 0, // Not applicable - uses daily quota
      rateLimitPerDay: 1000, // SAM.gov API daily quota
    });

    return {
      success: true,
      message: "SAM.gov source updated to use daily quota (1000/day)",
    };
  },
});
