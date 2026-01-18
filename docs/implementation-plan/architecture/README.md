# System Architecture

This document provides architectural views for different audiences:
- **Executives**: Business capability view
- **Engineers**: Technical component view
- **Junior Devs**: Implementation detail view

---

## Executive Architecture

*"What does the system do and why does it matter?"*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    RFP DISCOVERY & PROPOSAL MACHINE                         │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌───────────┐  │  │
│  │   │  DISCOVER  │   │  QUALIFY   │   │   DECIDE   │   │  PROPOSE  │  │  │
│  │   │            │   │            │   │            │   │           │  │  │
│  │   │ Find RFPs  │──▶│ Score Fit  │──▶│ Bid/No-Bid │──▶│ Generate  │  │  │
│  │   │ from 3+    │   │ on 6       │   │ Decision   │   │ Proposal  │  │  │
│  │   │ sources    │   │ dimensions │   │ Support    │   │ Draft     │  │  │
│  │   │            │   │            │   │            │   │           │  │  │
│  │   └────────────┘   └────────────┘   └────────────┘   └───────────┘  │  │
│  │                                                                      │  │
│  │   200+ opps/week   Top 20% fit    Pursue briefs   1+ prop/week      │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  BUSINESS OUTCOMES:                                                         │
│  ✓ 10x more opportunities discovered                                       │
│  ✓ 80% faster bid/no-bid decisions                                        │
│  ✓ 50% faster proposal creation                                           │
│  ✓ Track record → larger deals ($250k+)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Value Stream

```
                     ┌─────────────────────────────────────┐
                     │         TIME SAVINGS                │
                     └─────────────────────────────────────┘

Before:   Manual Search   Manual Review   Gut Decision   Start from Scratch
          (4 hrs/week)    (2 hrs/rfp)     (1 hr/rfp)     (8+ hrs/proposal)
               │               │               │               │
               ▼               ▼               ▼               ▼

After:    Auto Ingest     AI Scoring      Pursuit Brief   Template Assembly
          (0 hrs)         (seconds)       (30 secs)       (2 hrs/proposal)
               │               │               │               │
               ▼               ▼               ▼               ▼

Savings:  4 hrs/week      2 hrs/rfp       1 hr/rfp        6 hrs/proposal
          ═════════════════════════════════════════════════════════════
          Total: 15-20 hours saved per week on a typical 2-proposal week
```

---

## Technical Architecture

*"How is the system built?"*

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SYSTEMS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ SAM.gov  │    │ Maryland │    │ GovTribe │    │ Gemini   │             │
│  │   API    │    │   eMMA   │    │   API    │    │   API    │             │
│  │(Federal) │    │ (State)  │    │ (Intel)  │    │  (AI)    │             │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘             │
│       │               │               │               │                    │
└───────┼───────────────┼───────────────┼───────────────┼────────────────────┘
        │               │               │               │
        └───────────────┴───────────────┴───────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONVEX BACKEND                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ACTIONS (External Calls)                      │   │
│  │  • ingestFromSamGov()  • ingestFromGovTribe()  • generateBrief()    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MUTATIONS (Write Data)                        │   │
│  │  • upsertRfp()  • evaluate()  • updatePursuit()  • saveProposal()   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          DATABASE                                    │   │
│  │                                                                      │   │
│  │  ┌────────┐  ┌────────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  │  rfps  │  │evaluations │  │pursuits │  │ content  │  │ users  │ │   │
│  │  │        │  │            │  │         │  │  blocks  │  │        │ │   │
│  │  │ 1000+  │  │   500+     │  │  100+   │  │   20+    │  │  5+    │ │   │
│  │  └────────┘  └────────────┘  └─────────┘  └──────────┘  └────────┘ │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        QUERIES (Read Data)                           │   │
│  │  • listRfps()  • getEvaluation()  • getPipelineMetrics()            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REACT FRONTEND                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   RFP List   │  │  Evaluation  │  │   Pursuit    │  │   Proposal   │   │
│  │     View     │  │    Panel     │  │   Workflow   │  │   Builder    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Clerk Authentication                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │        USER          │
                    │   (BD Team Member)   │
                    └──────────────────────┘
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW: RFP TO PROPOSAL                          │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────────────────────┐
     │                        1. INGESTION                              │
     └──────────────────────────────────────────────────────────────────┘

      SAM.gov API ─────┐
                       │
      eMMA Portal  ────┼───▶  Canonical Schema  ───▶  rfps table
                       │      (normalize)            (deduplicate)
      GovTribe API ────┘


     ┌──────────────────────────────────────────────────────────────────┐
     │                        2. EVALUATION                             │
     └──────────────────────────────────────────────────────────────────┘

      rfps table  ───▶  Eligibility Gate  ───▶  6-Dimension  ───▶  evaluations
                        (disqualifiers?)       Scoring              table
                              │                     │
                              ▼                     ▼
                         [REJECT]            [SCORE 0-100]
                                                   │
                                                   ▼
                                            [RECOMMENDATION]
                                            pursue/maybe/skip


     ┌──────────────────────────────────────────────────────────────────┐
     │                        3. PURSUIT                                │
     └──────────────────────────────────────────────────────────────────┘

      evaluations  ───▶  Generate Brief  ───▶  pursuits table
      (pursue)           (AI + rules)         (status: new)
                              │
                              ▼
                         [HUMAN DECISION]
                         bid / no-bid
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              [BID]                [NO-BID]
                │                   (archive)
                ▼
          pursuits table
          (status: capture → draft → review → submitted)


     ┌──────────────────────────────────────────────────────────────────┐
     │                        4. PROPOSAL                               │
     └──────────────────────────────────────────────────────────────────┘

      pursuits  ───▶  Template  ───▶  Content    ───▶  Assembled
      (bid)          Selection       Matching         Proposal
                          │               │               │
                          ▼               ▼               ▼
                    proposalTemplates  contentBlocks   [MARKDOWN]
                                       caseStudies      ready for
                                       teamBios         submission
```

---

## Implementation Architecture

*"How do I build this?"*

### Component Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROJECT STRUCTURE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

rfp-discovery/
│
├── 📁 convex/                      # Backend (Convex functions)
│   │
│   ├── 📄 schema.ts                # Database schema (all tables)
│   │   └── Tables: users, rfps, evaluations, pursuits, criteria,
│   │               contentBlocks, caseStudies, teamBios
│   │
│   ├── 📁 ingestion/               # Data ingestion actions
│   │   ├── samGov.ts              # SAM.gov API connector
│   │   ├── emmaConnector.ts       # eMMA portal connector
│   │   ├── govtribe.ts            # GovTribe API connector
│   │   └── index.ts               # Logging helpers
│   │
│   ├── 📁 evaluation/              # Scoring engine
│   │   ├── scoring.ts             # 6-dimension evaluation
│   │   ├── seedCriteria.ts        # Default criteria setup
│   │   └── aiEvaluation.ts        # AI-enhanced scoring
│   │
│   ├── 📁 pursuits/                # Pursuit workflow
│   │   ├── workflow.ts            # Status transitions
│   │   ├── briefGenerator.ts      # Pursuit brief generation
│   │   └── complianceMatrix.ts    # Requirements tracking
│   │
│   ├── 📁 proposals/               # Proposal assembly
│   │   ├── assembly.ts            # Template + content → proposal
│   │   └── contentMatcher.ts      # Match content to RFPs
│   │
│   ├── 📄 rfps.ts                  # RFP queries and mutations
│   ├── 📄 users.ts                 # User sync with Clerk
│   ├── 📄 deduplication.ts         # Duplicate detection
│   ├── 📄 analytics.ts             # Pipeline metrics
│   └── 📄 auth.config.ts           # Clerk configuration
│
├── 📁 src/                         # Frontend (React)
│   │
│   ├── 📄 main.tsx                 # App entry with providers
│   ├── 📄 App.tsx                  # Main app component
│   │
│   ├── 📁 components/
│   │   ├── 📁 ui/                  # Base components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   │
│   │   ├── 📁 rfp/                 # RFP components
│   │   │   ├── RfpList.tsx        # Grid of RFP cards
│   │   │   ├── RfpCard.tsx        # Individual RFP display
│   │   │   └── RfpFilters.tsx     # Filter controls
│   │   │
│   │   ├── 📁 evaluation/          # Evaluation components
│   │   │   ├── EvaluationPanel.tsx # Score display
│   │   │   └── CriteriaBreakdown.tsx
│   │   │
│   │   ├── 📁 pursuit/             # Pursuit components
│   │   │   ├── PursuitBrief.tsx   # Brief display
│   │   │   ├── WorkflowBoard.tsx  # Kanban-style board
│   │   │   └── DecisionButtons.tsx
│   │   │
│   │   ├── 📁 proposal/            # Proposal components
│   │   │   ├── ProposalBuilder.tsx # Assembly UI
│   │   │   └── ContentSelector.tsx
│   │   │
│   │   └── 📄 AuthButtons.tsx      # Clerk sign-in/out
│   │
│   ├── 📁 hooks/                   # Custom React hooks
│   │   ├── useCurrentUser.ts
│   │   └── useSyncUser.ts
│   │
│   └── 📁 lib/                     # Utilities
│       └── utils.ts
│
├── 📁 docs/                        # Documentation
│   └── 📁 implementation-plan/     # This documentation
│
└── 📄 .env.local                   # Environment variables
```

### Key File Responsibilities

| File | What It Does | When To Modify |
|------|--------------|----------------|
| `convex/schema.ts` | Defines all database tables and indexes | Adding new data types |
| `convex/ingestion/samGov.ts` | Pulls RFPs from SAM.gov | Changing SAM.gov integration |
| `convex/evaluation/scoring.ts` | Runs 6-dimension scoring | Changing evaluation logic |
| `convex/pursuits/briefGenerator.ts` | Creates pursuit briefs | Changing brief format |
| `convex/proposals/assembly.ts` | Builds proposals from templates | Changing proposal structure |
| `src/components/rfp/RfpList.tsx` | Main RFP list UI | Changing list display |
| `src/components/evaluation/EvaluationPanel.tsx` | Shows scores | Changing score display |

### API Contract Reference

#### Queries (Read Data)

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `rfps.list` | `{ source?, limit? }` | `RFP[]` | List all RFPs |
| `rfps.get` | `{ id }` | `RFP` | Get single RFP |
| `evaluation.getByRfp` | `{ rfpId }` | `Evaluation` | Get evaluation |
| `pursuits.listByStatus` | `{ status? }` | `Pursuit[]` | Get pursuits |
| `analytics.getPipelineMetrics` | `{}` | `Metrics` | Dashboard data |

#### Mutations (Write Data)

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `rfps.upsert` | RFP fields | `{ id, action }` | Insert/update RFP |
| `evaluation.evaluate` | `{ rfpId }` | `evaluationId` | Run evaluation |
| `pursuits.updateStatus` | `{ pursuitId, status }` | `{ success }` | Move through workflow |
| `pursuits.makeDecision` | `{ pursuitId, decision }` | `{ success }` | Bid/no-bid |

#### Actions (External Calls)

| Function | Input | Effect | Use Case |
|----------|-------|--------|----------|
| `ingestion.ingestFromSamGov` | `{ daysBack? }` | Fetches SAM.gov data | Scheduled ingestion |
| `pursuits.generateBrief` | `{ rfpId }` | Creates pursuit brief | Prepare for decision |
| `proposals.assembleProposal` | Selection args | Creates proposal draft | Build proposal |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT TOPOLOGY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │         VERCEL              │
                    │   (Frontend Hosting)        │
                    │                             │
                    │  • React app (Vite build)   │
                    │  • Auto-deploy from GitHub  │
                    │  • Edge caching             │
                    │                             │
                    └─────────────┬───────────────┘
                                  │
                                  │ HTTPS
                                  │
                    ┌─────────────▼───────────────┐
                    │         CONVEX              │
                    │   (Backend + Database)      │
                    │                             │
                    │  • Real-time sync           │
                    │  • Serverless functions     │
                    │  • Automatic scaling        │
                    │  • Scheduled jobs (crons)   │
                    │                             │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │                             │
          ┌─────────▼─────────┐     ┌────────────▼────────────┐
          │      CLERK        │     │    EXTERNAL APIS       │
          │   (Auth Service)  │     │                        │
          │                   │     │  • SAM.gov             │
          │  • User mgmt      │     │  • GovTribe            │
          │  • SSO            │     │  • Gemini AI           │
          │  • JWT tokens     │     │                        │
          └───────────────────┘     └────────────────────────┘
```

### Environment Configuration

| Environment | Purpose | Convex Project | Clerk App |
|-------------|---------|----------------|-----------|
| Development | Local dev | `dev-xxx` | `dev-xxx` |
| Staging | Testing | `staging-xxx` | `staging-xxx` |
| Production | Live | `prod-xxx` | `prod-xxx` |

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: Authentication (Clerk)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ • All users must sign in                                                    │
│ • JWT tokens validated on every request                                     │
│ • Session management handled by Clerk                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: Authorization (Convex)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ • ctx.auth.getUserIdentity() in all mutations                               │
│ • Role-based access (admin vs user)                                         │
│ • User can only see their own pursuits                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: Data Protection                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ • API keys stored in Convex env vars (not client)                           │
│ • No PII logged                                                             │
│ • External API calls only from Actions (server-side)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Key Management

| Key | Storage Location | Accessed By |
|-----|------------------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env.local` | Client (safe) |
| `CLERK_ISSUER_URL` | Convex env vars | Server only |
| `SAM_GOV_API_KEY` | Convex env vars | Server only |
| `GOVTRIBE_API_KEY` | Convex env vars | Server only |
| `GEMINI_API_KEY` | Convex env vars | Server only |

---

## Related Documents

- [Phase 1: Foundation](../phase-1-foundation/README.md)
- [Phase 2: Intelligence](../phase-2-intelligence/README.md)
- [Phase 3: Scale](../phase-3-scale/README.md)
- [Database Schema](./DATABASE-SCHEMA.md)
- [Data Flow Diagrams](./DATA-FLOW.md)
