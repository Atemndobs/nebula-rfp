/**
 * Eligibility Gate Filter Implementations
 * Phase 2: Eligibility Gate (P0 HIGHEST PRIORITY)
 *
 * Each filter function analyzes an opportunity and returns a result
 * indicating whether it passes, fails, or should be flagged.
 */

import { Doc } from "../_generated/dataModel";
import {
  US_ENTITY_REQUIRED_KEYWORDS,
  US_PERSONS_ONLY_KEYWORDS,
  SECURITY_CLEARANCE_HARD_KEYWORDS,
  SECURITY_CLEARANCE_SOFT_KEYWORDS,
  SET_ASIDE_TYPES,
  ONSITE_HARD_KEYWORDS,
  ONSITE_SOFT_KEYWORDS,
  OUT_OF_SCOPE_KEYWORDS,
  SPECIALIST_VENDOR_REQUIRED_KEYWORDS,
  VALID_CATEGORY_KEYWORDS,
  VALID_NAICS_CODES,
  MINIMUM_DAYS_DEFAULT,
  DEFAULT_ORGANIZATION_CAPABILITIES,
} from "./keywords";

// ============================================
// Types for Filter Results
// ============================================

export type EligibilityOutcome = "pass" | "fail" | "flag";
export type EligibilitySeverity = "hard" | "soft";
export type EligibilityRuleId =
  | "us_entity_required"
  | "us_persons_only"
  | "us_organization" // Legacy - kept for backward compatibility
  | "security_clearance"
  | "set_aside"
  | "onsite_constraints"
  | "minimum_time"
  | "out_of_scope"
  | "category_check";

export interface FilterResult {
  ruleId: EligibilityRuleId;
  ruleName: string;
  passed: boolean;
  outcome: EligibilityOutcome;
  severity: EligibilitySeverity;
  evidence: string;
  matchedKeywords: string[];
}

export interface OrganizationCapabilities {
  hasUsEntity: boolean;
  certifications: {
    is8a: boolean;
    isSDVOSB: boolean;
    isHUBZone: boolean;
    isWOSB: boolean;
    isEDWOSB: boolean;
    isSmallBusiness: boolean;
  };
  canPartnerForSetAside: boolean;
  canPartnerForOnsite: boolean;
  canPartnerForUsOrg: boolean;
}

export interface FilterConfig {
  organization: OrganizationCapabilities;
  minimumDaysToDeadline: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Search text for keywords (case-insensitive)
 * Returns matched keywords and evidence snippets
 */
function findKeywords(
  text: string,
  keywords: string[]
): { matched: string[]; evidence: string } {
  const normalizedText = text.toLowerCase();
  const matched: string[] = [];
  let evidence = "";

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    const index = normalizedText.indexOf(normalizedKeyword);
    if (index !== -1) {
      matched.push(keyword);
      // Extract evidence snippet (50 chars before and after)
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + keyword.length + 50);
      const snippet = text.slice(start, end).trim();
      if (!evidence) {
        evidence = `...${snippet}...`;
      }
    }
  }

  return { matched, evidence };
}

/**
 * Count keyword occurrences in text
 */
function countKeywordOccurrences(text: string, keywords: string[]): number {
  const normalizedText = text.toLowerCase();
  let count = 0;

  for (const keyword of keywords) {
    const regex = new RegExp(keyword.toLowerCase(), "gi");
    const matches = normalizedText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

/**
 * Get searchable text from opportunity
 */
function getSearchableText(opportunity: Doc<"opportunities">): string {
  return [
    opportunity.title,
    opportunity.fullDescription,
    opportunity.categories.join(" "),
    opportunity.setAside || "",
  ]
    .join(" ")
    .toLowerCase();
}

// ============================================
// Filter 1a: US Entity / Onshore Requirement (Company-level)
// ============================================
// This is about whether the COMPANY is US-based, not about citizenship

export function checkUsEntityRequired(
  opportunity: Doc<"opportunities">,
  config: FilterConfig
): FilterResult {
  const text = getSearchableText(opportunity);
  const { matched, evidence } = findKeywords(text, US_ENTITY_REQUIRED_KEYWORDS);

  const requiresUsEntity = matched.length > 0;

  if (!requiresUsEntity) {
    return {
      ruleId: "us_entity_required",
      ruleName: "US Entity / Onshore Requirement",
      passed: true,
      outcome: "pass",
      severity: "soft",
      evidence: "No US entity/onshore requirement detected",
      matchedKeywords: [],
    };
  }

  // US entity requirement detected - check if we ARE a US entity
  if (config.organization.hasUsEntity) {
    return {
      ruleId: "us_entity_required",
      ruleName: "US Entity / Onshore Requirement",
      passed: true,
      outcome: "pass",
      severity: "soft",
      evidence: `US entity requirement detected. Organization is US-based (ELIGIBLE). ${evidence}`,
      matchedKeywords: matched,
    };
  }

  // Not a US entity - can we partner?
  if (config.organization.canPartnerForUsOrg) {
    return {
      ruleId: "us_entity_required",
      ruleName: "US Entity / Onshore Requirement",
      passed: false,
      outcome: "flag",
      severity: "soft",
      evidence: `US entity requirement detected. Partner with US-based firm may be required. ${evidence}`,
      matchedKeywords: matched,
    };
  }

  return {
    ruleId: "us_entity_required",
    ruleName: "US Entity / Onshore Requirement",
    passed: false,
    outcome: "fail",
    severity: "soft",
    evidence: `US entity requirement detected. Organization is not US-based. ${evidence}`,
    matchedKeywords: matched,
  };
}

// ============================================
// Filter 1b: US Persons / No Foreign Nationals (Staffing constraint)
// ============================================
// This is about personnel citizenship requirements, not company location

export function checkUsPersonsOnly(
  opportunity: Doc<"opportunities">,
  _config: FilterConfig
): FilterResult {
  const text = getSearchableText(opportunity);
  const { matched, evidence } = findKeywords(text, US_PERSONS_ONLY_KEYWORDS);

  if (matched.length === 0) {
    return {
      ruleId: "us_persons_only",
      ruleName: "US Persons / No Foreign Nationals",
      passed: true,
      outcome: "pass",
      severity: "soft",
      evidence: "No US citizenship/persons requirement detected",
      matchedKeywords: [],
    };
  }

  // US persons requirement detected - this is a staffing constraint
  // Default to PARTNER_REQUIRED (flag) as NLX may be able to staff compliant personnel
  return {
    ruleId: "us_persons_only",
    ruleName: "US Persons / No Foreign Nationals",
    passed: false,
    outcome: "flag",
    severity: "soft",
    evidence: `US citizenship/persons requirement detected. Staffing constraint - may need compliant personnel or partner. ${evidence}`,
    matchedKeywords: matched,
  };
}

// Legacy function for backward compatibility
export function checkUsOrganization(
  opportunity: Doc<"opportunities">,
  config: FilterConfig
): FilterResult {
  // Delegate to the new us_entity_required check
  return checkUsEntityRequired(opportunity, config);
}

// ============================================
// Filter 2: Security Clearance
// ============================================

export function checkSecurityClearance(
  opportunity: Doc<"opportunities">
): FilterResult {
  const text = getSearchableText(opportunity);

  // Check for hard clearance requirements first (auto-reject)
  const hardMatch = findKeywords(text, SECURITY_CLEARANCE_HARD_KEYWORDS);
  if (hardMatch.matched.length > 0) {
    return {
      ruleId: "security_clearance",
      ruleName: "Security Clearance Requirement",
      passed: false,
      outcome: "fail",
      severity: "hard",
      evidence: `Security clearance required: ${hardMatch.matched.join(", ")}. ${hardMatch.evidence}`,
      matchedKeywords: hardMatch.matched,
    };
  }

  // Check for soft clearance requirements (flag for review)
  const softMatch = findKeywords(text, SECURITY_CLEARANCE_SOFT_KEYWORDS);
  if (softMatch.matched.length > 0) {
    return {
      ruleId: "security_clearance",
      ruleName: "Security Clearance Requirement",
      passed: false,
      outcome: "flag",
      severity: "soft",
      evidence: `Background check may be required: ${softMatch.matched.join(", ")}. ${softMatch.evidence}`,
      matchedKeywords: softMatch.matched,
    };
  }

  return {
    ruleId: "security_clearance",
    ruleName: "Security Clearance Requirement",
    passed: true,
    outcome: "pass",
    severity: "hard",
    evidence: "No security clearance requirement detected",
    matchedKeywords: [],
  };
}

// ============================================
// Filter 3: Set-Aside / Certification Restrictions
// ============================================

export function checkSetAside(
  opportunity: Doc<"opportunities">,
  config: FilterConfig
): FilterResult {
  const text = getSearchableText(opportunity);
  const setAsideField = opportunity.setAside?.toLowerCase() || "";

  // Check each set-aside type
  const detectedSetAsides: { type: string; keywords: string[] }[] = [];

  for (const [type, keywords] of Object.entries(SET_ASIDE_TYPES)) {
    const { matched } = findKeywords(text + " " + setAsideField, keywords);
    if (matched.length > 0) {
      detectedSetAsides.push({ type, keywords: matched });
    }
  }

  if (detectedSetAsides.length === 0) {
    return {
      ruleId: "set_aside",
      ruleName: "Set-Aside / Certification Restriction",
      passed: true,
      outcome: "pass",
      severity: "soft",
      evidence: "No set-aside restriction detected - open competition",
      matchedKeywords: [],
    };
  }

  // Check if we hold any of the required certifications
  const certs = config.organization.certifications;
  const certMap: Record<string, boolean> = {
    "8a": certs.is8a,
    sdvosb: certs.isSDVOSB,
    hubzone: certs.isHUBZone,
    wosb: certs.isWOSB,
    edwosb: certs.isEDWOSB,
    smallBusiness: certs.isSmallBusiness,
    veteranOwned: false, // Add if needed
  };

  const allMatched = detectedSetAsides.flatMap((d) => d.keywords);
  const requiredTypes = detectedSetAsides.map((d) => d.type);

  // Check if we hold any of the required certs
  const heldCerts = requiredTypes.filter((type) => certMap[type] === true);

  if (heldCerts.length > 0) {
    return {
      ruleId: "set_aside",
      ruleName: "Set-Aside / Certification Restriction",
      passed: true,
      outcome: "pass",
      severity: "soft",
      evidence: `Set-aside for ${requiredTypes.join(", ")} detected. Organization holds: ${heldCerts.join(", ")}`,
      matchedKeywords: allMatched,
    };
  }

  // Don't hold cert - can we partner?
  if (config.organization.canPartnerForSetAside) {
    return {
      ruleId: "set_aside",
      ruleName: "Set-Aside / Certification Restriction",
      passed: false,
      outcome: "flag",
      severity: "soft",
      evidence: `Set-aside for ${requiredTypes.join(", ")} detected. Partner with certified firm may be required.`,
      matchedKeywords: allMatched,
    };
  }

  return {
    ruleId: "set_aside",
    ruleName: "Set-Aside / Certification Restriction",
    passed: false,
    outcome: "fail",
    severity: "soft",
    evidence: `Set-aside for ${requiredTypes.join(", ")} detected. Organization does not hold required certification.`,
    matchedKeywords: allMatched,
  };
}

// ============================================
// Filter 4: Onsite / Location Constraints
// ============================================

export function checkOnsiteConstraints(
  opportunity: Doc<"opportunities">,
  config: FilterConfig
): FilterResult {
  const text = getSearchableText(opportunity);

  // Check for hard onsite requirements (5 days/week)
  const hardMatch = findKeywords(text, ONSITE_HARD_KEYWORDS);
  if (hardMatch.matched.length > 0) {
    if (config.organization.canPartnerForOnsite) {
      return {
        ruleId: "onsite_constraints",
        ruleName: "Full-Time Onsite Requirement",
        passed: false,
        outcome: "flag",
        severity: "soft",
        evidence: `Full-time onsite required. Local partner may be needed. ${hardMatch.evidence}`,
        matchedKeywords: hardMatch.matched,
      };
    }

    return {
      ruleId: "onsite_constraints",
      ruleName: "Full-Time Onsite Requirement",
      passed: false,
      outcome: "fail",
      severity: "soft",
      evidence: `Full-time onsite required: ${hardMatch.matched.join(", ")}. ${hardMatch.evidence}`,
      matchedKeywords: hardMatch.matched,
    };
  }

  // Check for soft onsite requirements (hybrid)
  const softMatch = findKeywords(text, ONSITE_SOFT_KEYWORDS);
  if (softMatch.matched.length > 0) {
    return {
      ruleId: "onsite_constraints",
      ruleName: "Full-Time Onsite Requirement",
      passed: true,
      outcome: "flag",
      severity: "soft",
      evidence: `Partial/hybrid onsite detected: ${softMatch.matched.join(", ")}. Review location requirements.`,
      matchedKeywords: softMatch.matched,
    };
  }

  // Check if remote is explicitly allowed
  if (opportunity.location?.isRemoteAllowed) {
    return {
      ruleId: "onsite_constraints",
      ruleName: "Full-Time Onsite Requirement",
      passed: true,
      outcome: "pass",
      severity: "soft",
      evidence: "Remote work is allowed",
      matchedKeywords: [],
    };
  }

  return {
    ruleId: "onsite_constraints",
    ruleName: "Full-Time Onsite Requirement",
    passed: true,
    outcome: "pass",
    severity: "soft",
    evidence: "No specific onsite requirements detected",
    matchedKeywords: [],
  };
}

// ============================================
// Filter 5: Minimum Proposal Time
// ============================================

export function checkMinimumTime(
  opportunity: Doc<"opportunities">,
  config: FilterConfig
): FilterResult {
  const now = Date.now();
  const dueDate = opportunity.dueDate;
  const daysUntilDeadline = Math.floor(
    (dueDate - now) / (1000 * 60 * 60 * 24)
  );
  const minimumDays = config.minimumDaysToDeadline || MINIMUM_DAYS_DEFAULT;

  if (daysUntilDeadline < 0) {
    return {
      ruleId: "minimum_time",
      ruleName: "Minimum Proposal Time",
      passed: false,
      outcome: "fail",
      severity: "hard",
      evidence: `Deadline has passed (${Math.abs(daysUntilDeadline)} days ago)`,
      matchedKeywords: [],
    };
  }

  if (daysUntilDeadline < minimumDays) {
    return {
      ruleId: "minimum_time",
      ruleName: "Minimum Proposal Time",
      passed: false,
      outcome: "fail",
      severity: "hard",
      evidence: `Only ${daysUntilDeadline} days until deadline. Minimum ${minimumDays} days required.`,
      matchedKeywords: [],
    };
  }

  // Warning threshold (minimum + 2 days buffer)
  const warningThreshold = minimumDays + 2;
  if (daysUntilDeadline < warningThreshold) {
    return {
      ruleId: "minimum_time",
      ruleName: "Minimum Proposal Time",
      passed: true,
      outcome: "flag",
      severity: "soft",
      evidence: `${daysUntilDeadline} days until deadline. Tight timeline - expedited effort needed.`,
      matchedKeywords: [],
    };
  }

  return {
    ruleId: "minimum_time",
    ruleName: "Minimum Proposal Time",
    passed: true,
    outcome: "pass",
    severity: "hard",
    evidence: `${daysUntilDeadline} days until deadline. Sufficient time to prepare proposal.`,
    matchedKeywords: [],
  };
}

// ============================================
// Filter 6: Out-of-Scope Domain
// ============================================

export function checkOutOfScope(
  opportunity: Doc<"opportunities">
): FilterResult {
  const title = opportunity.title.toLowerCase();
  const description = opportunity.fullDescription.toLowerCase();
  const text = getSearchableText(opportunity);

  // Specialist-vendor requirement is an immediate hard out-of-scope signal.
  const specialistMatch = findKeywords(text, SPECIALIST_VENDOR_REQUIRED_KEYWORDS);
  if (specialistMatch.matched.length > 0) {
    return {
      ruleId: "out_of_scope",
      ruleName: "Out-of-Scope Domain",
      passed: false,
      outcome: "fail",
      severity: "hard",
      evidence: `Specialist vendor requirement detected: "${specialistMatch.matched.join(", ")}". ${specialistMatch.evidence}`,
      matchedKeywords: specialistMatch.matched,
    };
  }

  // Check title - primary focus indicator
  const titleMatch = findKeywords(title, OUT_OF_SCOPE_KEYWORDS);
  if (titleMatch.matched.length > 0) {
    return {
      ruleId: "out_of_scope",
      ruleName: "Out-of-Scope Domain",
      passed: false,
      outcome: "fail",
      severity: "hard",
      evidence: `Primary focus is out-of-scope: "${titleMatch.matched.join(", ")}" found in title`,
      matchedKeywords: titleMatch.matched,
    };
  }

  // Check description - 3+ occurrences suggests primary focus
  const occurrences = countKeywordOccurrences(description, OUT_OF_SCOPE_KEYWORDS);
  if (occurrences >= 3) {
    const { matched, evidence } = findKeywords(text, OUT_OF_SCOPE_KEYWORDS);
    return {
      ruleId: "out_of_scope",
      ruleName: "Out-of-Scope Domain",
      passed: false,
      outcome: "fail",
      severity: "hard",
      evidence: `Out-of-scope keywords mentioned ${occurrences} times: ${matched.slice(0, 3).join(", ")}. ${evidence}`,
      matchedKeywords: matched,
    };
  }

  // Check for any mentions (flag if found but not primary)
  const { matched, evidence } = findKeywords(text, OUT_OF_SCOPE_KEYWORDS);
  if (matched.length > 0) {
    return {
      ruleId: "out_of_scope",
      ruleName: "Out-of-Scope Domain",
      passed: true,
      outcome: "flag",
      severity: "soft",
      evidence: `Minor out-of-scope mentions: ${matched.join(", ")}. Review for hybrid nature. ${evidence}`,
      matchedKeywords: matched,
    };
  }

  return {
    ruleId: "out_of_scope",
    ruleName: "Out-of-Scope Domain",
    passed: true,
    outcome: "pass",
    severity: "hard",
    evidence: "No out-of-scope domain indicators detected",
    matchedKeywords: [],
  };
}

// ============================================
// Filter 7: Category Must Be Software / Digital
// ============================================

export function checkCategory(opportunity: Doc<"opportunities">): FilterResult {
  const text = getSearchableText(opportunity);
  const categories = opportunity.categories || [];

  // Check NAICS codes in categories
  const matchedNaics = VALID_NAICS_CODES.filter((code) =>
    categories.some((cat) => cat.includes(code))
  );

  if (matchedNaics.length > 0) {
    return {
      ruleId: "category_check",
      ruleName: "Software / Digital Category",
      passed: true,
      outcome: "pass",
      severity: "soft",
      evidence: `Valid NAICS codes found: ${matchedNaics.join(", ")}`,
      matchedKeywords: matchedNaics,
    };
  }

  // Check for software/digital keywords
  const { matched, evidence } = findKeywords(text, VALID_CATEGORY_KEYWORDS);

  if (matched.length >= 2) {
    return {
      ruleId: "category_check",
      ruleName: "Software / Digital Category",
      passed: true,
      outcome: "pass",
      severity: "soft",
      evidence: `Software/digital indicators found: ${matched.slice(0, 5).join(", ")}. ${evidence}`,
      matchedKeywords: matched,
    };
  }

  if (matched.length === 1) {
    return {
      ruleId: "category_check",
      ruleName: "Software / Digital Category",
      passed: true,
      outcome: "flag",
      severity: "soft",
      evidence: `Limited software/digital indicators: ${matched.join(", ")}. Manual review recommended. ${evidence}`,
      matchedKeywords: matched,
    };
  }

  return {
    ruleId: "category_check",
    ruleName: "Software / Digital Category",
    passed: false,
    outcome: "flag",
    severity: "soft",
    evidence:
      "No clear software/digital/IT category indicators found. Manual review recommended.",
    matchedKeywords: [],
  };
}

// ============================================
// Export All Filters
// ============================================

export const eligibilityFilters = {
  checkUsEntityRequired,
  checkUsPersonsOnly,
  checkUsOrganization, // Legacy - delegates to checkUsEntityRequired
  checkSecurityClearance,
  checkSetAside,
  checkOnsiteConstraints,
  checkMinimumTime,
  checkOutOfScope,
  checkCategory,
};

export const defaultFilterConfig: FilterConfig = {
  organization: DEFAULT_ORGANIZATION_CAPABILITIES,
  minimumDaysToDeadline: MINIMUM_DAYS_DEFAULT,
};
