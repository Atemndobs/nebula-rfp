# RFP Evaluation Rules (Nebula Logix)

Version: 1.1 (2026-01-18)
Owner: Nebula Logix — Bid Engine

## 1) Purpose

This document defines how the NLX RFP tool classifies opportunities through:

1) Normalization + deduplication
2) Eligibility gating (hard filter first)
3) Fit scoring (6 dimensions)
4) Good-fit decision + pipeline actions

Principle: **Eligibility first**, then scoring. Every decision must be explainable with **evidence snippets**.

---

## 2) Organization Facts (used by the Eligibility Engine)

### 2.1 Company facts (must be reflected in config)

- Legal entity: **Nebula Logix LLC (Austin, TX)**
- Founded: 2021
- Employees: ~11 (as of Q3-2025)
- Core services:
  - Custom cloud project delivery (AWS, serverless, modern apps)
  - Standardized AI & serverless MVP offerings
  - Architecture assessments & optimization (Well-Architected, cost optimization)
  - Managed cloud support (cloud operations, cost governance)
  - Supporting: UI/UX consulting & prototyping

### 2.2 Capability flags (config fields)

- hasUsEntity: **true**
- canPartnerForOnsite: true
- canPartnerForSetAside: true
- canPartnerForUsOrg: true
- certifications:
  - isSmallBusiness: true
  - is8a: false
  - isSDVOSB: false
  - isHUBZone: false
  - isWOSB: false
  - isEDWOSB: false

---

## 3) Pipeline Order (non-negotiable)

### Step A — Eligibility Gate (rules below)

Return exactly one:

- ELIGIBLE
- PARTNER_REQUIRED
- REJECTED
  And always store:
- reasons[]
- evidenceSnippets[]

If status = REJECTED → skip fit scoring (totalScore = 0, isGoodFit = false).

### Step B — Fit Scoring (6 dimensions)

Binary scoring per dimension (0/1), stored with evidence.

### Step C — Good Fit decision

Default:

- Good Fit = totalScore >= 4 AND eligibilityStatus != REJECTED
- Partner Required opportunities can be “Good Fit”, but must be clearly labeled.

---

## 4) Eligibility Rules (Hard Gate)

All rules are configurable in Admin (enabled/disabled, default outcome, override allowed).

### 4.1 Rule Table (v1.1)

#### Rule: US Entity / Onshore Requirement

- ruleId: us_entity_required
- severity: soft
- allowOverride: true
- defaultOutcome when matched:
  - if hasUsEntity = true → ELIGIBLE (or FLAG)
  - if hasUsEntity = false → PARTNER_REQUIRED
- patterns (examples):
  - "us entity required"
  - "us based organization/company/contractor"
  - "performed within the united states"
  - "conus only", "continental united states"
  - "no offshore", "onshore only"

Notes:

- This rule is NOT about citizenship restrictions; it is about the company being US-based.

#### Rule: US Persons / No Foreign Nationals

- ruleId: us_persons_only
- severity: soft
- allowOverride: true
- defaultOutcome: PARTNER_REQUIRED
- patterns:
  - "us citizens only"
  - "us persons only"
  - "no foreign nationals"

Notes:

- This is a staffing constraint. If NLX can staff compliant personnel, allow manual override to ELIGIBLE.

#### Rule: Security Clearance Requirement

- ruleId: security_clearance
- severity: hard
- allowOverride: false
- defaultOutcome: REJECTED
- patterns:
  - "secret clearance", "top secret", "ts/sci"
  - "clearance required", "active clearance"

#### Rule: Set-Aside / Certification Restriction

- ruleId: set_aside
- severity: soft
- allowOverride: true
- defaultOutcome: PARTNER_REQUIRED
- patterns:
  - "8(a)", "sdvosb", "hubzone", "wosb", "edwosb"
  - "small business set-aside"

Notes:

- If the set-aside requires a certification NLX does NOT hold, the default is PARTNER_REQUIRED (prime via qualified partner).
- If an RFP is explicitly "8(a) only" or similar with hard restriction, Admin may set outcome to REJECTED.

#### Rule: Full-Time Onsite Requirement

- ruleId: onsite_constraints
- severity: soft
- allowOverride: true
- defaultOutcome: PARTNER_REQUIRED
- patterns:
  - "onsite required", "100% onsite", "no remote"
  - "5 days/week onsite", "full-time onsite"
  - "must be local", "on-site only"

Notes:

- NLX can deliver onsite if needed, but treat as partner-required if local presence is mandated.

#### Rule: Minimum Proposal Time

- ruleId: minimum_time
- severity: hard
- allowOverride: true
- defaultOutcome: REJECTED
- logic:
  - If submissionDeadline - now < 5 days → REJECTED
  - Admin-configurable threshold (default 5 days)

#### Rule: Out-of-Scope Domain

- ruleId: out_of_scope
- severity: hard
- allowOverride: false
- defaultOutcome: REJECTED
- patterns:
  - construction, hvac, plumbing, asbestos, roofing, demolition, janitorial, etc.

#### Rule: Software / Digital Category Check

- ruleId: category_check
- severity: soft
- allowOverride: true
- defaultOutcome: FLAG
- patterns:
  - software, web development, application development, cloud, devops, cybersecurity, data, etc.

Notes:

- This rule is not a reject. It supports classification and reduces noise.

---

## 5) Fit Scoring Rules (6 Dimensions)

Each dimension returns:

- score: 0 or 1
- matchedTerms[]
- evidenceSnippet
- confidence (optional)

### Dimension 1 — Technical Relevance (NLX core stack)

Score 1 if the opportunity clearly aligns to NLX engineering strengths:

- AWS, serverless (Lambda, API Gateway), event-driven, microservices
- Modern web app stack (React/Next.js/TypeScript/Node)
- DevOps/IaC/CI-CD, automated testing
- Data/AI signals (MLOps, ML pipelines, AI enablement)

Avoid generic terms:

- "software", "systems", "website", "UI", "UX" alone should not produce a 1.

### Dimension 2 — Scope Fit (what we deliver)

Score 1 if the scope matches NLX delivery patterns:

- serverless app build, modernization, cloud migration
- portals/dashboards/web apps with backend
- API integrations (REST/GraphQL)
- architecture assessments / cost optimization sprints
- managed cloud support (ops, monitoring, governance)

### Dimension 3 — Category Focus

Score 1 if procurement category is clearly IT/digital/cloud/software.
If unclear, score 0 and rely on manual triage.

### Dimension 4 — Client Profile

Score 1 if the buyer fits NLX targeting:

- Public sector (federal/state/local) OR startups/SMB
- Agile/iterative delivery expectations
- Tech-forward language

### Dimension 5 — Logistics

Score 1 if the logistics are workable:

- Remote/hybrid allowed OR onsite feasible
- Clear SOW/requirements
- Timeline realistic (not a 48-hour scramble)
- Submission method manageable

### Dimension 6 — Skill Set Alignment

Score 1 if required roles map to NLX delivery team:

- Solution Architect, Product Owner, Fullstack/Backend/Frontend
- DevOps/Cloud, QA/Automation
- UI/UX as supporting (not the primary driver)

---

## 6) Good Fit Policy (Default)

- Eligible + Score >= 4 → Good Fit
- Partner Required + Score >= 4 → Good Fit (Partner Track)
- Any REJECTED → Not Fit

Optional tightening (recommended):

- Must-pass: Scope Fit OR Technical Relevance must be 1

---

## 7) Evidence & Audit Requirements

Every eligibility and scoring decision must store:

- evidenceSnippets[] (short excerpt)
- reasons[] (human-readable)
- matchedTerms[] (machine-readable)

Admin changes must be logged (who/what/when).

---

## 8) Required Agent Changes (to implement v1.1)

1) Set `organizationCapabilities.hasUsEntity = true`
2) Split `us_organization` rule into:
   - us_entity_required
   - us_persons_only
3) Update unit tests:
   - “USA Organization Only” should be ELIGIBLE when hasUsEntity=true
   - “US citizens only / no foreign nationals” should be PARTNER_REQUIRED by default
4) Ensure eligibility runs before scoring and rejected items skip scoring.
