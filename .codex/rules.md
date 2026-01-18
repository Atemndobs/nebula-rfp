# RFP Discovery & Evaluation Platform - Codex Rules

## Project Overview

**RFP Discovery** is an AI-powered RFP discovery and evaluation platform designed to transform from a discovery tool into a "proposal machine" for Nebula Logix. Business goal: establish Nebula Logix as a serious public-sector bidder with at least one proposal submission per week.

---

## CRITICAL: Before Writing Any Code

### 1. Check the Implementation Plan FIRST

**ALWAYS** consult `docs/implementation-plan/` before coding. Eligibility (Phase 2) precedes scoring (Phase 3); Convex/Clerk come later (Phase 6).

### 2. Additive Changes Only (No Redesigns)

Keep existing views intact: **Home** (RFPs, filters, shortlist, CSV export), **Data** (raw API records), **Admin** (tabbed Data Sources / AI / Evaluation / Settings), **Theme Toggle** (light/dark). Extend rather than replace layouts, services, or types. All changes must be ADDITIVE, not rewrites.

### 3. Admin View Tab Structure

| Tab | Contents |
|-----|----------|
| **Data Sources** | Source connectors, CSV upload, Ingestion logs |
| **AI Settings** | Provider config, prompts, system instructions |
| **Evaluation** | Eligibility rules, Criteria settings |
| **Settings** | Auto-refresh interval, Provider status |

**Key files:** `components/AdminView.tsx`, `components/admin/*.tsx`

### 4. Execution Order

Schema/types → backend services → minimal UI additions. Do not start Convex migrations before feature logic is validated.

### 5. Existing Admin Capabilities (treat as v1)

| Capability | Status | Notes |
|------------|--------|-------|
| Auto Refresh Scheduler | ✅ Exists | Configurable interval (default 24h) |
| AI Provider Selection | ✅ Exists | Gemini/OpenAI/Anthropic/Groq/DeepSeek/Ollama/LM Studio |
| AI Analysis Toggle | ✅ Exists | Fallback to keyword matching |
| Core Prompt Template | ✅ Exists | `{{TEXT_TO_ANALYZE}}` + `{{TARGET_KEYWORDS_LIST}}` |
| Per-criterion Instructions | ✅ Exists | Technical Relevance, Scope Fit, Skill Alignment |
| Evaluation Criteria | ✅ Exists | 6 criteria with enable/disable and keywords |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 19.1 + TypeScript 5.7 | UI |
| Build | Vite 6.2 | Dev & bundling |
| Styling | TailwindCSS | Design tokens + utilities |
| Database | Convex | Real-time backend (future) |
| Auth | Clerk | Authentication & user management |
| AI | Gemini (primary) + OpenAI/Anthropic/DeepSeek/Groq | Evaluation |

## Directory Structure (current + planned)

```
rfp-discovery/
├── App.tsx                     # Main application component
├── types.ts                    # TypeScript interfaces and enums
├── constants.ts                # Evaluation criteria, AI configs
├── components/                 # UI components
├── services/                   # API/AI helpers
├── convex/                     # Convex backend (to be added)
│   ├── schema.ts               # Database schema
│   ├── stats.ts                # Aggregation tables
│   └── [resource].ts           # Queries/mutations per resource
├── docs/features/              # Feature planning docs
└── .codex/                     # Codex rules & skills
```

## Build Order (CTO-approved)

Ingestion → Eligibility → Scoring → Pipeline → Proposals → Persistence (Convex/Clerk last).

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/implementation-plan/README.md` | **Master implementation plan** |
| `docs/implementation-plan/architecture/` | System architecture & schema |
| `.codex/rules.md` | Codex-specific coding conventions |
| `.codex/skills/*/SKILL.md` | Feature-specific skills |
| `convex/schema.ts` | Database schema |
| `convex/stats.ts` | Stats aggregation for bandwidth optimization |
| `types.ts` | TypeScript interfaces |
| `docs/features/TEMPLATE.md` | Feature planning template |
| `GEMINI.md` | Strategic context (AWS goals, target profile) |

---

## Code Conventions

### TypeScript Guidelines

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| `any` or `as any` | Proper interfaces from `types.ts` or `satisfies` |
| Implicit return types | Explicit return types |
| Magic strings | Enums or const objects |

### React Patterns

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| Class components | Functional components with hooks |
| Props drilling (3+ levels) | Context or Convex queries |
| Inline styles | Tailwind utility classes |
| Components > 300 lines | Extract to new files |
| `useEffect` for data fetching | Convex `useQuery` |
| Always-on queries before user action | Conditional query loading with `"skip"` |

### Convex Patterns

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| LocalStorage for persistent data | Convex tables + queries/mutations |
| Unbounded `.collect()` | `.take(limit)` for pagination |
| Large `.take()` (e.g., 1000) on heavy tables | Paginated `.take(limit)` with `hasMore` loop |
| Mutations without auth guard | `ctx.auth.getUserIdentity()` |
| Client-side API keys | Convex environment variables |
| Loading full collections to count | Stats aggregation tables (`convex/stats.ts`) |
| Single-shot bulk deletes | Batched deletes with `hasMore` pattern |
| Stringly Convex IDs | `Id<"table">` types |

### Styling with Tailwind

Use design tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `text-primary`, `text-success`, `text-destructive`, etc.). Do not hardcode colors like `#1a1a1a` or `bg-black`.

---

## Evaluation System

### 6-Dimension Scoring Framework

| Dimension | Weight | Keywords/Criteria |
|-----------|--------|-------------------|
| Technical Relevance | 25% | aws, cloud, serverless, react, api, kubernetes |
| Scope Fit | 20% | website redesign, platform modernization, cloud migration |
| Category Focus | 15% | public sector, federal, state, IT services |
| Client Profile | 15% | federal/state agency, tech-forward |
| Logistics | 15% | Remote feasibility, timeline ≥5 days, scope clarity |
| Skill Alignment | 10% | frontend, backend, full-stack, devops, qa |

### Eligibility Gating (Hard Disqualifiers)

| Pattern | Result |
|---------|--------|
| "USA organization only" | Reject or Needs Partner |
| "Security clearance required" | Reject |
| "On-site presence required" | Reject |
| "Must be located in [State]" | Evaluate |

### Chaseability Score Thresholds

| Score | Recommendation |
|-------|----------------|
| ≥70% | **Pursue** |
| 50-69% | **Maybe** |
| <50% | **Skip** |

### AI Response Compatibility

Accept legacy `{ foundKeywords, isMatch }` or extended `{ foundKeywords, isMatch, confidence, evidenceSnippets, detectedConstraints }`. Store evidence when available.

---

## Pursuit Workflow

```
New → Triage → Bid/No-Bid
                 ↓
           [Bid] → Capture → Draft → Review → Submit
                 ↓
           [No-Bid] → Archive with reason
```

Statuses: `new`, `triage`, `bid`, `no-bid`, `capture`, `draft`, `review`, `submitted`, `won`, `lost`.

---

## RFP Data Sources (Priority)

| Source | Priority | API Available | Region |
|--------|----------|---------------|--------|
| SAM.gov | P1 | Yes | Federal |
| Maryland eMMA | P1 | No (scrape) | State |
| RFPMart | Current | Yes | Mixed |
| GovTribe | P2 | Yes (paid) | Federal |
| BidNet/DemandStar | P3 | Varies | State/Local |

---

## Environment Variables

### Required (.env.local)

```
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Convex Dashboard (server-side)

```
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
GEMINI_API_KEY=...
OPENAI_API_KEY=...
SAM_GOV_API_KEY=...
```

---

## Development Workflows

```bash
npm run dev          # Start Vite dev server (port 5173)
npx convex dev       # Start Convex dev server (separate terminal)
npm run build        # Production build
npm run preview      # Preview build
npx convex deploy    # Deploy Convex
```

### Git Workflow

- Branch naming: `feature/`, `fix/`, `chore/`
- Commit messages: Present tense, imperative ("Add feature")

---

## Feature Planning (Required)

Before implementing any new feature, ensure a plan exists in `docs/features/[feature-name]/`:

```
docs/features/[feature-name]/
├── README.md           # Concept and goals
├── ARCHITECTURE.md     # Technical design (Mermaid diagrams with quoted labels)
└── IMPLEMENTATION.md   # Step-by-step plan and checklist
```

If no plan exists, create one before coding. Follow execution order and mark tasks complete as you go.

---

## Documentation Standards

- Use Mermaid for diagrams; **quote any label containing special characters** (`()`, `[]`, `{}`, `:`, `|`, `<`, `>`, `&`, `?`).
- Avoid HTML tags inside Mermaid labels.
- Provide ASCII diagrams for simple flows when Mermaid is overkill.

---

## Security Guidelines

| ❌ Never | ✅ Always |
|----------|-----------|
| Store API keys in localStorage | Use Convex environment variables |
| Make AI calls from client | Route through Convex actions |
| Trust client-side auth state | Verify with `ctx.auth.getUserIdentity()` |
| Commit `.env.local` | Keep secrets out of git |

---

## Quick Reference

### Convex Query Pattern
```typescript
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rfps")
      .order("desc")
      .take(args.limit ?? 50);
  },
});
```

### Authenticated Mutation Pattern
```typescript
export const create = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    // ...
  },
});
```

### Conditional Query Loading (Skip Pattern)
```tsx
const [shouldLoad, setShouldLoad] = useState(false);
const result = useQuery(api.feature.list, shouldLoad ? { limit: 50 } : "skip");

<button onClick={() => setShouldLoad(true)}>Load data</button>;
```

### Stats Aggregation Pattern
```typescript
const cached = await ctx.db
  .query("statsAggregation")
  .withIndex("by_key", (q) => q.eq("key", "eligibility"))
  .first();
return cached?.counts.total ?? 0;
```

### Batch Deletion Pattern
```typescript
export const resetAll = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batch = await ctx.db.query("items").take(args.batchSize ?? 100);
    for (const item of batch) await ctx.db.delete(item._id);
    return { deleted: batch.length, hasMore: batch.length === (args.batchSize ?? 100) };
  },
});
```

---

## Available Skills

Use `.codex/skills/*/SKILL.md` for deeper guidance:

- `rfp-ingest`: Adding RFP data sources and normalization
- `rfp-evaluate`: Eligibility and 6-dimension scoring
- `pursuit-brief`: Pursuit brief generation
- `compliance-matrix`: Requirements tracking
- `proposal-builder`: Proposal assembly from templates/content blocks
- `convex-patterns`: Convex queries/mutations patterns
- `clerk-auth`: Authentication flows with Clerk
- `csv-export`: Data export and CSV tooling
- `architecture-docs`: Architecture documentation and Mermaid patterns

---

## Type Definitions Reference

```typescript
interface RFP {
  id: string;
  externalId: string;
  source: string;
  title: string;
  description: string;
  location: string;
  category: string;
  postedDate: number;
  expiryDate: number;
  url: string;
}

interface Evaluation {
  rfpId: Id<"rfps">;
  score: number;
  isFit: boolean;
  criteriaResults: CriterionResult[];
  eligibility: EligibilityResult;
}

interface Pursuit {
  rfpId: Id<"rfps">;
  status: PursuitStatus;
  decision: "pursue" | "maybe" | "skip";
  brief?: PursuitBrief;
  complianceMatrix?: ComplianceMatrix;
}
```
