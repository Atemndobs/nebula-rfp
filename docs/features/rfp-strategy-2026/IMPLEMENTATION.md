# RFP Strategy Implementation Plan

## ⚠️ CTO Architecture Mandate

> [!CAUTION]
> **Critical Execution Rules:**
> 1. **DO NOT redesign** what already works (Home/Data/Admin views)
> 2. All changes must be **additive enhancements**
> 3. Eligibility gating must be **rule-driven first** (AI is optional enhancement)
> 4. AI JSON output must remain **backward compatible**
> 5. **Follow execution order exactly** to avoid rework

---

## Execution Order (MANDATORY)

> [!IMPORTANT]
> This sequence is non-negotiable. Executing out of order will cause rework.

| Step  | Phase  | Focus                               | UI Impact              |
| ----- | ------ | ----------------------------------- | ---------------------- |
| **1** | Prep   | Canonical schema + dedupe           | None (backend only)    |
| **2** | Core   | Eligibility Gate + Admin rules      | Badge on RfpCard       |
| **3** | Expand | Source connectors (SAM.gov, eMMA)   | Source badge           |
| **4** | Tune   | Scoring weights + negative keywords | Admin panels           |
| **5** | Flow   | Pursuit workflow + templates        | "Start Pursuit" button |

---

## Step 1: Canonical Schema + Deduplication (No UI Changes)

### Goal
Establish unified data model **without changing any views**.

### Pre-requisites
- [ ] Understand existing `types.ts` structure
- [ ] Review current `rfpDataService.ts` data flow

---

### Task 1.1: Add Core Types

**File:** [types.ts](file:///Users/atem/sites/nebula/rfp/rfp-discovery/types.ts)

**Action:** Add new types (don't modify existing)

```typescript
// ADD to types.ts — do not remove existing types

export enum RFPSource {
  SAM = 'SAM',
  EMMA = 'EMMA',
  RFPMART = 'RFPMART',
  BIDNET = 'BIDNET',
  GOVTRIBE = 'GOVTRIBE'
}

export interface NormalizedOpportunity {
  id: string;                    // Internal UUID
  sourceId: string;              // Original ID from source
  source: RFPSource;
  title: string;
  description: string;
  buyer: {
    name: string;
    agency?: string;
    department?: string;
  };
  postedDate: Date;
  submissionDeadline: Date;
  naicsCodes: string[];
  estimatedValue?: number;
  dedupeHash: string;
  lastUpdated: Date;
}

export interface SourceRecord {
  id: string;
  opportunityId: string;
  source: RFPSource;
  rawPayload: unknown;
  fetchedAt: Date;
}

export interface EligibilityResult {
  status: 'ELIGIBLE' | 'PARTNER_REQUIRED' | 'REJECTED';
  reasons: string[];
  evidenceSnippets: string[];
}
```

**Verification:**
- [ ] Types compile without errors
- [ ] Existing types unchanged
- [ ] No breaking changes to components

---

### Task 1.2: Create Deduplication Service

**File:** [NEW] `services/deduplication/dedupeService.ts`

```typescript
import { NormalizedOpportunity } from '../../types';

/**
 * Generate a hash for deduplication based on stable fields
 */
export function generateDedupeHash(opp: NormalizedOpportunity): string {
  const components = [
    opp.title.toLowerCase().replace(/\s+/g, ' ').trim(),
    opp.buyer.name?.toLowerCase() || '',
    opp.submissionDeadline.toISOString().split('T')[0],
  ];
  
  // Simple hash for now — can use crypto later
  const input = components.join('|');
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Filter duplicates from a list of opportunities
 */
export function deduplicateOpportunities(
  opportunities: NormalizedOpportunity[]
): NormalizedOpportunity[] {
  const seen = new Map<string, NormalizedOpportunity>();
  
  for (const opp of opportunities) {
    const hash = opp.dedupeHash || generateDedupeHash(opp);
    
    if (!seen.has(hash)) {
      seen.set(hash, { ...opp, dedupeHash: hash });
    } else {
      // Keep the one with more recent data
      const existing = seen.get(hash)!;
      if (opp.lastUpdated > existing.lastUpdated) {
        seen.set(hash, { ...opp, dedupeHash: hash });
      }
    }
  }
  
  return Array.from(seen.values());
}
```

**Verification:**
- [ ] Unit test with duplicate opportunities
- [ ] Verify hash stability

---

### Task 1.3: Create Index File

**File:** [NEW] `services/deduplication/index.ts`

```typescript
export * from './dedupeService';
```

**Completion Criteria for Step 1:**
- [ ] New types added to `types.ts`
- [ ] Deduplication service created and tested
- [ ] **No UI changes**
- [ ] Existing functionality unaffected

---

## Step 2: Eligibility Gate (CRITICAL — Rules-First)

> [!CAUTION]
> **Implementation Rule:** Eligibility must be **rule-driven first**.
> AI extraction is an optional enhancement, NOT a dependency.
> This step runs **BEFORE** fit scoring.

### Goal
Hard-reject ineligible opportunities before wasting scoring effort.

---

### Task 2.1: Create Eligibility Types

**File:** [types.ts](file:///Users/atem/sites/nebula/rfp/rfp-discovery/types.ts)

**Action:** Add eligibility configuration types

```typescript
// ADD to types.ts

export interface EligibilityRulesConfig {
  enabled: boolean;
  rules: {
    usaOrganizationOnly: EligibilityRule;
    securityClearance: EligibilityRule;
    setAsides: EligibilityRule & { qualifiedTypes: string[] };
    minimumDeadline: EligibilityRule & { minDaysOut: number };
    onsiteHeavy: EligibilityRule;
    outOfScopeIndustries: EligibilityRule & { keywords: string[] };
  };
}

export interface EligibilityRule {
  enabled: boolean;
  patterns: string[];
  action: 'PARTNER_REQUIRED' | 'REJECT';
}
```

---

### Task 2.2: Create Constraint Extractor (Rule-Based)

**File:** [NEW] `services/eligibility/constraintExtractor.ts`

```typescript
export interface ExtractedConstraint {
  category: string;
  subType?: string;
  pattern: string;
  evidence: string;
}

const ELIGIBILITY_PATTERNS: Record<string, RegExp[]> = {
  usaOrganizationOnly: [
    /usa\s+organization\s+only/i,
    /u\.?s\.?\s+organization\s+required/i,
    /must\s+be\s+(a\s+)?u\.?s\.?\s+company/i,
    /domestic\s+source\s+only/i,
    /onshore\s+only/i,
  ],
  securityClearance: [
    /security\s+clearance\s+required/i,
    /secret\s+clearance/i,
    /top\s+secret/i,
    /ts\/sci/i,
    /public\s+trust/i,
  ],
  onsiteRequired: [
    /on.?site\s+required/i,
    /must\s+be\s+located\s+in/i,
    /local\s+presence\s+required/i,
    /100%?\s+on.?site/i,
    /onsite\s+5\s+days/i,
  ],
};

const SET_ASIDE_PATTERNS: Record<string, RegExp[]> = {
  '8A': [/8\(a\)/i, /8a\s+set.?aside/i],
  'SDVOSB': [/sdvosb/i, /service.?disabled\s+veteran/i],
  'HUBZONE': [/hubzone/i],
  'WOSB': [/wosb/i, /women.?owned/i],
  'SMALL_BUSINESS': [/small\s+business\s+set.?aside/i],
};

const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\bconstruction\b/i,
  /\bhvac\b/i,
  /\bplumbing\b/i,
  /\belectrical\s+works?\b/i,
  /\basbestos\b/i,
  /\broofing\b/i,
  /\bdemolition\b/i,
];

export function extractConstraints(text: string): ExtractedConstraint[] {
  const results: ExtractedConstraint[] = [];
  
  // Check standard patterns
  for (const [category, patterns] of Object.entries(ELIGIBILITY_PATTERNS)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        results.push({
          category,
          pattern: pattern.source,
          evidence: extractSnippet(text, match.index!, match[0].length),
        });
        break; // One match per category is enough
      }
    }
  }
  
  // Check set-asides
  for (const [setAsideType, patterns] of Object.entries(SET_ASIDE_PATTERNS)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        results.push({
          category: 'setAside',
          subType: setAsideType,
          pattern: pattern.source,
          evidence: extractSnippet(text, match.index!, match[0].length),
        });
        break;
      }
    }
  }
  
  // Check out-of-scope industries
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      results.push({
        category: 'outOfScopeIndustry',
        pattern: pattern.source,
        evidence: extractSnippet(text, match.index!, match[0].length),
      });
    }
  }
  
  return results;
}

function extractSnippet(text: string, index: number, matchLength: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + matchLength + 40);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return prefix + text.slice(start, end) + suffix;
}
```

---

### Task 2.3: Create Eligibility Service

**File:** [NEW] `services/eligibility/eligibilityService.ts`

```typescript
import { NormalizedOpportunity, EligibilityResult, EligibilityRulesConfig } from '../../types';
import { extractConstraints, ExtractedConstraint } from './constraintExtractor';

const DEFAULT_CONFIG: EligibilityRulesConfig = {
  enabled: true,
  rules: {
    usaOrganizationOnly: { enabled: true, patterns: [], action: 'PARTNER_REQUIRED' },
    securityClearance: { enabled: true, patterns: [], action: 'REJECT' },
    setAsides: { enabled: true, patterns: [], action: 'REJECT', qualifiedTypes: ['SMALL_BUSINESS'] },
    minimumDeadline: { enabled: true, patterns: [], action: 'REJECT', minDaysOut: 5 },
    onsiteHeavy: { enabled: true, patterns: [], action: 'REJECT' },
    outOfScopeIndustries: { enabled: true, patterns: [], action: 'REJECT', keywords: [] },
  },
};

export function checkEligibility(
  opportunity: NormalizedOpportunity,
  config: EligibilityRulesConfig = DEFAULT_CONFIG
): EligibilityResult {
  if (!config.enabled) {
    return { status: 'ELIGIBLE', reasons: [], evidenceSnippets: [] };
  }
  
  const text = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const constraints = extractConstraints(text);
  
  const reasons: string[] = [];
  const evidenceSnippets: string[] = [];
  let status: EligibilityResult['status'] = 'ELIGIBLE';
  
  // Check each constraint against rules
  for (const constraint of constraints) {
    const rule = mapConstraintToRule(constraint, config);
    if (rule && rule.enabled) {
      reasons.push(formatReason(constraint));
      evidenceSnippets.push(constraint.evidence);
      
      // Apply worst outcome (REJECT > PARTNER_REQUIRED > ELIGIBLE)
      if (rule.action === 'REJECT') {
        status = 'REJECTED';
      } else if (rule.action === 'PARTNER_REQUIRED' && status !== 'REJECTED') {
        status = 'PARTNER_REQUIRED';
      }
    }
  }
  
  // Check minimum deadline rule
  if (config.rules.minimumDeadline.enabled) {
    const daysOut = Math.floor(
      (opportunity.submissionDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysOut < config.rules.minimumDeadline.minDaysOut) {
      reasons.push(`Deadline too soon: ${daysOut} days out (min: ${config.rules.minimumDeadline.minDaysOut})`);
      status = 'REJECTED';
    }
  }
  
  return { status, reasons, evidenceSnippets };
}

function mapConstraintToRule(
  constraint: ExtractedConstraint,
  config: EligibilityRulesConfig
): { enabled: boolean; action: 'PARTNER_REQUIRED' | 'REJECT' } | null {
  switch (constraint.category) {
    case 'usaOrganizationOnly':
      return config.rules.usaOrganizationOnly;
    case 'securityClearance':
      return config.rules.securityClearance;
    case 'onsiteRequired':
      return config.rules.onsiteHeavy;
    case 'setAside':
      // Only reject if we're not qualified for this set-aside type
      if (!config.rules.setAsides.qualifiedTypes.includes(constraint.subType || '')) {
        return config.rules.setAsides;
      }
      return null;
    case 'outOfScopeIndustry':
      return config.rules.outOfScopeIndustries;
    default:
      return null;
  }
}

function formatReason(constraint: ExtractedConstraint): string {
  const labels: Record<string, string> = {
    usaOrganizationOnly: 'USA organization required',
    securityClearance: 'Security clearance required',
    onsiteRequired: 'Heavy on-site presence required',
    setAside: `Set-aside: ${constraint.subType}`,
    outOfScopeIndustry: 'Out-of-scope industry detected',
  };
  return labels[constraint.category] || constraint.category;
}
```

---

### Task 2.4: Create Index File

**File:** [NEW] `services/eligibility/index.ts`

```typescript
export * from './eligibilityService';
export * from './constraintExtractor';
```

---

### Task 2.5: Integrate Eligibility into Evaluation

**File:** [services/evaluationService.ts](file:///Users/atem/sites/nebula/rfp/rfp-discovery/services/evaluationService.ts)

**Action:** Call eligibility check BEFORE scoring

```typescript
// ADD import at top
import { checkEligibility } from './eligibility';

// MODIFY evaluateOpportunity function
export async function evaluateOpportunity(
  opp: NormalizedOpportunity,
  config?: EvaluationConfig
): Promise<Evaluation> {
  // Step 1: Eligibility gate (NEW — runs first)
  const eligibility = checkEligibility(opp);
  
  // If rejected, skip scoring entirely
  if (eligibility.status === 'REJECTED') {
    return {
      opportunityId: opp.id,
      eligibilityStatus: eligibility.status,
      eligibilityReasons: eligibility.reasons,
      evidenceSnippets: eligibility.evidenceSnippets,
      dimensionScores: getEmptyScores(),
      totalScore: 0,
      isGoodFit: false,
      evaluatedAt: new Date(),
    };
  }
  
  // Step 2: Existing scoring logic (unchanged)
  const dimensionScores = await scoreAllDimensions(opp, config);
  const totalScore = calculateTotalScore(dimensionScores);
  
  return {
    opportunityId: opp.id,
    eligibilityStatus: eligibility.status,
    eligibilityReasons: eligibility.reasons,
    evidenceSnippets: eligibility.evidenceSnippets,
    dimensionScores,
    totalScore,
    isGoodFit: totalScore >= (config?.goodFitThreshold ?? 4),
    evaluatedAt: new Date(),
  };
}
```

---

### Task 2.6: Create Eligibility Badge Component

**File:** [NEW] `components/EligibilityBadge.tsx`

```typescript
import React from 'react';

interface Props {
  status: 'ELIGIBLE' | 'PARTNER_REQUIRED' | 'REJECTED';
  reasons?: string[];
  showDetails?: boolean;
}

const BADGE_CONFIG = {
  ELIGIBLE: {
    color: '#4CAF50',
    bgColor: '#E8F5E9',
    icon: '✓',
    label: 'Eligible',
  },
  PARTNER_REQUIRED: {
    color: '#FF9800',
    bgColor: '#FFF3E0',
    icon: '👥',
    label: 'Partner Required',
  },
  REJECTED: {
    color: '#F44336',
    bgColor: '#FFEBEE',
    icon: '✗',
    label: 'Not Eligible',
  },
};

export function EligibilityBadge({ status, reasons, showDetails }: Props) {
  const config = BADGE_CONFIG[status];
  
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
          color: config.color,
          backgroundColor: config.bgColor,
        }}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
      
      {showDetails && reasons && reasons.length > 0 && (
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '11px', color: '#666' }}>
          {reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

### Task 2.7: Add Badge to RfpCard

**File:** [components/RfpCard.tsx](file:///Users/atem/sites/nebula/rfp/rfp-discovery/components/RfpCard.tsx)

**Action:** Add eligibility badge to card header (minimal change)

```typescript
// ADD import
import { EligibilityBadge } from './EligibilityBadge';

// In the card header section, ADD:
<EligibilityBadge
  status={rfp.evaluation?.eligibilityStatus || 'ELIGIBLE'}
  reasons={rfp.evaluation?.eligibilityReasons}
/>
```

---

### Task 2.8: Add Eligibility Rules Panel to Admin

**File:** [NEW] `components/EligibilityRulesPanel.tsx`

Create an Admin panel for configuring eligibility rules (see ARCHITECTURE.md for layout).

**File:** [components/AdminView.tsx](file:///Users/atem/sites/nebula/rfp/rfp-discovery/components/AdminView.tsx)

**Action:** Import and add panel below existing sections

```typescript
// ADD import
import { EligibilityRulesPanel } from './EligibilityRulesPanel';

// ADD in render, after existing panels:
<EligibilityRulesPanel
  config={eligibilityConfig}
  onChange={setEligibilityConfig}
/>
```

---

**Completion Criteria for Step 2:**
- [ ] Eligibility service created with rule-based extraction
- [ ] Eligibility check called BEFORE scoring
- [ ] Rejected RFPs skip scoring entirely
- [ ] EligibilityBadge component created
- [ ] Badge visible on RfpCard
- [ ] Eligibility rules panel added to Admin
- [ ] **Existing Admin panels unchanged**

---

## Step 3: Source Connectors (SAM.gov, eMMA)

### Goal
Add SAM.gov and eMMA to expand the opportunity pipeline.

> [!NOTE]
> RFPMart connector is a refactor of existing code — do not break current functionality.

---

### Task 3.1: Create Connector Interface

**File:** [NEW] `services/connectors/types.ts`

```typescript
import { RFPSource, NormalizedOpportunity } from '../../types';

export interface ConnectorConfig {
  apiKey?: string;
  baseUrl?: string;
  refreshIntervalHours?: number;
  enabled: boolean;
}

export interface FetchParams {
  keywords?: string[];
  naicsCodes?: string[];
  postedAfter?: Date;
  deadlineAfter?: Date;
  limit?: number;
  offset?: number;
}

export interface ConnectorHealth {
  lastFetch: Date | null;
  lastSuccess: Date | null;
  errorCount: number;
  backoffUntil: Date | null;
}

export interface RFPConnector {
  source: RFPSource;
  initialize(config: ConnectorConfig): Promise<void>;
  fetchOpportunities(params: FetchParams): Promise<NormalizedOpportunity[]>;
  getHealth(): ConnectorHealth;
  isHealthy(): boolean;
}
```

---

### Task 3.2: Refactor RFPMart to Connector Pattern

**File:** [NEW] `services/connectors/rfpMartConnector.ts`

Wrap existing FastAPI logic — do not break current data flow.

---

### Task 3.3: Implement SAM.gov Connector

**File:** [NEW] `services/connectors/samGovConnector.ts`

See ARCHITECTURE.md for implementation details.

**Environment Variable:**
```bash
# .env.local
VITE_SAM_API_KEY=your_api_key
```

---

### Task 3.4: Create Source Badge Component

**File:** [NEW] `components/SourceBadge.tsx`

```typescript
import React from 'react';
import { RFPSource } from '../types';

interface Props {
  source: RFPSource;
}

const SOURCE_CONFIG: Record<RFPSource, { color: string; label: string }> = {
  [RFPSource.SAM]: { color: '#1976D2', label: 'SAM.gov' },
  [RFPSource.EMMA]: { color: '#388E3C', label: 'eMMA' },
  [RFPSource.RFPMART]: { color: '#7B1FA2', label: 'RFPMart' },
  [RFPSource.BIDNET]: { color: '#F57C00', label: 'BidNet' },
  [RFPSource.GOVTRIBE]: { color: '#00796B', label: 'GovTribe' },
};

export function SourceBadge({ source }: Props) {
  const config = SOURCE_CONFIG[source] || { color: '#666', label: source };
  
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '10px',
        fontWeight: 600,
        color: 'white',
        backgroundColor: config.color,
      }}
    >
      {config.label}
    </span>
  );
}
```

---

### Task 3.5: Add Sources Panel to Admin

**File:** [NEW] `components/SourcesPanel.tsx`

Display each source with:
- Enable/disable toggle
- Health status (last fetch, last success, error count)
- Per-source refresh cadence

**File:** [components/AdminView.tsx](file:///Users/atem/sites/nebula/rfp/rfp-discovery/components/AdminView.tsx)

**Action:** Add panel below Eligibility Rules panel

---

**Completion Criteria for Step 3:**
- [ ] RFPMart refactored to connector pattern (no breaking changes)
- [ ] SAM.gov connector implemented
- [ ] SourceBadge displayed on RfpCard
- [ ] Sources panel added to Admin
- [ ] Health status visible in Admin
- [ ] Deduplication works across sources

---

## Step 4: Scoring Weights + Negative Keywords

### Goal
Improve scoring precision by adding configurable weights and exclusions.

---

### Task 4.1: Add Scoring Weights Panel

**File:** [NEW] `components/ScoringWeightsPanel.tsx`

Allow configuration of:
- Weight per dimension (slider 1-5)
- "Good Fit" threshold (e.g., ≥4/6)
- Must-pass dimensions (checkboxes)

---

### Task 4.2: Add Negative Keywords Panel

**File:** [NEW] `components/NegativeKeywordsPanel.tsx`

Configure:
- Exclusion keywords (hard reject or heavy penalty)
- Flag overly generic current keywords for review

---

### Task 4.3: Clean Up Generic Keywords

> [!WARNING]
> Current keyword lists contain overly generic terms that inflate matches:
> - "software", "systems", "Website", "UI", "UX"

**Action:** In Admin, update default criteria to:
- Remove or low-weight these generic terms
- Require combination with specific terms (React, Next, AWS)

---

**Completion Criteria for Step 4:**
- [ ] Scoring weights panel in Admin
- [ ] Negative keywords panel in Admin
- [ ] Generic keywords reviewed and tuned
- [ ] Weighted scoring implemented in evaluation service
- [ ] **Existing Admin panels unchanged**

---

## Step 5: Pursuit Workflow

### Goal
Track opportunities through bid/no-bid decision to submission.

---

### Task 5.1: Create Pursuit Types

**File:** Add to [types.ts](file:///Users/atem/sites/nebula/rfp/rfp-discovery/types.ts)

```typescript
export enum PursuitStage {
  NEW = 'NEW',
  TRIAGE = 'TRIAGE',
  BID_NO_BID = 'BID_NO_BID',
  CAPTURE = 'CAPTURE',
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  SUBMIT = 'SUBMIT',
  OUTCOME = 'OUTCOME',
  ARCHIVED = 'ARCHIVED',
}

export interface Pursuit {
  id: string;
  opportunityId: string;
  stage: PursuitStage;
  owners: string[];
  notes: { author: string; content: string; createdAt: Date }[];
  outcome?: 'WON' | 'LOST' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Task 5.2: Create Pursuit Service

**File:** [NEW] `services/pursuit/pursuitService.ts`

CRUD operations for pursuits, backed by localStorage initially.

---

### Task 5.3: Add "Start Pursuit" Button

**File:** [components/RfpCard.tsx](file:///Users/atem/sites/nebula/rfp/rfp-discovery/components/RfpCard.tsx)

**Action:** Add button (enabled only if Eligible or Partner Required)

```typescript
{(evaluation.eligibilityStatus === 'ELIGIBLE' || 
  evaluation.eligibilityStatus === 'PARTNER_REQUIRED') && (
  <button onClick={() => startPursuit(rfp.id)}>
    Start Pursuit
  </button>
)}
```

---

### Task 5.4: Optional — Add Pursuits Tab

If drawer approach is insufficient, add minimal Pursuits View tab.

---

**Completion Criteria for Step 5:**
- [ ] Pursuit types defined
- [ ] Pursuit service implemented
- [ ] "Start Pursuit" button on RfpCard
- [ ] Pursuit creation works
- [ ] Pipeline stage indicator displayed
- [ ] **Home/Data/Admin views unchanged except for button**

---

## Verification Checklist

### After Step 1
- [ ] New types compile
- [ ] Deduplication service works
- [ ] **No UI changes**

### After Step 2
- [ ] Eligibility service works with rule-based extraction
- [ ] Eligibility check runs before scoring
- [ ] Badge displays on RfpCard
- [ ] Admin panel shows eligibility rules
- [ ] **Existing Admin panels unchanged**

### After Step 3
- [ ] SAM.gov data appears in dashboard
- [ ] RFPMart still works
- [ ] Source badge displayed
- [ ] Deduplication works across sources
- [ ] Sources panel in Admin

### After Step 4
- [ ] Weighted scoring implemented
- [ ] Negative keywords working
- [ ] Generic keywords cleaned up

### After Step 5
- [ ] "Start Pursuit" button works
- [ ] Pursuit creation succeeds
- [ ] Stage indicator displays

---

## Backward Compatibility Checklist

- [ ] Home View: No breaking changes, only additive badges
- [ ] Data View: No changes
- [ ] Admin View: No changes to existing panels, new panels added below
- [ ] Theme Toggle: No changes
- [ ] AI Response: v1 format continues to work, v2 optional
- [ ] CSV Export: No changes
