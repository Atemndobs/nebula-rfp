"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { scrapeRfpMartDetailPage } from "./rfpmartScraper";

/**
 * RFPMart CSV Enrichment
 *
 * Fetches full descriptions for CSV-imported opportunities that only have
 * titles (no descriptions). Uses the shared RFPMart scraper.
 */

/**
 * Enrich pending RFPMart CSV opportunities with full descriptions
 */
export const enrichPending = internalAction({
    args: {
        batchSize: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<{ processed: number; success: number; failed: number }> => {
        const batchSize = args.batchSize ?? 10;

        // Get opportunities that need enrichment (query is in separate file due to Node.js constraint)
        const pending: Array<{
            _id: any;
            externalIds: Array<{ url: string }>;
            sourceUrl: string;
            title: string;
            fullDescription: string;
        }> = await ctx.runQuery(internal.ingestion.rfpmartEnrichQueries.getPendingEnrichment, {
            limit: batchSize,
        });

        if (pending.length === 0) {
            console.log("No RFPMart CSV opportunities pending enrichment");
            return { processed: 0, success: 0, failed: 0 };
        }

        console.log(`Enriching ${pending.length} RFPMart CSV opportunities...`);

        let success = 0;
        let failed = 0;

        for (const opp of pending) {
            try {
                // Get the source URL from externalIds
                const sourceUrl = opp.externalIds[0]?.url || opp.sourceUrl;

                if (!sourceUrl) {
                    console.error(`No URL found for opportunity ${opp._id}`);
                    failed++;
                    continue;
                }

                console.log(`Scraping: ${sourceUrl}`);
                const scraped = await scrapeRfpMartDetailPage(sourceUrl);

                // Update the opportunity with enriched data
                await ctx.runMutation(internal.opportunities.update, {
                    id: opp._id,
                    fullDescription: scraped.description !== "No description available"
                        ? scraped.description
                        : (scraped.scope_of_service || opp.fullDescription),
                    needsDetailFetch: false, // Clear the flag
                    lastUpdatedAt: Date.now(),
                });

                success++;
                console.log(`✓ Enriched: ${opp.title.substring(0, 50)}...`);

                // Rate limiting - 1 second between requests
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`Failed to enrich ${opp._id}: ${errorMsg}`);
                failed++;
            }
        }

        console.log(`Enrichment complete: ${success} success, ${failed} failed`);

        return {
            processed: pending.length,
            success,
            failed,
        };
    },
});
