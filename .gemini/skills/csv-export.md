# Skill: CSV Export & Data Export

## Purpose
Export RFP data, evaluations, and pursuit information in various formats for reporting and external analysis.

## Export Types

### 1. RFP List Export

```typescript
interface RfpExportRow {
  id: string;
  externalId: string;
  source: string;
  title: string;
  description: string;
  location: string;
  category: string;
  postedDate: string;
  expiryDate: string;
  daysRemaining: number;
  url: string;
  // Evaluation fields
  score: number | null;
  isFit: boolean | null;
  eligibilityStatus: string | null;
  // Pursuit fields
  pursuitStatus: string | null;
  decision: string | null;
}
```

### 2. Evaluation Details Export

```typescript
interface EvaluationExportRow {
  rfpId: string;
  rfpTitle: string;
  evaluatedAt: string;
  evaluationType: string;
  overallScore: number;
  isFit: boolean;
  eligibilityStatus: string;
  eligibilityDisqualifiers: string;
  // Per-criterion scores
  technicalRelevanceScore: number;
  technicalRelevanceMet: boolean;
  technicalRelevanceKeywords: string;
  scopeFitScore: number;
  scopeFitMet: boolean;
  scopeFitKeywords: string;
  // ... other criteria
  reasoning: string;
}
```

### 3. Pursuit Pipeline Export

```typescript
interface PursuitExportRow {
  rfpId: string;
  rfpTitle: string;
  source: string;
  deadline: string;
  status: string;
  decision: string;
  decisionBy: string;
  decisionDate: string;
  score: number;
  teamMembers: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
}
```

## CSV Generation Service

```typescript
// services/csvExportService.ts

type ExportableData = Record<string, string | number | boolean | null>;

export function generateCsv(
  data: ExportableData[],
  options?: {
    headers?: string[];
    delimiter?: string;
    includeHeaders?: boolean;
  }
): string {
  if (data.length === 0) return "";

  const delimiter = options?.delimiter ?? ",";
  const includeHeaders = options?.includeHeaders ?? true;
  const headers = options?.headers ?? Object.keys(data[0]);

  const rows: string[] = [];

  // Add header row
  if (includeHeaders) {
    rows.push(headers.map(escapeForCsv).join(delimiter));
  }

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return escapeForCsv(formatValue(value));
    });
    rows.push(values.join(delimiter));
  }

  return rows.join("\n");
}

function escapeForCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toString();
  return value;
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

## Convex Export Functions

```typescript
// convex/exports.ts
import { query, action } from "./_generated/server";
import { v } from "convex/values";

// Export RFP list
export const exportRfps = query({
  args: {
    source: v.optional(v.string()),
    showOnlyFit: v.optional(v.boolean()),
    format: v.optional(v.string()), // "csv" | "json"
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("rfps");

    if (args.source) {
      q = q.withIndex("by_source", (q) => q.eq("source", args.source));
    }

    const rfps = await q.collect();

    // Join with evaluations and pursuits
    const exportData = await Promise.all(
      rfps.map(async (rfp) => {
        const evaluation = await ctx.db
          .query("evaluations")
          .withIndex("by_rfp", (q) => q.eq("rfpId", rfp._id))
          .order("desc")
          .first();

        const pursuit = await ctx.db
          .query("pursuits")
          .withIndex("by_rfp", (q) => q.eq("rfpId", rfp._id))
          .first();

        // Apply fit filter
        if (args.showOnlyFit && !evaluation?.isFit) {
          return null;
        }

        return {
          id: rfp._id,
          externalId: rfp.externalId,
          source: rfp.source,
          title: rfp.title,
          description: truncate(rfp.description, 500),
          location: rfp.location,
          category: rfp.category,
          postedDate: formatDate(rfp.postedDate),
          expiryDate: formatDate(rfp.expiryDate),
          daysRemaining: calculateDaysRemaining(rfp.expiryDate),
          url: rfp.url,
          score: evaluation?.score ?? null,
          isFit: evaluation?.isFit ?? null,
          eligibilityStatus: evaluation?.eligibility?.status ?? null,
          pursuitStatus: pursuit?.status ?? null,
          decision: pursuit?.decision ?? null,
        };
      })
    );

    return exportData.filter(Boolean);
  },
});

// Export evaluations with full criterion details
export const exportEvaluations = query({
  args: {
    rfpIds: v.optional(v.array(v.id("rfps"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let evaluations;

    if (args.rfpIds) {
      evaluations = await Promise.all(
        args.rfpIds.map((rfpId) =>
          ctx.db
            .query("evaluations")
            .withIndex("by_rfp", (q) => q.eq("rfpId", rfpId))
            .first()
        )
      );
      evaluations = evaluations.filter(Boolean);
    } else {
      evaluations = await ctx.db.query("evaluations").collect();
    }

    // Date filter
    if (args.startDate || args.endDate) {
      evaluations = evaluations.filter((e) => {
        if (args.startDate && e.evaluatedAt < args.startDate) return false;
        if (args.endDate && e.evaluatedAt > args.endDate) return false;
        return true;
      });
    }

    // Join with RFP data
    return Promise.all(
      evaluations.map(async (eval_) => {
        const rfp = await ctx.db.get(eval_.rfpId);

        // Flatten criteria results
        const criteriaData: Record<string, any> = {};
        for (const result of eval_.criteriaResults) {
          const prefix = result.criterionName.toLowerCase().replace(/\s+/g, "_");
          criteriaData[`${prefix}_score`] = result.score;
          criteriaData[`${prefix}_met`] = result.met;
          criteriaData[`${prefix}_keywords`] = result.matchedKeywords.join("; ");
        }

        return {
          rfpId: eval_.rfpId,
          rfpTitle: rfp?.title ?? "Unknown",
          evaluatedAt: formatDateTime(eval_.evaluatedAt),
          evaluationType: eval_.evaluationType,
          overallScore: eval_.score,
          isFit: eval_.isFit,
          eligibilityStatus: eval_.eligibility.status,
          eligibilityDisqualifiers: eval_.eligibility.disqualifiers.join("; "),
          ...criteriaData,
          reasoning: eval_.reasoning ?? "",
        };
      })
    );
  },
});

// Export pursuit pipeline
export const exportPursuits = query({
  args: {
    status: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("pursuits");

    if (args.status) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }
    if (args.userId) {
      q = q.withIndex("by_user", (q) => q.eq("userId", args.userId));
    }

    const pursuits = await q.collect();

    return Promise.all(
      pursuits.map(async (pursuit) => {
        const rfp = await ctx.db.get(pursuit.rfpId);
        const evaluation = await ctx.db
          .query("evaluations")
          .withIndex("by_rfp", (q) => q.eq("rfpId", pursuit.rfpId))
          .first();

        return {
          rfpId: pursuit.rfpId,
          rfpTitle: rfp?.title ?? "Unknown",
          source: rfp?.source ?? "Unknown",
          deadline: rfp ? formatDate(rfp.expiryDate) : "",
          daysRemaining: rfp ? calculateDaysRemaining(rfp.expiryDate) : null,
          status: pursuit.status,
          decision: pursuit.decision ?? "",
          decisionBy: pursuit.decisionBy ?? "",
          decisionDate: pursuit.decisionAt
            ? formatDate(pursuit.decisionAt)
            : "",
          score: evaluation?.score ?? null,
          teamMembers: pursuit.teamMembers?.join("; ") ?? "",
          createdAt: formatDateTime(pursuit.createdAt),
          updatedAt: formatDateTime(pursuit.updatedAt),
          notes: pursuit.notes ?? "",
        };
      })
    );
  },
});

// Helper functions
function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function calculateDaysRemaining(expiryDate: number): number {
  const now = Date.now();
  const diff = expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
```

## React Export Components

```tsx
// components/ExportButton.tsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { generateCsv, downloadCsv } from "../services/csvExportService";

interface ExportButtonProps {
  exportType: "rfps" | "evaluations" | "pursuits";
  filters?: Record<string, any>;
  filename?: string;
}

export function ExportButton({ exportType, filters, filename }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data;
      switch (exportType) {
        case "rfps":
          data = await convexClient.query(api.exports.exportRfps, filters);
          break;
        case "evaluations":
          data = await convexClient.query(api.exports.exportEvaluations, filters);
          break;
        case "pursuits":
          data = await convexClient.query(api.exports.exportPursuits, filters);
          break;
      }

      const csv = generateCsv(data);
      const defaultFilename = `${exportType}-${formatDateForFilename(new Date())}.csv`;
      downloadCsv(csv, filename ?? defaultFilename);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
    >
      <DownloadIcon className="w-4 h-4" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split("T")[0];
}
```

### Bulk Export Panel

```tsx
// components/BulkExportPanel.tsx
export function BulkExportPanel() {
  const [exportType, setExportType] = useState<"rfps" | "evaluations" | "pursuits">("rfps");
  const [filters, setFilters] = useState({
    source: "",
    showOnlyFit: false,
    status: "",
  });

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Export Data</h2>

      {/* Export Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Export Type</label>
        <select
          value={exportType}
          onChange={(e) => setExportType(e.target.value as any)}
          className="w-full p-2 bg-gray-700 rounded"
        >
          <option value="rfps">RFP List</option>
          <option value="evaluations">Evaluation Details</option>
          <option value="pursuits">Pursuit Pipeline</option>
        </select>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <label className="block text-sm font-medium">Filters</label>

        {exportType === "rfps" && (
          <>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full p-2 bg-gray-700 rounded"
            >
              <option value="">All Sources</option>
              <option value="sam.gov">SAM.gov</option>
              <option value="emma">Maryland eMMA</option>
              <option value="rfpmart">RFPMart</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.showOnlyFit}
                onChange={(e) => setFilters({ ...filters, showOnlyFit: e.target.checked })}
              />
              <span>Show only fit opportunities</span>
            </label>
          </>
        )}

        {exportType === "pursuits" && (
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full p-2 bg-gray-700 rounded"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="triage">Triage</option>
            <option value="bid">Bid</option>
            <option value="capture">Capture</option>
            <option value="submitted">Submitted</option>
          </select>
        )}
      </div>

      {/* Export Button */}
      <ExportButton
        exportType={exportType}
        filters={filters}
      />

      {/* Format Options */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          Exports include all visible columns. Dates are in ISO 8601 format.
          Boolean values are exported as "Yes" or "No".
        </p>
      </div>
    </div>
  );
}
```

## JSON Export Alternative

```typescript
export function downloadJson(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// For Excel compatibility, use xlsx library
export async function downloadExcel(data: any[], filename: string): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
}
```

## Integration with Selection Controls

```tsx
// components/SelectionControls.tsx
export function SelectionControls({
  selectedIds,
  onSelectAll,
  onDeselectAll,
}: SelectionControlsProps) {
  const handleExportSelected = async () => {
    const data = await convexClient.query(api.exports.exportRfps, {
      rfpIds: selectedIds,
    });
    const csv = generateCsv(data);
    downloadCsv(csv, `selected-rfps-${formatDate(new Date())}.csv`);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded">
      <span className="text-sm">{selectedIds.length} selected</span>

      <button onClick={onSelectAll}>Select All</button>
      <button onClick={onDeselectAll}>Deselect All</button>

      <button
        onClick={handleExportSelected}
        disabled={selectedIds.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Export Selected
      </button>
    </div>
  );
}
```
