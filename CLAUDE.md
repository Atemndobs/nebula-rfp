# RFP Discovery Platform - AI Assistant Rules

> Global project instructions for Claude Code and other AI assistants.

## Project Context

**RFP Discovery** is an AI-powered platform for discovering, evaluating, and pursuing public-sector RFP opportunities. The goal is to transform from a discovery tool into a "proposal machine" for Nebula Logix.

---

## CRITICAL: Before Writing Any Code

### 1. Check the Implementation Plan

**ALWAYS** consult `docs/implementation-plan/` before writing code:

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Multi-source Ingestion + Canonical Schema | Weeks 1-2 |
| Phase 2 | Eligibility Gate (P0 HIGHEST PRIORITY) | Weeks 3-4 |
| Phase 3 | 6-Dimension Scoring | Weeks 5-6 |
| Phase 4 | Pursuit Workflow | Weeks 7-8 |
| Phase 5 | Proposal Templates | Weeks 9-10 |
| Phase 6 | Convex + RBAC + Audit | Weeks 11-12 |

### 2. Do NOT Redesign What Works

Existing views that **MUST remain intact**:
- **Home View**: RFPs, filters, shortlist, CSV export
- **Data View**: Raw API records
- **Admin View**: Tabbed interface with Data Sources, AI, Evaluation, Settings
- **Theme Toggle**: Light/Dark

**All changes must be ADDITIVE, not rewrites.**

### 3. Admin View Tab Structure

The Admin view uses a **tabbed interface** to organize settings. When adding new admin features, place them in the appropriate tab:

| Tab | Contents |
|-----|----------|
| **Data Sources** | Source connectors, CSV upload, Ingestion logs |
| **AI Settings** | Provider config, prompts, system instructions |
| **Evaluation** | Eligibility rules, Criteria settings |
| **Settings** | Auto-refresh interval, Provider status |

**Key files:**
- `components/AdminView.tsx` - Main tabbed component
- `components/admin/*.tsx` - Individual section components

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript 5.7 |
| Build | Vite 6.2 |
| Database | **Convex** (real-time serverless) |
| Auth | **Clerk** |
| Styling | TailwindCSS |
| AI | Gemini (primary), OpenAI, Anthropic, DeepSeek |

## Critical Patterns

### ✅ DO

- Use Convex for all persistent data (not localStorage)
- Use Clerk for authentication
- Check `ctx.auth.getUserIdentity()` in all mutations
- Use `.take(limit)` with Convex queries, never `.collect()` unbounded
- **Use stats aggregation tables for counts** (see `convex/stats.ts`)
- **Use conditional query loading with `"skip"`** when data isn't immediately needed
- **Use batch operations with `hasMore` pattern** for large deletions
- Use design tokens from Tailwind config
- Type everything explicitly with TypeScript
- Create feature planning docs before implementing

### ❌ DON'T

- Store API keys in localStorage or client code
- Use `as any` type coercion
- Skip auth checks in Convex mutations
- Use `.collect()` without limits on large tables
- **Use large `.take()` limits** (e.g., `.take(1000)`) on heavyweight tables - even bounded queries can cause bandwidth issues
- **Load full document lists just to count them** - use aggregation tables instead
- Hardcode colors - use design tokens
- Implement features without planning docs

## Key Files

| File | Purpose |
|------|---------|
| `docs/implementation-plan/README.md` | **Master implementation plan** |
| `docs/implementation-plan/architecture/` | System architecture & schema |
| `.claude/rules.md` | Detailed coding conventions |
| `.claude/skills/*/SKILL.md` | Feature-specific skills |
| `convex/schema.ts` | Database schema |
| `convex/stats.ts` | **Stats aggregation for bandwidth optimization** |
| `types.ts` | TypeScript interfaces |
| `docs/features/TEMPLATE.md` | Feature planning template |
| `GEMINI.md` | Strategic context (AWS goals, target profile) |

## Available Skills

Invoke skills with `/skill-name` when working on related features:

| Skill | Use For |
|-------|---------|
| `/rfp-ingest` | Adding RFP data sources (SAM.gov, eMMA) |
| `/rfp-evaluate` | Evaluation criteria and scoring |
| `/pursuit-brief` | Pursuit brief generation |
| `/compliance-matrix` | Requirements tracking |
| `/proposal-builder` | Proposal templates and content |
| `/convex-patterns` | Convex queries/mutations |
| `/clerk-auth` | Authentication flows |
| `/csv-export` | Data export features |

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
  args: { ... },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    // ...
  },
});
```

### Component Pattern
```tsx
function FeatureComponent() {
  const data = useQuery(api.feature.list, { limit: 50 });

  if (data === undefined) return <LoadingSpinner />;

  return <div>...</div>;
}
```

### Conditional Query Loading (Skip Pattern)
```tsx
// Only load data when user requests it
const [wantsExport, setWantsExport] = useState(false);
const exportData = useQuery(api.feature.export, wantsExport ? {} : "skip");

// Data won't load until button is clicked
<button onClick={() => setWantsExport(true)}>Export</button>
```

### Stats Aggregation Pattern
```typescript
// Instead of: ctx.db.query("evaluations").collect().length
// Use pre-computed stats:
const cached = await ctx.db
  .query("statsAggregation")
  .withIndex("by_key", (q) => q.eq("key", "eligibility"))
  .first();
return cached?.counts.total ?? 0;
```

### Batch Deletion Pattern
```typescript
// Delete in batches to avoid timeouts and reduce bandwidth
export const resetAll = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batch = await ctx.db.query("items").take(args.batchSize ?? 100);
    for (const item of batch) await ctx.db.delete(item._id);
    return { deleted: batch.length, hasMore: batch.length === (args.batchSize ?? 100) };
  },
});
```

## Development Commands

```bash
npm run dev          # Start Vite (port 5173)
npx convex dev       # Start Convex (separate terminal)
npm run build        # Production build
npx convex deploy    # Deploy Convex
```

## Before Implementing Features

1. **Check `docs/implementation-plan/`** to see where the feature fits
2. **Verify what already exists** — don't rebuild working features
3. **Review relevant skills** in `.claude/skills/`
4. **Follow execution order** — eligibility BEFORE scoring
5. **Create feature docs** in `docs/features/[feature-name]/` if needed
6. **Follow coding conventions** in `.claude/rules.md`

## Mermaid Diagram Rule

When creating Mermaid diagrams, **ALWAYS quote labels with special characters**:

```mermaid
%% ❌ Wrong - will break
A[Status: Active]

%% ✅ Correct
A["Status: Active"]
```

Characters that need quoting: `()`, `[]`, `{}`, `:`, `|`, `>`, `<`, `&`, `?`
