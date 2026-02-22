import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

/**
 * SAM.gov Data Management - Simple delete functionality
 */
export function SamGovManager() {
  const deleteRecords = useMutation(api.opportunities.deleteAllSamGovRecords);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

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
      const maxIterations = 20;

      while (hasMore && iterations < maxIterations) {
        const result = await deleteRecords({ confirm: true, batchSize: 100 });
        totalDeleted += result.deleted;
        hasMore = result.hasMore;
        iterations++;

        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setDeleteResult(
        `Deleted ${totalDeleted} SAM.gov records. ${hasMore ? "(Run again if needed)" : "All records removed."}`
      );
      setDeleteConfirm(false);
    } catch (error) {
      setDeleteResult(`Delete failed: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: 600 }}>
        SAM.gov Data Management
      </h3>
      <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--text-muted, #6B7280)" }}>
        Delete all SAM.gov records to free up database space. You can re-fetch fresh data anytime.
      </p>

      <div
        style={{
          padding: "1rem",
          background: "var(--bg-secondary, #F9FAFB)",
          borderRadius: "0.5rem",
          border: "1px solid var(--border, #E5E7EB)",
        }}
      >
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
            id="deleteConfirmSamGov"
            checked={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.checked)}
            style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
          />
          <label
            htmlFor="deleteConfirmSamGov"
            style={{ fontSize: "0.875rem", cursor: "pointer" }}
          >
            I confirm I want to delete all SAM.gov records
          </label>
        </div>

        <button
          onClick={handleDelete}
          disabled={!deleteConfirm || isDeleting}
          style={{
            padding: "0.5rem 1rem",
            background: !deleteConfirm || isDeleting ? "#9CA3AF" : "#DC2626",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: !deleteConfirm || isDeleting ? "not-allowed" : "pointer",
            fontWeight: 500,
            fontSize: "0.875rem",
          }}
        >
          {isDeleting ? "Deleting..." : "Delete All SAM.gov Records"}
        </button>

        {deleteResult && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: deleteResult.includes("Deleted")
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
              color: deleteResult.includes("Deleted") ? "#15803D" : "#B91C1C",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
          >
            {deleteResult}
          </div>
        )}
      </div>
    </div>
  );
}
