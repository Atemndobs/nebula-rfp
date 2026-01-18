import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useRef } from "react";

interface UploadResult {
  success: boolean;
  total: number;
  new: number;
  updated: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
}

export function CsvUpload() {
  const uploadCSV = useAction(api.ingestion.rfpmartCsv.uploadCSV);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterItOnly, setFilterItOnly] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }

    setIsUploading(true);
    setResult(null);
    setError(null);

    try {
      const csvContent = await file.text();
      const uploadResult = await uploadCSV({ csvContent, filterItOnly });
      setResult(uploadResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setError("Please drop a CSV file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }

    setIsUploading(true);
    setResult(null);
    setError(null);

    try {
      const csvContent = await file.text();
      const uploadResult = await uploadCSV({ csvContent, filterItOnly });
      setResult(uploadResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
          RFPMart CSV Upload
        </h2>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary, #6B7280)" }}>
          Upload RFPMart alert CSV files to ingest opportunities into the system.
        </p>
      </div>

      {/* Filter Option */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="checkbox"
          id="filterItOnly"
          checked={filterItOnly}
          onChange={(e) => setFilterItOnly(e.target.checked)}
          style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
        />
        <label
          htmlFor="filterItOnly"
          style={{ fontSize: "0.875rem", cursor: "pointer" }}
        >
          Only import IT-relevant RFPs (SW, ITES, NET, TELCOM, DRA, CSE)
        </label>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          padding: "2rem",
          border: "2px dashed var(--border, #D1D5DB)",
          borderRadius: "0.5rem",
          textAlign: "center",
          background: isUploading ? "var(--bg-secondary, #F9FAFB)" : "transparent",
          cursor: isUploading ? "not-allowed" : "pointer",
          opacity: isUploading ? 0.7 : 1,
          transition: "all 0.2s",
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={isUploading}
          style={{ display: "none" }}
        />

        {isUploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "2rem",
                height: "2rem",
                border: "2px solid var(--primary, #3B82F6)",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ color: "var(--text-secondary, #6B7280)" }}>
              Processing CSV...
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--text-secondary, #9CA3AF)" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ margin: 0, fontWeight: 500 }}>
              Drop CSV file here or click to browse
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary, #9CA3AF)" }}>
              Maximum file size: 10MB
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid #EF4444",
            borderRadius: "0.5rem",
            color: "#B91C1C",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Result */}
      {result && result.success && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid #22C55E",
            borderRadius: "0.5rem",
          }}
        >
          <h4 style={{ margin: "0 0 0.75rem 0", color: "#15803D" }}>
            Upload Successful
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "1rem",
            }}
          >
            <StatBox label="Total Rows" value={result.total} />
            <StatBox label="New" value={result.new} color="#22C55E" />
            <StatBox label="Updated" value={result.updated} color="#3B82F6" />
            <StatBox label="Skipped" value={result.skipped} color="#9CA3AF" />
            <StatBox
              label="Errors"
              value={result.errors}
              color={result.errors > 0 ? "#EF4444" : undefined}
            />
          </div>
          {result.errorMessages.length > 0 && (
            <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
              <strong style={{ color: "#B91C1C" }}>Error Details:</strong>
              <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem" }}>
                {result.errorMessages.map((msg, i) => (
                  <li key={i} style={{ color: "#B91C1C" }}>
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* CSV Format Info */}
      <div
        style={{
          padding: "1rem",
          background: "var(--bg-secondary, #F3F4F6)",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
        }}
      >
        <h4 style={{ margin: "0 0 0.5rem 0" }}>Expected CSV Format</h4>
        <p style={{ margin: "0 0 0.5rem 0", color: "var(--text-secondary, #6B7280)" }}>
          RFPMart alert CSVs with 6 columns (no header row):
        </p>
        <code
          style={{
            display: "block",
            padding: "0.5rem",
            background: "var(--bg-tertiary, #E5E7EB)",
            borderRadius: "0.25rem",
            fontSize: "0.75rem",
            overflowX: "auto",
          }}
        >
          ID, Country, State, Title, Deadline, URL
        </code>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary, #9CA3AF)" }}>
          Example: SW-82097,USA,Idaho,"SW-82097 - USA (Idaho) - Data Concealment...","March 25,2026",https://www.rfpmart.com/...
        </p>
      </div>

      {/* Add keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "1.5rem",
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
