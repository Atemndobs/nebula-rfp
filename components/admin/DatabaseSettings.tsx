import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import LoadingSpinner from "../LoadingSpinner";

/**
 * DatabaseSettings component for managing database cleanup operations.
 * Allows admins to clear the opportunities database when bad data has been ingested.
 */
export function DatabaseSettings() {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    hasMore?: boolean;
  } | null>(null);

  const counts = useQuery(api.opportunities.getCount);
  const clearAll = useMutation(api.opportunities.clearAllOpportunities);

  const handleClearDatabase = async () => {
    if (confirmText !== "DELETE ALL") {
      return;
    }

    setIsClearing(true);
    setResult(null);

    try {
      let totalDeleted = 0;
      let totalEvaluations = 0;
      let hasMore = true;

      // Run in batches until complete
      while (hasMore) {
        const res = await clearAll({ confirm: true, batchSize: 100 });
        totalDeleted += res.deletedOpportunities;
        totalEvaluations += res.deletedEvaluations;
        hasMore = res.hasMore;

        // Update result after each batch
        setResult({
          success: true,
          message: hasMore
            ? `Deleted ${totalDeleted} opportunities so far...`
            : `Successfully deleted ${totalDeleted} opportunities and ${totalEvaluations} evaluations.`,
          hasMore,
        });
      }

      setResult({
        success: true,
        message: `Successfully deleted ${totalDeleted} opportunities and ${totalEvaluations} evaluations. Database cleared.`,
        hasMore: false,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to clear database",
      });
    } finally {
      setIsClearing(false);
      setShowConfirmDialog(false);
      setConfirmText("");
    }
  };

  const buttonBaseClasses =
    "px-3 py-1.5 text-xs font-medium border rounded-md shadow-vercel-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-dark-accents-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  const dangerButtonClasses = `${buttonBaseClasses} bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500`;
  const secondaryButtonClasses = `${buttonBaseClasses} bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5`;
  const inputBaseClasses =
    "p-2 border border-accents-2 dark:border-dark-accents-2 rounded-md shadow-vercel-sm text-sm bg-geist-background dark:bg-dark-accents-1 text-geist-foreground dark:text-dark-geist-foreground placeholder-accents-4 dark:placeholder-accents-5 focus:ring-2 focus:ring-red-500 focus:border-red-500";

  return (
    <section>
      <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">
        Database Management
      </h3>
      <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary mb-3">
        Clear the opportunities database when you need to start fresh (e.g., after ingesting incorrect data).
      </p>

      <div className="p-4 bg-accents-1 dark:bg-dark-accents-2 border border-accents-2 dark:border-dark-accents-2 rounded-md">
        {/* Current database stats */}
        <div className="mb-4 p-3 bg-white dark:bg-dark-accents-1 rounded-md border border-accents-2 dark:border-dark-accents-3">
          <h4 className="text-sm font-medium text-geist-foreground dark:text-dark-geist-foreground mb-2">
            Current Database Status
          </h4>
          {counts === undefined ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-xs text-geist-secondary">Loading...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-geist-secondary dark:text-dark-geist-secondary">Opportunities:</span>
                <span className="ml-2 font-medium text-geist-foreground dark:text-dark-geist-foreground">
                  {counts.displayCount}
                </span>
              </div>
              <div>
                <span className="text-geist-secondary dark:text-dark-geist-secondary">Evaluations:</span>
                <span className="ml-2 font-medium text-geist-foreground dark:text-dark-geist-foreground">
                  {counts.displayEvaluations}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Warning message */}
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Danger Zone
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Clearing the database will permanently delete ALL opportunities and their evaluations.
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Clear database button */}
        {!showConfirmDialog ? (
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isClearing || (counts !== undefined && counts.opportunitiesCount === 0)}
            className={dangerButtonClasses}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 mr-1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            Clear All Opportunities
          </button>
        ) : (
          <div className="p-4 bg-white dark:bg-dark-accents-1 rounded-md border border-red-300 dark:border-red-700">
            <p className="text-sm text-geist-foreground dark:text-dark-geist-foreground mb-3">
              Type <strong className="text-red-600">DELETE ALL</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE ALL"
              className={`${inputBaseClasses} w-full mb-3`}
              disabled={isClearing}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleClearDatabase}
                disabled={confirmText !== "DELETE ALL" || isClearing}
                className={dangerButtonClasses}
              >
                {isClearing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-1.5">Clearing...</span>
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmText("");
                }}
                disabled={isClearing}
                className={secondaryButtonClasses}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Result message */}
        {result && (
          <div
            className={`mt-4 p-3 rounded-md border ${
              result.success
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}
          >
            <p
              className={`text-sm ${
                result.success
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {result.message}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
