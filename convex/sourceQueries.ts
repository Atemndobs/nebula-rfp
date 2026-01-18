import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List queries for a source
 */
export const listBySource = query({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sourceQueries")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .take(50);
  },
});

/**
 * Create a new source query
 */
export const create = mutation({
  args: {
    sourceId: v.id("sources"),
    name: v.string(),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
    naicsCodes: v.optional(v.array(v.string())),
    states: v.optional(v.array(v.string())),
    setAsideTypes: v.optional(v.array(v.string())),
    postedWithinDays: v.optional(v.number()),
    deadlineAfterDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify source exists
    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    return await ctx.db.insert("sourceQueries", args);
  },
});

/**
 * Update a source query
 */
export const update = mutation({
  args: {
    id: v.id("sourceQueries"),
    name: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    keywords: v.optional(v.array(v.string())),
    naicsCodes: v.optional(v.array(v.string())),
    states: v.optional(v.array(v.string())),
    setAsideTypes: v.optional(v.array(v.string())),
    postedWithinDays: v.optional(v.number()),
    deadlineAfterDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const { id, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, cleanUpdates);
    return { success: true };
  },
});

/**
 * Delete a source query
 */
export const remove = mutation({
  args: { id: v.id("sourceQueries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Initialize default queries for a source
 */
export const initializeDefaults = mutation({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if queries already exist for this source
    const existing = await ctx.db
      .query("sourceQueries")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .take(1);

    if (existing.length > 0) {
      return { message: "Queries already exist for this source" };
    }

    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    // Default queries for IT services
    const defaultQueries = [
      {
        sourceId: args.sourceId,
        name: "Software Development",
        enabled: true,
        keywords: [
          "software development",
          "application development",
          "web development",
          "mobile development",
          "custom software",
        ],
        naicsCodes: ["541511", "541512"],
        postedWithinDays: 30,
        deadlineAfterDays: 5,
      },
      {
        sourceId: args.sourceId,
        name: "Cloud & DevOps",
        enabled: true,
        keywords: [
          "cloud migration",
          "AWS",
          "Azure",
          "DevOps",
          "infrastructure",
          "cloud services",
        ],
        naicsCodes: ["541512", "518210"],
        postedWithinDays: 30,
        deadlineAfterDays: 5,
      },
      {
        sourceId: args.sourceId,
        name: "Data & Analytics",
        enabled: true,
        keywords: [
          "data analytics",
          "business intelligence",
          "data engineering",
          "machine learning",
          "AI",
          "artificial intelligence",
        ],
        naicsCodes: ["541511", "541519"],
        postedWithinDays: 30,
        deadlineAfterDays: 5,
      },
      {
        sourceId: args.sourceId,
        name: "IT Consulting",
        enabled: true,
        keywords: [
          "IT consulting",
          "technology consulting",
          "systems integration",
          "IT modernization",
        ],
        naicsCodes: ["541512", "541611"],
        postedWithinDays: 30,
        deadlineAfterDays: 5,
      },
    ];

    for (const query of defaultQueries) {
      await ctx.db.insert("sourceQueries", query);
    }

    return { message: "Default queries initialized", count: defaultQueries.length };
  },
});
