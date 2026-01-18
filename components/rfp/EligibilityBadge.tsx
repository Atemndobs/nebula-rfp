/**
 * EligibilityBadge Component
 * Phase 2: Eligibility Gate (P0 HIGHEST PRIORITY)
 *
 * Displays the eligibility status with visual indicators and expandable details.
 */

import React, { useState } from "react";

// Types
type EligibilityStatus = "ELIGIBLE" | "PARTNER_REQUIRED" | "REJECTED";
type EligibilityOutcome = "pass" | "fail" | "flag";
type EligibilitySeverity = "hard" | "soft";

interface EligibilityReason {
  ruleId: string;
  ruleName: string;
  outcome: EligibilityOutcome;
  severity: EligibilitySeverity;
  evidence: string;
  keywords: string[];
}

interface EligibilityAssessment {
  status: EligibilityStatus;
  reasons: EligibilityReason[];
  evidenceSnippets: string[];
  rulesVersion: string;
}

interface EligibilityBadgeProps {
  eligibility: EligibilityAssessment | null | undefined;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  className?: string;
}

// Icons
const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

const PartnerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
  </svg>
);

const RejectIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

// Status configuration
const STATUS_CONFIG: Record<
  EligibilityStatus,
  {
    label: string;
    icon: React.FC;
    bgColor: string;
    textColor: string;
    borderColor: string;
    darkBgColor: string;
    darkTextColor: string;
    darkBorderColor: string;
  }
> = {
  ELIGIBLE: {
    label: "Eligible",
    icon: CheckIcon,
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    darkBgColor: "dark:bg-green-900/20",
    darkTextColor: "dark:text-green-300",
    darkBorderColor: "dark:border-green-700",
  },
  PARTNER_REQUIRED: {
    label: "Partner Required",
    icon: PartnerIcon,
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    darkBgColor: "dark:bg-amber-900/20",
    darkTextColor: "dark:text-amber-300",
    darkBorderColor: "dark:border-amber-700",
  },
  REJECTED: {
    label: "Not Eligible",
    icon: RejectIcon,
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
    darkBgColor: "dark:bg-red-900/20",
    darkTextColor: "dark:text-red-300",
    darkBorderColor: "dark:border-red-700",
  },
};

// Size configuration
const SIZE_CONFIG = {
  sm: {
    badge: "px-2 py-0.5 text-xs",
    icon: "w-3 h-3",
    gap: "gap-1",
  },
  md: {
    badge: "px-2.5 py-1 text-sm",
    icon: "w-4 h-4",
    gap: "gap-1.5",
  },
  lg: {
    badge: "px-3 py-1.5 text-base",
    icon: "w-5 h-5",
    gap: "gap-2",
  },
};

/**
 * Displays a badge indicating eligibility status
 */
export function EligibilityBadge({
  eligibility,
  size = "md",
  showDetails = false,
  className = "",
}: EligibilityBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle missing eligibility
  if (!eligibility) {
    return (
      <span
        className={`inline-flex items-center ${SIZE_CONFIG[size].gap} ${SIZE_CONFIG[size].badge} rounded-full bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        <span>Not Evaluated</span>
      </span>
    );
  }

  const config = STATUS_CONFIG[eligibility.status];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  const badgeClasses = `
    inline-flex items-center ${sizeConfig.gap} ${sizeConfig.badge}
    rounded-full border font-medium
    ${config.bgColor} ${config.textColor} ${config.borderColor}
    ${config.darkBgColor} ${config.darkTextColor} ${config.darkBorderColor}
    ${showDetails ? "cursor-pointer hover:opacity-90" : ""}
    ${className}
  `;

  const handleClick = () => {
    if (showDetails) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="inline-block relative">
      <button
        type="button"
        onClick={handleClick}
        className={badgeClasses}
        disabled={!showDetails}
        aria-expanded={showDetails ? isExpanded : undefined}
      >
        <Icon />
        <span>{config.label}</span>
        {showDetails && eligibility.reasons.length > 0 && (
          <span
            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
          >
            <ChevronDownIcon />
          </span>
        )}
      </button>

      {/* Expandable details */}
      {showDetails && isExpanded && eligibility.reasons.length > 0 && (
        <EligibilityDetails
          reasons={eligibility.reasons}
          evidenceSnippets={eligibility.evidenceSnippets}
          rulesVersion={eligibility.rulesVersion}
        />
      )}
    </div>
  );
}

/**
 * Expandable details panel showing reasons for eligibility status
 */
function EligibilityDetails({
  reasons,
  evidenceSnippets,
  rulesVersion,
}: {
  reasons: EligibilityReason[];
  evidenceSnippets: string[];
  rulesVersion: string;
}) {
  return (
    <div className="absolute z-50 top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {reasons.length} issue{reasons.length !== 1 ? "s" : ""} detected (v
          {rulesVersion})
        </p>
      </div>

      {/* Reasons list */}
      <div className="max-h-64 overflow-y-auto">
        {reasons.map((reason, idx) => (
          <ReasonItem key={`${reason.ruleId}-${idx}`} reason={reason} />
        ))}
      </div>

      {/* Evidence snippets */}
      {evidenceSnippets.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Evidence
          </p>
          <div className="space-y-1">
            {evidenceSnippets.slice(0, 3).map((snippet, idx) => (
              <p
                key={idx}
                className="text-xs text-gray-600 dark:text-gray-400 italic truncate"
                title={snippet}
              >
                "{snippet}"
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual reason item in the details panel
 */
function ReasonItem({ reason }: { reason: EligibilityReason }) {
  const outcomeColors = {
    pass: "text-green-600 dark:text-green-400",
    fail: "text-red-600 dark:text-red-400",
    flag: "text-amber-600 dark:text-amber-400",
  };

  const severityBadge = {
    hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    soft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {reason.ruleName}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {reason.evidence}
          </p>
          {reason.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {reason.keywords.slice(0, 3).map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  {keyword}
                </span>
              ))}
              {reason.keywords.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{reason.keywords.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-medium ${outcomeColors[reason.outcome]}`}>
            {reason.outcome.toUpperCase()}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${severityBadge[reason.severity]}`}
          >
            {reason.severity}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline badge for use in lists/cards
 */
export function EligibilityBadgeInline({
  status,
  className = "",
}: {
  status: EligibilityStatus | null | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full bg-gray-400 ${className}`}
        title="Not Evaluated"
      />
    );
  }

  const colors = {
    ELIGIBLE: "bg-green-500",
    PARTNER_REQUIRED: "bg-amber-500",
    REJECTED: "bg-red-500",
  };

  const labels = {
    ELIGIBLE: "Eligible",
    PARTNER_REQUIRED: "Partner Required",
    REJECTED: "Not Eligible",
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status]} ${className}`}
      title={labels[status]}
    />
  );
}

export default EligibilityBadge;
