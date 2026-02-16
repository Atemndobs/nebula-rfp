"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * RFPMart CSV Enrichment
 *
 * Fetches full descriptions for CSV-imported opportunities that only have
 * titles (no descriptions). Uses the scraper to fetch content from URLs.
 */

interface ScrapedRfpDetail {
    id: string;
    title: string;
    description: string;
    scope_of_service?: string;
    posted_date?: string;
    expiry_date?: string;
    question_deadline?: string;
    location?: string;
    budget?: string;
    eligibility?: string;
    work_performance?: string;
    category?: string;
    country?: string;
    state?: string;
    url: string;
}

/**
 * Clean HTML tags from text
 */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Extract field value from RFPMart page structure
 */
function extractField(html: string, fieldName: string): string {
    const patterns = [
        new RegExp(`<strong>${fieldName}[:\\s]*</strong>\\s*([^<]+)`, "i"),
        new RegExp(`${fieldName}[:\\s]*</strong>\\s*([^<]+)`, "i"),
        new RegExp(`${fieldName}[:\\s]*</[^>]+>\\s*([^<]+)`, "i"),
        new RegExp(`>${fieldName}[:\\s]*<[^>]*>([^<]+)`, "i"),
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            return stripHtml(match[1]).trim();
        }
    }
    return "";
}

/**
 * Core scraping logic for RFPMart pages
 */
async function scrapePageContent(url: string): Promise<ScrapedRfpDetail> {
    if (!url) {
        throw new Error("URL is required");
    }

    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RFPDiscovery/1.0)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Extract ID from URL
    const idMatch = url.match(/\/(\d+)-[^/]+\.html$/);
    const id = idMatch ? idMatch[1] : url;

    // Extract title from <title> tag or <h1>
    let title = "";
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
        title = stripHtml(titleMatch[1]).replace(/ - RFPMart.*$/i, "").trim();
    }
    if (!title) {
        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match) {
            title = stripHtml(h1Match[1]);
        }
    }

    // Extract description - usually in main content area
    let description = "";

    const descPatterns = [
        /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
        /<p[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
    ];

    for (const pattern of descPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            description = stripHtml(match[1]);
            if (description.length > 50) break;
        }
    }

    // If no description found, try to get first substantial paragraph
    if (!description || description.length < 50) {
        const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
        for (const p of paragraphs) {
            const text = stripHtml(p);
            if (text.length > 100 && !text.includes("cookie") && !text.includes("privacy")) {
                description = text;
                break;
            }
        }
    }

    // Extract various fields
    const postedDate =
        extractField(html, "Posted Date") ||
        extractField(html, "Post Date") ||
        extractField(html, "Published");

    const expiryDate =
        extractField(html, "Expiry Date") ||
        extractField(html, "Due Date") ||
        extractField(html, "Deadline") ||
        "";

    const location =
        extractField(html, "Location") ||
        extractField(html, "Place of Performance") ||
        extractField(html, "State");

    const budget =
        extractField(html, "Budget") ||
        extractField(html, "Estimated Value") ||
        extractField(html, "Contract Value");

    const eligibility =
        extractField(html, "Eligibility") ||
        extractField(html, "Set-Aside") ||
        extractField(html, "Business Type");

    const category =
        extractField(html, "Category") || extractField(html, "Type") || extractField(html, "NAICS");

    const scopeOfService =
        extractField(html, "Scope of Service") ||
        extractField(html, "Scope of Work") ||
        extractField(html, "Requirements");

    return {
        id,
        title: title || "Title not available",
        description: description || "No description available",
        scope_of_service: scopeOfService || undefined,
        posted_date: postedDate || undefined,
        expiry_date: expiryDate || undefined,
        location: location || undefined,
        budget: budget || undefined,
        eligibility: eligibility || undefined,
        category: category || undefined,
        url,
    };
}

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
                const scraped = await scrapePageContent(sourceUrl);

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
