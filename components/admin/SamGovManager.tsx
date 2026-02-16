import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

/**
 * SAM.gov Data Management - BANDWIDTH OPTIMIZED
 * Delete SAM.gov records to free up bandwidth
 */
export function SamGovManager() {
  const debugData = useQuery(api.opportunities.debugSamGovRecords, { limit: 3 });
  const deleteRecords = useMutation(api.opportunities.deleteAllSamGovRecords);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  // Backfill state
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const backfillAction = useAction(api.ingestion.samGovBackfill.triggerBackfill);

  // Count from debug data (approximate)
  const recordCount = debugData ? debugData.length : 0;

  const handleBackfill = async () => {
    setIsBackfilling(true);
    setBackfillResult(null);

    try {
      let totalUpdated = 0;
      let totalFailed = 0;
      let hasMore = true;
      let iterations = 0;
      const maxIterations = 20; // Safety limit

      // Process in batches
      while (hasMore && iterations < maxIterations) {
        const result = await backfillAction({ batchSize: 10, onlyFlagged: false });
        totalUpdated += result.updated;
        totalFailed += result.failed;
        hasMore = result.hasMore ?? false;
        iterations++;

        if (hasMore) {
          // Brief pause between batches (rate limiting already in backfill)
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      setBackfillResult(
        `Backfill complete! Updated: ${totalUpdated}, Failed: ${totalFailed}. ${hasMore ? `(Stopped after ${iterations} batches - run again if needed)` : "All records processed."}`
      );
    } catch (error) {
      setBackfillResult(`Backfill failed: ${error}`);
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      alert("Please check the confirmation box before deleting");
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      let totalDeleted = 0;
      let hasMore = true;
      let iterations = 0;
      const maxIterations = 20; // Safety limit

      // Delete in batches
      while (hasMore && iterations < maxIterations) {
        const result = await deleteRecords({ confirm: true, batchSize: 100 });
        totalDeleted += result.deleted;
        hasMore = result.hasMore;
        iterations++;

        if (hasMore) {
          // Brief pause between batches
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setDeleteResult(
        `Successfully deleted ${totalDeleted} SAM.gov records. ${hasMore ? `(Stopped after ${iterations} batches - run again if needed)` : "All records removed."}`
      );
      setDeleteConfirm(false);
    } catch (error) {
      setDeleteResult(`Delete failed: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Backfill Full Descriptions */}
      <div>
        <div
          style={{
            padding: "1rem",
            background: "var(--success-bg, #D1FAE5)",
            border: "2px solid var(--success, #10B981)",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "var(--success-text, #065F46)",
              marginBottom: "0.5rem",
            }}
          >
            ✨ Enrich SAM.gov Data
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--success-text, #065F46)",
            }}
          >
            Fetch full descriptions for SAM.gov opportunities. Most SAM.gov records only
            have titles - this will fetch the complete RFP details including requirements,
            specifications, and compliance information.
          </p>
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          SAM.gov Description Backfill
        </h3>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          This will re-fetch all SAM.gov opportunities and download their full descriptions
          from the SAM.gov API. This improves eligibility evaluation and provides better
          context for decision-making.
        </p>

        <button
          onClick={handleBackfill}
          disabled={isBackfilling}
          style={{
            padding: "0.75rem 1.5rem",
            background: isBackfilling ? "var(--bg-muted)" : "var(--success, #10B981)",
            color: isBackfilling ? "var(--text-muted)" : "#FFFFFF",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: isBackfilling ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            width: "100%",
          }}
        >
          {isBackfilling ? "Backfilling... (this may take a few minutes)" : "Start Backfill"}
        </button>

        {backfillResult && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: backfillResult.includes("failed")
                ? "var(--error-bg, #FEE2E2)"
                : "var(--success-bg, #D1FAE5)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            {backfillResult}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--border)" }}></div>

      {/* Header with WARNING */}
      <div>
        <div
          style={{
            padding: "1rem",
            background: "var(--error-bg, #FEE2E2)",
            border: "2px solid var(--error, #EF4444)",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "var(--error-text, #991B1B)",
              marginBottom: "0.5rem",
            }}
          >
            ⚠️ BANDWIDTH CRISIS
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--error-text, #991B1B)",
            }}
          >
            You're over Convex bandwidth limits (1.04 GB / 1 GB). Delete SAM.gov
            records immediately to free up space.
          </p>
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          SAM.gov Emergency Cleanup
        </h3>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
          The 110+ SAM.gov records are mostly hardware/parts (not IT services). Delete
          them to reduce bandwidth usage.
        </p>
      </div>

      {/* Sample Data Preview */}
      {debugData && debugData.length > 0 && (
        <div
          style={{
            background: "var(--bg-secondary)",
            padding: "1rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
          }}
        >
          <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem" }}>
            Sample Records (what will be deleted)
          </h4>
          <div style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
            {debugData.map((record, idx) => (
              <div
                key={record.id}
                style={{
                  marginBottom: "0.75rem",
                  paddingBottom: "0.75rem",
                  borderBottom:
                    idx < debugData.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ fontWeight: 600 }}>{record.title}</div>
                <div style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Categories: {record.categories.join(", ") || "None"}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                  Buyer: {record.buyer.name}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.5rem",
              background: "var(--warning-bg, #FEF3C7)",
              borderRadius: "0.25rem",
              fontSize: "0.75rem",
            }}
          >
            These are mostly hardware/ordnance (332994, 333517) - not IT services (541XXX)
          </div>
        </div>
      )}

      {/* Delete Section - PRIORITIZED */}
      <div
        style={{
          background: "var(--bg-secondary)",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          border: "2px solid var(--error, #EF4444)",
        }}
      >
        <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--error, #EF4444)" }}>
          Delete All SAM.gov Records
        </h4>
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem" }}>
          This will permanently delete all SAM.gov records and free up database bandwidth.
          You can re-fetch better data tomorrow when your API key resets.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <input
            type="checkbox"
            id="deleteConfirm"
            checked={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label
            htmlFor="deleteConfirm"
            style={{ fontSize: "0.875rem", cursor: "pointer" }}
          >
            I understand this will permanently delete all SAM.gov records (~110 records)
          </label>
        </div>

        <button
          onClick={handleDelete}
          disabled={!deleteConfirm || isDeleting}
          style={{
            padding: "0.75rem 1.5rem",
            background:
              !deleteConfirm || isDeleting ? "var(--border)" : "var(--error, #EF4444)",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: !deleteConfirm || isDeleting ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          {isDeleting ? "Deleting..." : "🗑️ Delete All SAM.gov Records"}
        </button>

        {deleteResult && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: deleteResult.includes("Successfully")
                ? "var(--success-bg, #D1FAE5)"
                : "var(--error-bg, #FEE2E2)",
              color: deleteResult.includes("Successfully")
                ? "var(--success-text, #065F46)"
                : "var(--error-text, #991B1B)",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
          >
            {deleteResult}
          </div>
        )}
      </div>

      {/* Why This Happened */}
      <div
        style={{
          background: "var(--bg-secondary)",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          border: "1px solid var(--border)",
        }}
      >
        <h4 style={{ margin: "0 0 0.75rem 0" }}>Why This Happened</h4>
        <ol style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.875rem" }}>
          <li>SAM.gov API returned 110 records without filtering</li>
          <li>Most are hardware/parts (NAICS 332994, 333517) not IT services</li>
          <li>
            The records lack descriptions ("No description available" in detail view)
          </li>
          <li>Loading these records repeatedly consumed bandwidth</li>
        </ol>
      </div>

      {/* Next Steps */}
      <div
        style={{
          background: "var(--bg-secondary)",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          border: "1px solid var(--border)",
        }}
      >
        <h4 style={{ margin: "0 0 0.75rem 0" }}>Next Steps (After Deletion)</h4>
        <ol style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.875rem" }}>
          <li>
            <strong>Tomorrow</strong>: When your SAM.gov API key resets, fetch fresh data
          </li>
          <li>
            <strong>New filters are in place</strong>: Only IT-relevant NAICS codes
            (541XXX)
          </li>
          <li>
            <strong>ICRFP filtering added</strong>: Will exclude archived/closed RFPs
          </li>
          <li>
            <strong>Debug logs enabled</strong>: Will show what fields API actually returns
          </li>
          <li>
            <strong>Expected result</strong>: ~20-50 relevant IT opportunities instead of
            110 hardware parts
          </li>
        </ol>
      </div>
    </div>
  );
}
