"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Parse and ingest RFPMart CSV data
 *
 * CSV format (no header):
 * Column 0: ID (e.g., "SW-82097")
 * Column 1: Country (e.g., "USA")
 * Column 2: State (e.g., "Idaho")
 * Column 3: Title (e.g., "SW-82097 - USA (Idaho) - Data Concealment...")
 * Column 4: Deadline (e.g., "March 25,2026")
 * Column 5: URL (e.g., "https://www.rfpmart.com/...")
 */

interface ParsedRfpMartRow {
  id: string;
  country: string;
  state: string;
  title: string;
  deadline: string;
  url: string;
}

/**
 * Parse CSV content into rows
 * Handles quoted fields with commas inside
 */
function parseCsv(csvContent: string): ParsedRfpMartRow[] {
  const rows: ParsedRfpMartRow[] = [];
  const lines = csvContent.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    // Parse CSV line handling quoted fields
    const fields = parseCSVLine(line);

    if (fields.length >= 6) {
      rows.push({
        id: fields[0].trim(),
        country: fields[1].trim(),
        state: fields[2].trim(),
        title: fields[3].trim(),
        deadline: fields[4].trim(),
        url: fields[5].trim(),
      });
    }
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Push last field
  fields.push(current);

  return fields;
}

/**
 * Parse deadline string like "March 25,2026" to timestamp
 */
function parseDeadline(deadlineStr: string): number {
  // Handle various formats: "March 25,2026", "June 30,2034", etc.
  const cleaned = deadlineStr.replace(",", ", ");

  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  // Fallback: 30 days from now
  return Date.now() + 30 * 24 * 60 * 60 * 1000;
}

/**
 * Extract category from ID prefix (e.g., "SW-82097" -> "Software")
 */
function extractCategory(id: string): string {
  const prefix = id.split("-")[0]?.toUpperCase() || "";

  const categoryMap: Record<string, string> = {
    SW: "Software Development",
    ITES: "IT Services",
    NET: "Networking",
    TELCOM: "Telecommunications",
    HR: "Human Resources",
    PM: "Project Management",
    DRA: "Data & Research",
    CSE: "Security Services",
    TRANSLATION: "Translation Services",
    MRB: "Marketing & Branding",
    EQU: "Equipment",
    EXTRA: "Miscellaneous",
    STAFF: "Staffing",
    ANIM: "Manufacturing",
    WRT: "Writing & Analysis",
    SURG: "Medical Supplies",
  };

  return categoryMap[prefix] || "Other";
}

/**
 * Determine if the RFP category is IT-relevant for Nebula Logix
 */
function isItRelevant(id: string): boolean {
  const prefix = id.split("-")[0]?.toUpperCase() || "";
  const itPrefixes = ["SW", "ITES", "NET", "TELCOM", "DRA", "CSE"];
  return itPrefixes.includes(prefix);
}

/**
 * Normalize CSV row to canonical opportunity schema
 */
function normalizeRow(row: ParsedRfpMartRow) {
  const now = Date.now();
  const dueDate = parseDeadline(row.deadline);
  const category = extractCategory(row.id);

  // Extract city from title if present (e.g., "USA (San Jose, California)")
  let city: string | undefined;
  const cityMatch = row.title.match(/\(([^,]+),\s*[^)]+\)/);
  if (cityMatch) {
    city = cityMatch[1];
  }

  // Clean title - remove the ID and location prefix
  const cleanTitle = row.title
    .replace(/^[A-Z]+-\d+\s*-\s*/, "") // Remove ID prefix
    .replace(/USA\s*\([^)]+\)\s*-\s*/, "") // Remove location prefix
    .trim();

  return {
    externalIds: [
      {
        source: "rfpmart-csv",
        externalId: row.id,
        url: row.url,
        fetchedAt: now,
      },
    ],
    title: cleanTitle || row.title,
    fullDescription: row.title, // CSV doesn't have full description
    buyer: {
      name: "Unknown (via RFPMart CSV)",
      type: "other" as const,
    },
    location: {
      state: row.state,
      city: city,
      isRemoteAllowed: undefined,
    },
    postedDate: now, // CSV doesn't have posted date
    dueDate,
    estimatedValue: undefined,
    contact: undefined,
    categories: [category],
    setAside: undefined,
    attachments: [],
    sourceUrl: row.url,
    evidenceSnippets: [],
    source: "rfpmart-csv",
  };
}

/**
 * Internal action to process CSV data
 */
export const processCSV = internalAction({
  args: {
    csvContent: v.string(),
    filterItOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rows = parseCsv(args.csvContent);
    const errors: string[] = [];

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let evaluatedCount = 0;

    for (const row of rows) {
      try {
        // Optionally filter to IT-relevant RFPs only
        if (args.filterItOnly && !isItRelevant(row.id)) {
          skippedCount++;
          continue;
        }

        const normalized = normalizeRow(row);
        const result = await ctx.runMutation(
          internal.opportunities.upsert,
          normalized
        );

        if (result.action === "inserted") {
          newCount++;
        } else {
          updatedCount++;
        }

        // Auto-evaluate the opportunity for eligibility
        try {
          await ctx.runMutation(internal.eligibilityRules.evaluateOpportunityInternal, {
            opportunityId: result.id,
          });
          evaluatedCount++;
        } catch (evalError) {
          // Don't fail the whole ingest if evaluation fails
          console.error(`Evaluation failed for ${row.id}:`, evalError);
        }
      } catch (error) {
        errors.push(`Failed to process ${row.id}: ${error}`);
      }
    }

    // Update source health
    await ctx.runMutation(internal.sources.updateHealth, {
      name: "rfpmart-csv",
      status: errors.length > 5 ? "warning" : "healthy",
      errorCount: errors.length,
      lastFetchAt: Date.now(),
      fetchedCount: rows.length,
      lastError: errors.length > 0 ? errors[0] : undefined,
    });

    // Log ingestion
    await ctx.runMutation(internal.ingestion.logs.create, {
      source: "rfpmart-csv",
      status: errors.length > 0 ? "partial" : "success",
      fetchedCount: rows.length,
      newCount,
      updatedCount,
      duplicateCount: 0,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });

    return {
      success: true,
      total: rows.length,
      new: newCount,
      updated: updatedCount,
      evaluated: evaluatedCount,
      skipped: skippedCount,
      errors: errors.length,
      errorMessages: errors.slice(0, 5),
    };
  },
});

/**
 * Public action to upload and process CSV
 *
 * TODO: PRODUCTION - Re-enable auth check before deploying to production!
 * Currently allowing unauthenticated uploads for development convenience.
 */
export const uploadCSV = action({
  args: {
    csvContent: v.string(),
    filterItOnly: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    total: number;
    new: number;
    updated: number;
    skipped: number;
    errors: number;
    errorMessages: string[];
  }> => {
    // DEV MODE: Auth check disabled for development
    // TODO: Uncomment for production:
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }

    return await ctx.runAction(internal.ingestion.rfpmartCsv.processCSV, args);
  },
});
