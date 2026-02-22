# Convex Usage Audit (2026-02-21)

## Scope
- Static usage audit of Convex functions and schema tables.
- Reference scan across frontend/backend code (`App.tsx`, `components/`, `services/`, `src/`, `hooks/`, `convex/`).

## Function Audit Result
- Total Convex functions after cleanup: `49`
- Unreferenced Convex functions after cleanup: `0`

## Cleanup Applied
- Removed unused functions from:
  - `convex/eligibilityRules.ts`
  - `convex/ingestion/logs.ts`
  - `convex/ingestion/scraper.ts`
  - `convex/opportunities.ts`
  - `convex/users.ts`
- Removed fully unused modules:
  - `convex/sourceQueries.ts`
  - `convex/stats.ts`

## Table Usage (Current Runtime)

### Used tables
- `users`
- `opportunities`
- `sources`
- `evaluations`
- `eligibilityRules`
- `ingestionLogs`
- `statsAggregation`

### Unused tables (no runtime references in current code)
- `sourceQueries`
- `pursuits`
- `pursuitBriefs`
- `complianceMatrices`
- `pursuitNotes`
- `pursuitActivity`
- `scoringConfig`
- `auditLogs`
- `contentBlocks`
- `caseStudies`
- `teamBios`
- `proposalTemplates`

## Notes
- This audit is static usage-based. It does not include ad-hoc CLI/manual invocations.
- Unused table removal was not executed in this pass (destructive/data-model change). These are candidates for a separate migration.
