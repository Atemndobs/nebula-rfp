# Phase 2: Intelligence Engine

**Duration**: 4 Weeks (Days 15-42)
**Goal**: Build smart scoring and pursuit automation

---

## Executive View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: INTELLIGENCE ENGINE                           │
│                                                                             │
│  Week 3-4: Scoring               Week 5-6: Automation                       │
│  ┌─────────────────────┐        ┌─────────────────────┐                    │
│  │ ☐ 6-Dimension Model │        │ ☐ Pursuit Briefs    │                    │
│  │ ☐ Keyword Matching  │        │ ☐ Compliance Matrix │                    │
│  │ ☐ AI Enhancement    │        │ ☐ Bid/No-Bid Flow   │                    │
│  │ ☐ Chaseability Score│        │ ☐ Workflow UI       │                    │
│  └─────────────────────┘        └─────────────────────┘                    │
│                                                                             │
│  Outcome: System recommends what to pursue with supporting docs             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What This Phase Delivers

| Feature | Business Value |
|---------|----------------|
| **6-Dimension Scoring** | Objectively rank opportunities by fit |
| **AI Evaluation** | Catch semantic matches humans miss |
| **Pursuit Briefs** | 1-page decision docs in seconds, not hours |
| **Compliance Matrix** | Never miss a requirement again |
| **Workflow Management** | Track pursuits from discovery to submission |

### Success Criteria

| Metric | Target |
|--------|--------|
| Scoring accuracy | 80%+ agreement with human judgment |
| Brief generation time | < 30 seconds |
| False positive rate | < 20% (opportunities scored high but actually poor fit) |
| Pursuit workflow adoption | 100% of bids tracked |

---

## The 6-Dimension Scoring Framework

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHASEABILITY SCORE                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   Technical    Scope     Category   Client    Logistics   Skills   │   │
│  │   Relevance    Fit       Focus      Profile              Alignment │   │
│  │                                                                     │   │
│  │   ████████    ██████    ████       ████      ████        ██       │   │
│  │    25%         20%       15%        15%       15%        10%       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FORMULA: Sum of (dimension_score × weight) = Chaseability Score (0-100)   │
│                                                                             │
│  THRESHOLDS:                                                                │
│  • ≥70 = PURSUE (Green) - Move to capture phase                            │
│  • 50-69 = MAYBE (Yellow) - Investigate further                            │
│  • <50 = SKIP (Red) - Archive                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dimension Details

| Dimension | Weight | What It Measures | Example Keywords |
|-----------|--------|------------------|------------------|
| **Technical Relevance** | 25% | Tech stack alignment | aws, serverless, cloud, api, react |
| **Scope Fit** | 20% | Project type match | modernization, migration, redesign |
| **Category Focus** | 15% | Industry alignment | federal, state, public sector |
| **Client Profile** | 15% | Client type match | agency, department, technology-forward |
| **Logistics** | 15% | Practical feasibility | remote, timeline ≥5 days |
| **Skill Alignment** | 10% | Team capability | full-stack, devops, architect |

---

## Developer Implementation Guide

### Week 3-4: Scoring Engine (Days 15-28)

#### Day 15-17: Database Schema for Evaluations

**Add to `convex/schema.ts`:**
```typescript
// Add these tables to your existing schema

  // Evaluation criteria configuration
  criteria: defineTable({
    name: v.string(),           // e.g., "technical_relevance"
    displayName: v.string(),    // e.g., "Technical Relevance"
    description: v.string(),
    weight: v.number(),         // 0-100
    enabled: v.boolean(),
    keywords: v.array(v.object({
      value: v.string(),
      enabled: v.boolean(),
      weight: v.optional(v.number()),
    })),
    minMatches: v.number(),
    systemInstruction: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_order", ["order"]),

  // Evaluation results
  evaluations: defineTable({
    rfpId: v.id("rfps"),
    userId: v.string(),
    evaluationType: v.string(),  // "logic" | "ai" | "hybrid"
    aiProvider: v.optional(v.string()),

    // Overall results
    score: v.number(),
    isFit: v.boolean(),
    recommendation: v.string(),  // "pursue" | "maybe" | "skip"

    // Per-criterion results
    criteriaResults: v.array(v.object({
      criterionId: v.string(),
      criterionName: v.string(),
      weight: v.number(),
      met: v.boolean(),
      score: v.number(),
      matchedKeywords: v.array(v.string()),
      details: v.string(),
    })),

    // Eligibility
    eligibility: v.object({
      eligible: v.boolean(),
      status: v.string(),  // "ok" | "needs_partner" | "reject"
      disqualifiers: v.array(v.string()),
    }),

    reasoning: v.optional(v.string()),
    evaluatedAt: v.number(),
  })
    .index("by_rfp", ["rfpId"])
    .index("by_user", ["userId"])
    .index("by_score", ["score"]),

  // Pursuit tracking
  pursuits: defineTable({
    rfpId: v.id("rfps"),
    userId: v.string(),

    // Status workflow
    status: v.string(),  // See workflow below
    decision: v.optional(v.string()),  // "pursue" | "maybe" | "skip"
    decisionBy: v.optional(v.string()),
    decisionAt: v.optional(v.number()),

    // Documents
    brief: v.optional(v.string()),  // JSON
    complianceMatrix: v.optional(v.string()),  // JSON
    proposalDraft: v.optional(v.string()),

    // Metadata
    notes: v.optional(v.string()),
    teamMembers: v.optional(v.array(v.string())),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_rfp", ["rfpId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),
```

---

#### Day 18-20: Scoring Engine Implementation

**File: `convex/evaluation/scoring.ts`**
```typescript
import { query, mutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";

// Types
interface CriterionResult {
  criterionId: string;
  criterionName: string;
  weight: number;
  met: boolean;
  score: number;
  matchedKeywords: string[];
  details: string;
}

interface EligibilityResult {
  eligible: boolean;
  status: "ok" | "needs_partner" | "reject";
  disqualifiers: string[];
}

interface EvaluationResult {
  score: number;
  isFit: boolean;
  recommendation: "pursue" | "maybe" | "skip";
  criteriaResults: CriterionResult[];
  eligibility: EligibilityResult;
  reasoning: string;
}

// Hard disqualifier patterns
const DISQUALIFIERS = [
  { pattern: /security\s*clearance\s*(required|mandatory)/i, fatal: true, label: "Security clearance required" },
  { pattern: /on-?site\s*(presence\s*)?(required|mandatory)/i, fatal: true, label: "Onsite presence required" },
  { pattern: /u\.?s\.?\s*(citizen|company|organization)\s*only/i, fatal: false, label: "US organization only" },
  { pattern: /must\s*be\s*located\s*in/i, fatal: false, label: "Location restriction" },
];

// Check eligibility
function checkEligibility(text: string): EligibilityResult {
  const disqualifiers: string[] = [];
  let canPartner = true;

  for (const { pattern, fatal, label } of DISQUALIFIERS) {
    if (pattern.test(text)) {
      disqualifiers.push(label);
      if (fatal) canPartner = false;
    }
  }

  if (disqualifiers.length === 0) {
    return { eligible: true, status: "ok", disqualifiers: [] };
  }

  return {
    eligible: canPartner,
    status: canPartner ? "needs_partner" : "reject",
    disqualifiers,
  };
}

// Logic-based evaluation
function evaluateLogically(
  rfpText: string,
  criteria: Doc<"criteria">[]
): { criteriaResults: CriterionResult[]; rawScore: number } {
  const text = rfpText.toLowerCase();
  const results: CriterionResult[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    if (!criterion.enabled) continue;

    // Get enabled keywords
    const enabledKeywords = criterion.keywords
      .filter((kw) => kw.enabled)
      .map((kw) => kw.value.toLowerCase());

    // Find matches
    const matches = enabledKeywords.filter((kw) => text.includes(kw));
    const met = matches.length >= criterion.minMatches;
    const score = met ? criterion.weight : 0;

    results.push({
      criterionId: criterion._id,
      criterionName: criterion.displayName,
      weight: criterion.weight,
      met,
      score,
      matchedKeywords: matches,
      details: met
        ? `Matched ${matches.length} keywords: ${matches.join(", ")}`
        : `Only ${matches.length}/${criterion.minMatches} required matches`,
    });

    totalScore += score;
    totalWeight += criterion.weight;
  }

  const rawScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  return { criteriaResults: results, rawScore };
}

// Main evaluation mutation
export const evaluate = mutation({
  args: {
    rfpId: v.id("rfps"),
    evaluationType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"evaluations">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get RFP
    const rfp = await ctx.db.get(args.rfpId);
    if (!rfp) throw new Error("RFP not found");

    // Get criteria
    const criteria = await ctx.db
      .query("criteria")
      .withIndex("by_order")
      .collect();

    if (criteria.length === 0) {
      throw new Error("No evaluation criteria configured. Run seedCriteria first.");
    }

    // Build full text for analysis
    const fullText = `${rfp.title} ${rfp.description}`;

    // Check eligibility
    const eligibility = checkEligibility(fullText);

    // Run logic-based evaluation
    const { criteriaResults, rawScore } = evaluateLogically(fullText, criteria);

    // Apply partner penalty if needed
    const partnerPenalty = eligibility.status === "needs_partner" ? 0.85 : 1.0;
    const adjustedScore = eligibility.eligible ? rawScore * partnerPenalty : 0;

    // Determine recommendation
    let recommendation: "pursue" | "maybe" | "skip";
    if (!eligibility.eligible) {
      recommendation = "skip";
    } else if (adjustedScore >= 70) {
      recommendation = "pursue";
    } else if (adjustedScore >= 50) {
      recommendation = "maybe";
    } else {
      recommendation = "skip";
    }

    // Build reasoning
    const metCriteria = criteriaResults.filter((r) => r.met);
    const missedCriteria = criteriaResults.filter((r) => !r.met);

    let reasoning = `Score: ${Math.round(adjustedScore)}%. `;
    reasoning += `Met ${metCriteria.length}/${criteriaResults.length} criteria. `;

    if (missedCriteria.length > 0) {
      reasoning += `Missing: ${missedCriteria.map((r) => r.criterionName).join(", ")}. `;
    }

    if (eligibility.status === "needs_partner") {
      reasoning += "Note: Requires US partner. ";
    } else if (eligibility.status === "reject") {
      reasoning += `Disqualified: ${eligibility.disqualifiers.join(", ")}. `;
    }

    // Save evaluation
    return await ctx.db.insert("evaluations", {
      rfpId: args.rfpId,
      userId: identity.subject,
      evaluationType: args.evaluationType ?? "logic",
      score: Math.round(adjustedScore),
      isFit: adjustedScore >= 60,
      recommendation,
      criteriaResults,
      eligibility,
      reasoning,
      evaluatedAt: Date.now(),
    });
  },
});

// Get evaluation for an RFP
export const getByRfp = query({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evaluations")
      .withIndex("by_rfp", (q) => q.eq("rfpId", args.rfpId))
      .order("desc")
      .first();
  },
});

// Batch evaluate multiple RFPs
export const evaluateBatch = mutation({
  args: { rfpIds: v.array(v.id("rfps")) },
  handler: async (ctx, args) => {
    const results = [];

    for (const rfpId of args.rfpIds) {
      try {
        // Re-use the evaluate logic (simplified here)
        const evalId = await evaluate(ctx, { rfpId });
        results.push({ rfpId, success: true, evaluationId: evalId });
      } catch (error) {
        results.push({ rfpId, success: false, error: String(error) });
      }
    }

    return results;
  },
});
```

---

#### Day 21-23: Seed Default Criteria

**File: `convex/evaluation/seedCriteria.ts`**
```typescript
import { mutation } from "../_generated/server";

const DEFAULT_CRITERIA = [
  {
    name: "technical_relevance",
    displayName: "Technical Relevance",
    description: "Alignment with cloud, serverless, and modern tech stack",
    weight: 25,
    enabled: true,
    keywords: [
      { value: "aws", enabled: true },
      { value: "cloud", enabled: true },
      { value: "serverless", enabled: true },
      { value: "lambda", enabled: true },
      { value: "kubernetes", enabled: true },
      { value: "docker", enabled: true },
      { value: "react", enabled: true },
      { value: "typescript", enabled: true },
      { value: "api", enabled: true },
      { value: "microservices", enabled: true },
      { value: "devops", enabled: true },
      { value: "ci/cd", enabled: true },
    ],
    minMatches: 2,
    order: 1,
  },
  {
    name: "scope_fit",
    displayName: "Scope Fit",
    description: "Project type matches our delivery capabilities",
    weight: 20,
    enabled: true,
    keywords: [
      { value: "modernization", enabled: true },
      { value: "migration", enabled: true },
      { value: "redesign", enabled: true },
      { value: "platform", enabled: true },
      { value: "web application", enabled: true },
      { value: "portal", enabled: true },
      { value: "integration", enabled: true },
      { value: "digital transformation", enabled: true },
    ],
    minMatches: 1,
    order: 2,
  },
  {
    name: "category_focus",
    displayName: "Category Focus",
    description: "Industry sector alignment",
    weight: 15,
    enabled: true,
    keywords: [
      { value: "federal", enabled: true },
      { value: "state", enabled: true },
      { value: "government", enabled: true },
      { value: "public sector", enabled: true },
      { value: "agency", enabled: true },
      { value: "department", enabled: true },
    ],
    minMatches: 1,
    order: 3,
  },
  {
    name: "client_profile",
    displayName: "Client Profile",
    description: "Ideal client characteristics",
    weight: 15,
    enabled: true,
    keywords: [
      { value: "technology", enabled: true },
      { value: "innovation", enabled: true },
      { value: "agile", enabled: true },
      { value: "modern", enabled: true },
    ],
    minMatches: 1,
    order: 4,
  },
  {
    name: "logistics",
    displayName: "Logistics",
    description: "Practical requirements alignment",
    weight: 15,
    enabled: true,
    keywords: [
      { value: "remote", enabled: true },
      { value: "virtual", enabled: true },
      { value: "telework", enabled: true },
    ],
    minMatches: 0, // Absence of "onsite required" is checked via eligibility
    order: 5,
  },
  {
    name: "skill_alignment",
    displayName: "Skill Alignment",
    description: "Team capability match",
    weight: 10,
    enabled: true,
    keywords: [
      { value: "developer", enabled: true },
      { value: "architect", enabled: true },
      { value: "engineer", enabled: true },
      { value: "full-stack", enabled: true },
      { value: "frontend", enabled: true },
      { value: "backend", enabled: true },
    ],
    minMatches: 1,
    order: 6,
  },
];

export const seedCriteria = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("criteria").first();
    if (existing) {
      return { message: "Criteria already exist", count: 0 };
    }

    const now = Date.now();
    let count = 0;

    for (const criterion of DEFAULT_CRITERIA) {
      await ctx.db.insert("criteria", {
        ...criterion,
        keywords: criterion.keywords.map((kw) => ({
          value: kw.value,
          enabled: kw.enabled,
        })),
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { message: "Criteria seeded successfully", count };
  },
});
```

---

### Week 5-6: Pursuit Automation (Days 29-42)

#### Day 29-32: Pursuit Brief Generation

**File: `convex/pursuits/briefGenerator.ts`**
```typescript
import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

interface PursuitBrief {
  quickFacts: {
    source: string;
    noticeId: string;
    agency: string;
    deadline: string;
    daysRemaining: number;
    location: string;
    setAside?: string;
  };
  score: {
    overall: number;
    recommendation: string;
    breakdown: Record<string, number>;
  };
  summary: string;
  whyPursue: string[];
  risks: string[];
  eligibility: {
    status: string;
    flags: string[];
  };
  recommendedTeam: {
    roles: string[];
    size: number;
  };
  winStrategy: string;
}

// Generate brief using AI
export const generateBrief = action({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args): Promise<PursuitBrief> => {
    // Get RFP and evaluation
    const rfp = await ctx.runQuery(internal.rfps.get, { id: args.rfpId });
    const evaluation = await ctx.runQuery(internal.evaluation.getByRfp, {
      rfpId: args.rfpId,
    });

    if (!rfp) throw new Error("RFP not found");
    if (!evaluation) throw new Error("Evaluate RFP first");

    // Calculate days remaining
    const daysRemaining = Math.ceil(
      (rfp.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Build score breakdown
    const breakdown: Record<string, number> = {};
    for (const result of evaluation.criteriaResults) {
      breakdown[result.criterionName] = result.score;
    }

    // Infer team needs from RFP text
    const team = inferTeamNeeds(rfp.title + " " + rfp.description);

    // Generate AI sections
    const aiSections = await generateAISections(rfp, evaluation);

    const brief: PursuitBrief = {
      quickFacts: {
        source: rfp.source,
        noticeId: rfp.externalId,
        agency: extractAgency(rfp.title),
        deadline: new Date(rfp.expiryDate).toLocaleDateString(),
        daysRemaining,
        location: rfp.location,
        setAside: rfp.setAside,
      },
      score: {
        overall: evaluation.score,
        recommendation: evaluation.recommendation,
        breakdown,
      },
      summary: aiSections.summary,
      whyPursue: aiSections.strengths,
      risks: aiSections.risks,
      eligibility: {
        status: evaluation.eligibility.status,
        flags: evaluation.eligibility.disqualifiers,
      },
      recommendedTeam: team,
      winStrategy: aiSections.winStrategy,
    };

    // Save to pursuit
    await ctx.runMutation(internal.pursuits.saveBrief, {
      rfpId: args.rfpId,
      brief: JSON.stringify(brief),
    });

    return brief;
  },
});

function extractAgency(title: string): string {
  // Try to extract agency name from title
  const patterns = [
    /(?:for|from)\s+(?:the\s+)?([A-Z][A-Za-z\s]+(?:Agency|Department|Office|Bureau))/i,
    /^([A-Z][A-Za-z\s]+(?:Agency|Department|Office|Bureau))/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1].trim();
  }

  return "Unknown Agency";
}

function inferTeamNeeds(text: string): { roles: string[]; size: number } {
  const lowerText = text.toLowerCase();
  const roles: string[] = ["Technical Lead"];
  let size = 1;

  if (lowerText.includes("frontend") || lowerText.includes("react") || lowerText.includes("ui")) {
    roles.push("Frontend Developer");
    size++;
  }

  if (lowerText.includes("backend") || lowerText.includes("api") || lowerText.includes("database")) {
    roles.push("Backend Developer");
    size++;
  }

  if (lowerText.includes("devops") || lowerText.includes("infrastructure") || lowerText.includes("deployment")) {
    roles.push("DevOps Engineer");
    size++;
  }

  if (lowerText.includes("design") || lowerText.includes("ux") || lowerText.includes("user experience")) {
    roles.push("UX Designer");
    size++;
  }

  // Default if nothing specific found
  if (roles.length === 1) {
    roles.push("Full-Stack Developer", "Full-Stack Developer");
    size = 3;
  }

  return { roles, size };
}

async function generateAISections(
  rfp: any,
  evaluation: any
): Promise<{
  summary: string;
  strengths: string[];
  risks: string[];
  winStrategy: string;
}> {
  // For now, use rule-based generation
  // In production, call Gemini/OpenAI here

  const matchedKeywords = evaluation.criteriaResults
    .flatMap((r: any) => r.matchedKeywords)
    .join(", ");

  const summary = `${rfp.title}. This opportunity requires ${matchedKeywords || "general IT services"} capabilities. Deadline is ${new Date(rfp.expiryDate).toLocaleDateString()}.`;

  const strengths = [];
  if (evaluation.score >= 70) {
    strengths.push("Strong technical alignment with our cloud/serverless capabilities");
  }
  if (evaluation.criteriaResults.find((r: any) => r.criterionName === "Scope Fit")?.met) {
    strengths.push("Project scope matches our delivery experience");
  }
  if (evaluation.eligibility.status === "ok") {
    strengths.push("No eligibility barriers - can bid directly");
  }
  if (strengths.length === 0) {
    strengths.push("Opportunity to expand into new area");
  }

  const risks = [];
  if (evaluation.eligibility.status === "needs_partner") {
    risks.push("Requires US partner for eligibility");
  }
  const missedCriteria = evaluation.criteriaResults.filter((r: any) => !r.met);
  for (const missed of missedCriteria.slice(0, 2)) {
    risks.push(`Missing ${missed.criterionName} alignment`);
  }
  if (risks.length === 0) {
    risks.push("Standard execution risk");
  }

  const winStrategy = evaluation.score >= 70
    ? "Lead with technical depth in cloud modernization. Emphasize serverless expertise and rapid delivery methodology."
    : "Focus on partnership or specific capability areas. May need teaming arrangement.";

  return { summary, strengths, risks, winStrategy };
}

// Save brief to pursuit
export const saveBrief = mutation({
  args: {
    rfpId: v.id("rfps"),
    brief: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find or create pursuit
    const existing = await ctx.db
      .query("pursuits")
      .withIndex("by_rfp", (q) => q.eq("rfpId", args.rfpId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        brief: args.brief,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("pursuits", {
      rfpId: args.rfpId,
      userId: identity.subject,
      status: "new",
      brief: args.brief,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get brief for display
export const getBrief = query({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    const pursuit = await ctx.db
      .query("pursuits")
      .withIndex("by_rfp", (q) => q.eq("rfpId", args.rfpId))
      .first();

    if (!pursuit?.brief) return null;

    return JSON.parse(pursuit.brief) as PursuitBrief;
  },
});
```

---

#### Day 33-35: Pursuit Workflow

**File: `convex/pursuits/workflow.ts`**
```typescript
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ["triage"],
  triage: ["bid", "no-bid"],
  bid: ["capture"],
  capture: ["draft"],
  draft: ["review"],
  review: ["submitted", "draft"], // Can go back to draft
  submitted: ["won", "lost"],
  "no-bid": [], // Terminal
  won: [], // Terminal
  lost: [], // Terminal
};

export const updateStatus = mutation({
  args: {
    pursuitId: v.id("pursuits"),
    newStatus: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pursuit = await ctx.db.get(args.pursuitId);
    if (!pursuit) throw new Error("Pursuit not found");

    // Validate transition
    const validNext = VALID_TRANSITIONS[pursuit.status] || [];
    if (!validNext.includes(args.newStatus)) {
      throw new Error(
        `Invalid status transition: ${pursuit.status} → ${args.newStatus}. ` +
        `Valid options: ${validNext.join(", ")}`
      );
    }

    // Update
    await ctx.db.patch(args.pursuitId, {
      status: args.newStatus,
      notes: args.notes ?? pursuit.notes,
      updatedAt: Date.now(),
    });

    return { success: true, newStatus: args.newStatus };
  },
});

export const makeDecision = mutation({
  args: {
    pursuitId: v.id("pursuits"),
    decision: v.union(v.literal("pursue"), v.literal("maybe"), v.literal("skip")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pursuit = await ctx.db.get(args.pursuitId);
    if (!pursuit) throw new Error("Pursuit not found");

    // Map decision to status
    const newStatus = args.decision === "pursue" ? "bid" : "no-bid";

    await ctx.db.patch(args.pursuitId, {
      decision: args.decision,
      decisionBy: identity.subject,
      decisionAt: Date.now(),
      status: args.decision === "skip" ? "no-bid" : pursuit.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// List pursuits by status
export const listByStatus = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("pursuits");

    if (args.status) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }

    const pursuits = await q.order("desc").take(args.limit ?? 50);

    // Join with RFP data
    return Promise.all(
      pursuits.map(async (pursuit) => {
        const rfp = await ctx.db.get(pursuit.rfpId);
        return { ...pursuit, rfp };
      })
    );
  },
});

// Get pipeline summary
export const getPipelineSummary = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("pursuits").collect();

    const summary: Record<string, number> = {
      new: 0,
      triage: 0,
      bid: 0,
      capture: 0,
      draft: 0,
      review: 0,
      submitted: 0,
      won: 0,
      lost: 0,
      "no-bid": 0,
    };

    for (const pursuit of all) {
      summary[pursuit.status] = (summary[pursuit.status] || 0) + 1;
    }

    return summary;
  },
});
```

---

#### Day 36-42: UI Components

**File: `src/components/EvaluationPanel.tsx`**
```tsx
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface EvaluationPanelProps {
  rfpId: Id<"rfps">;
}

export function EvaluationPanel({ rfpId }: EvaluationPanelProps) {
  const evaluation = useQuery(api.evaluation.getByRfp, { rfpId });
  const evaluate = useMutation(api.evaluation.evaluate);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      await evaluate({ rfpId });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!evaluation) {
    return (
      <div className="p-4 bg-card rounded-lg border">
        <p className="text-muted-foreground mb-4">Not evaluated yet</p>
        <button
          onClick={handleEvaluate}
          disabled={isEvaluating}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          {isEvaluating ? "Evaluating..." : "Evaluate Now"}
        </button>
      </div>
    );
  }

  const scoreColor =
    evaluation.score >= 70
      ? "text-success"
      : evaluation.score >= 50
        ? "text-warning"
        : "text-destructive";

  return (
    <div className="p-4 bg-card rounded-lg border space-y-4">
      {/* Score Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className={`text-3xl font-bold ${scoreColor}`}>
            {evaluation.score}%
          </span>
          <span className="ml-2 text-sm text-muted-foreground">
            Chaseability Score
          </span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            evaluation.recommendation === "pursue"
              ? "bg-success/20 text-success"
              : evaluation.recommendation === "maybe"
                ? "bg-warning/20 text-warning"
                : "bg-destructive/20 text-destructive"
          }`}
        >
          {evaluation.recommendation.toUpperCase()}
        </span>
      </div>

      {/* Eligibility */}
      {evaluation.eligibility.status !== "ok" && (
        <div className="p-3 bg-warning/10 rounded border border-warning/20">
          <p className="text-sm font-medium text-warning">
            {evaluation.eligibility.status === "needs_partner"
              ? "⚠️ Requires US Partner"
              : "❌ Not Eligible"}
          </p>
          <ul className="text-xs text-muted-foreground mt-1">
            {evaluation.eligibility.disqualifiers.map((d, i) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Criteria Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Criteria Breakdown</h4>
        {evaluation.criteriaResults.map((result) => (
          <div key={result.criterionId} className="flex items-center gap-2">
            <span
              className={`w-4 h-4 rounded-full ${
                result.met ? "bg-success" : "bg-muted"
              }`}
            />
            <span className="flex-1 text-sm">{result.criterionName}</span>
            <span className="text-sm text-muted-foreground">
              {result.score}/{result.weight}
            </span>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <div className="text-sm text-muted-foreground">
        {evaluation.reasoning}
      </div>
    </div>
  );
}
```

---

## Testing Checklist

### Scoring Engine
- [ ] Criteria seed successfully
- [ ] Evaluation runs on RFPs
- [ ] Scores calculate correctly
- [ ] Eligibility flags detected
- [ ] Recommendation thresholds work

### Pursuit Automation
- [ ] Brief generates in < 30 seconds
- [ ] Brief contains all required sections
- [ ] Status transitions validate correctly
- [ ] Pipeline summary accurate

### UI
- [ ] Evaluation panel displays
- [ ] Score colors correct
- [ ] Criteria breakdown shows
- [ ] Decision buttons work

---

## Handoff Criteria for Phase 3

Phase 2 is complete when:

1. ✅ 6-dimension scoring works
2. ✅ Pursuit briefs generate automatically
3. ✅ Bid/No-Bid workflow functions
4. ✅ Pipeline tracking operational
5. ✅ UI shows evaluations and allows decisions

**Next**: [Phase 3 - Scale & Coverage](../phase-3-scale/README.md)
