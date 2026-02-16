import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { requireActionAdmin } from "../lib/auth";

/**
 * Backfill full descriptions for existing SAM.gov opportunities
 *
 * This action re-fetches opportunities from SAM.gov API to get their description URLs,
 * then fetches the full description text for each one.
 *
 * Use cases:
 * - Backfill opportunities ingested before description URL fetching was implemented
 * - Retry opportunities where description fetch previously failed (needsDetailFetch: true)
 * - Update opportunities with empty descriptions
 */
export const backfillDescriptions = internalAction({
  args: {
    batchSize: v.optional(v.number()), // Number of opportunities to process per invocation
    onlyFlagged: v.optional(v.boolean()), // Only process opportunities with needsDetailFetch: true
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    processed: number;
    updated: number;
    failed: number;
    skipped: number;
    hasMore?: boolean;
    remainingCount?: number;
  }> => {
    const batchSize = args.batchSize ?? 10;
    const onlyFlagged = args.onlyFlagged ?? false;

    console.log("=== SAM.gov Description Backfill ===");
    console.log(`Batch size: ${batchSize}`);
    console.log(`Only flagged: ${onlyFlagged}`);

    // Get SAM.gov API key from environment
    const apiKey = process.env.SAM_GOV_API_KEY;
    if (!apiKey) {
      throw new Error("SAM_GOV_API_KEY not configured");
    }

    // Query opportunities that need descriptions
    // Note: We'll query all SAM.gov opportunities and filter in memory for now
    const opportunities: any[] = await ctx.runQuery(internal.opportunities.listBySource, {
      source: "sam.gov",
      limit: 500, // Get a large batch to filter from
    });

    if (!opportunities || opportunities.length === 0) {
      console.log("No SAM.gov opportunities found");
      return {
        success: true,
        processed: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
      };
    }

    // Filter opportunities that need backfill
    const needsBackfill = opportunities.filter((opp) => {
      // If onlyFlagged, only process flagged opportunities
      if (onlyFlagged && !(opp as any).needsDetailFetch) {
        return false;
      }

      // Process if description is empty or very short (likely a URL that wasn't fetched)
      const hasEmptyDescription = !opp.fullDescription || opp.fullDescription.trim().length < 50;

      // Or if flagged for detail fetch
      const isFlagged = (opp as any).needsDetailFetch === true;

      return hasEmptyDescription || isFlagged;
    });

    console.log(`Found ${needsBackfill.length} opportunities needing backfill (out of ${opportunities.length} total)`);

    // Limit to batch size
    const toProcess = needsBackfill.slice(0, batchSize);
    console.log(`Processing ${toProcess.length} opportunities in this batch`);

    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const opp of toProcess) {
      try {
        // Extract noticeId from externalIds
        const samGovExternalId = opp.externalIds?.find((ext: any) => ext.source === "sam.gov");
        if (!samGovExternalId) {
          console.warn(`Opportunity ${opp._id} has no SAM.gov external ID`);
          skipped++;
          continue;
        }

        const noticeId = samGovExternalId.externalId;

        // Fetch this specific opportunity from SAM.gov API to get description URL
        const searchUrl = new URL("https://api.sam.gov/opportunities/v2/search");
        searchUrl.searchParams.append("api_key", apiKey);
        searchUrl.searchParams.append("noticeid", noticeId);
        searchUrl.searchParams.append("limit", "1");

        console.log(`Fetching noticeId ${noticeId} from SAM.gov API...`);

        const response = await fetch(searchUrl.toString());

        if (!response.ok) {
          console.warn(`Failed to fetch noticeId ${noticeId}: ${response.status}`);
          failed++;
          continue;
        }

        const data: any = await response.json();

        if (!data.opportunitiesData || data.opportunitiesData.length === 0) {
          console.warn(`No opportunity found for noticeId ${noticeId}`);
          skipped++;
          continue;
        }

        const oppData = data.opportunitiesData[0];

        // Check if description field exists and looks like a URL
        if (!oppData.description || !oppData.description.startsWith('http')) {
          console.log(`Opportunity ${noticeId} has no description URL (inline text or empty)`);
          skipped++;
          continue;
        }

        // Fetch the full description text
        const descriptionUrl = oppData.description.includes('?')
          ? `${oppData.description}&api_key=${apiKey}`
          : `${oppData.description}?api_key=${apiKey}`;

        console.log(`Fetching description from URL for ${noticeId}...`);

        const descResponse = await fetch(descriptionUrl);

        if (!descResponse.ok) {
          console.warn(`Failed to fetch description for ${noticeId}: ${descResponse.status}`);
          // Update opportunity to mark it as needing detail fetch
          await ctx.runMutation(internal.opportunities.update, {
            id: opp._id,
            fullDescription: opp.fullDescription, // Keep existing
            needsDetailFetch: true,
            lastUpdatedAt: Date.now(),
          });
          failed++;
          continue;
        }

        const descriptionText = await descResponse.text();

        if (!descriptionText || descriptionText.trim().length < 10) {
          console.warn(`Description text too short for ${noticeId}`);
          failed++;
          continue;
        }

        // Update the opportunity with full description
        await ctx.runMutation(internal.opportunities.update, {
          id: opp._id,
          fullDescription: descriptionText.trim(),
          needsDetailFetch: false, // Clear the flag
          lastUpdatedAt: Date.now(),
        });

        console.log(`✓ Updated ${noticeId} with full description (${descriptionText.length} chars)`);
        updated++;

        // Rate limit: 100ms delay between fetches
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing opportunity ${opp._id}:`, error);
        failed++;
      }
    }

    const hasMore = needsBackfill.length > batchSize;

    console.log("=== Backfill Complete ===");
    console.log(`Processed: ${toProcess.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Has more: ${hasMore}`);
    console.log("========================");

    return {
      success: true,
      processed: toProcess.length,
      updated,
      failed,
      skipped,
      hasMore,
      remainingCount: Math.max(0, needsBackfill.length - batchSize),
    };
  },
});

/**
 * Public action to trigger backfill from UI
 */
export const triggerBackfill = action({
  args: {
    batchSize: v.optional(v.number()),
    onlyFlagged: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    processed: number;
    updated: number;
    failed: number;
    skipped: number;
    hasMore?: boolean;
    remainingCount?: number;
  }> => {
    await requireActionAdmin(ctx);

    return await ctx.runAction(internal.ingestion.samGovBackfill.backfillDescriptions, args);
  },
});
