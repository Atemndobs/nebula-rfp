import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get opportunities pending enrichment
 * Separated from rfpmartEnrich.ts because queries can't be in Node.js files
 */
export const getPendingEnrichment = internalQuery({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 10;

        // Query opportunities that need detail fetch from rfpmart-csv source
        const opportunities = await ctx.db
            .query("opportunities")
            .withIndex("by_needs_detail_fetch", (q) =>
                q.eq("needsDetailFetch", true).eq("source", "rfpmart-csv")
            )
            .take(limit);

        return opportunities;
    },
});
