# Nebula Logix RFP Discovery & Evaluation Tool

## Project Overview

**RFP Discovery & Evaluation Tool** is an AI-powered application for Nebula Logix that discovers, filters, and evaluates RFP (Request for Proposal) opportunities from multiple sources.

### Mission
Transform RFP discovery from manual process into an automated "pursuit decision system" that:
- Aggregates opportunities from multiple platforms
- Filters out ineligible opportunities automatically
- Scores opportunities against Nebula Logix capabilities
- Accelerates proposal preparation

---

## ⚠️ Architecture Mandate (CRITICAL)

> **Non-Negotiable: Build on what exists. DO NOT redesign.**

The current system has working views that **must remain intact**:
- **Home View**: Processed RFPs, filters, shortlist actions, CSV export
- **Data View**: Raw API records
- **Admin View**: Configuration controls (AI provider, criteria, refresh)
- **Theme Toggle**: Light/Dark mode

**All changes must be additive enhancements, not redesigns.**

### What "Additive" Means

| ✅ Allowed                                | ❌ Forbidden                       |
| ---------------------------------------- | --------------------------------- |
| Add new badge component to existing card | Redesign card layout              |
| Add new Admin panel below existing ones  | Reorganize Admin structure        |
| Add new service alongside existing ones  | Replace existing service patterns |
| Extend existing types                    | Remove or rename existing types   |

### Implementation Order Matters

When building new features, follow this execution order to avoid rework:
1. **Schema/Types first** (no UI changes)
2. **Backend services** (no UI changes)
3. **Minimal UI additions** (badges, buttons, panels)

---

## 📋 Implementation Plan Alignment (REQUIRED)

> **Before writing any code, check the implementation plan.**

### Master Implementation Plan

**ALWAYS** consult `docs/implementation-plan/` before writing code:

| Phase   | Focus                                      | Timeline    |
| ------- | ------------------------------------------ | ----------- |
| Phase 1 | Multi-source Ingestion + Canonical Schema  | Weeks 1-2   |
| Phase 2 | **Eligibility Gate (P0 HIGHEST PRIORITY)** | Weeks 3-4   |
| Phase 3 | 6-Dimension Scoring                        | Weeks 5-6   |
| Phase 4 | Pursuit Workflow                           | Weeks 7-8   |
| Phase 5 | Proposal Templates                         | Weeks 9-10  |
| Phase 6 | Convex + RBAC + Audit                      | Weeks 11-12 |

> **CRITICAL**: Eligibility Gate (Phase 2) runs BEFORE scoring (Phase 3). Convex persistence comes LAST in Phase 6.

### Pre-Implementation Checklist

Before implementing any feature, the agent MUST:

1. **Check the master plan** at `docs/implementation-plan/README.md`
2. **Find the relevant phase** and read its README.md
3. **Verify what already exists** — don't rebuild working features
4. **Follow the execution order** — eligibility comes BEFORE scoring
5. **Stay aligned with the plan** — don't deviate without explicit approval

### During Implementation

| Step | Action                                    |
| ---- | ----------------------------------------- |
| 1    | Open the relevant `IMPLEMENTATION.md`     |
| 2    | Find your current task in the checklist   |
| 3    | Follow the specified file changes exactly |
| 4    | Mark tasks as complete when done          |
| 5    | Update the plan if scope changes          |

### If No Plan Exists

**Create one before coding.** Use the standard structure:
```
docs/features/[feature-name]/
├── README.md           # Concept overview and goals
├── ARCHITECTURE.md     # Technical design and data flow
└── IMPLEMENTATION.md   # Step-by-step implementation plan
```

---

## 📊 Mermaid Diagram Guidelines

When creating Mermaid diagrams in documentation, follow these rules to avoid rendering errors:

### Critical: Quote Special Characters

**Always quote node labels containing special characters:**

| Character           | Example        | ❌ Wrong           | ✅ Correct           |
| ------------------- | -------------- | ----------------- | ------------------- |
| Parentheses `()`    | "Label (Info)" | `A[Label (Info)]` | `A["Label (Info)"]` |
| Brackets `[]`       | "Array [0]"    | `A[Array [0]]`    | `A["Array [0]"]`    |
| Angle brackets `<>` | "Id<table>"    | `A[Id<table>]`    | `A["Id<table>"]`    |
| Ampersand `&`       | "A & B"        | `A[A & B]`        | `A["A & B"]`        |
| Colon `:`           | "Key: Value"   | `A[Key: Value]`   | `A["Key: Value"]`   |
| HTML entities       | "5 > 3"        | `A[5 > 3]`        | `A["5 > 3"]`        |

### Avoid HTML Tags in Labels

```mermaid
%% ❌ Wrong - HTML breaks rendering
A[<b>Bold Label</b>]

%% ✅ Correct - Plain text or markdown
A["**Bold Label**"]
```

### Use Subgraph Labels Properly

```mermaid
%% ✅ Correct
subgraph Sources["📥 Data Sources"]
    A[SAM.gov]
    B[RFPMart]
end
```

### Diagram Templates

**System Architecture:**
```mermaid
flowchart TB
    subgraph External["External Services"]
        A["Service A"]
        B["Service B"]
    end
    
    subgraph Core["Core System"]
        C["Component C"]
        D["Component D"]
    end
    
    A --> C
    B --> D
```

**State Machine:**
```mermaid
stateDiagram-v2
    [*] --> New
    New --> Processing: Start
    Processing --> Complete: Success
    Processing --> Failed: Error
    Complete --> [*]
    Failed --> [*]
```

**Sequence Diagram:**
```mermaid
sequenceDiagram
    participant U as User
    participant S as Service
    participant D as Database
    
    U->>S: Request
    S->>D: Query
    D-->>S: Result
    S-->>U: Response
```

## Tech Stack

### Current Implementation
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Inline styles (CSS-in-JS pattern)
- **State Management**: React hooks (useState, useEffect, useCallback, useMemo)
- **AI Integration**: Multi-provider support (Gemini, OpenAI, Anthropic, Groq, DeepSeek, Ollama, LM Studio)
- **Data Source**: FastAPI backend at `fastapi.curator.atemkeng.eu`
- **Build**: Vite with TypeScript
- **Deployment**: Docker with Nginx

### Planned Additions
- **Database**: Convex (real-time backend)
- **Authentication**: Clerk (user authentication)

## Strategic Context

### AWS Partnership Goals
- Currently a registered AWS partner (lowest tier)
- Goal: Advance through partnership levels via documented project deliveries
- Target: Meet ARR targets ($1,500/month minimum) through AWS Marketplace
- Strategy: Drive all business through AWS to build partnership credentials

### Target Project Profile
| Attribute        | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| Budget Range     | Under $100k initially                                                           |
| Ideal Scope      | Website redesigns, custom portals, cloud migration, API integration, serverless |
| Geography        | U.S.-based (federal, state, local)                                              |
| Minimum Deadline | 5 days out for proposal preparation                                             |

### RFP Platforms to Integrate
1. **SAM.gov** - Federal opportunities (API available)
2. **eMMA** - Maryland state/local
3. **BidNet Direct** - Broad U.S. public-sector
4. **DemandStar** - State/local agencies
5. **GovTribe** - Market intelligence + API
6. **RFPMart** - Current source

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

## Architecture

### Directory Structure
```
rfp-discovery/
├── App.tsx                    # Main application component
├── types.ts                   # TypeScript interfaces and enums
├── constants.ts               # Evaluation criteria, AI configs
├── components/
│   ├── AdminView.tsx          # Settings and configuration
│   ├── FilterControls.tsx     # RFP filtering interface
│   ├── RfpCard.tsx            # Individual RFP display
│   ├── RawDataView.tsx        # Raw API data viewer
│   ├── SelectionControls.tsx  # Bulk selection actions
│   ├── Modal.tsx              # Reusable modal
│   ├── ThemeSwitcher.tsx      # Dark/light theme toggle
│   └── ViewSwitcher.tsx       # View navigation
├── services/
│   ├── rfpDataService.ts      # RFP fetching from FastAPI
│   ├── evaluationService.ts   # RFP evaluation logic
│   ├── fitAnalysisService.ts  # AI-powered fit analysis
│   ├── geminiService.ts       # Google Gemini integration
│   ├── openaiService.ts       # OpenAI integration
│   └── csvExportService.ts    # Export functionality
├── convex/                    # Convex backend (to be added)
│   ├── schema.ts              # Database schema
│   └── [resource].ts          # Queries/mutations per resource
└── docs/features/             # Feature planning docs
```

### Data Flow
1. **Fetch**: RFPs scraped from platforms via FastAPI backend
2. **Normalize**: Raw API data transformed to `RFP` interface
3. **Evaluate**: Each RFP scored against 6 criteria (via AI or keyword matching)
4. **Display**: Scored RFPs shown in filterable, sortable interface
5. **Export**: Selected RFPs exportable to CSV

## Evaluation Criteria (6-Dimension Scoring)

| Criterion               | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| **Technical Relevance** | Matches tech stack (React, AWS, serverless, TypeScript)      |
| **Scope Fit**           | Project type alignment (redesign, portal, cloud migration)   |
| **Category Focus**      | Preferred categories (web-design, software-dev, IT-services) |
| **Client Profile**      | U.S. agencies, agile-friendly organizations                  |
| **Logistics**           | Remote-friendly, sufficient deadline, clear SOW              |
| **Skill Set Alignment** | Required roles match team composition                        |

### Eligibility Gating (Before Scoring)

| Pattern                       | Result                  |
| ----------------------------- | ----------------------- |
| "USA organization only"       | Reject or Needs Partner |
| "Security clearance required" | Reject                  |
| "On-site presence required"   | Reject                  |
| "Must be located in [State]"  | Evaluate                |

### AI Response Backward Compatibility

The current AI returns:
```json
{"foundKeywords": [...], "isMatch": true/false}
```

**Extended format (optional, preferred):**
```json
{
  "foundKeywords": [...],
  "isMatch": true/false,
  "confidence": 0.85,
  "evidenceSnippets": ["...relevant excerpt..."],
  "detectedConstraints": ["USA-only", "onsite-required"]
}
```

**Compatibility Rule:**
- If AI returns only the old JSON → system still works
- If AI returns extended JSON → store and display evidence

## Coding Standards

### TypeScript Guidelines
- Use strict TypeScript with explicit type annotations
- Define interfaces in `types.ts` for all data structures
- Prefer enums for fixed sets of values (e.g., `EvaluationCriterionKey`, `AiProvider`)

### Type Safety (Critical)

| ❌ Avoid                 | ✅ Use Instead                                        |
| ----------------------- | ---------------------------------------------------- |
| `as any`                | Proper type definitions                              |
| Untyped fallback arrays | Type with proper interface or `satisfies`            |
| Coerced Convex IDs      | `Id<"tableName">` from `convex/_generated/dataModel` |

```typescript
// ❌ Bad
const rfps = data as any;

// ✅ Good
const rfps: RFPWithEvaluation[] = data;
```

### React Patterns
- Functional components with hooks only
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive computations
- Keep components focused - extract to new files when > 300 lines

### Naming Conventions
| Type             | Convention          | Example                 |
| ---------------- | ------------------- | ----------------------- |
| Components       | PascalCase          | `RfpCard.tsx`           |
| Services         | camelCase + Service | `geminiService.ts`      |
| Types/Interfaces | PascalCase          | `RFPWithEvaluation`     |
| Constants        | UPPER_SNAKE_CASE    | `MIN_DEADLINE_DAYS_OUT` |

### State Management
- Local state via `useState` for component-specific data
- `localStorage` for persistence (criteria config, AI settings)
- **Future**: Convex for persistent, shared state

## Feature Planning (Required)

> [!IMPORTANT]
> **Before writing ANY code, check if an implementation plan exists and align with it.**

### Step 1: Check for Existing Plan

Before implementing a feature, ALWAYS check `docs/features/` for an existing plan:

```bash
# Check if plan exists
ls docs/features/[feature-name]/
```

**If plan exists:**
1. Read `IMPLEMENTATION.md` first
2. Identify which tasks are completed (✅) vs pending
3. Follow the specified file changes exactly
4. Don't deviate from the plan without approval

**If no plan exists:**
Create one using this structure:

```
docs/features/[feature-name]/
├── README.md           # Concept overview and goals
├── ARCHITECTURE.md     # Technical design and data flow
└── IMPLEMENTATION.md   # Step-by-step implementation plan
```

### Step 2: Understand the Architecture

**README.md** should include:
- Feature concept and user value
- Scope and requirements
- Success criteria
- Diagrams for executive understanding

**ARCHITECTURE.md** should include:
- System diagrams (using Mermaid with proper quoting)
- Data model definitions
- Component relationships
- Implementation notes for developers

**IMPLEMENTATION.md** should include:
- Step-by-step execution order
- Specific file changes with code examples
- Testing approach and verification criteria
- Completion checklist

### Step 3: Stay Aligned

| ✅ Do                                   | ❌ Don't                          |
| -------------------------------------- | -------------------------------- |
| Follow the execution order in the plan | Jump ahead to later steps        |
| Use file changes specified in the plan | Create new files not in the plan |
| Mark tasks complete as you go          | Forget to update the checklist   |
| Ask before deviating from plan         | Redesign without approval        |

## Development Workflows

### Local Development
```bash
npm install           # Install dependencies
npm run dev           # Start Vite dev server
npx convex dev        # Start Convex (when integrated)
```

### Build & Deploy
```bash
npm run build         # Production build
npm run preview       # Preview production build
docker-compose up     # Deploy with Docker
```

### Environment Variables
Required in `.env.local`:
- `VITE_GEMINI_API_KEY` - Gemini API key (or `API_KEY`)
- `VITE_CONVEX_URL` - Convex deployment URL (future)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key (future)

## Implementation Phases (CTO-Approved Order)

> **Build Order**: Ingestion → Eligibility → Scoring → Pipeline → Proposals → Persistence (Convex last)

### Phase 1: Multi-Source Ingestion (Weeks 1-2)
- Canonical opportunity schema
- SAM.gov API integration
- eMMA scraper connector
- Cross-source deduplication
- Sources Admin panel

### Phase 2: Eligibility Gate — P0 HIGHEST PRIORITY (Weeks 3-4)
- 7 hard filters (US-org, clearance, set-asides, onsite, deadline, domain, category)
- Eligibility Rules Admin panel
- Evidence snippets for decisions
- Outputs: ELIGIBLE | PARTNER_REQUIRED | REJECTED

### Phase 3: 6-Dimension Scoring (Weeks 5-6)
- Binary scoring (0/1 per dimension)
- Keyword configurations per dimension
- Negative keywords dictionary
- Threshold: ≥4/6 = Good Fit

### Phase 4: Pursuit Workflow (Weeks 7-8)
- Pipeline stages (New → Triage → Bid/No-Bid → Capture → Submit)
- Bid/No-Bid checklist
- Owner assignment
- Deadline alerts

### Phase 5: Proposal Templates (Weeks 9-10)
- Template library
- Content snippets
- Pursuit brief generator
- Compliance matrix

### Phase 6: Production (Weeks 11-12)
- Complete Convex schema migration
- Clerk authentication + RBAC
- Audit logging
- Performance optimization

## Skills Reference

Use skills in `.gemini/skills/` for specialized guidance:

| Skill                | Use For                                 |
| -------------------- | --------------------------------------- |
| `rfp-ingest`         | Adding RFP data sources (SAM.gov, eMMA) |
| `rfp-evaluate`       | Evaluation criteria and scoring         |
| `pursuit-brief`      | Pursuit brief generation                |
| `compliance-matrix`  | Requirements tracking                   |
| `proposal-templates` | Proposal templates and content          |
| `convex-setup`       | Convex queries/mutations                |
| `auth-clerk`         | Authentication flows                    |
| `csv-export`         | Data export features                    |
| `architecture-docs`  | Mermaid diagrams and documentation      |

**Invoke skills by reading the SKILL.md file before implementing related features.**

## Key Files Reference

| File                                     | Purpose                        |
| ---------------------------------------- | ------------------------------ |
| `docs/implementation-plan/README.md`     | **Master implementation plan** |
| `docs/implementation-plan/architecture/` | System architecture & schema   |
| `.gemini/skills/*/SKILL.md`              | Feature-specific skills        |
| `convex/schema.ts`                       | Database schema                |
| `src/types.ts`                           | TypeScript interfaces          |
| `docs/features/TEMPLATE.md`              | Feature planning template      |
