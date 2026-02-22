"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { scrapeRfpMartDetailPage, type ScrapedRfpDetail } from "./rfpmartScraper";

/**
 * Public action - Scrape RFP detail directly from public page
 */
export const scrapeRfpDetail = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<ScrapedRfpDetail> => {
    const sourceRecord = await ctx.runQuery(internal.sources.getByNameInternal, {
      name: "rfpmart",
    });

    if (sourceRecord && !sourceRecord.enabled) {
      throw new Error("Live RFPMart search is disabled in source settings.");
    }

    let hostname = "";
    try {
      hostname = new URL(args.url).hostname.toLowerCase();
    } catch {
      // Keep empty and fail validation below.
    }

    if (!hostname.includes("rfpmart.com")) {
      throw new Error("Scraper only supports RFPMart URLs.");
    }

    try {
      return await scrapeRfpMartDetailPage(args.url);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to scrape RFP detail: ${errorMsg}`);
    }
  },
});
