/**
 * Eligibility Gate Module
 * Phase 2: Eligibility Gate (P0 HIGHEST PRIORITY)
 *
 * Export all eligibility-related functionality
 */

// Engine
export {
  evaluateEligibility,
  shouldAutoReject,
  getEligibilitySummary,
  evaluateBatch,
  filterByEligibility,
  defaultFilterConfig,
  type EligibilityStatus,
  type EligibilityReason,
  type EligibilityResult,
  type EligibilityEngineConfig,
} from "./engine";

// Filters
export {
  checkUsEntityRequired,
  checkUsPersonsOnly,
  checkUsOrganization,
  checkSecurityClearance,
  checkSetAside,
  checkOnsiteConstraints,
  checkMinimumTime,
  checkOutOfScope,
  checkCategory,
  eligibilityFilters,
  type FilterResult,
  type FilterConfig,
  type OrganizationCapabilities,
  type EligibilityOutcome,
  type EligibilitySeverity,
  type EligibilityRuleId,
} from "./filters";

// Keywords & Defaults
export {
  US_ENTITY_REQUIRED_KEYWORDS,
  US_PERSONS_ONLY_KEYWORDS,
  SECURITY_CLEARANCE_HARD_KEYWORDS,
  SECURITY_CLEARANCE_SOFT_KEYWORDS,
  SET_ASIDE_TYPES,
  ONSITE_HARD_KEYWORDS,
  ONSITE_SOFT_KEYWORDS,
  OUT_OF_SCOPE_KEYWORDS,
  VALID_CATEGORY_KEYWORDS,
  VALID_NAICS_CODES,
  MINIMUM_DAYS_DEFAULT,
  WARNING_DAYS_BUFFER,
  DEFAULT_ELIGIBILITY_RULES,
  DEFAULT_ORGANIZATION_CAPABILITIES,
  RULES_VERSION,
} from "./keywords";
