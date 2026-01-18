# RFP Discovery Platform - Implementation Plan

## Executive Summary

**Mission**: Build an end-to-end system that turns "raw opportunities" into **winnable pursuits** for Nebula Logix.

**Target Outcome**: Submit at least **1 proposal per week** and reduce wasted effort through intelligent filtering.

**Reference Architecture**: Ingestion → Eligibility Gate → AI Scoring → Pipeline → Proposal Generator

---

## The Big Picture (For Executives)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RFP DISCOVERY PLATFORM PIPELINE                               │
│                    "Raw Opportunities → Winnable Pursuits"                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │  INGEST  │───▶│  DEDUPE  │───▶│  GATE    │───▶│  SCORE   │───▶│ PIPELINE │ │
│   │          │    │          │    │          │    │          │    │          │ │
│   │ SAM.gov  │    │ Canonical│    │ ELIGIBLE │    │ Fit 0-6  │    │ Bid/No   │ │
│   │ eMMA     │    │ Schema   │    │ PARTNER  │    │          │    │ Brief    │ │
│   │ GovTribe │    │ Merge    │    │ REJECTED │    │ ≥4 = GO  │    │ Proposal │ │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                                  │
│   Phase 1            Phase 1         Phase 2         Phase 3         Phase 4    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### What We're Building

| Component | What It Does | Business Value |
|-----------|--------------|----------------|
| **Multi-Source Ingestion** | Pulls RFPs from SAM.gov, eMMA, GovTribe into canonical schema | 10x more opportunities discovered |
| **Deduplication Service** | Prevents same RFP appearing multiple times | Clean, trustworthy data |
| **Eligibility Gate** | Auto-rejects opportunities we can't win FAST | Zero wasted effort on ineligible RFPs |
| **Fit Scoring Engine** | Scores on 6 dimensions with configurable weights | Focus only on high-probability wins |
| **Pursuit Pipeline** | Manages bid/no-bid → draft → submit workflow | Systematic proposal production |
| **Proposal Acceleration** | Templates, content library, compliance matrices | 50% faster proposal turnaround |

### Success Definition

> **Done means**: We can reliably discover, auto-triage, and move an opportunity to a proposal draft within **48-72 hours**.

---

## CTO-Aligned Delivery Plan (Build Order)

**Critical**: This build order is optimized for rapid iteration. Persistence (Convex) comes LAST to avoid infrastructure blocking feature development.

| Phase | Focus | Duration | Deliverable |
|-------|-------|----------|-------------|
| **Phase 1** | Multi-source Ingestion + Canonical Schema + Dedupe | 2 weeks | All sources feeding one clean dataset |
| **Phase 2** | Eligibility Gate + Admin Rules + Evidence | 2 weeks | Hard filters blocking unwinnable bids |
| **Phase 3** | Scoring Engine + Thresholds/Weights | 2 weeks | 6-dimension scoring with configurable rules |
| **Phase 4** | Pursuit Workflow + Bid/No-Bid + Alerts | 2 weeks | Full pipeline from triage to submit |
| **Phase 5** | Proposal Templates + Content Library | 2 weeks | Automated brief & proposal generation |
| **Phase 6** | Persistence (Convex) + RBAC + Audit | 2 weeks | Production-ready with auth & logging |

**Total Timeline**: 12 weeks to full operational capability

---

## Implementation Phases

### Phase 1: Multi-Source Ingestion (Weeks 1-2)
> **Goal**: All data sources feeding a normalized, deduplicated dataset

- [ ] Implement canonical opportunity schema
- [ ] SAM.gov connector (priority)
- [ ] Maryland eMMA connector (priority)
- [ ] RFPMart connector (existing, refactor)
- [ ] Deduplication service with source traceability
- [ ] Sources Admin panel (enable/disable, health status)

**Deliverable**: Clean, unified RFP feed from multiple sources

📁 [Phase 1 Details](./phase-1-ingestion/README.md)

---

### Phase 2: Eligibility Gate (Weeks 3-4)
> **Goal**: Hard filters blocking unwinnable bids before scoring

- [ ] Eligibility Rules Admin (highest priority!)
- [ ] US Organization / Onshore detection
- [ ] Security Clearance detection
- [ ] Set-Aside / Certification restrictions
- [ ] Onsite / Location constraints
- [ ] Minimum proposal time rule (5 days)
- [ ] Out-of-scope domain detection
- [ ] Evidence snippets storage

**Output**: Every RFP tagged as `ELIGIBLE`, `PARTNER_REQUIRED`, or `REJECTED`

📁 [Phase 2 Details](./phase-2-eligibility/README.md)

---

### Phase 3: Scoring Engine (Weeks 5-6)
> **Goal**: Multi-dimension fit scoring with explainable results

- [ ] 6-dimension binary scoring (0/1 per dimension)
- [ ] Scoring Weights Admin
- [ ] Threshold configuration (default: ≥4/6 = Good Fit)
- [ ] Must-pass dimensions option
- [ ] Negative keywords dictionary
- [ ] Decisioning defaults (budget, timeline, delivery model)

**Deliverable**: Every eligible RFP has fit score with reasoning

📁 [Phase 3 Details](./phase-3-scoring/README.md)

---

### Phase 4: Pursuit Workflow (Weeks 7-8)
> **Goal**: Full pipeline from discovery to submission

- [ ] Pipeline stages: NEW → TRIAGE → BID/NO-BID → CAPTURE → DRAFT → REVIEW → SUBMIT → OUTCOME
- [ ] Owner assignment (capture manager, proposal lead, technical lead)
- [ ] Bid/no-bid checklist with decision reason
- [ ] Deadline alerts (<5 days warning, <2 days critical)
- [ ] Notes & activity log
- [ ] Pipeline view by stage

📁 [Phase 4 Details](./phase-4-pursuit/README.md)

---

### Phase 5: Proposal Acceleration (Weeks 9-10)
> **Goal**: Templates and content library for rapid proposal generation

- [ ] Formal RFP response template
- [ ] Unsolicited proposal template
- [ ] Pursuit brief generator
- [ ] Compliance matrix generator
- [ ] Content library (capabilities, case studies, bios, boilerplate)
- [ ] Output formats: Markdown + Word-compatible

📁 [Phase 5 Details](./phase-5-proposals/README.md)

---

### Phase 6: Persistence & Production (Weeks 11-12)
> **Goal**: Production-ready system with auth, RBAC, and audit

- [ ] Convex database migration
- [ ] Clerk authentication integration
- [ ] Role-based access for Admin features
- [ ] Audit logging (who changed what, when)
- [ ] Versioning of prompt templates + criteria sets
- [ ] Observability (ingestion logs, scoring errors, connector failures)

📁 [Phase 6 Details](./phase-6-production/README.md)

---

## Architecture Overview

📁 [Full Architecture Documentation](./architecture/README.md)

### Component Model

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              CONNECTOR LAYER                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ SAM.gov │  │  eMMA   │  │ RFPMart │  │ BidNet  │  │GovTribe │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       └────────────┴───────────┬┴───────────┴────────────┘                   │
└────────────────────────────────┼─────────────────────────────────────────────┘
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         NORMALIZER + DEDUPE                                    │
│            ┌──────────────────────────────────────┐                           │
│            │     Canonical Opportunity Schema      │                           │
│            │  (single internal structure for all)  │                           │
│            └──────────────────────────────────────┘                           │
└───────────────────────────────┼───────────────────────────────────────────────┘
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          ELIGIBILITY GATE                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                       │
│   │  ELIGIBLE   │    │  PARTNER    │    │  REJECTED   │                       │
│   │             │    │  REQUIRED   │    │             │                       │
│   └─────────────┘    └─────────────┘    └─────────────┘                       │
│   + eligibilityReasons[] + evidenceSnippets[]                                 │
└───────────────────────────────┼───────────────────────────────────────────────┘
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         FIT SCORING ENGINE                                     │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│   │ Technical  │ │   Scope    │ │  Category  │ │   Client   │ │  Logistics │ │
│   │ Relevance  │ │    Fit     │ │   Focus    │ │  Profile   │ │            │ │
│   │   (0/1)    │ │   (0/1)    │ │   (0/1)    │ │   (0/1)    │ │   (0/1)    │ │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
│                              ┌────────────┐                                    │
│                              │ Skill Set  │                                    │
│                              │ Alignment  │                                    │
│                              │   (0/1)    │                                    │
│                              └────────────┘                                    │
│                     Total Score: 0-6 (Good Fit = ≥4)                          │
└───────────────────────────────┼───────────────────────────────────────────────┘
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                        PURSUIT PIPELINE                                        │
│   NEW → TRIAGE → BID/NO-BID → CAPTURE → DRAFT → REVIEW → SUBMIT → OUTCOME    │
│                                                                                │
│   + Owner Assignment + Deadline Alerts + Activity Log                          │
└───────────────────────────────┼───────────────────────────────────────────────┘
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                      PROPOSAL GENERATOR                                        │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│   │   Templates  │  │   Content    │  │  Compliance  │  │   Pursuit    │     │
│   │   Library    │  │   Library    │  │   Matrix     │  │    Brief     │     │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Admin Configuration Requirements

| Admin Area | Purpose | Priority |
|------------|---------|----------|
| **Sources & Connectors** | Enable/disable sources, refresh cadence, rate-limits, health status | P1 |
| **Eligibility Rules** | Configurable hard filters, outcome per rule (Reject/Partner/Flag) | P0 (Highest) |
| **Scoring Weights** | Weight per dimension, threshold for Good Fit, must-pass dimensions | P1 |
| **Negative Keywords** | Central "do not bid" list (clearance, construction, onsite-heavy) | P1 |
| **Decisioning Defaults** | Minimum deadline (5 days), budget band, delivery model preference | P2 |
| **Auditability** | Admin changes logged, versioning of prompt templates | P2 |

---

## Non-Functional Requirements

| Requirement | Implementation |
|-------------|----------------|
| **API Keys** | Environment variables only, no plaintext in UI |
| **Role-Based Access** | Clerk + custom roles for Admin features |
| **Observability** | Ingestion job logs, scoring errors, connector failures |
| **Failure Isolation** | One broken connector must not break the system |
| **Evidence-First** | Every reject/partner/good_fit decision shows "why" |

---

## UI/Product Requirements

### RFP Card Must Show:
- Source badge (SAM.gov, eMMA, etc.)
- Eligibility status (Eligible / Partner Required / Rejected)
- Fit score + breakdown by dimension
- Evidence snippets (why)
- "Start Pursuit" button (only if Eligible or Partner_Required)

### Views Required:
- **Discovery View**: All RFPs with filters
- **Pipeline View**: Pursuits by stage + deadlines
- **Admin Panel**: Sources, Eligibility Rules, Scoring Weights, Keywords, Audit Log

---

## Success Metrics

| Metric | Current | Phase 2 | Phase 4 | Phase 6 |
|--------|---------|---------|---------|---------|
| RFPs discovered/week | ~10 | 100+ | 150+ | 200+ |
| Auto-rejected (ineligible)/week | 0 | 60+ | 100+ | 150+ |
| Qualified opportunities/week | ~2 | 15+ | 25+ | 40+ |
| Proposals submitted/week | 0-1 | 1 | 1-2 | 2+ |
| Discovery to draft time | N/A | < 72 hrs | < 48 hrs | < 48 hrs |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SAM.gov API rate limits | Medium | High | Implement caching, respect limits, multiple API keys |
| AI costs exceed budget | Medium | Medium | Start with Gemini Flash, monitor usage |
| Eligibility rules too aggressive | Medium | Medium | Start conservative, tune with feedback |
| Low win rate initially | High | Medium | Expected - focus on learning, not just winning |
| Team capacity constraints | Medium | High | Automate everything possible |

---

## Approval Checklist

Before proceeding, confirm alignment on:

- [ ] **Build Order**: Ingestion → Eligibility → Scoring → Pipeline → Proposals → Persistence correct?
- [ ] **Timeline**: 12-week implementation acceptable?
- [ ] **Admin Priority**: Eligibility Rules Admin is highest priority?
- [ ] **Tech Stack**: Local storage first, Convex migration in Phase 6?
- [ ] **Success Metric**: Discovery to proposal draft in < 48-72 hours?

---

*Document Version: 2.0 (CTO-Aligned)*
*Last Updated: January 16, 2026*
*Reference: cto-level-instruction.md*
