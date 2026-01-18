import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function IngestionLogs() {
  const logs = useQuery(api.ingestion.logs.list, { limit: 20 });
  const stats = useQuery(api.ingestion.logs.getStats, { daysBack: 7 });
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (logs === undefined) {
    return (
      <div style={{ padding: "1rem", textAlign: "center" }}>
        Loading logs...
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    running: { bg: "#DBEAFE", text: "#1D4ED8" },
    success: { bg: "#DCFCE7", text: "#15803D" },
    partial: { bg: "#FEF3C7", text: "#B45309" },
    failed: { bg: "#FEE2E2", text: "#B91C1C" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
        Ingestion Logs
      </h2>

      {/* Stats Summary */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "1rem",
          }}
        >
          <StatCard label="Total Runs" value={stats.totalRuns} />
          <StatCard label="Successful" value={stats.successfulRuns} color="#22C55E" />
          <StatCard label="Failed" value={stats.failedRuns} color="#EF4444" />
          <StatCard label="Total Fetched" value={stats.totalFetched} />
          <StatCard label="New Records" value={stats.totalNew} color="#3B82F6" />
          <StatCard label="Errors" value={stats.totalErrors} color="#F59E0B" />
        </div>
      )}

      {/* Logs Table */}
      {logs.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "var(--bg-secondary, #F3F4F6)",
            borderRadius: "0.5rem",
          }}
        >
          <p style={{ margin: 0, color: "var(--text-secondary, #6B7280)" }}>
            No ingestion logs yet. Trigger a fetch to see logs.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid var(--border, #E5E7EB)",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "0.75rem 0.5rem" }}>Time</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Source</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Status</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Fetched</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>New</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Updated</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Errors</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const colors = statusColors[log.status] || statusColors.failed;
                return (
                  <React.Fragment key={log._id}>
                  <tr
                    onClick={() => setExpandedLogId(expandedLogId === log._id ? null : log._id)}
                    style={{
                      borderBottom: log.errors && expandedLogId === log._id ? "none" : "1px solid var(--border, #E5E7EB)",
                      cursor: log.errors && log.errors.length > 0 ? "pointer" : "default",
                      background: expandedLogId === log._id ? "var(--bg-secondary, #F9FAFB)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      {formatTime(log.startedAt)}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 500 }}>
                      {log.source}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <span
                        style={{
                          padding: "0.125rem 0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          background: colors.bg,
                          color: colors.text,
                          borderRadius: "9999px",
                          textTransform: "uppercase",
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{log.fetchedCount}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#15803D" }}>
                      {log.newCount}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{log.updatedCount}</td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        color: log.errorCount > 0 ? "#B91C1C" : "inherit",
                      }}
                    >
                      {log.errorCount}
                      {log.errors && log.errors.length > 0 && (
                        <span style={{ marginLeft: "0.25rem", fontSize: "0.75rem" }}>
                          {expandedLogId === log._id ? "▲" : "▼"}
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedLogId === log._id && log.errors && log.errors.length > 0 && (
                    <tr key={`${log._id}-errors`}>
                      <td
                        colSpan={7}
                        style={{
                          padding: "0.75rem 1rem",
                          background: "#FEF2F2",
                          borderBottom: "1px solid var(--border, #E5E7EB)",
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#991B1B", marginBottom: "0.5rem" }}>
                          Error Details:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.75rem", color: "#B91C1C" }}>
                          {log.errors.map((error, idx) => (
                            <li key={idx} style={{ marginBottom: "0.25rem", wordBreak: "break-word" }}>
                              {error}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
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
        padding: "0.75rem",
        background: "var(--bg-secondary, #F3F4F6)",
        borderRadius: "0.5rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: color || "var(--text-primary, #111827)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #6B7280)" }}>
        {label}
      </div>
    </div>
  );
}
