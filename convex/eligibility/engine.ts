/**
 * Eligibility Engine
 * Phase 2: Eligibility Gate (P0 HIGHEST PRIORITY)
 *
 * Orchestrates all eligibility filters and determines the final eligibility status
 * for each opportunity. Runs BEFORE 6-dimension scoring.
 */

import { Doc } from "../_generated/dataModel";
import {
  checkUsEntityRequired,
  checkUsPersonsOnly,
  checkSecurityClearance,
  checkSetAside,
  checkOnsiteConstraints,
  checkMinimumTime,
  checkOutOfScope,
  checkCategory,
  FilterResult,
  FilterConfig,
  defaultFilterConfig,
} from "./filters";
import { RULES_VERSION } from "./keywords";

// ============================================
// Types
// ============================================

export type EligibilityStatus = "ELIGIBLE" | "PARTNER_REQUIRED" | "REJECTED";

export interface EligibilityReason {
  ruleId: string;
  ruleName: string;
  outcome: "pass" | "fail" | "flag";
  severity: "hard" | "soft";
  evidence: string;
  keywords: string[];
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: EligibilityReason[];
  evidenceSnippets: string[];
  filterResults: FilterResult[];
  rulesVersion: string;
}

export interface EligibilityEngineConfig extends FilterConfig {
  // Rules to skip (by ruleId)
  disabledRules?: string[];
}

// ============================================
// Eligibility Engine
// ============================================

/**
 * Main eligibility evaluation function
 * Runs all 7 filters and determines the final eligibility status
 */
export function evaluateEligibility(
  opportunity: Doc<"opportunities">,
  config: EligibilityEngineConfig = defaultFilterConfig
): EligibilityResult {
  const disabledRules = new Set(config.disabledRules || []);

  // Run all filters
  const filterResults: FilterResult[] = [];

  // Filter 1a: US Entity / Onshore Requirement (Company-level)
  if (!disabledRules.has("us_entity_required")) {
    filterResults.push(checkUsEntityRequired(opportunity, config));
  }

  // Filter 1b: US Persons / No Foreign Nationals (Staffing constraint)
  if (!disabledRules.has("us_persons_only")) {
    filterResults.push(checkUsPersonsOnly(opportunity, config));
  }

  // Filter 2: Security Clearance
  if (!disabledRules.has("security_clearance")) {
    filterResults.push(checkSecurityClearance(opportunity));
  }

  // Filter 3: Set-Aside
  if (!disabledRules.has("set_aside")) {
    filterResults.push(checkSetAside(opportunity, config));
  }

  // Filter 4: Onsite Constraints
  if (!disabledRules.has("onsite_constraints")) {
    filterResults.push(checkOnsiteConstraints(opportunity, config));
  }

  // Filter 5: Minimum Time
  if (!disabledRules.has("minimum_time")) {
    filterResults.push(checkMinimumTime(opportunity, config));
  }

  // Filter 6: Out of Scope
  if (!disabledRules.has("out_of_scope")) {
    filterResults.push(checkOutOfScope(opportunity));
  }

  // Filter 7: Category Check
  if (!disabledRules.has("category_check")) {
    filterResults.push(checkCategory(opportunity));
  }

  // Determine final status
  const status = determineStatus(filterResults);

  // Build reasons from all filters (pass/fail/flag) so frontend can render
  // complete scoring context without inferring missing pass states.
  const reasons: EligibilityReason[] = filterResults
    .map((r) => ({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      outcome: r.outcome,
      severity: r.severity,
      evidence: r.evidence,
      keywords: r.matchedKeywords,
    }));

  // Collect evidence snippets
  const evidenceSnippets = filterResults
    .filter((r) => r.matchedKeywords.length > 0)
    .map((r) => r.evidence)
    .slice(0, 5); // Limit to 5 snippets

  return {
    status,
    reasons,
    evidenceSnippets,
    filterResults,
    rulesVersion: RULES_VERSION,
  };
}

/**
 * Determine overall eligibility status from filter results
 *
 * Logic:
 * - Any hard fail → REJECTED
 * - Any soft fail with flag → PARTNER_REQUIRED
 * - Only flags (no fails) → ELIGIBLE (with flags noted)
 * - All pass → ELIGIBLE
 */
function determineStatus(filterResults: FilterResult[]): EligibilityStatus {
  // Check for any hard failures (auto-reject)
  const hardFailures = filterResults.filter(
    (r) => r.severity === "hard" && r.outcome === "fail"
  );

  if (hardFailures.length > 0) {
    return "REJECTED";
  }

  // Check for soft failures (may need partner)
  const softFailures = filterResults.filter(
    (r) => r.severity === "soft" && r.outcome === "fail"
  );

  if (softFailures.length > 0) {
    return "PARTNER_REQUIRED";
  }

  // Check for flags that suggest partner needed
  const partnerFlags = filterResults.filter(
    (r) =>
      r.outcome === "flag" &&
      (r.ruleId === "us_entity_required" ||
        r.ruleId === "us_persons_only" ||
        r.ruleId === "set_aside" ||
        r.ruleId === "onsite_constraints")
  );

  if (partnerFlags.length > 0) {
    return "PARTNER_REQUIRED";
  }

  // All other cases are eligible (may have informational flags)
  return "ELIGIBLE";
}

/**
 * Quick check if opportunity should be auto-rejected
 * Use for fast filtering before full evaluation
 */
export function shouldAutoReject(opportunity: Doc<"opportunities">): boolean {
  // Quick checks for obvious rejections
  const now = Date.now();
  const daysUntilDeadline = Math.floor(
    (opportunity.dueDate - now) / (1000 * 60 * 60 * 24)
  );

  // Past deadline
  if (daysUntilDeadline < 0) {
    return true;
  }

  // Quick security clearance check
  const text = (
    opportunity.title +
    " " +
    opportunity.fullDescription
  ).toLowerCase();

  const clearanceKeywords = ["top secret", "ts/sci", "secret clearance"];
  for (const keyword of clearanceKeywords) {
    if (text.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Get summary statistics for eligibility assessment
 */
export function getEligibilitySummary(result: EligibilityResult): {
  totalFilters: number;
  passed: number;
  failed: number;
  flagged: number;
  hardFails: number;
  softFails: number;
} {
  const passed = result.filterResults.filter((r) => r.outcome === "pass").length;
  const failed = result.filterResults.filter((r) => r.outcome === "fail").length;
  const flagged = result.filterResults.filter((r) => r.outcome === "flag").length;
  const hardFails = result.filterResults.filter(
    (r) => r.severity === "hard" && r.outcome === "fail"
  ).length;
  const softFails = result.filterResults.filter(
    (r) => r.severity === "soft" && r.outcome === "fail"
  ).length;

  return {
    totalFilters: result.filterResults.length,
    passed,
    failed,
    flagged,
    hardFails,
    softFails,
  };
}

// ============================================
// Batch Processing
// ============================================

/**
 * Evaluate eligibility for multiple opportunities
 */
export function evaluateBatch(
  opportunities: Doc<"opportunities">[],
  config: EligibilityEngineConfig = defaultFilterConfig
): Map<string, EligibilityResult> {
  const results = new Map<string, EligibilityResult>();

  for (const opportunity of opportunities) {
    results.set(opportunity._id, evaluateEligibility(opportunity, config));
  }

  return results;
}

/**
 * Filter opportunities by eligibility status
 */
export function filterByEligibility(
  opportunities: Doc<"opportunities">[],
  config: EligibilityEngineConfig = defaultFilterConfig,
  statuses: EligibilityStatus[] = ["ELIGIBLE", "PARTNER_REQUIRED"]
): Doc<"opportunities">[] {
  return opportunities.filter((opp) => {
    const result = evaluateEligibility(opp, config);
    return statuses.includes(result.status);
  });
}

// ============================================
// Export
// ============================================

export { defaultFilterConfig } from "./filters";
