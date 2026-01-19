import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * List opportunities with optional filters
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    source: v.optional(v.string()),
    cursor: v.optional(v.id("opportunities")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let q = ctx.db.query("opportunities").order("desc");

    if (args.source) {
      q = ctx.db
        .query("opportunities")
        .withIndex("by_source", (q) => q.eq("source", args.source!))
        .order("desc");
    }

    if (args.cursor) {
      const cursorDoc = await ctx.db.get(args.cursor);
      if (cursorDoc) {
        q = q.filter((q) =>
          q.lt(q.field("_creationTime"), cursorDoc._creationTime)
        );
      }
    }

    const items = await q.take(limit + 1);
    const hasMore = items.length > limit;

    return {
      items: items.slice(0, limit),
      nextCursor: hasMore ? items[limit - 1]._id : null,
    };
  },
});

/**
 * Get a single opportunity by ID
 */
export const getById = query({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Search opportunities by title
 */
export const search = query({
  args: {
    searchTerm: v.string(),
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("opportunities")
      .withSearchIndex("search_title", (q) => {
        let sq = q.search("title", args.searchTerm);
        if (args.source) {
          sq = sq.eq("source", args.source);
        }
        return sq;
      });

    return await q.take(args.limit ?? 20);
  },
});

/**
 * Get opportunities by due date range
 */
export const getByDueDate = query({
  args: {
    from: v.number(),
    to: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_due_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("dueDate"), args.from),
          q.lte(q.field("dueDate"), args.to)
        )
      )
      .take(args.limit ?? 50);
  },
});

/**
 * Get opportunity statistics
 * BANDWIDTH OPTIMIZED: Reduced sample size and uses indexed queries where possible
 */
export const getStats = query({
  args: { sampleSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Use a smaller sample size - 200 is enough for stats on most datasets
    // For accurate counts, use an aggregation table (see statsAggregation table)
    const sampleSize = args.sampleSize ?? 200;
    const allOpportunities = await ctx.db.query("opportunities").take(sampleSize);

    const now = Date.now();
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const stats = {
      total: allOpportunities.length,
      bySource: {} as Record<string, number>,
      dueSoon: 0, // Due within 7 days
      expired: 0,
      isSampled: allOpportunities.length === sampleSize, // Indicates if stats are from a sample
    };

    for (const opp of allOpportunities) {
      // Count by source
      stats.bySource[opp.source] = (stats.bySource[opp.source] || 0) + 1;

      // Count due soon
      if (opp.dueDate > now && opp.dueDate < oneWeekFromNow) {
        stats.dueSoon++;
      }

      // Count expired
      if (opp.dueDate < now) {
        stats.expired++;
      }
    }

    return stats;
  },
});

/**
 * Internal mutation to upsert an opportunity (used by ingestion)
 * Handles deduplication by checking externalIds
 */
export const upsert = internalMutation({
  args: {
    externalIds: v.array(
      v.object({
        source: v.string(),
        externalId: v.string(),
        url: v.string(),
        fetchedAt: v.number(),
      })
    ),
    title: v.string(),
    fullDescription: v.string(),
    buyer: v.object({
      name: v.string(),
      type: v.union(
        v.literal("federal"),
        v.literal("state"),
        v.literal("local"),
        v.literal("other")
      ),
    }),
    location: v.object({
      state: v.optional(v.string()),
      city: v.optional(v.string()),
      isRemoteAllowed: v.optional(v.boolean()),
    }),
    postedDate: v.number(),
    dueDate: v.number(),
    dueTime: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    valueRange: v.optional(
      v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number()),
      })
    ),
    contractType: v.optional(v.string()),
    contact: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
    categories: v.array(v.string()),
    setAside: v.optional(v.string()),
    attachments: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        type: v.optional(v.string()),
        size: v.optional(v.number()),
      })
    ),
    sourceUrl: v.string(),
    evidenceSnippets: v.array(v.string()),
    source: v.string(),
    needsDetailFetch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // BANDWIDTH OPTIMIZED: Build a set of external IDs to search for
    const searchIds = new Set(args.externalIds.map(ref => `${ref.source}:${ref.externalId}`));

    // Check for existing opportunity with same external ID
    // Reduced batch size from 500 to 100 - most dedup happens within recent records
    const existingOpportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .order("desc") // Most recent first - more likely to find duplicates
      .take(100);

    // Find if any existing opportunity has matching external ID
    let existingId: typeof existingOpportunities[0]["_id"] | null = null;

    for (const existing of existingOpportunities) {
      for (const existingRef of existing.externalIds) {
        const key = `${existingRef.source}:${existingRef.externalId}`;
        if (searchIds.has(key)) {
          existingId = existing._id;
          break;
        }
      }
      if (existingId) break;
    }

    if (existingId) {
      // Update existing opportunity
      await ctx.db.patch(existingId, {
        ...args,
        lastUpdatedAt: now,
      });
      return { id: existingId, action: "updated" as const };
    }

    // Insert new opportunity
    const id = await ctx.db.insert("opportunities", {
      ...args,
      ingestedAt: now,
      lastUpdatedAt: now,
    });

    return { id, action: "inserted" as const };
  },
});

/**
 * List opportunities with their evaluations
 * Returns opportunities with eligibility status from the admin-configured rules
 * BANDWIDTH OPTIMIZED: Uses indexed lookups instead of loading all evaluations
 */
export const listWithEvaluations = query({
  args: {
    limit: v.optional(v.number()),
    onlyEligible: v.optional(v.boolean()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get opportunities - use exact limit needed, not 2x
    let opportunities;
    if (args.source) {
      opportunities = await ctx.db
        .query("opportunities")
        .withIndex("by_source", (q) => q.eq("source", args.source!))
        .order("desc")
        .take(limit + 10); // Small buffer for filtering
    } else {
      opportunities = await ctx.db
        .query("opportunities")
        .order("desc")
        .take(limit + 10);
    }

    // BANDWIDTH OPTIMIZED: Fetch evaluations only for the opportunities we have
    // using indexed lookups instead of loading all evaluations
    const evaluationPromises = opportunities.map(opp =>
      ctx.db
        .query("evaluations")
        .withIndex("by_opportunity", (q) => q.eq("opportunityId", opp._id))
        .first()
    );
    const evaluations = await Promise.all(evaluationPromises);

    // Create a map from the results
    const evalMap = new Map(
      evaluations
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .map(e => [e.opportunityId, e])
    );

    // Join opportunities with evaluations (using eligibility rules results)
    const results = opportunities.map(opp => {
      const evaluation = evalMap.get(opp._id);
      return {
        ...opp,
        evaluation: evaluation ? {
          eligibilityStatus: evaluation.eligibility.status,
          reasons: evaluation.eligibility.reasons,
          evidenceSnippets: evaluation.eligibility.evidenceSnippets,
          rulesVersion: evaluation.eligibility.rulesVersion,
          evaluatedAt: evaluation.evaluatedAt,
          // Map eligibility status to fit score for frontend compatibility
          isGoodFit: evaluation.eligibility.status === "ELIGIBLE",
          totalScore: evaluation.eligibility.status === "ELIGIBLE" ? 3 :
            evaluation.eligibility.status === "PARTNER_REQUIRED" ? 2 : 1,
          maxScore: 3,
        } : null,
      };
    });

    // Filter to eligible only if requested
    let filtered = results;
    if (args.onlyEligible) {
      filtered = results.filter(r =>
        r.evaluation?.eligibilityStatus === "ELIGIBLE" ||
        r.evaluation?.eligibilityStatus === "PARTNER_REQUIRED"
      );
    }

    return {
      items: filtered.slice(0, limit),
      total: filtered.length,
      evaluated: results.filter(r => r.evaluation).length,
      unevaluated: results.filter(r => !r.evaluation).length,
    };
  },
});

/**
 * DEBUG: Inspect SAM.gov records to see what fields we actually have
 */
export const debugSamGovRecords = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const samRecords = await ctx.db
      .query("opportunities")
      .withIndex("by_source", (q) => q.eq("source", "sam.gov"))
      .take(args.limit ?? 5);

    return samRecords.map((record) => ({
      id: record._id,
      title: record.title,
      hasDescription: !!record.fullDescription,
      descriptionLength: record.fullDescription?.length ?? 0,
      descriptionPreview: record.fullDescription?.substring(0, 200) || "No description",
      source: record.source,
      externalIds: record.externalIds,
      categories: record.categories,
      buyer: record.buyer,
      hasContact: !!record.contact,
      contact: record.contact,
      evidenceSnippets: record.evidenceSnippets,
      attachments: record.attachments.length,
      createdAt: record._creationTime,
    }));
  },
});

/**
 * Export SAM.gov records in batches (bandwidth optimized)
 * Use cursor-based pagination to avoid loading all at once
 */
export const exportSamGovRecords = query({
  args: {
    cursor: v.optional(v.id("opportunities")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50; // Small batches

    let q = ctx.db
      .query("opportunities")
      .withIndex("by_source", (q) => q.eq("source", "sam.gov"))
      .order("desc");

    // Apply cursor if provided
    if (args.cursor) {
      const cursorDoc = await ctx.db.get(args.cursor);
      if (cursorDoc) {
        q = q.filter((q) => q.lt(q.field("_creationTime"), cursorDoc._creationTime));
      }
    }

    const samRecords = await q.take(limit + 1);
    const hasMore = samRecords.length > limit;
    const items = samRecords.slice(0, limit);

    return {
      records: items.map((record) => ({
        // IDs
        internalId: record._id,
        externalId: record.externalIds[0]?.externalId || "",
        samGovUrl: record.externalIds[0]?.url || "",

        // Core fields
        title: record.title,
        fullDescription: record.fullDescription,

        // Buyer info
        buyerName: record.buyer.name,
        buyerType: record.buyer.type,

        // Location
        state: record.location.state || "",
        city: record.location.city || "",
        isRemoteAllowed: record.location.isRemoteAllowed ? "Yes" : "No",

        // Dates & Value
        postedDate: new Date(record.postedDate).toISOString(),
        dueDate: new Date(record.dueDate).toISOString(),
        estimatedValue: record.estimatedValue || 0,

        // Classification
        categories: record.categories.join("; "),
        contractType: record.contractType || "",
        setAside: record.setAside || "",

        // Contact
        contactName: record.contact?.name || "",
        contactEmail: record.contact?.email || "",
        contactPhone: record.contact?.phone || "",

        // Additional data
        evidenceSnippets: record.evidenceSnippets.join(" | "),
        attachmentCount: record.attachments.length,
        attachmentUrls: record.attachments.map(a => a.url).join("; "),

        // Metadata
        sourceUrl: record.sourceUrl,
        source: record.source,
        createdAt: new Date(record._creationTime).toISOString(),
        lastUpdatedAt: record.lastUpdatedAt ? new Date(record.lastUpdatedAt).toISOString() : "",
      })),
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]._id : null,
      total: items.length,
    };
  },
});

/**
 * Delete all SAM.gov records (admin only)
 * IMPORTANT: This is destructive - use with caution
 *
 * TODO: PRODUCTION - Re-enable auth check before deploying to production!
 */
export const deleteAllSamGovRecords = mutation({
  args: {
    confirm: v.boolean(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Auth check - REQUIRED for production
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Safety confirmation
    if (!args.confirm) {
      throw new Error("Must set confirm: true to delete records");
    }

    // Delete in batches to avoid timeout
    const batchSize = args.batchSize ?? 100;
    const samRecords = await ctx.db
      .query("opportunities")
      .withIndex("by_source", (q) => q.eq("source", "sam.gov"))
      .take(batchSize);

    let deletedCount = 0;
    for (const record of samRecords) {
      await ctx.db.delete(record._id);
      deletedCount++;
    }

    const hasMore = samRecords.length === batchSize;

    return {
      success: true,
      deleted: deletedCount,
      hasMore,
      message: hasMore
        ? `Deleted ${deletedCount} records. Run again to delete more.`
        : `Deleted ${deletedCount} records. All SAM.gov records removed.`,
    };
  },
});

/**
 * Delete all RFPMart CSV records (admin only)
 * IMPORTANT: This is destructive - use with caution
 */
export const deleteAllRfpMartCsvRecords = mutation({
  args: {
    confirm: v.boolean(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Auth check - REQUIRED for production
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Safety confirmation
    if (!args.confirm) {
      throw new Error("Must set confirm: true to delete records");
    }

    // Delete in batches to avoid timeout
    const batchSize = args.batchSize ?? 100;
    const records = await ctx.db
      .query("opportunities")
      .withIndex("by_source", (q) => q.eq("source", "rfpmart-csv"))
      .take(batchSize);

    let deletedCount = 0;
    for (const record of records) {
      // Also delete associated evaluations
      const evaluation = await ctx.db
        .query("evaluations")
        .withIndex("by_opportunity", (q) => q.eq("opportunityId", record._id))
        .first();
      if (evaluation) {
        await ctx.db.delete(evaluation._id);
      }

      await ctx.db.delete(record._id);
      deletedCount++;
    }

    const hasMore = records.length === batchSize;

    return {
      success: true,
      deleted: deletedCount,
      hasMore,
      message: hasMore
        ? `Deleted ${deletedCount} records. Run again to delete more.`
        : `Deleted ${deletedCount} records. All RFPMart CSV records removed.`,
    };
  },
});

/**
 * Delete an opportunity (admin only)
 */
export const remove = mutation({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Internal query to list opportunities by source (for backfill operations)
 */
export const listBySource = internalQuery({
  args: {
    source: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 500;

    return await ctx.db
      .query("opportunities")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .take(limit);
  },
});

/**
 * Internal mutation to update opportunity fields (for backfill operations)
 */
export const update = internalMutation({
  args: {
    id: v.id("opportunities"),
    fullDescription: v.optional(v.string()),
    needsDetailFetch: v.optional(v.boolean()),
    lastUpdatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, updates);

    return { success: true };
  },
});
