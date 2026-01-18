# Database Schema Reference (CTO-Aligned)

Complete Convex schema for the RFP Discovery Platform, aligned with CTO requirements.

**Reference**: cto-level-instruction.md Section 2C (Data Model Requirements)

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIPS (CTO-ALIGNED)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐         ┌──────────────┐
    │    users     │         │   sources    │──────────┐
    │──────────────│         │──────────────│          │
    │ clerkId (PK) │         │ name         │          │ 1
    │ email        │         │ enabled      │          │
    │ role         │         │ status       │          ▼ *
    └──────┬───────┘         │ health       │    ┌──────────────┐
           │ 1               └──────────────┘    │ sourceQueries│
           │                                     │──────────────│
           │ creates/owns                        │ keywords[]   │
           │                                     │ naicsCodes[] │
           ▼ *                                   └──────────────┘
    ┌──────────────┐
    │   pursuits   │────────────────────────────────────────────────┐
    │──────────────│                                                 │
    │ opportunityId│    ┌──────────────┐                            │
    │ status       │    │ opportunities│◄───────────────────────────┘
    │ decision     │────│──────────────│  * opportunityId (FK)       1
    │ captureManager    │ externalIds[]│
    │ proposalLead │    │ title        │
    │ technicalLead│    │ fullDesc     │
    └──────┬───────┘    │ buyer        │
           │            │ dueDate      │
           │            │ source       │
           │            │ evidenceSnip │
           │            └──────┬───────┘
           │                   │ 1
           │                   │
           ▼ 1                 │ evaluated by
    ┌──────────────┐           │
    │pursuitBriefs │           ▼ *
    │──────────────│     ┌──────────────┐
    │ content      │     │ evaluations  │
    │ generatedAt  │     │──────────────│
    └──────────────┘     │ eligibility{}│ ◄── ELIGIBLE/PARTNER/REJECTED
                         │ scoring{}    │ ◄── 6-dimension scores
                         │ evidenceSnip │
                         └──────────────┘


    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │eligibilityRules   │ scoringConfig│    │  auditLogs   │
    │──────────────│    │──────────────│    │──────────────│
    │ ruleId       │    │ threshold    │    │ action       │
    │ keywords[]   │    │ weights{}    │    │ entityType   │
    │ outcome      │    │ mustPass[]   │    │ changes{}    │
    │ enabled      │    │ negatives[]  │    │ userId       │
    └──────────────┘    └──────────────┘    └──────────────┘


    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │contentBlocks │    │ caseStudies  │    │  teamBios    │
    │──────────────│    │──────────────│    │──────────────│
    │ category     │    │ clientName   │    │ name         │
    │ content      │    │ industry[]   │    │ role         │
    │ tags[]       │    │ technologies │    │ skills[]     │
    └──────────────┘    │ results[]    │    │ certs[]      │
                        └──────────────┘    └──────────────┘
```

---

## Table Definitions

### users

Synchronized from Clerk on sign-in. Supports RBAC.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `clerkId` | `string` | ✅ | Clerk user ID |
| `email` | `string` | ✅ | Email address |
| `name` | `string` | ✅ | Display name |
| `role` | `"admin" \| "manager" \| "user" \| "viewer"` | ✅ | RBAC role |
| `createdAt` | `number` | ✅ | Unix timestamp |
| `lastLoginAt` | `number` | ❌ | Last login timestamp |

**Indexes:**
- `by_clerk_id` → `[clerkId]`
- `by_email` → `[email]`

---

### opportunities

Canonical normalized records (renamed from `rfps` per CTO spec).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `externalIds` | `array` | ✅ | `[{source, externalId, url, fetchedAt}]` - Dedupe traceability |
| `title` | `string` | ✅ | RFP title |
| `fullDescription` | `string` | ✅ | Complete RFP text |
| `buyer` | `object` | ✅ | `{name, type: federal/state/local/other}` |
| `location` | `object` | ✅ | `{state?, city?, isRemoteAllowed?}` |
| `postedDate` | `number` | ✅ | Posted timestamp |
| `dueDate` | `number` | ✅ | Deadline timestamp |
| `dueTime` | `string` | ❌ | Time string if available |
| `estimatedValue` | `number` | ❌ | Budget if available |
| `valueRange` | `object` | ❌ | `{min?, max?}` |
| `contractType` | `string` | ❌ | FFP, T&M, IDIQ, etc. |
| `contact` | `object` | ❌ | `{name?, email?, phone?}` |
| `categories` | `array` | ✅ | NAICS codes if available |
| `setAside` | `string` | ❌ | Small business set-aside type |
| `attachments` | `array` | ✅ | `[{name, url, type?, size?}]` |
| `sourceUrl` | `string` | ✅ | Original listing URL |
| `evidenceSnippets` | `array` | ✅ | Key excerpts for decisions |
| `source` | `string` | ✅ | Primary source name |
| `ingestedAt` | `number` | ✅ | Ingestion timestamp |
| `lastUpdatedAt` | `number` | ✅ | Last update timestamp |

**Indexes:**
- `by_source` → `[source]`
- `by_due_date` → `[dueDate]`
- `by_posted_date` → `[postedDate]`
- `search_title` → Full-text search on `title`

---

### sources

Connector configs + health status (CTO requirement).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | ✅ | Machine name (sam.gov, emma) |
| `displayName` | `string` | ✅ | Human name |
| `enabled` | `boolean` | ✅ | Active or disabled |
| `refreshIntervalMinutes` | `number` | ✅ | Fetch frequency |
| `lastFetchAt` | `number` | ❌ | Last fetch timestamp |
| `nextFetchAt` | `number` | ❌ | Scheduled next fetch |
| `rateLimitPerMinute` | `number` | ✅ | API rate limit |
| `rateLimitPerHour` | `number` | ✅ | Hourly rate limit |
| `status` | `"healthy" \| "warning" \| "error" \| "disabled"` | ✅ | Health status |
| `errorCount` | `number` | ✅ | Recent error count |
| `lastError` | `string` | ❌ | Last error message |
| `lastErrorAt` | `number` | ❌ | Last error timestamp |
| `totalFetched` | `number` | ✅ | Lifetime fetch count |
| `fetchedToday` | `number` | ✅ | Today's fetch count |

**Indexes:**
- `by_name` → `[name]`

---

### sourceQueries

Per-source query configurations.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `sourceId` | `Id<"sources">` | ✅ | Parent source |
| `name` | `string` | ✅ | Query name (IT Services) |
| `enabled` | `boolean` | ✅ | Active or not |
| `keywords` | `array` | ✅ | Search keywords |
| `naicsCodes` | `array` | ❌ | NAICS filter |
| `states` | `array` | ❌ | State filter |
| `setAsideTypes` | `array` | ❌ | Set-aside filter |
| `postedWithinDays` | `number` | ❌ | Posted date filter |
| `deadlineAfterDays` | `number` | ❌ | Deadline filter |

**Indexes:**
- `by_source` → `[sourceId]`

---

### evaluations

Eligibility + multi-dimension scoring + evidence (CTO requirement).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `opportunityId` | `Id<"opportunities">` | ✅ | Reference to opportunity |
| `eligibility` | `object` | ✅ | See structure below |
| `scoring` | `object` | ❌ | See structure below (only if eligible) |
| `evaluatedAt` | `number` | ✅ | Evaluation timestamp |
| `evaluatedBy` | `"system" \| "manual"` | ✅ | Evaluation type |

**eligibility structure:**
```typescript
{
  status: "ELIGIBLE" | "PARTNER_REQUIRED" | "REJECTED";
  reasons: [{
    ruleId: string;
    ruleName: string;
    outcome: "pass" | "fail" | "flag";
    severity: "hard" | "soft";
    evidence: string;
    keywords: string[];
  }];
  evidenceSnippets: string[];
  rulesVersion: string;
}
```

**scoring structure (only if eligible):**
```typescript
{
  totalScore: number;  // 0-6
  dimensions: [{
    dimension: string;
    score: 0 | 1;
    weight: number;
    evidence: string[];
    matchedKeywords: string[];
  }];
  isGoodFit: boolean;
  threshold: number;
  configVersion: string;
}
```

**Indexes:**
- `by_opportunity` → `[opportunityId]`
- `by_eligibility_status` → `[eligibility.status]`

---

### pursuits

Pipeline state + assignments + compliance matrix + generated docs (CTO requirement).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `opportunityId` | `Id<"opportunities">` | ✅ | Reference to opportunity |
| `status` | `PursuitStatus` | ✅ | Pipeline stage |
| `decision` | `"bid" \| "no-bid"` | ❌ | Bid decision |
| `decisionBy` | `string` | ❌ | Who decided |
| `decisionAt` | `number` | ❌ | Decision timestamp |
| `decisionReasons` | `array` | ✅ | Reasons for decision |
| `captureManager` | `string` | ❌ | Capture manager ID |
| `proposalLead` | `string` | ❌ | Proposal lead ID |
| `technicalLead` | `string` | ❌ | Technical lead ID |
| `teamMembers` | `array` | ✅ | Team member IDs |
| `pursuitBriefId` | `Id<"pursuitBriefs">` | ❌ | Generated brief |
| `complianceMatrixId` | `Id<"complianceMatrices">` | ❌ | Compliance matrix |
| `createdAt` | `number` | ✅ | Creation timestamp |
| `updatedAt` | `number` | ✅ | Last update timestamp |

**PursuitStatus values:**
```
new → triage → bid/no-bid → capture → draft → review → submitted → won/lost → archived
```

**Indexes:**
- `by_opportunity` → `[opportunityId]`
- `by_status` → `[status]`
- `by_capture_manager` → `[captureManager]`

---

### pursuitBriefs

Generated pursuit briefs.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `pursuitId` | `Id<"pursuits">` | ✅ | Parent pursuit |
| `content` | `string` | ✅ | JSON stringified brief |
| `generatedAt` | `number` | ✅ | Generation timestamp |
| `generatedBy` | `"ai" \| "manual"` | ✅ | Generation method |
| `version` | `number` | ✅ | Version number |

**Indexes:**
- `by_pursuit` → `[pursuitId]`

---

### complianceMatrices

Requirements tracking.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `pursuitId` | `Id<"pursuits">` | ✅ | Parent pursuit |
| `requirements` | `string` | ✅ | JSON array of requirements |
| `completionPercent` | `number` | ✅ | % complete |
| `generatedAt` | `number` | ✅ | Generation timestamp |
| `lastUpdatedAt` | `number` | ✅ | Last update |

**Indexes:**
- `by_pursuit` → `[pursuitId]`

---

### pursuitNotes

Notes per pursuit.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `pursuitId` | `Id<"pursuits">` | ✅ | Parent pursuit |
| `content` | `string` | ✅ | Note content |
| `createdBy` | `string` | ✅ | Author ID |
| `createdAt` | `number` | ✅ | Creation timestamp |

**Indexes:**
- `by_pursuit` → `[pursuitId]`

---

### pursuitActivity

Activity log per pursuit.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `pursuitId` | `Id<"pursuits">` | ✅ | Parent pursuit |
| `type` | `string` | ✅ | Activity type |
| `description` | `string` | ✅ | Activity description |
| `userId` | `string` | ✅ | Actor ID |
| `timestamp` | `number` | ✅ | Activity timestamp |
| `metadata` | `string` | ❌ | JSON metadata |

**Indexes:**
- `by_pursuit` → `[pursuitId]`
- `by_timestamp` → `[timestamp]`

---

### eligibilityRules

Configurable hard filter rules (CTO highest priority).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `ruleId` | `string` | ✅ | Machine ID |
| `name` | `string` | ✅ | Human name |
| `description` | `string` | ✅ | What it detects |
| `enabled` | `boolean` | ✅ | Active or not |
| `defaultOutcome` | `string` | ✅ | REJECTED/PARTNER_REQUIRED/FLAG |
| `allowOverride` | `boolean` | ✅ | Can be overridden |
| `keywords` | `array` | ✅ | Detection keywords |
| `isRegex` | `boolean` | ✅ | Keywords are regex |
| `severity` | `string` | ✅ | hard/soft |
| `version` | `number` | ✅ | Rule version |
| `createdAt` | `number` | ✅ | Creation timestamp |
| `updatedAt` | `number` | ✅ | Last update |

**Indexes:**
- `by_rule_id` → `[ruleId]`

---

### scoringConfig

Scoring weights and thresholds.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `key` | `string` | ✅ | 'current' for active config |
| `threshold` | `number` | ✅ | Good fit threshold (default 4) |
| `mustPassDimensions` | `array` | ✅ | Required dimensions |
| `weights` | `string` | ✅ | JSON weight config |
| `negativeKeywords` | `array` | ✅ | Do-not-bid keywords |
| `version` | `number` | ✅ | Config version |
| `createdAt` | `number` | ✅ | Creation timestamp |
| `updatedAt` | `number` | ✅ | Last update |

**Indexes:**
- `by_key` → `[key]`

---

### auditLogs

Admin change tracking (CTO requirement).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `action` | `string` | ✅ | create/update/delete |
| `entityType` | `string` | ✅ | Table name |
| `entityId` | `string` | ✅ | Record ID |
| `userId` | `string` | ✅ | Actor ID |
| `userEmail` | `string` | ✅ | Actor email |
| `changes` | `string` | ✅ | JSON: `[{field, oldValue, newValue}]` |
| `timestamp` | `number` | ✅ | Change timestamp |
| `metadata` | `string` | ❌ | JSON extra context |

**Indexes:**
- `by_entity` → `[entityType, entityId]`
- `by_user` → `[userId]`
- `by_timestamp` → `[timestamp]`

---

### contentBlocks

Capabilities, boilerplate, technical content.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `category` | `string` | ✅ | Content category |
| `name` | `string` | ✅ | Block name |
| `content` | `string` | ✅ | Markdown content |
| `tags` | `array` | ✅ | Search tags |
| `variables` | `array` | ✅ | Template variables |
| `relevantNaics` | `array` | ❌ | NAICS codes |
| `relevantKeywords` | `array` | ❌ | Match keywords |
| `lastUsedAt` | `number` | ❌ | Last use |
| `useCount` | `number` | ✅ | Usage count |
| `createdBy` | `string` | ✅ | Creator ID |
| `createdAt` | `number` | ✅ | Creation timestamp |
| `updatedAt` | `number` | ✅ | Last update |

**Indexes:**
- `by_category` → `[category]`

---

### caseStudies

Past performance case studies.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `clientName` | `string` | ✅ | Client name |
| `projectName` | `string` | ✅ | Project title |
| `industry` | `array` | ✅ | Industry sectors |
| `technologies` | `array` | ✅ | Tech used |
| `duration` | `string` | ✅ | Project duration |
| `contractValue` | `string` | ❌ | Contract value |
| `summary` | `string` | ✅ | 2-3 sentence summary |
| `challenge` | `string` | ✅ | Problem statement |
| `solution` | `string` | ✅ | Solution approach |
| `results` | `array` | ✅ | Quantified outcomes |
| `contactReference` | `object` | ❌ | `{name, title, email?, phone?}` |
| `createdAt` | `number` | ✅ | Creation timestamp |
| `updatedAt` | `number` | ✅ | Last update |

**Indexes:**
- `by_industry` → `[industry]`

---

### teamBios

Team member biographies.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | ✅ | Full name |
| `title` | `string` | ✅ | Job title |
| `role` | `string` | ✅ | Team role |
| `yearsExperience` | `number` | ✅ | Experience years |
| `education` | `array` | ✅ | Degrees |
| `certifications` | `array` | ✅ | Certifications |
| `skills` | `array` | ✅ | Technical skills |
| `summary` | `string` | ✅ | 2-3 paragraph bio |
| `shortBio` | `string` | ✅ | 1 paragraph bio |
| `createdAt` | `number` | ✅ | Creation timestamp |
| `updatedAt` | `number` | ✅ | Last update |

**Indexes:**
- `by_role` → `[role]`

---

### proposalTemplates

Template library metadata.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | ✅ | Template name |
| `type` | `string` | ✅ | Template type |
| `description` | `string` | ✅ | What it's for |
| `sections` | `string` | ✅ | JSON sections |
| `requiredFields` | `array` | ✅ | Required fields |
| `optionalFields` | `array` | ✅ | Optional fields |
| `boilerplateVariables` | `array` | ✅ | Variable placeholders |
| `createdBy` | `string` | ✅ | Creator ID |
| `createdAt` | `number` | ✅ | Creation timestamp |
| `version` | `string` | ✅ | Template version |
| `isDefault` | `boolean` | ✅ | Is default template |

**Indexes:**
- `by_type` → `[type]`

---

### ingestionLogs

Ingestion job audit trail.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `source` | `string` | ✅ | Data source |
| `startedAt` | `number` | ✅ | Start timestamp |
| `completedAt` | `number` | ❌ | End timestamp |
| `status` | `"running" \| "success" \| "partial" \| "failed"` | ✅ | Job status |
| `fetchedCount` | `number` | ✅ | Total fetched |
| `newCount` | `number` | ✅ | New records |
| `updatedCount` | `number` | ✅ | Updated records |
| `duplicateCount` | `number` | ✅ | Duplicates found |
| `errorCount` | `number` | ✅ | Errors |
| `errors` | `array` | ❌ | Error messages |

**Indexes:**
- `by_source` → `[source]`
- `by_started_at` → `[startedAt]`

---

## Complete Schema File

See [Phase 6: Production](../phase-6-production/README.md) for the complete `convex/schema.ts` implementation.

---

*Document Version: 2.0 (CTO-Aligned)*
*Reference: cto-level-instruction.md Section 2C*
