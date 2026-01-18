# Phase 3: Scale & Coverage

**Duration**: 4 Weeks (Days 43-70)
**Goal**: Comprehensive market coverage and proposal automation

---

## Executive View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 3: SCALE & COVERAGE                            │
│                                                                             │
│  Week 7-8: Multi-Source         Week 9-10: Proposal Machine                 │
│  ┌─────────────────────┐        ┌─────────────────────┐                    │
│  │ ☐ Maryland eMMA     │        │ ☐ Template Library  │                    │
│  │ ☐ GovTribe API      │        │ ☐ Content Blocks    │                    │
│  │ ☐ Deduplication     │        │ ☐ Proposal Assembly │                    │
│  │ ☐ Source Dashboard  │        │ ☐ Analytics         │                    │
│  └─────────────────────┘        └─────────────────────┘                    │
│                                                                             │
│  Outcome: Full proposal machine generating 1+ proposals/week                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What This Phase Delivers

| Feature | Business Value |
|---------|----------------|
| **Maryland eMMA** | State/local opportunities (regional density) |
| **GovTribe Integration** | Market intelligence + enrichment |
| **Proposal Templates** | 50% faster proposal creation |
| **Content Library** | Reusable capability blocks, case studies |
| **Analytics Dashboard** | Track win rates, identify patterns |

### Success Criteria

| Metric | Target |
|--------|--------|
| Data sources active | 3+ (SAM.gov, eMMA, GovTribe) |
| Opportunities discovered/week | 200+ |
| Proposals submitted/week | 1-2 |
| Template reuse rate | 80%+ |

---

## Data Source Expansion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCE LANDSCAPE                               │
│                                                                             │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐             │
│  │    SAM.gov     │   │ Maryland eMMA  │   │   GovTribe     │             │
│  │   (Federal)    │   │ (State/Local)  │   │ (Intelligence) │             │
│  ├────────────────┤   ├────────────────┤   ├────────────────┤             │
│  │ • Free API     │   │ • Portal scrape│   │ • Paid API     │             │
│  │ • 10k/day      │   │ • MD/DC focus  │   │ • Enrichment   │             │
│  │ • Structured   │   │ • High signal  │   │ • Incumbents   │             │
│  └───────┬────────┘   └───────┬────────┘   └───────┬────────┘             │
│          │                    │                    │                       │
│          └────────────────────┼────────────────────┘                       │
│                               │                                            │
│                               ▼                                            │
│                    ┌─────────────────────┐                                 │
│                    │  CANONICAL SCHEMA   │                                 │
│                    │  (Unified RFP Model)│                                 │
│                    └─────────────────────┘                                 │
│                               │                                            │
│                               ▼                                            │
│                    ┌─────────────────────┐                                 │
│                    │   DEDUPLICATION     │                                 │
│                    │   ENGINE            │                                 │
│                    └─────────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Source Comparison

| Source | Coverage | API | Cost | Priority |
|--------|----------|-----|------|----------|
| **SAM.gov** | Federal | Yes (free) | Free | P1 ✅ |
| **Maryland eMMA** | State/Local | No (scrape) | Free | P1 |
| **GovTribe** | Federal + Intel | Yes | $200-500/mo | P2 |
| **BidNet/DemandStar** | State/Local | Limited | Varies | P3 |
| **Deltek GovWin** | Enterprise Intel | Web services | $$$$ | Future |

---

## Developer Implementation Guide

### Week 7-8: Multi-Source Integration (Days 43-56)

#### Day 43-48: Maryland eMMA Connector

**Note**: eMMA doesn't have a public API, so we use scheduled browser automation or RSS feeds.

**File: `convex/ingestion/emmaConnector.ts`**
```typescript
import { action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// eMMA opportunity structure (normalized from scraped data)
interface EmmaOpportunity {
  solicitationNumber: string;
  title: string;
  description: string;
  agency: string;
  closingDate: string;
  category: string;
  type: string; // RFP, IFB, RFQ
  url: string;
}

// For now, we'll use a manual import approach
// In production, this would connect to a scraping service
export const importFromEmma = action({
  args: {
    opportunities: v.array(
      v.object({
        solicitationNumber: v.string(),
        title: v.string(),
        description: v.string(),
        agency: v.string(),
        closingDate: v.string(),
        category: v.string(),
        type: v.string(),
        url: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.runMutation(internal.ingestion.logStart, {
      source: "emma",
    });

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const opp of args.opportunities) {
      try {
        // Detect eligibility flags
        const fullText = `${opp.title} ${opp.description}`;
        const eligibilityFlags = detectEligibilityFlags(fullText);

        const result = await ctx.runMutation(internal.rfps.upsert, {
          externalId: opp.solicitationNumber,
          source: "emma",
          title: opp.title,
          description: opp.description,
          location: "Maryland",
          category: opp.category,
          postedDate: Date.now(), // Use current if not available
          expiryDate: new Date(opp.closingDate).getTime(),
          url: opp.url,
          eligibilityFlags,
          rawData: opp,
        });

        if (result.action === "inserted") inserted++;
        else updated++;
      } catch (error) {
        errors.push(`${opp.solicitationNumber}: ${error}`);
      }
    }

    await ctx.runMutation(internal.ingestion.logComplete, {
      logId,
      recordsProcessed: args.opportunities.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
      errors: errors.length > 0 ? errors : undefined,
    });

    return { inserted, updated, errors: errors.length };
  },
});

function detectEligibilityFlags(text: string): string[] {
  const patterns = [
    { pattern: /maryland\s*(only|based)/i, flag: "maryland-only" },
    { pattern: /mbe|minority\s*business/i, flag: "mbe-required" },
    { pattern: /dbe|disadvantaged\s*business/i, flag: "dbe-required" },
    { pattern: /small\s*business/i, flag: "small-business" },
  ];

  return patterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ flag }) => flag);
}

// Scheduled check for eMMA (placeholder for when we add scraping)
export const checkEmmaRss = action({
  args: {},
  handler: async (ctx) => {
    // In production, this would:
    // 1. Fetch eMMA RSS feed or scrape the portal
    // 2. Parse opportunities
    // 3. Call importFromEmma

    console.log("eMMA RSS check - implement scraping service");
    return { message: "RSS check placeholder" };
  },
});
```

---

#### Day 49-52: GovTribe Integration

**File: `convex/ingestion/govtribe.ts`**
```typescript
import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// GovTribe API types
interface GovTribeOpportunity {
  id: string;
  title: string;
  description: string;
  agency: {
    name: string;
    subtier?: string;
  };
  naics: string[];
  setAside?: string;
  placeOfPerformance?: {
    state: string;
    city?: string;
  };
  responseDeadline: string;
  postedDate: string;
  url: string;
  // Enrichment data
  incumbents?: string[];
  contractHistory?: {
    vendor: string;
    value: number;
    period: string;
  }[];
  marketIntelligence?: {
    competitionLevel: "low" | "medium" | "high";
    estimatedValue?: number;
  };
}

export const ingestFromGovTribe = action({
  args: {
    daysBack: v.optional(v.number()),
    naicsCodes: v.optional(v.array(v.string())),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOVTRIBE_API_KEY;
    if (!apiKey) {
      throw new Error("GOVTRIBE_API_KEY not configured");
    }

    const logId = await ctx.runMutation(internal.ingestion.logStart, {
      source: "govtribe",
    });

    try {
      // Build query
      const params: Record<string, string> = {
        api_key: apiKey,
        posted_within_days: String(args.daysBack ?? 7),
      };

      if (args.naicsCodes?.length) {
        params.naics = args.naicsCodes.join(",");
      }

      if (args.keywords?.length) {
        params.q = args.keywords.join(" ");
      }

      const url = `https://api.govtribe.com/opportunities?${new URLSearchParams(params)}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`GovTribe API error: ${response.status}`);
      }

      const data = await response.json();
      const opportunities: GovTribeOpportunity[] = data.opportunities ?? [];

      let inserted = 0;
      let updated = 0;

      for (const opp of opportunities) {
        const fullText = `${opp.title} ${opp.description}`;

        // Include incumbent info in raw data for intelligence
        const enrichedData = {
          ...opp,
          hasIncumbent: opp.incumbents && opp.incumbents.length > 0,
          competitionLevel: opp.marketIntelligence?.competitionLevel,
        };

        const result = await ctx.runMutation(internal.rfps.upsert, {
          externalId: opp.id,
          source: "govtribe",
          title: opp.title,
          description: opp.description,
          location: opp.placeOfPerformance?.state ?? "USA",
          category: opp.naics?.[0] ?? "Unknown",
          naicsCode: opp.naics?.[0],
          setAside: opp.setAside,
          postedDate: new Date(opp.postedDate).getTime(),
          expiryDate: new Date(opp.responseDeadline).getTime(),
          url: opp.url,
          eligibilityFlags: detectFlags(fullText, opp),
          rawData: enrichedData,
        });

        if (result.action === "inserted") inserted++;
        else updated++;
      }

      await ctx.runMutation(internal.ingestion.logComplete, {
        logId,
        recordsProcessed: opportunities.length,
        recordsInserted: inserted,
        recordsUpdated: updated,
      });

      return { success: true, processed: opportunities.length, inserted, updated };
    } catch (error) {
      await ctx.runMutation(internal.ingestion.logFailed, {
        logId,
        error: String(error),
      });
      throw error;
    }
  },
});

function detectFlags(text: string, opp: GovTribeOpportunity): string[] {
  const flags: string[] = [];

  // Standard eligibility patterns
  if (/u\.?s\.?\s*(citizen|company|organization)\s*only/i.test(text)) {
    flags.push("us-org-only");
  }
  if (/security\s*clearance/i.test(text)) {
    flags.push("clearance-required");
  }
  if (opp.setAside) {
    flags.push(opp.setAside.toLowerCase().replace(/\s+/g, "-"));
  }

  // Intelligence flags
  if (opp.incumbents && opp.incumbents.length > 0) {
    flags.push("has-incumbent");
  }
  if (opp.marketIntelligence?.competitionLevel === "high") {
    flags.push("high-competition");
  }

  return flags;
}
```

---

#### Day 53-56: Deduplication Engine

**File: `convex/deduplication.ts`**
```typescript
import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Find potential duplicates
export const findDuplicates = internalQuery({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    const rfp = await ctx.db.get(args.rfpId);
    if (!rfp) return [];

    // Strategy 1: Same external ID from different source
    const byExternalId = await ctx.db
      .query("rfps")
      .filter((q) =>
        q.and(
          q.eq(q.field("externalId"), rfp.externalId),
          q.neq(q.field("_id"), args.rfpId)
        )
      )
      .collect();

    // Strategy 2: Title similarity (within same deadline window)
    const titleWords = rfp.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const deadlineWindow = 7 * 24 * 60 * 60 * 1000; // 7 days

    const byTitle = await ctx.db
      .query("rfps")
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), args.rfpId),
          q.gte(q.field("expiryDate"), rfp.expiryDate - deadlineWindow),
          q.lte(q.field("expiryDate"), rfp.expiryDate + deadlineWindow)
        )
      )
      .collect();

    // Score title similarity
    const similarTitles = byTitle.filter((other) => {
      const otherWords = other.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const overlap = titleWords.filter((w) => otherWords.includes(w));
      const similarity = overlap.length / Math.max(titleWords.length, otherWords.length);
      return similarity > 0.6; // 60% word overlap
    });

    return [...byExternalId, ...similarTitles];
  },
});

// Mark duplicates
export const markAsDuplicate = mutation({
  args: {
    rfpId: v.id("rfps"),
    duplicateOfId: v.id("rfps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get both RFPs
    const rfp = await ctx.db.get(args.rfpId);
    const primary = await ctx.db.get(args.duplicateOfId);

    if (!rfp || !primary) {
      throw new Error("RFP not found");
    }

    // Add duplicate flag
    const flags = rfp.eligibilityFlags || [];
    if (!flags.includes("duplicate")) {
      await ctx.db.patch(args.rfpId, {
        eligibilityFlags: [...flags, "duplicate", `duplicate-of:${args.duplicateOfId}`],
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get RFPs excluding duplicates
export const listUnique = query({
  args: {
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("rfps");

    if (args.source) {
      q = q.withIndex("by_source", (q) => q.eq("source", args.source));
    }

    const all = await q.order("desc").take((args.limit ?? 50) * 2); // Fetch more to account for dups

    // Filter out duplicates
    const unique = all.filter(
      (rfp) => !rfp.eligibilityFlags?.includes("duplicate")
    );

    return unique.slice(0, args.limit ?? 50);
  },
});
```

---

### Week 9-10: Proposal Machine (Days 57-70)

#### Day 57-60: Content Library Schema

**Add to `convex/schema.ts`:**
```typescript
  // Proposal templates
  proposalTemplates: defineTable({
    name: v.string(),
    type: v.string(), // "formal_rfp" | "unsolicited" | "capability_statement"
    description: v.string(),
    sections: v.array(v.object({
      id: v.string(),
      name: v.string(),
      order: v.number(),
      required: v.boolean(),
      guidance: v.string(),
      defaultContent: v.optional(v.string()),
      placeholders: v.array(v.string()),
    })),
    metadata: v.object({
      timesUsed: v.number(),
      lastUsed: v.optional(v.number()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"]),

  // Reusable content blocks
  contentBlocks: defineTable({
    name: v.string(),
    category: v.string(), // "technical" | "management" | "case_study" | etc.
    content: v.string(), // Markdown content
    keywords: v.array(v.string()), // For matching to RFPs
    metadata: v.object({
      timesUsed: v.number(),
      lastUpdated: v.number(),
    }),
  })
    .index("by_category", ["category"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["category"],
    }),

  // Case studies
  caseStudies: defineTable({
    title: v.string(),
    client: v.string(),
    industry: v.string(),
    isPublic: v.boolean(), // Can use client name
    challenge: v.string(),
    approach: v.string(),
    results: v.string(),
    technologies: v.array(v.string()),
    metrics: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
    timeline: v.string(),
    teamSize: v.number(),
    createdAt: v.number(),
  })
    .index("by_industry", ["industry"]),

  // Team member bios
  teamBios: defineTable({
    name: v.string(),
    role: v.string(),
    summary: v.string(),
    expertise: v.array(v.string()),
    certifications: v.array(v.string()),
    yearsExperience: v.number(),
    photoUrl: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_role", ["role"]),
```

---

#### Day 61-64: Proposal Assembly Engine

**File: `convex/proposals/assembly.ts`**
```typescript
import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Assemble a proposal from template + content
export const assembleProposal = action({
  args: {
    rfpId: v.id("rfps"),
    templateId: v.id("proposalTemplates"),
    selectedBlocks: v.array(v.id("contentBlocks")),
    selectedCaseStudies: v.array(v.id("caseStudies")),
    selectedTeam: v.array(v.id("teamBios")),
    customizations: v.optional(v.object({
      clientName: v.optional(v.string()),
      projectTitle: v.optional(v.string()),
      valueProposition: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Fetch all required data
    const rfp = await ctx.runQuery(internal.rfps.get, { id: args.rfpId });
    const template = await ctx.runQuery(internal.proposals.getTemplate, {
      id: args.templateId,
    });
    const blocks = await ctx.runQuery(internal.proposals.getBlocksByIds, {
      ids: args.selectedBlocks,
    });
    const caseStudies = await ctx.runQuery(internal.proposals.getCaseStudiesByIds, {
      ids: args.selectedCaseStudies,
    });
    const team = await ctx.runQuery(internal.proposals.getTeamByIds, {
      ids: args.selectedTeam,
    });

    if (!rfp || !template) {
      throw new Error("RFP or template not found");
    }

    // Start with template structure
    let proposal = `# ${args.customizations?.projectTitle || rfp.title}\n\n`;
    proposal += `**Prepared for:** ${args.customizations?.clientName || extractAgency(rfp.title)}\n`;
    proposal += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    proposal += `---\n\n`;

    // Process each section
    for (const section of template.sections.sort((a, b) => a.order - b.order)) {
      proposal += `## ${section.name}\n\n`;

      // Replace placeholders
      let content = section.defaultContent || section.guidance;

      // Standard placeholders
      content = content
        .replace(/\{\{CLIENT_NAME\}\}/g, args.customizations?.clientName || "the Client")
        .replace(/\{\{PROJECT_TITLE\}\}/g, args.customizations?.projectTitle || rfp.title)
        .replace(/\{\{SUBMISSION_DATE\}\}/g, new Date().toLocaleDateString());

      // Special section handling
      if (section.name.toLowerCase().includes("technical")) {
        // Insert capability blocks
        content = blocks.map((b) => `### ${b.name}\n\n${b.content}`).join("\n\n");
      } else if (section.name.toLowerCase().includes("past performance")) {
        // Insert case studies
        content = caseStudies.map(formatCaseStudy).join("\n\n---\n\n");
      } else if (section.name.toLowerCase().includes("team")) {
        // Insert team bios
        content = team.map(formatTeamBio).join("\n\n");
      }

      proposal += content + "\n\n";
    }

    // Save draft
    const wordCount = proposal.split(/\s+/).length;

    await ctx.runMutation(internal.pursuits.saveProposalDraft, {
      rfpId: args.rfpId,
      content: proposal,
      wordCount,
    });

    // Update usage stats
    await ctx.runMutation(internal.proposals.incrementTemplateUsage, {
      templateId: args.templateId,
    });

    return {
      content: proposal,
      wordCount,
      sectionsIncluded: template.sections.length,
    };
  },
});

function extractAgency(title: string): string {
  const match = title.match(/(?:for|from)\s+(?:the\s+)?([A-Z][A-Za-z\s]+)/i);
  return match ? match[1].trim() : "the Agency";
}

function formatCaseStudy(cs: any): string {
  return `### ${cs.title}

**Client:** ${cs.isPublic ? cs.client : "Federal Agency (confidential)"}
**Industry:** ${cs.industry}

**Challenge:**
${cs.challenge}

**Our Approach:**
${cs.approach}

**Results:**
${cs.results}

**Technologies:** ${cs.technologies.join(", ")}
**Timeline:** ${cs.timeline} | **Team Size:** ${cs.teamSize}`;
}

function formatTeamBio(bio: any): string {
  return `### ${bio.name}
**${bio.role}**

${bio.summary}

- **Expertise:** ${bio.expertise.join(", ")}
- **Certifications:** ${bio.certifications.join(", ")}
- **Experience:** ${bio.yearsExperience}+ years`;
}
```

---

#### Day 65-68: Content Matching

**File: `convex/proposals/contentMatcher.ts`**
```typescript
import { query } from "../_generated/server";
import { v } from "convex/values";

// Find content blocks that match an RFP
export const matchBlocksToRfp = query({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    const rfp = await ctx.db.get(args.rfpId);
    if (!rfp) return [];

    const blocks = await ctx.db.query("contentBlocks").collect();
    const rfpText = `${rfp.title} ${rfp.description}`.toLowerCase();

    // Score each block
    const scored = blocks.map((block) => {
      const matchedKeywords = block.keywords.filter((kw) =>
        rfpText.includes(kw.toLowerCase())
      );

      return {
        ...block,
        matchScore: matchedKeywords.length,
        matchedKeywords,
        relevance: matchedKeywords.length / block.keywords.length,
      };
    });

    // Return top matches
    return scored
      .filter((b) => b.matchScore > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  },
});

// Find case studies by technology/industry match
export const matchCaseStudiesToRfp = query({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    const rfp = await ctx.db.get(args.rfpId);
    if (!rfp) return [];

    const caseStudies = await ctx.db.query("caseStudies").collect();
    const rfpText = `${rfp.title} ${rfp.description}`.toLowerCase();

    const scored = caseStudies.map((cs) => {
      // Score by technology match
      const techMatches = cs.technologies.filter((tech) =>
        rfpText.includes(tech.toLowerCase())
      );

      // Bonus for industry match
      const industryMatch = rfpText.includes(cs.industry.toLowerCase()) ? 2 : 0;

      return {
        ...cs,
        matchScore: techMatches.length + industryMatch,
        matchedTechnologies: techMatches,
      };
    });

    return scored
      .filter((cs) => cs.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  },
});
```

---

#### Day 69-70: Analytics Dashboard

**File: `convex/analytics.ts`**
```typescript
import { query } from "./_generated/server";

export const getPipelineMetrics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get all data
    const rfps = await ctx.db.query("rfps").collect();
    const evaluations = await ctx.db.query("evaluations").collect();
    const pursuits = await ctx.db.query("pursuits").collect();

    // RFPs by source
    const bySource: Record<string, number> = {};
    for (const rfp of rfps) {
      bySource[rfp.source] = (bySource[rfp.source] || 0) + 1;
    }

    // Recent activity
    const recentRfps = rfps.filter((r) => r.ingestedAt >= weekAgo).length;
    const recentEvaluations = evaluations.filter((e) => e.evaluatedAt >= weekAgo).length;

    // Pursuit funnel
    const funnel = {
      total: pursuits.length,
      bid: pursuits.filter((p) => p.status === "bid" || p.decision === "pursue").length,
      submitted: pursuits.filter((p) => p.status === "submitted").length,
      won: pursuits.filter((p) => p.status === "won").length,
      lost: pursuits.filter((p) => p.status === "lost").length,
    };

    // Win rate (if we have data)
    const completed = funnel.won + funnel.lost;
    const winRate = completed > 0 ? (funnel.won / completed) * 100 : 0;

    // Score distribution
    const scoreRanges = {
      high: evaluations.filter((e) => e.score >= 70).length,
      medium: evaluations.filter((e) => e.score >= 50 && e.score < 70).length,
      low: evaluations.filter((e) => e.score < 50).length,
    };

    return {
      summary: {
        totalRfps: rfps.length,
        totalEvaluations: evaluations.length,
        totalPursuits: pursuits.length,
        winRate: Math.round(winRate),
      },
      thisWeek: {
        rfpsIngested: recentRfps,
        evaluationsRun: recentEvaluations,
      },
      bySource,
      funnel,
      scoreDistribution: scoreRanges,
    };
  },
});

export const getIngestionHistory = query({
  args: { daysBack: number },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.daysBack * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("ingestionLogs")
      .filter((q) => q.gte(q.field("startedAt"), cutoff))
      .order("desc")
      .take(100);

    return logs;
  },
});
```

---

## Testing Checklist

### Multi-Source
- [ ] eMMA import works
- [ ] GovTribe API connects
- [ ] Deduplication catches duplicates
- [ ] Source dashboard shows all sources

### Proposal Machine
- [ ] Templates load
- [ ] Content blocks match RFPs
- [ ] Case studies match by technology
- [ ] Proposal assembly generates valid document
- [ ] Word count accurate

### Analytics
- [ ] Pipeline metrics calculate
- [ ] Funnel shows correct numbers
- [ ] Win rate calculates (when data available)

---

## Operational Checklist (Go-Live)

Before declaring Phase 3 complete:

1. ✅ **3+ data sources active** (SAM.gov, eMMA, GovTribe)
2. ✅ **Weekly ingestion scheduled** (auto-runs every 6 hours)
3. ✅ **Content library seeded** (5+ capability blocks, 3+ case studies)
4. ✅ **Team bios added** (all active team members)
5. ✅ **1 proposal generated** using the system

---

## Post-Phase 3: Ongoing Operations

With the platform complete, establish these routines:

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Review new RFPs | Daily | BD Lead |
| Run evaluations | On new RFPs | Automated |
| Update content library | Monthly | Team |
| Add case studies | After each project | PM |
| Review analytics | Weekly | BD Lead |
| Submit proposals | Weekly | BD Team |

---

**Congratulations!** 🎉

With Phase 3 complete, you now have a fully operational RFP Discovery and Proposal Machine capable of:

- Ingesting 200+ opportunities weekly
- Scoring and recommending the best fits
- Generating pursuit briefs and compliance matrices
- Assembling proposals from reusable content

**Target**: 1+ qualified proposals per week → building track record → larger opportunities ($250k+)
