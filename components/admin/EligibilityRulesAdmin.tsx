/**
 * EligibilityRulesAdmin Component
 * Phase 2: Eligibility Gate (P0 HIGHEST PRIORITY)
 *
 * Admin UI for configuring eligibility rules, keywords, and outcomes.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import {
  formatRulesAsMarkdown,
  formatRulesAsJson,
  downloadAsFile,
  ExportedRulesData,
} from "../../utils/exportRulesMarkdown";

// Types
type EligibilityOutcome = "REJECTED" | "PARTNER_REQUIRED" | "FLAG";
type EligibilitySeverity = "hard" | "soft";

interface EligibilityRule {
  _id: string | null;
  ruleId: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultOutcome: EligibilityOutcome;
  allowOverride: boolean;
  keywords: string[];
  isRegex: boolean;
  severity: EligibilitySeverity;
  version: number;
  createdAt: number;
  updatedAt: number;
}

// Icons
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
  </svg>
);

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-semibold mt-1" style={{ color: color || "inherit" }}>
        {value}
      </p>
    </div>
  );
}

// Rule Card Component
function RuleCard({
  rule,
  onToggle,
  onUpdateOutcome,
  onAddKeyword,
  onRemoveKeyword,
}: {
  rule: EligibilityRule;
  onToggle: (ruleId: string, enabled: boolean) => void;
  onUpdateOutcome: (ruleId: string, outcome: EligibilityOutcome) => void;
  onAddKeyword: (ruleId: string, keyword: string) => void;
  onRemoveKeyword: (ruleId: string, keyword: string) => void;
}) {
  const [showKeywords, setShowKeywords] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      onAddKeyword(rule.ruleId, newKeyword.trim());
      setNewKeyword("");
    }
  };

  const severityColors = {
    hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    soft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  const outcomeColors = {
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    PARTNER_REQUIRED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    FLAG: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border ${
        rule.enabled
          ? "border-gray-200 dark:border-gray-700"
          : "border-gray-200 dark:border-gray-700 opacity-60"
      } overflow-hidden`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {rule.name}
              </h3>
              <span className={`px-2 py-0.5 text-xs rounded ${severityColors[rule.severity]}`}>
                {rule.severity}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {rule.description}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => onToggle(rule.ruleId, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Outcome selector */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Default Outcome
        </label>
        <div className="flex gap-2">
          {(["REJECTED", "PARTNER_REQUIRED", "FLAG"] as EligibilityOutcome[]).map((outcome) => (
            <button
              key={outcome}
              onClick={() => onUpdateOutcome(rule.ruleId, outcome)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                rule.defaultOutcome === outcome
                  ? outcomeColors[outcome] + " border-current"
                  : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
            >
              {outcome.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Keywords section */}
      {rule.keywords.length > 0 && (
        <div className="p-4">
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <span>Keywords ({rule.keywords.length})</span>
            <svg
              className={`w-4 h-4 transition-transform ${showKeywords ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showKeywords && (
            <div className="mt-3">
              {/* Add keyword input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                  placeholder="Add keyword..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleAddKeyword}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <PlusIcon />
                </button>
              </div>

              {/* Keywords list */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {rule.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md group"
                  >
                    {keyword}
                    <button
                      onClick={() => onRemoveKeyword(rule.ruleId, keyword)}
                      className="opacity-50 hover:opacity-100 hover:text-red-500"
                    >
                      <XIcon />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Component
export function EligibilityRulesAdmin() {
  const rules = useQuery(api.eligibilityRules.listRules);
  const stats = useQuery(api.eligibilityRules.getEligibilityStats);
  // BANDWIDTH OPTIMIZED: Only load export data when user opens the export menu
  // This prevents expensive queries from running on every page load
  const [wantsExport, setWantsExport] = useState(false);
  const exportData = useQuery(
    api.eligibilityRules.exportRules,
    wantsExport ? {} : "skip"
  );
  const initializeRules = useMutation(api.eligibilityRules.initializeRules);
  const updateRule = useMutation(api.eligibilityRules.updateRule);
  const addKeyword = useMutation(api.eligibilityRules.addKeyword);
  const removeKeyword = useMutation(api.eligibilityRules.removeKeyword);
  const evaluateAll = useMutation(api.eligibilityRules.evaluateAllPending);
  const resetEvaluations = useMutation(api.eligibilityRules.resetAllEvaluations);

  const [isInitializing, setIsInitializing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await initializeRules();
    } catch (error) {
      console.error("Failed to initialize rules:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    await updateRule({ ruleId, enabled });
  };

  const handleUpdateOutcome = async (ruleId: string, outcome: EligibilityOutcome) => {
    await updateRule({ ruleId, defaultOutcome: outcome });
  };

  const handleAddKeyword = async (ruleId: string, keyword: string) => {
    await addKeyword({ ruleId, keyword });
  };

  const handleRemoveKeyword = async (ruleId: string, keyword: string) => {
    await removeKeyword({ ruleId, keyword });
  };

  const handleEvaluateAll = async () => {
    setIsEvaluating(true);
    setEvaluationResult(null);
    try {
      const result = await evaluateAll({ limit: 100 });
      setEvaluationResult(`Evaluated ${result.evaluated} of ${result.total} opportunities`);
    } catch (error) {
      console.error("Failed to evaluate:", error);
      setEvaluationResult("Evaluation failed");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleResetEvaluations = async () => {
    if (confirm("This will delete all eligibility evaluations. Are you sure?")) {
      try {
        // Reset in batches of 100 to avoid loading entire table
        let totalDeleted = 0;
        let hasMore = true;
        while (hasMore) {
          const result = await resetEvaluations({ batchSize: 100 });
          totalDeleted += result.deleted;
          hasMore = result.hasMore;
        }
        setEvaluationResult(`Deleted ${totalDeleted} evaluations`);
      } catch (error) {
        console.error("Failed to reset:", error);
      }
    }
  };

  const handleExportMarkdown = () => {
    if (!exportData) return;
    const markdown = formatRulesAsMarkdown(exportData as ExportedRulesData);
    const timestamp = new Date().toISOString().split("T")[0];
    downloadAsFile(markdown, `eligibility-rules-${timestamp}.md`, "text/markdown");
    setShowExportMenu(false);
  };

  const handleExportJson = () => {
    if (!exportData) return;
    const json = formatRulesAsJson(exportData as ExportedRulesData);
    const timestamp = new Date().toISOString().split("T")[0];
    downloadAsFile(json, `eligibility-rules-${timestamp}.json`, "application/json");
    setShowExportMenu(false);
  };

  const handleCopyToClipboard = async () => {
    if (!exportData) return;
    const markdown = formatRulesAsMarkdown(exportData as ExportedRulesData);
    try {
      await navigator.clipboard.writeText(markdown);
      setEvaluationResult("Rules copied to clipboard!");
      setShowExportMenu(false);
    } catch (error) {
      console.error("Failed to copy:", error);
      setEvaluationResult("Failed to copy to clipboard");
    }
  };

  if (rules === undefined) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading eligibility rules...
      </div>
    );
  }

  const hasStoredRules = rules.some((r) => r._id !== null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Eligibility Rules
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure the 7 hard filters that determine RFP eligibility
          </p>
        </div>
        <div className="flex gap-2">
          {!hasStoredRules && (
            <button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializing ? "Initializing..." : "Initialize Rules"}
            </button>
          )}
          <button
            onClick={handleEvaluateAll}
            disabled={isEvaluating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEvaluating ? "Evaluating..." : "Evaluate All"}
          </button>
          <button
            onClick={handleResetEvaluations}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Reset
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setWantsExport(true); // Start loading export data
                setShowExportMenu(!showExportMenu);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
            >
              <DownloadIcon />
              Export Rules
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <button
                  onClick={handleExportMarkdown}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md"
                >
                  Download as Markdown
                </button>
                <button
                  onClick={handleExportJson}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Download as JSON
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evaluation result message */}
      {evaluationResult && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-sm">
          {evaluationResult}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Evaluated" value={stats.total} />
          <StatCard label="Eligible" value={stats.eligible} color="#22C55E" />
          <StatCard label="Partner Required" value={stats.partnerRequired} color="#F59E0B" />
          <StatCard label="Rejected" value={stats.rejected} color="#EF4444" />
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <RuleCard
            key={rule.ruleId}
            rule={rule as EligibilityRule}
            onToggle={handleToggleRule}
            onUpdateOutcome={handleUpdateOutcome}
            onAddKeyword={handleAddKeyword}
            onRemoveKeyword={handleRemoveKeyword}
          />
        ))}
      </div>
    </div>
  );
}

export default EligibilityRulesAdmin;
