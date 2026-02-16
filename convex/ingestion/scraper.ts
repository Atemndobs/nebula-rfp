"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { scrapeRfpMartDetailPage, type ScrapedRfpDetail } from "./rfpmartScraper";

/**
 * Public action - Scrape RFP detail directly from public page
 */
export const scrapeRfpDetail = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args): Promise<ScrapedRfpDetail> => {
    try {
      return await scrapeRfpMartDetailPage(args.url);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to scrape RFP detail: ${errorMsg}`);
    }
  },
});

/**
 * Internal action for batch scraping (used by ingestion cron)
 */
export const batchScrapeDetails = internalAction({
  args: {
    urls: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const results: { url: string; success: boolean; data?: ScrapedRfpDetail; error?: string }[] = [];

    for (const url of args.urls) {
      try {
        const detail = await scrapeRfpMartDetailPage(url);
        results.push({ url, success: true, data: detail });

        // Rate limiting - wait between requests to be polite
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ url, success: false, error: errorMsg });
      }
    }

    return {
      total: args.urls.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});
