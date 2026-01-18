# Skill: RFP Evaluation

## Purpose
Evaluate RFP opportunities using the 6-dimension scoring framework with both logic-based and AI-powered analysis.

## 6-Dimension Scoring Framework

### 1. Technical Relevance (Weight: 25%)
Keywords indicating alignment with Nebula Logix capabilities:

```typescript
const TECHNICAL_KEYWORDS = [
  // Cloud & Infrastructure
  "aws", "azure", "gcp", "cloud", "serverless", "lambda", "kubernetes",
  // Development
  "react", "nextjs", "typescript", "node", "api", "rest", "graphql",
  // Data
  "data platform", "analytics", "etl", "data pipeline", "database",
  // Security & DevOps
  "devsecops", "ci/cd", "security", "compliance", "monitoring",
  // Workflow
  "workflow", "automation", "integration", "microservices"
];
```

### 2. Scope Fit (Weight: 20%)
Project types that match our delivery capabilities:

```typescript
const SCOPE_KEYWORDS = [
  "website redesign", "web application", "portal development",
  "cms implementation", "platform modernization", "digital transformation",
  "cloud migration", "api development", "system integration",
  "data migration", "taxonomy", "information architecture"
];
```

### 3. Category Focus (Weight: 15%)
Preferred industry sectors and categories:

```typescript
const CATEGORY_KEYWORDS = [
  "public sector", "federal", "state", "local government",
  "it services", "software development", "digital services",
  "technology", "information technology"
];
```

### 4. Client Profile (Weight: 15%)
Ideal client characteristics:

```typescript
const CLIENT_KEYWORDS = [
  "federal agency", "state agency", "municipality",
  "technology-forward", "agile", "modern", "innovative",
  "us-based", "remote-friendly"
];
```

### 5. Logistics (Weight: 15%)
Practical requirements alignment:

```typescript
interface LogisticsCheck {
  remoteOk: boolean;       // No onsite requirements
  timelineOk: boolean;     // Deadline >= 5 days out
  scopeClarity: "high" | "medium" | "low";
  budgetVisible: boolean;
}
```

### 6. Skill Set Alignment (Weight: 10%)
Team capability match:

```typescript
const SKILL_KEYWORDS = [
  "frontend developer", "backend developer", "full-stack",
  "cloud architect", "devops engineer", "ux designer",
  "technical lead", "project manager", "qa engineer"
];
```

## Scoring Algorithm

### Logic-Based Evaluation

```typescript
function evaluateLogically(rfp: RFP, criteria: Criterion[]): EvaluationResult {
  const results: CriterionResult[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    if (!criterion.enabled) continue;

    const text = `${rfp.title} ${rfp.description}`.toLowerCase();
    const matches = criterion.keywords.filter(kw =>
      text.includes(kw.toLowerCase())
    );

    const met = matches.length >= criterion.minMatches;
    const score = met ? criterion.weight : 0;

    results.push({
      criterion: criterion.name,
      met,
      score,
      matchedKeywords: matches,
      details: met
        ? `Matched: ${matches.join(", ")}`
        : `No matches found (need ${criterion.minMatches})`
    });

    totalScore += score;
    totalWeight += criterion.weight;
  }

  return {
    score: totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0,
    isFit: totalScore / totalWeight >= 0.6, // 60% threshold
    criteriaResults: results,
  };
}
```

### AI-Based Evaluation

```typescript
async function evaluateWithAI(
  rfp: RFP,
  criterion: Criterion,
  aiService: AIService
): Promise<CriterionResult> {
  const prompt = `
Analyze this RFP for ${criterion.name}:

RFP Title: ${rfp.title}
RFP Description: ${rfp.description}

Keywords to look for: ${criterion.keywords.join(", ")}

Determine if this RFP matches our ${criterion.name} requirements.
Consider both explicit keyword matches and semantic relevance.

Respond with JSON:
{
  "foundKeywords": ["keyword1", "keyword2"],
  "isMatch": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}
`;

  const response = await aiService.analyze(prompt, criterion.systemInstruction);
  return parseAIResponse(response, criterion);
}
```

## Eligibility Gate (Hard Disqualifiers)

Run BEFORE scoring to reject ineligible opportunities:

```typescript
interface EligibilityResult {
  eligible: boolean;
  status: "ok" | "reject" | "needs_partner";
  disqualifiers: string[];
}

function checkEligibility(rfp: RFP): EligibilityResult {
  const disqualifiers: string[] = [];
  const text = `${rfp.title} ${rfp.description}`.toLowerCase();

  // Check for hard disqualifiers
  if (/u\.?s\.?\s*(citizen|company|organization)\s*only/i.test(text)) {
    disqualifiers.push("US organization only requirement");
  }
  if (/security\s*clearance\s*(required|mandatory)/i.test(text)) {
    disqualifiers.push("Security clearance required");
  }
  if (/on-?site\s*(presence\s*)?(required|mandatory)/i.test(text)) {
    disqualifiers.push("Onsite presence required");
  }

  // Determine status
  if (disqualifiers.length === 0) {
    return { eligible: true, status: "ok", disqualifiers: [] };
  }

  // Some disqualifiers can be overcome with a partner
  const partnerableDisqualifiers = ["US organization only requirement"];
  const needsPartner = disqualifiers.every(d =>
    partnerableDisqualifiers.includes(d)
  );

  return {
    eligible: needsPartner,
    status: needsPartner ? "needs_partner" : "reject",
    disqualifiers,
  };
}
```

## Chaseability Score

Final composite score combining all factors:

```typescript
interface ChaseabilityScore {
  overall: number;        // 0-100
  breakdown: {
    technicalRelevance: number;
    scopeFit: number;
    categoryFocus: number;
    clientProfile: number;
    logistics: number;
    skillAlignment: number;
  };
  recommendation: "pursue" | "maybe" | "skip";
  reasoning: string;
}

function calculateChaseability(
  evaluation: EvaluationResult,
  eligibility: EligibilityResult
): ChaseabilityScore {
  if (!eligibility.eligible) {
    return {
      overall: 0,
      breakdown: { /* all zeros */ },
      recommendation: "skip",
      reasoning: `Disqualified: ${eligibility.disqualifiers.join(", ")}`
    };
  }

  // Apply partner penalty if needed
  const partnerPenalty = eligibility.status === "needs_partner" ? 0.85 : 1.0;
  const adjustedScore = evaluation.score * partnerPenalty;

  return {
    overall: adjustedScore,
    breakdown: buildBreakdown(evaluation),
    recommendation:
      adjustedScore >= 70 ? "pursue" :
      adjustedScore >= 50 ? "maybe" : "skip",
    reasoning: buildReasoning(evaluation, eligibility)
  };
}
```

## Convex Storage

```typescript
// convex/evaluations.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const save = mutation({
  args: {
    rfpId: v.id("rfps"),
    score: v.number(),
    isFit: v.boolean(),
    criteriaResults: v.array(v.object({
      criterion: v.string(),
      met: v.boolean(),
      score: v.number(),
      matchedKeywords: v.array(v.string()),
      details: v.string(),
    })),
    eligibility: v.object({
      eligible: v.boolean(),
      status: v.string(),
      disqualifiers: v.array(v.string()),
    }),
    reasoning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("evaluations", {
      ...args,
      userId: identity.subject,
      evaluatedAt: Date.now(),
    });
  },
});

export const getByRfp = query({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evaluations")
      .withIndex("by_rfp", q => q.eq("rfpId", args.rfpId))
      .order("desc")
      .first();
  },
});
```

## Batch Evaluation

```typescript
// convex/evaluations.ts
export const evaluateBatch = action({
  args: { rfpIds: v.array(v.id("rfps")) },
  handler: async (ctx, args) => {
    const results = [];

    for (const rfpId of args.rfpIds) {
      const rfp = await ctx.runQuery(internal.rfps.get, { id: rfpId });
      if (!rfp) continue;

      const eligibility = checkEligibility(rfp);
      const evaluation = evaluateLogically(rfp, DEFAULT_CRITERIA);

      await ctx.runMutation(internal.evaluations.save, {
        rfpId,
        ...evaluation,
        eligibility,
      });

      results.push({ rfpId, score: evaluation.score });
    }

    return results;
  },
});
```
