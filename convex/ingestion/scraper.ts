"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * RFP Detail Scraper - Direct page scraping without external API
 *
 * This scrapes public RFPMart pages directly, avoiding the need for
 * the external crawler service that was returning 502 errors.
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
  // RFPMart pages often have structure like: <strong>Field Name:</strong> Value
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
 * Parse deadline from title string (e.g., "Deadline June 19,2025")
 */
function parseDeadlineFromTitle(title: string): string | null {
  const match = title.match(/Deadline\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  if (match && match[1]) {
    try {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Ignore parse errors
    }
  }
  return null;
}

/**
 * Core scraping logic - shared between actions
 */
async function scrapePageContent(url: string): Promise<ScrapedRfpDetail> {
  if (!url) {
    throw new Error("URL is required");
  }

  // Fetch the page directly (works from server-side, no CORS issues)
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

  // Try to find description in structured data
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
    parseDeadlineFromTitle(title) ||
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

  const workPerformance =
    extractField(html, "Work Performance") ||
    extractField(html, "Period of Performance") ||
    extractField(html, "Duration");

  const questionDeadline =
    extractField(html, "Question Deadline") || extractField(html, "Questions Due");

  // Determine country/state from location
  let country = "";
  let state = "";
  if (location) {
    if (location.includes("USA") || location.includes("United States")) {
      country = "USA";
    }
    // Extract state abbreviation or name
    const stateMatch =
      location.match(/\b([A-Z]{2})\b/) ||
      location.match(
        /(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)/i
      );
    if (stateMatch) {
      state = stateMatch[1];
    }
  }

  return {
    id,
    title: title || "Title not available",
    description: description || "No description available",
    scope_of_service: scopeOfService || undefined,
    posted_date: postedDate || undefined,
    expiry_date: expiryDate || undefined,
    question_deadline: questionDeadline || undefined,
    location: location || undefined,
    budget: budget || undefined,
    eligibility: eligibility || undefined,
    work_performance: workPerformance || undefined,
    category: category || undefined,
    country: country || undefined,
    state: state || undefined,
    url,
  };
}

/**
 * Public action - Scrape RFP detail directly from public page
 */
export const scrapeRfpDetail = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args): Promise<ScrapedRfpDetail> => {
    try {
      return await scrapePageContent(args.url);
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
        const detail = await scrapePageContent(url);
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
