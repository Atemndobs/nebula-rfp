import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useRef } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface Source {
  _id: Id<"sources">;
  name: string;
  displayName: string;
  enabled: boolean;
  refreshIntervalMinutes: number;
  lastFetchAt?: number;
  nextFetchAt?: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  rateLimitPerDay?: number; // For sources with daily quotas (e.g., SAM.gov)
  status: "healthy" | "warning" | "error" | "disabled";
  errorCount: number;
  lastError?: string;
  lastErrorAt?: number;
  totalFetched: number;
  fetchedToday: number;
}

export function SourcesAdmin() {
  const sources = useQuery(api.sources.list);
  const healthSummary = useQuery(api.sources.getHealthSummary);
  const initializeDefaults = useMutation(api.sources.initializeDefaults);
  const evaluateAllPending = useMutation(api.eligibilityRules.evaluateAllPending);
  const migrateSamGov = useMutation(api.sources.migrateSamGovToDaily);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await initializeDefaults();
    } catch (error) {
      console.error("Failed to initialize sources:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleEvaluateAll = async () => {
    setIsEvaluating(true);
    setEvalResult(null);
    try {
      const result = await evaluateAllPending({ limit: 100 });
      setEvalResult(`Evaluated ${result.evaluated} of ${result.total} opportunities.`);
    } catch (error) {
      setEvalResult(`Evaluation failed: ${error}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleMigrateSamGov = async () => {
    setIsMigrating(true);
    setMigrateResult(null);
    try {
      const result = await migrateSamGov({});
      if (result.success) {
        setMigrateResult(result.message || "Migration successful!");
      } else {
        setMigrateResult(`Migration failed: ${'error' in result ? result.error : "Unknown error"}`);
      }
    } catch (error) {
      setMigrateResult(`Migration failed: ${error}`);
    } finally {
      setIsMigrating(false);
    }
  };

  if (sources === undefined) {
    return (
      <div style={{ padding: "1rem", textAlign: "center" }}>
        Loading sources...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
          Data Sources
        </h2>
        {sources.length === 0 && (
          <button
            onClick={handleInitialize}
            disabled={isInitializing}
            style={{
              padding: "0.5rem 1rem",
              background: "var(--primary, #3B82F6)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: isInitializing ? "not-allowed" : "pointer",
              opacity: isInitializing ? 0.7 : 1,
            }}
          >
            {isInitializing ? "Initializing..." : "Initialize Default Sources"}
          </button>
        )}
      </div>

      {/* Health Summary */}
      {healthSummary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
          }}
        >
          <StatCard label="Total Sources" value={healthSummary.total} />
          <StatCard label="Healthy" value={healthSummary.healthy} color="#22C55E" />
          <StatCard label="Warning" value={healthSummary.warning} color="#F59E0B" />
          <StatCard label="Error" value={healthSummary.error} color="#EF4444" />
          <StatCard label="Fetched Today" value={healthSummary.totalFetchedToday} />
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={handleEvaluateAll}
          disabled={isEvaluating}
          style={{
            padding: "0.5rem 1rem",
            background: isEvaluating ? "#9CA3AF" : "#10B981",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: isEvaluating ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          {isEvaluating ? "Evaluating..." : "Evaluate All Opportunities"}
        </button>
        {evalResult && (
          <span style={{ fontSize: "0.875rem", color: evalResult.includes("failed") ? "#EF4444" : "#10B981" }}>
            {evalResult}
          </span>
        )}

        <button
          onClick={handleMigrateSamGov}
          disabled={isMigrating}
          style={{
            padding: "0.5rem 1rem",
            background: isMigrating ? "#9CA3AF" : "#3B82F6",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: isMigrating ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          {isMigrating ? "Migrating..." : "Update SAM.gov to Daily Quota"}
        </button>
        {migrateResult && (
          <span style={{ fontSize: "0.875rem", color: migrateResult.includes("failed") ? "#EF4444" : "#10B981" }}>
            {migrateResult}
          </span>
        )}
      </div>

      {/* Source Cards */}
      {sources.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "var(--bg-secondary, #F3F4F6)",
            borderRadius: "0.5rem",
          }}
        >
          <p style={{ margin: 0, color: "var(--text-secondary, #6B7280)" }}>
            No sources configured. Click "Initialize Default Sources" to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {sources.map((source) => (
            <SourceCard key={source._id} source={source as Source} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "1rem",
        background: "var(--bg-secondary, #F3F4F6)",
        borderRadius: "0.5rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: color || "var(--text-primary, #111827)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.875rem", color: "var(--text-secondary, #6B7280)" }}>
        {label}
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  const updateSource = useMutation(api.sources.update);
  const triggerSamGov = useAction(api.ingestion.samGov.triggerFetch);
  const triggerRfpmart = useAction(api.ingestion.rfpmart.triggerFetch);
  const deleteRfpmartCsv = useMutation(api.opportunities.deleteAllRfpMartCsvRecords);
  const uploadCSV = useAction(api.ingestion.rfpmartCsv.uploadCSV);
  const [isFetching, setIsFetching] = useState(false);
  const [isDeletingCsv, setIsDeletingCsv] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const isManualCsvSource = source.name === "rfpmart-csv";
  const canFetchNow = source.enabled && !isManualCsvSource;

  // CSV Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filterItOnly, setFilterItOnly] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setFetchResult("Error: Please select a CSV file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFetchResult("Error: File size exceeds 10MB limit");
      return;
    }

    setIsUploading(true);
    setFetchResult(null);
    try {
      const csvContent = await file.text();
      const result = await uploadCSV({ csvContent, filterItOnly });
      if (result.success) {
        setFetchResult(`Uploaded: ${result.new} new, ${result.updated} updated, ${result.skipped} skipped`);
      } else {
        setFetchResult(`Upload failed: ${result.errorMessages.join(", ")}`);
      }
    } catch (err) {
      setFetchResult(`Error: ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const statusColors = {
    healthy: { bg: "#DCFCE7", border: "#22C55E", text: "#15803D" },
    warning: { bg: "#FEF3C7", border: "#F59E0B", text: "#B45309" },
    error: { bg: "#FEE2E2", border: "#EF4444", text: "#B91C1C" },
    disabled: { bg: "#F3F4F6", border: "#9CA3AF", text: "#6B7280" },
  };

  const colors = statusColors[source.status];

  const handleToggle = async () => {
    try {
      await updateSource({
        id: source._id,
        enabled: !source.enabled,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFetchResult(`Error toggling source: ${message}`);
    }
  };

  const handleFetchNow = async () => {
    if (isManualCsvSource) {
      setFetchResult("Manual source: use 'Sync CSV Files' on Home or 'RFPMart CSV Upload' in Admin.");
      return;
    }

    setIsFetching(true);
    setFetchResult(null);
    try {
      let result;
      if (source.name === "sam.gov") {
        result = await triggerSamGov({ limit: 50 });
      } else if (source.name === "rfpmart") {
        result = await triggerRfpmart({ limit: 50 });
      } else {
        setFetchResult("Connector not implemented");
        return;
      }

      if (result.success) {
        setFetchResult(`Fetched ${result.fetched ?? 0} opportunities (${result.new ?? 0} new, ${result.updated ?? 0} updated)`);
      } else {
        const errorMsg = 'error' in result ? result.error : "Unknown error";
        setFetchResult(`Error: ${errorMsg}`);
      }
    } catch (error) {
      setFetchResult(`Failed: ${error}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleDeleteCsvRecords = async () => {
    if (!isManualCsvSource || isDeletingCsv) return;

    const confirmed = window.confirm(
      "Delete all RFPMart CSV records and their evaluations? This cannot be undone."
    );
    if (!confirmed) return;

    setIsDeletingCsv(true);
    setFetchResult(null);
    try {
      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore) {
        const result = await deleteRfpmartCsv({ confirm: true, batchSize: 100 });
        totalDeleted += result.deleted;
        hasMore = result.hasMore;
      }

      setFetchResult(`Deleted ${totalDeleted} RFPMart CSV record(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFetchResult(`Failed: ${message}`);
    } finally {
      setIsDeletingCsv(false);
    }
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      style={{
        padding: "1rem",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "0.5rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
            {source.displayName}
          </h3>
          <span
            style={{
              padding: "0.125rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              background: colors.border,
              color: "white",
              borderRadius: "9999px",
              textTransform: "uppercase",
            }}
          >
            {source.status}
          </span>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <span style={{ fontSize: "0.875rem", color: colors.text }}>
            {source.enabled ? "Enabled" : "Disabled"}
          </span>
          <input
            type="checkbox"
            checked={source.enabled}
            onChange={handleToggle}
            style={{ width: "1.25rem", height: "1.25rem", cursor: "pointer" }}
          />
        </label>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "1rem",
          fontSize: "0.875rem",
        }}
      >
        <div>
          <div style={{ color: colors.text, fontWeight: 500 }}>Last Fetch</div>
          <div>{formatTime(source.lastFetchAt)}</div>
        </div>
        <div>
          <div style={{ color: colors.text, fontWeight: 500 }}>Fetched Today</div>
          <div>{source.fetchedToday}</div>
        </div>
        <div>
          <div style={{ color: colors.text, fontWeight: 500 }}>Total Fetched</div>
          <div>{source.totalFetched}</div>
        </div>
        <div>
          <div style={{ color: colors.text, fontWeight: 500 }}>Errors</div>
          <div>{source.errorCount}</div>
        </div>
      </div>

      {/* Error Message */}
      {source.lastError && (
        <div
          style={{
            padding: "0.5rem",
            marginBottom: "1rem",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "0.25rem",
            fontSize: "0.875rem",
            color: "#B91C1C",
          }}
        >
          Last error: {source.lastError}
        </div>
      )}

      {/* Fetch Result */}
      {fetchResult && (
        (() => {
          const isFailure = fetchResult.startsWith("Error") || fetchResult.startsWith("Failed");
          const isInfo = fetchResult.startsWith("Manual source:");
          return (
        <div
          style={{
            padding: "0.5rem",
            marginBottom: "1rem",
            background: isFailure
              ? "rgba(239, 68, 68, 0.1)"
              : isInfo
                ? "rgba(59, 130, 246, 0.12)"
                : "rgba(34, 197, 94, 0.1)",
            borderRadius: "0.25rem",
            fontSize: "0.875rem",
            color: isFailure
              ? "#B91C1C"
              : isInfo
                ? "#1D4ED8"
                : "#15803D",
          }}
        >
          {fetchResult}
        </div>
          );
        })()
      )}

      {isManualCsvSource && (
        <div
          style={{
            padding: "0.5rem",
            marginBottom: "1rem",
            background: "rgba(59, 130, 246, 0.12)",
            borderRadius: "0.25rem",
            fontSize: "0.875rem",
            color: "#1D4ED8",
          }}
        >
          Manual source: use &quot;Sync CSV Files&quot; on Home or &quot;RFPMart CSV Upload&quot; in Admin.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={handleFetchNow}
          disabled={isFetching || isDeletingCsv || !canFetchNow}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            background: canFetchNow ? "var(--primary, #3B82F6)" : "#9CA3AF",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: isFetching || isDeletingCsv || !canFetchNow ? "not-allowed" : "pointer",
            opacity: isFetching ? 0.7 : 1,
          }}
        >
          {isFetching ? "Fetching..." : isManualCsvSource ? "Manual Only" : "Fetch Now"}
        </button>
        {isManualCsvSource && (
          <>
            <button
              onClick={() => setShowUpload(!showUpload)}
              disabled={isUploading}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                background: showUpload ? "#059669" : "#10B981",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: isUploading ? "not-allowed" : "pointer",
              }}
            >
              {showUpload ? "Hide Upload" : "Upload CSV"}
            </button>
            <button
              onClick={handleDeleteCsvRecords}
              disabled={isDeletingCsv}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                background: isDeletingCsv ? "#9CA3AF" : "#DC2626",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: isDeletingCsv ? "not-allowed" : "pointer",
                opacity: isDeletingCsv ? 0.7 : 1,
              }}
            >
              {isDeletingCsv ? "Deleting..." : "Delete CSV Records"}
            </button>
          </>
        )}
      </div>

      {/* Inline CSV Upload (for rfpmart-csv) */}
      {isManualCsvSource && showUpload && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "rgba(255, 255, 255, 0.5)",
            borderRadius: "0.5rem",
            border: `1px dashed ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input
              type="checkbox"
              id="filterItOnly"
              checked={filterItOnly}
              onChange={(e) => setFilterItOnly(e.target.checked)}
              style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
            />
            <label htmlFor="filterItOnly" style={{ fontSize: "0.875rem", cursor: "pointer" }}>
              Only import IT-relevant RFPs (SW, ITES, NET, TELCOM, DRA, CSE)
            </label>
          </div>

          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleCsvUpload(file);
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              padding: "1.5rem",
              border: "2px dashed #9CA3AF",
              borderRadius: "0.375rem",
              textAlign: "center",
              cursor: isUploading ? "not-allowed" : "pointer",
              background: isUploading ? "rgba(0,0,0,0.05)" : "transparent",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvUpload(file);
              }}
              disabled={isUploading}
              style={{ display: "none" }}
            />
            {isUploading ? (
              <span style={{ color: "#6B7280" }}>Processing CSV...</span>
            ) : (
              <>
                <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                  Drop CSV file here or click to browse
                </div>
                <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                  Max 10MB • Format: ID, Country, State, Title, Deadline, URL
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Config Info */}
      <div
        style={{
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: `1px solid ${colors.border}`,
          fontSize: "0.75rem",
          color: colors.text,
          display: "flex",
          gap: "1.5rem",
        }}
      >
        <span>Refresh: {source.refreshIntervalMinutes}min</span>
        {source.rateLimitPerDay ? (
          <span>
            Daily Quota: {source.fetchedToday}/{source.rateLimitPerDay} ({source.rateLimitPerDay - source.fetchedToday} remaining)
          </span>
        ) : (
          <span>Rate: {source.rateLimitPerMinute}/min, {source.rateLimitPerHour}/hr</span>
        )}
      </div>
    </div>
  );
}
