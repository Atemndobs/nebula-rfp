import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (synced from Clerk)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("user"),
      v.literal("viewer")
    ),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // RFP Opportunities (canonical normalized records)
  opportunities: defineTable({
    externalIds: v.array(
      v.object({
        source: v.string(),
        externalId: v.string(),
        url: v.string(),
        fetchedAt: v.number(),
      })
    ),
    title: v.string(),
    fullDescription: v.string(),
    buyer: v.object({
      name: v.string(),
      type: v.union(
        v.literal("federal"),
        v.literal("state"),
        v.literal("local"),
        v.literal("other")
      ),
    }),
    location: v.object({
      state: v.optional(v.string()),
      city: v.optional(v.string()),
      isRemoteAllowed: v.optional(v.boolean()),
    }),
    postedDate: v.number(),
    dueDate: v.number(),
    dueTime: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    valueRange: v.optional(
      v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number()),
      })
    ),
    contractType: v.optional(v.string()),
    contact: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
    categories: v.array(v.string()),
    setAside: v.optional(v.string()),
    attachments: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        type: v.optional(v.string()),
        size: v.optional(v.number()),
      })
    ),
    sourceUrl: v.string(),
    evidenceSnippets: v.array(v.string()),
    source: v.string(),
    ingestedAt: v.number(),
    lastUpdatedAt: v.number(),
    // Flag for opportunities where full description fetch failed (SAM.gov description URLs)
    needsDetailFetch: v.optional(v.boolean()),
  })
    .index("by_source", ["source"])
    .index("by_due_date", ["dueDate"])
    .index("by_posted_date", ["postedDate"])
    .index("by_needs_detail_fetch", ["needsDetailFetch", "source"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["source"],
    }),

  // Data Sources configuration
  sources: defineTable({
    name: v.string(),
    displayName: v.string(),
    enabled: v.boolean(),
    refreshIntervalMinutes: v.number(),
    lastFetchAt: v.optional(v.number()),
    nextFetchAt: v.optional(v.number()),
    rateLimitPerMinute: v.number(),
    rateLimitPerHour: v.number(),
    rateLimitPerDay: v.optional(v.number()), // For sources with daily quotas (e.g., SAM.gov)
    status: v.union(
      v.literal("healthy"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("disabled")
    ),
    errorCount: v.number(),
    lastError: v.optional(v.string()),
    lastErrorAt: v.optional(v.number()),
    totalFetched: v.number(),
    fetchedToday: v.number(),
  }).index("by_name", ["name"]),

  // Source query configurations
  sourceQueries: defineTable({
    sourceId: v.id("sources"),
    name: v.string(),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
    naicsCodes: v.optional(v.array(v.string())),
    states: v.optional(v.array(v.string())),
    setAsideTypes: v.optional(v.array(v.string())),
    postedWithinDays: v.optional(v.number()),
    deadlineAfterDays: v.optional(v.number()),
  }).index("by_source", ["sourceId"]),

  // Evaluations (eligibility + scoring)
  evaluations: defineTable({
    opportunityId: v.id("opportunities"),
    eligibility: v.object({
      status: v.union(
        v.literal("ELIGIBLE"),
        v.literal("PARTNER_REQUIRED"),
        v.literal("REJECTED")
      ),
      reasons: v.array(
        v.object({
          ruleId: v.string(),
          ruleName: v.string(),
          outcome: v.union(v.literal("pass"), v.literal("fail"), v.literal("flag")),
          severity: v.union(v.literal("hard"), v.literal("soft")),
          evidence: v.string(),
          keywords: v.array(v.string()),
        })
      ),
      evidenceSnippets: v.array(v.string()),
      rulesVersion: v.string(),
    }),
    scoring: v.optional(
      v.object({
        totalScore: v.number(),
        dimensions: v.array(
          v.object({
            dimension: v.string(),
            score: v.union(v.literal(0), v.literal(1)),
            weight: v.number(),
            evidence: v.array(v.string()),
            matchedKeywords: v.array(v.string()),
          })
        ),
        isGoodFit: v.boolean(),
        threshold: v.number(),
        configVersion: v.string(),
      })
    ),
    evaluatedAt: v.number(),
    evaluatedBy: v.union(v.literal("system"), v.literal("manual")),
  })
    .index("by_opportunity", ["opportunityId"])
    .index("by_eligibility_status", ["eligibility.status"]),

  // Pursuits (pipeline tracking)
  pursuits: defineTable({
    opportunityId: v.id("opportunities"),
    status: v.union(
      v.literal("new"),
      v.literal("triage"),
      v.literal("bid"),
      v.literal("no-bid"),
      v.literal("capture"),
      v.literal("draft"),
      v.literal("review"),
      v.literal("submitted"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("archived")
    ),
    decision: v.optional(v.union(v.literal("bid"), v.literal("no-bid"))),
    decisionBy: v.optional(v.string()),
    decisionAt: v.optional(v.number()),
    decisionReasons: v.array(v.string()),
    captureManager: v.optional(v.string()),
    proposalLead: v.optional(v.string()),
    technicalLead: v.optional(v.string()),
    teamMembers: v.array(v.string()),
    pursuitBriefId: v.optional(v.id("pursuitBriefs")),
    complianceMatrixId: v.optional(v.id("complianceMatrices")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_opportunity", ["opportunityId"])
    .index("by_status", ["status"])
    .index("by_capture_manager", ["captureManager"]),

  // Pursuit briefs (generated documents)
  pursuitBriefs: defineTable({
    pursuitId: v.id("pursuits"),
    content: v.string(),
    generatedAt: v.number(),
    generatedBy: v.union(v.literal("ai"), v.literal("manual")),
    version: v.number(),
  }).index("by_pursuit", ["pursuitId"]),

  // Compliance matrices
  complianceMatrices: defineTable({
    pursuitId: v.id("pursuits"),
    requirements: v.string(),
    completionPercent: v.number(),
    generatedAt: v.number(),
    lastUpdatedAt: v.number(),
  }).index("by_pursuit", ["pursuitId"]),

  // Pursuit notes
  pursuitNotes: defineTable({
    pursuitId: v.id("pursuits"),
    content: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_pursuit", ["pursuitId"]),

  // Pursuit activity log
  pursuitActivity: defineTable({
    pursuitId: v.id("pursuits"),
    type: v.string(),
    description: v.string(),
    userId: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.string()),
  })
    .index("by_pursuit", ["pursuitId"])
    .index("by_timestamp", ["timestamp"]),

  // Eligibility rules (configurable)
  eligibilityRules: defineTable({
    ruleId: v.string(),
    name: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    defaultOutcome: v.union(
      v.literal("REJECTED"),
      v.literal("PARTNER_REQUIRED"),
      v.literal("FLAG")
    ),
    allowOverride: v.boolean(),
    keywords: v.array(v.string()),
    isRegex: v.boolean(),
    severity: v.union(v.literal("hard"), v.literal("soft")),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_rule_id", ["ruleId"]),

  // Scoring configuration
  scoringConfig: defineTable({
    key: v.string(),
    threshold: v.number(),
    mustPassDimensions: v.array(v.string()),
    weights: v.string(),
    negativeKeywords: v.array(v.string()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Audit logs
  auditLogs: defineTable({
    action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    entityType: v.string(),
    entityId: v.string(),
    userId: v.string(),
    userEmail: v.string(),
    changes: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.string()),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // Content blocks (proposal content library)
  contentBlocks: defineTable({
    category: v.string(),
    name: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    variables: v.array(v.string()),
    relevantNaics: v.optional(v.array(v.string())),
    relevantKeywords: v.optional(v.array(v.string())),
    lastUsedAt: v.optional(v.number()),
    useCount: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_category", ["category"]),

  // Case studies (past performance)
  caseStudies: defineTable({
    clientName: v.string(),
    projectName: v.string(),
    industry: v.array(v.string()),
    technologies: v.array(v.string()),
    duration: v.string(),
    contractValue: v.optional(v.string()),
    summary: v.string(),
    challenge: v.string(),
    solution: v.string(),
    results: v.array(v.string()),
    contactReference: v.optional(
      v.object({
        name: v.string(),
        title: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_industry", ["industry"]),

  // Team bios
  teamBios: defineTable({
    name: v.string(),
    title: v.string(),
    role: v.string(),
    yearsExperience: v.number(),
    education: v.array(v.string()),
    certifications: v.array(v.string()),
    skills: v.array(v.string()),
    summary: v.string(),
    shortBio: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_role", ["role"]),

  // Proposal templates
  proposalTemplates: defineTable({
    name: v.string(),
    type: v.string(),
    description: v.string(),
    sections: v.string(),
    requiredFields: v.array(v.string()),
    optionalFields: v.array(v.string()),
    boilerplateVariables: v.array(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    version: v.string(),
    isDefault: v.boolean(),
  }).index("by_type", ["type"]),

  // Ingestion logs
  ingestionLogs: defineTable({
    source: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed")
    ),
    fetchedCount: v.number(),
    newCount: v.number(),
    updatedCount: v.number(),
    duplicateCount: v.number(),
    errorCount: v.number(),
    errors: v.optional(v.array(v.string())),
  })
    .index("by_source", ["source"])
    .index("by_started_at", ["startedAt"]),

  // Stats aggregation (BANDWIDTH OPTIMIZATION)
  // Pre-computed counts to avoid querying thousands of documents
  statsAggregation: defineTable({
    key: v.string(), // e.g., "eligibility", "opportunities"
    counts: v.object({
      total: v.number(),
      eligible: v.optional(v.number()),
      partnerRequired: v.optional(v.number()),
      rejected: v.optional(v.number()),
      bySource: v.optional(v.string()), // JSON string of source counts
    }),
    lastUpdatedAt: v.number(),
  }).index("by_key", ["key"]),
});
