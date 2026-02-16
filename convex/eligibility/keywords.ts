/**
 * Keyword configurations for the 7 Eligibility Gate filters
 * Phase 2: Eligibility Gate (P0 HIGHEST PRIORITY)
 */

// ============================================
// Filter 1a: US Entity / Onshore Requirement (Company-level)
// ============================================
// This is about whether the company is US-based, NOT about citizenship
export const US_ENTITY_REQUIRED_KEYWORDS = [
  "onshore",
  "onshore only",
  "us-based",
  "united states only",
  "no offshore",
  "domestic only",
  "us organization",
  "work must be performed in the us",
  "us based organization",
  "us based company",
  "us based contractor",
  "us entity required",
  "conus only",
  "continental united states",
  "performed within the united states",
  "all work performed in the us",
];

// ============================================
// Filter 1b: US Persons / No Foreign Nationals (Staffing constraint)
// ============================================
// This is about personnel citizenship requirements
export const US_PERSONS_ONLY_KEYWORDS = [
  "us citizens only",
  "us persons only",
  "no foreign nationals",
  "us citizen required",
  "must be us citizen",
  "citizenship required",
  "american citizens only",
  "united states citizens",
];

// ============================================
// Filter 2: Security Clearance
// ============================================
export const SECURITY_CLEARANCE_HARD_KEYWORDS = [
  "secret clearance",
  "top secret",
  "ts/sci",
  "sci clearance",
  "clearance required",
  "security clearance required",
  "must have clearance",
  "active clearance",
  "secret level clearance",
  "top secret clearance",
  "compartmented information",
  "sensitive compartmented",
  "clearance level: secret",
  "clearance level: top secret",
  "current secret clearance",
  "current top secret",
  "active secret clearance",
  "active top secret",
  "ts clearance",
  "sci access",
];

export const SECURITY_CLEARANCE_SOFT_KEYWORDS = [
  "public trust",
  "background investigation",
  "background check required",
  "suitability determination",
  "naci",
  "moderate risk public trust",
  "high risk public trust",
  "tier 1 investigation",
  "tier 2 investigation",
];

// ============================================
// Filter 3: Set-Aside / Certification Restrictions
// ============================================
export const SET_ASIDE_TYPES = {
  "8a": ["8(a)", "8a program", "8(a) program", "8a set-aside", "8(a) set-aside"],
  sdvosb: [
    "sdvosb",
    "service-disabled veteran",
    "service disabled veteran",
    "sdvo small business",
    "service-disabled veteran-owned",
  ],
  hubzone: ["hubzone", "hub zone", "historically underutilized business zone"],
  wosb: [
    "wosb",
    "women-owned small business",
    "women owned small business",
    "woman-owned",
    "woman owned",
  ],
  edwosb: [
    "edwosb",
    "economically disadvantaged women-owned",
    "economically disadvantaged woman-owned",
  ],
  smallBusiness: [
    "small business set-aside",
    "small business set aside",
    "sba set-aside",
    "total small business",
    "small business only",
  ],
  veteranOwned: [
    "vosb",
    "veteran-owned small business",
    "veteran owned small business",
  ],
};

// ============================================
// Filter 4: Onsite / Location Constraints
// ============================================
export const ONSITE_HARD_KEYWORDS = [
  "onsite required",
  "5 days/week onsite",
  "5 days a week onsite",
  "full-time onsite",
  "full time onsite",
  "must be local",
  "no remote",
  "100% onsite",
  "on-site only",
  "on site only",
  "must work on-site",
  "must work onsite",
  "work must be performed on-site",
  "work must be performed onsite",
  "no remote work",
  "no telework",
  "no telecommuting",
  "five days a week on site",
  "five days per week onsite",
  "full-time on site",
];

export const ONSITE_SOFT_KEYWORDS = [
  "hybrid",
  "occasional onsite",
  "some onsite",
  "periodic onsite",
  "2-3 days onsite",
  "2 days onsite",
  "3 days onsite",
  "partial onsite",
  "primarily onsite",
  "mostly onsite",
  "onsite preferred",
  "local preferred",
  "partial telework",
  "limited telework",
  "partial remote",
];

// ============================================
// Filter 5: Minimum Proposal Time
// ============================================
export const MINIMUM_DAYS_DEFAULT = 5;
export const WARNING_DAYS_BUFFER = 2;

// ============================================
// Filter 6: Out-of-Scope Domain
// ============================================
export const OUT_OF_SCOPE_KEYWORDS = [
  "construction",
  "hvac",
  "plumbing",
  "electrical works",
  "asbestos",
  "roofing",
  "bridge",
  "concrete",
  "demolition",
  "excavation",
  "paving",
  "masonry",
  "carpentry",
  "landscaping",
  "janitorial",
  "food service",
  "medical equipment",
  "vehicle maintenance",
  "fleet management",
  "building renovation",
  "structural repair",
  "mechanical systems",
  "elevator maintenance",
  "fire suppression",
  "facility maintenance",
  "grounds keeping",
  "snow removal",
  "pest control",
  "waste management",
  "custodial services",
];

// Requests that require niche specialist vendors outside Nebula's core model.
// These are treated as hard out-of-scope signals.
export const SPECIALIST_VENDOR_REQUIRED_KEYWORDS = [
  "expert vendor",
  "specialized vendor",
  "specialist vendor",
  "subject matter expert",
  "domain expert",
  "niche expertise required",
  "oem certified partner",
  "exclusive implementation partner",
];

// ============================================
// Filter 7: Category Must Be Software / Digital
// ============================================
export const VALID_CATEGORY_KEYWORDS = [
  "information technology",
  "software",
  "web development",
  "web design",
  "application development",
  "cloud",
  "digital",
  "systems integration",
  "it services",
  "computer",
  "programming",
  "database",
  "network",
  "cybersecurity",
  "data analytics",
  "app development",
  "mobile development",
  "mobile app",
  "saas",
  "platform development",
  "api development",
  "ai",
  "artificial intelligence",
  "machine learning",
  "data science",
  "devops",
  "cloud computing",
  "cloud services",
  "software engineering",
  "full stack",
  "frontend",
  "backend",
  "web application",
  "enterprise software",
  "custom software",
];

export const VALID_NAICS_CODES = [
  "541511", // Custom Computer Programming Services
  "541512", // Computer Systems Design Services
  "541513", // Computer Facilities Management Services
  "541519", // Other Computer Related Services
  "518210", // Data Processing, Hosting, and Related Services
  "519130", // Internet Publishing and Broadcasting
  "541611", // Administrative Management Consulting
  "541690", // Other Scientific and Technical Consulting
  "517311", // Wired Telecommunications Carriers
  "517312", // Wireless Telecommunications Carriers
  "517919", // All Other Telecommunications
  "518111", // Internet Service Providers
  "518112", // Web Search Portals
  "334111", // Electronic Computer Manufacturing
  "334614", // Software and Other Prerecorded Compact Disc
  "511210", // Software Publishers
];

// ============================================
// Default Rule Configurations
// ============================================
export const DEFAULT_ELIGIBILITY_RULES = [
  {
    ruleId: "us_entity_required",
    name: "US Entity / Onshore Requirement",
    description:
      "Detects if RFP requires US-based organization or onshore work. If hasUsEntity=true, organization is ELIGIBLE.",
    enabled: true,
    defaultOutcome: "PARTNER_REQUIRED" as const, // Will be overridden to ELIGIBLE if hasUsEntity=true
    allowOverride: true,
    keywords: US_ENTITY_REQUIRED_KEYWORDS,
    isRegex: false,
    severity: "soft" as const,
  },
  {
    ruleId: "us_persons_only",
    name: "US Persons / No Foreign Nationals",
    description:
      "Detects if RFP requires US citizens or no foreign nationals. This is a staffing constraint that may require partner or compliant personnel.",
    enabled: true,
    defaultOutcome: "PARTNER_REQUIRED" as const,
    allowOverride: true,
    keywords: US_PERSONS_ONLY_KEYWORDS,
    isRegex: false,
    severity: "soft" as const,
  },
  {
    ruleId: "security_clearance",
    name: "Security Clearance Requirement",
    description:
      "Detects if RFP requires security clearance (SECRET, TS, TS/SCI)",
    enabled: true,
    defaultOutcome: "REJECTED" as const,
    allowOverride: false,
    keywords: SECURITY_CLEARANCE_HARD_KEYWORDS,
    isRegex: false,
    severity: "hard" as const,
  },
  {
    ruleId: "set_aside",
    name: "Set-Aside / Certification Restriction",
    description:
      "Detects if RFP is set-aside for certifications we don't hold (8a, SDVOSB, HUBZone, etc.)",
    enabled: true,
    defaultOutcome: "PARTNER_REQUIRED" as const,
    allowOverride: true,
    keywords: Object.values(SET_ASIDE_TYPES).flat(),
    isRegex: false,
    severity: "soft" as const,
  },
  {
    ruleId: "onsite_constraints",
    name: "Full-Time Onsite Requirement",
    description: "Detects if RFP requires full-time onsite presence (5 days/week)",
    enabled: true,
    defaultOutcome: "PARTNER_REQUIRED" as const,
    allowOverride: true,
    keywords: ONSITE_HARD_KEYWORDS,
    isRegex: false,
    severity: "soft" as const,
  },
  {
    ruleId: "minimum_time",
    name: "Minimum Proposal Time",
    description: "Rejects RFPs with less than 5 days until deadline",
    enabled: true,
    defaultOutcome: "REJECTED" as const,
    allowOverride: true,
    keywords: [],
    isRegex: false,
    severity: "hard" as const,
  },
  {
    ruleId: "out_of_scope",
    name: "Out-of-Scope Domain",
    description:
      "Detects if RFP is primarily for physical infrastructure or requires niche specialist vendors outside core cloud/serverless scope",
    enabled: true,
    defaultOutcome: "REJECTED" as const,
    allowOverride: false,
    keywords: OUT_OF_SCOPE_KEYWORDS,
    isRegex: false,
    severity: "hard" as const,
  },
  {
    ruleId: "category_check",
    name: "Software / Digital Category",
    description: "Validates that RFP is in software/IT/digital category",
    enabled: true,
    defaultOutcome: "FLAG" as const,
    allowOverride: true,
    keywords: VALID_CATEGORY_KEYWORDS,
    isRegex: false,
    severity: "soft" as const,
  },
];

// ============================================
// Default Organization Capabilities
// ============================================
export const DEFAULT_ORGANIZATION_CAPABILITIES = {
  hasUsEntity: true, // Nebula Logix LLC is US-based (Austin, TX)
  certifications: {
    is8a: false,
    isSDVOSB: false,
    isHUBZone: false,
    isWOSB: false,
    isEDWOSB: false,
    isSmallBusiness: true,
  },
  canPartnerForSetAside: true,
  canPartnerForOnsite: true,
  canPartnerForUsOrg: true,
};

// ============================================
// Current Rules Version
// ============================================
export const RULES_VERSION = "1.1.0";
