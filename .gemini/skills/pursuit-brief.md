# Skill: Pursuit Brief Generation

## Purpose
Generate 1-page pursuit briefs for qualified RFP opportunities to support rapid bid/no-bid decisions.

## Pursuit Brief Template

```markdown
# Pursuit Brief: [RFP Title]

## Quick Facts
| Field | Value |
|-------|-------|
| Source | SAM.gov / eMMA / RFPMart |
| Notice ID | [External ID] |
| Agency | [Client Name] |
| Posted | [Date] |
| Deadline | [Date] ([X] days remaining) |
| Est. Value | [If available] |
| Location | [Place of Performance] |
| Set-Aside | [If applicable] |

## Chaseability Score: [X]/100

### Score Breakdown
- Technical Relevance: [X]/25
- Scope Fit: [X]/20
- Category Focus: [X]/15
- Client Profile: [X]/15
- Logistics: [X]/15
- Skill Alignment: [X]/10

## Opportunity Summary
[2-3 sentence AI-generated summary of what the client is looking for]

## Why Pursue
- [Strength 1 - specific keyword/requirement match]
- [Strength 2 - alignment with capabilities]
- [Strength 3 - strategic value]

## Risks & Concerns
- [Risk 1 - timeline, scope, etc.]
- [Risk 2 - competition, incumbent]
- [Risk 3 - missing capabilities]

## Eligibility Status
- [ ] US Organization: [OK / Needs Partner / Blocked]
- [ ] Clearance Required: [Yes / No]
- [ ] Onsite Required: [Yes / No / Partial]
- [ ] Certifications: [List any required]

## Recommended Team
- Technical Lead: [Role needed]
- Developers: [X] FE, [X] BE, [X] FS
- Other: [DevOps, QA, etc.]

## Win Strategy Notes
[Initial thoughts on differentiation, incumbents, teaming opportunities]

## Decision
- [ ] PURSUE - Strong fit, move to capture
- [ ] MAYBE - Needs more investigation
- [ ] SKIP - Does not meet criteria

**Decision By:** _________________ **Date:** _________
```

## Generation Logic

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

interface PursuitBrief {
  rfpId: string;
  quickFacts: QuickFacts;
  chaseabilityScore: ChaseabilityScore;
  summary: string;
  whyPursue: string[];
  risks: string[];
  eligibility: EligibilityChecklist;
  recommendedTeam: TeamRecommendation;
  winStrategyNotes: string;
}

export const generateBrief = action({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    const rfp = await ctx.runQuery(internal.rfps.get, { id: args.rfpId });
    const evaluation = await ctx.runQuery(internal.evaluations.getByRfp, {
      rfpId: args.rfpId
    });

    if (!rfp || !evaluation) {
      throw new Error("RFP or evaluation not found");
    }

    // Generate AI-powered sections
    const aiSections = await generateAISections(rfp, evaluation);

    const brief: PursuitBrief = {
      rfpId: args.rfpId,
      quickFacts: {
        source: rfp.source,
        noticeId: rfp.externalId,
        agency: extractAgency(rfp),
        posted: new Date(rfp.postedDate),
        deadline: new Date(rfp.expiryDate),
        daysRemaining: calculateDaysRemaining(rfp.expiryDate),
        estValue: rfp.rawData?.estimatedValue ?? "Not specified",
        location: rfp.location,
        setAside: rfp.rawData?.setAside,
      },
      chaseabilityScore: {
        overall: evaluation.score,
        breakdown: extractBreakdown(evaluation),
      },
      summary: aiSections.summary,
      whyPursue: aiSections.strengths,
      risks: aiSections.risks,
      eligibility: buildEligibilityChecklist(evaluation.eligibility),
      recommendedTeam: inferTeamNeeds(rfp, evaluation),
      winStrategyNotes: aiSections.winStrategy,
    };

    // Save to database
    await ctx.runMutation(internal.pursuits.saveBrief, {
      rfpId: args.rfpId,
      brief: JSON.stringify(brief),
    });

    return brief;
  },
});

async function generateAISections(rfp: RFP, evaluation: Evaluation) {
  const prompt = `
Analyze this RFP opportunity and provide:
1. A 2-3 sentence summary of what the client needs
2. 3 specific reasons why Nebula Logix should pursue this (based on our strengths in cloud-native, serverless, APIs, workflow systems)
3. 3 potential risks or concerns
4. Initial win strategy notes (differentiation, competition considerations)

RFP Title: ${rfp.title}
Description: ${rfp.description}
Evaluation Score: ${evaluation.score}/100
Matched Keywords: ${evaluation.criteriaResults.flatMap(c => c.matchedKeywords).join(", ")}

Respond with JSON:
{
  "summary": "...",
  "strengths": ["...", "...", "..."],
  "risks": ["...", "...", "..."],
  "winStrategy": "..."
}
`;

  const response = await callAIProvider(prompt);
  return JSON.parse(response);
}

function inferTeamNeeds(rfp: RFP, evaluation: Evaluation): TeamRecommendation {
  const text = `${rfp.title} ${rfp.description}`.toLowerCase();

  const needs: TeamRecommendation = {
    technicalLead: true,
    frontendDevs: 0,
    backendDevs: 0,
    fullStackDevs: 0,
    devOps: false,
    qa: false,
    designer: false,
  };

  // Infer from content
  if (text.includes("frontend") || text.includes("react") || text.includes("ui")) {
    needs.frontendDevs = 1;
  }
  if (text.includes("backend") || text.includes("api") || text.includes("database")) {
    needs.backendDevs = 1;
  }
  if (text.includes("full-stack") || text.includes("full stack")) {
    needs.fullStackDevs = 1;
  }
  if (text.includes("devops") || text.includes("ci/cd") || text.includes("deployment")) {
    needs.devOps = true;
  }
  if (text.includes("testing") || text.includes("qa") || text.includes("quality")) {
    needs.qa = true;
  }
  if (text.includes("design") || text.includes("ux") || text.includes("user experience")) {
    needs.designer = true;
  }

  // Default if nothing detected
  if (needs.frontendDevs + needs.backendDevs + needs.fullStackDevs === 0) {
    needs.fullStackDevs = 2;
  }

  return needs;
}
```

## Markdown Export

```typescript
export function formatBriefAsMarkdown(brief: PursuitBrief): string {
  return `
# Pursuit Brief: ${brief.quickFacts.title}

## Quick Facts
| Field | Value |
|-------|-------|
| Source | ${brief.quickFacts.source} |
| Notice ID | ${brief.quickFacts.noticeId} |
| Agency | ${brief.quickFacts.agency} |
| Posted | ${formatDate(brief.quickFacts.posted)} |
| Deadline | ${formatDate(brief.quickFacts.deadline)} (${brief.quickFacts.daysRemaining} days) |
| Est. Value | ${brief.quickFacts.estValue} |
| Location | ${brief.quickFacts.location} |
| Set-Aside | ${brief.quickFacts.setAside ?? "None"} |

## Chaseability Score: ${brief.chaseabilityScore.overall}/100

### Score Breakdown
- Technical Relevance: ${brief.chaseabilityScore.breakdown.technicalRelevance}/25
- Scope Fit: ${brief.chaseabilityScore.breakdown.scopeFit}/20
- Category Focus: ${brief.chaseabilityScore.breakdown.categoryFocus}/15
- Client Profile: ${brief.chaseabilityScore.breakdown.clientProfile}/15
- Logistics: ${brief.chaseabilityScore.breakdown.logistics}/15
- Skill Alignment: ${brief.chaseabilityScore.breakdown.skillAlignment}/10

## Opportunity Summary
${brief.summary}

## Why Pursue
${brief.whyPursue.map(s => `- ${s}`).join('\n')}

## Risks & Concerns
${brief.risks.map(r => `- ${r}`).join('\n')}

## Eligibility Status
- [${brief.eligibility.usOrg}] US Organization
- [${brief.eligibility.clearance}] Clearance Required
- [${brief.eligibility.onsite}] Onsite Required

## Recommended Team
${formatTeamRecommendation(brief.recommendedTeam)}

## Win Strategy Notes
${brief.winStrategyNotes}

## Decision
- [ ] PURSUE - Strong fit, move to capture
- [ ] MAYBE - Needs more investigation
- [ ] SKIP - Does not meet criteria

**Decision By:** _________________ **Date:** _________
`;
}
```

## UI Component

```tsx
// components/PursuitBriefView.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function PursuitBriefView({ rfpId }: { rfpId: string }) {
  const brief = useQuery(api.pursuits.getBrief, { rfpId });
  const generateBrief = useMutation(api.pursuits.generateBrief);
  const updateDecision = useMutation(api.pursuits.updateDecision);

  if (!brief) {
    return (
      <div className="p-4">
        <button
          onClick={() => generateBrief({ rfpId })}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Generate Pursuit Brief
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">
        Pursuit Brief: {brief.quickFacts.title}
      </h1>

      {/* Quick Facts Table */}
      <QuickFactsTable facts={brief.quickFacts} />

      {/* Score Display */}
      <ScoreBreakdown score={brief.chaseabilityScore} />

      {/* Summary and Analysis */}
      <Section title="Opportunity Summary">{brief.summary}</Section>
      <Section title="Why Pursue">
        <ul>{brief.whyPursue.map(s => <li key={s}>{s}</li>)}</ul>
      </Section>
      <Section title="Risks & Concerns">
        <ul>{brief.risks.map(r => <li key={r}>{r}</li>)}</ul>
      </Section>

      {/* Decision Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => updateDecision({ rfpId, decision: "pursue" })}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          PURSUE
        </button>
        <button
          onClick={() => updateDecision({ rfpId, decision: "maybe" })}
          className="px-4 py-2 bg-yellow-500 text-white rounded"
        >
          MAYBE
        </button>
        <button
          onClick={() => updateDecision({ rfpId, decision: "skip" })}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          SKIP
        </button>
      </div>
    </div>
  );
}
```
