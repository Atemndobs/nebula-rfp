# Feature Planning Template

Use this template when planning new features. Copy this directory structure for each feature:

```
docs/features/[feature-name]/
├── README.md           # Copy from README-TEMPLATE.md
├── ARCHITECTURE.md     # Copy from ARCHITECTURE-TEMPLATE.md
└── IMPLEMENTATION.md   # Copy from IMPLEMENTATION-TEMPLATE.md
```

---

# README-TEMPLATE.md

```markdown
# Feature: [Feature Name]

## Problem Statement

[What problem does this solve? Why is it needed?]

## Proposed Solution

[High-level description of the solution approach]

## User Stories

- As a [user type], I want to [action], so that [benefit]
- As a [user type], I want to [action], so that [benefit]

## Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Out of Scope

- [What this feature explicitly does NOT include]
- [Deferred functionality for future phases]

## Dependencies

- [Required features/systems that must exist]
- [External services or APIs needed]

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [Mitigation strategy] |
```

---

# ARCHITECTURE-TEMPLATE.md

```markdown
# Architecture: [Feature Name]

## System Overview

[Diagram or description of how this feature fits into the system]

## Data Model

### New Tables/Collections

```typescript
// convex/schema.ts additions
[featureName]: defineTable({
  field1: v.string(),
  field2: v.number(),
  // ...
}).index("by_field", ["field1"])
```

### Modified Tables

| Table | Change | Reason |
|-------|--------|--------|
| [table] | [change] | [reason] |

## API Design

### New Queries

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `feature.list` | `{ limit?: number }` | `Feature[]` | List features |

### New Mutations

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `feature.create` | `{ ... }` | `Id<"features">` | Create feature |

### New Actions

| Function | Purpose | External Calls |
|----------|---------|----------------|
| `feature.process` | [Purpose] | [APIs called] |

## Component Structure

```
src/components/
├── feature/
│   ├── FeatureList.tsx      # Main list view
│   ├── FeatureCard.tsx      # Individual item
│   ├── FeatureForm.tsx      # Create/edit form
│   └── FeatureFilters.tsx   # Filter controls
```

## State Management

[How state flows through the feature]

## Integration Points

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| [System] | [API/Event/etc] | [Purpose] |

## Security Considerations

- [ ] Auth required for all mutations
- [ ] Input validation on all user data
- [ ] Rate limiting on external API calls
- [ ] Sensitive data not logged
```

---

# IMPLEMENTATION-TEMPLATE.md

```markdown
# Implementation: [Feature Name]

## Prerequisites

- [ ] [Dependency 1 in place]
- [ ] [Dependency 2 in place]
- [ ] [Environment variables configured]

## Implementation Steps

### Phase 1: Data Layer

- [ ] Add schema definitions to `convex/schema.ts`
- [ ] Create `convex/[feature].ts` with queries/mutations
- [ ] Add indexes for common queries
- [ ] Test queries in Convex dashboard

### Phase 2: Core Logic

- [ ] Implement business logic in services
- [ ] Add validation functions
- [ ] Write unit tests for core logic
- [ ] Handle error cases

### Phase 3: UI Components

- [ ] Create base components in `src/components/feature/`
- [ ] Implement list/grid view
- [ ] Add create/edit forms
- [ ] Implement filters and sorting
- [ ] Add loading and error states

### Phase 4: Integration

- [ ] Wire up Convex queries in components
- [ ] Add navigation/routing
- [ ] Integrate with existing features
- [ ] Add to admin panel if needed

### Phase 5: Polish

- [ ] Add proper TypeScript types
- [ ] Implement responsive design
- [ ] Add keyboard navigation
- [ ] Write component tests
- [ ] Update documentation

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `convex/schema.ts` | Modify | Add [feature] table |
| `convex/[feature].ts` | Create | Queries and mutations |
| `src/components/feature/*.tsx` | Create | UI components |
| `src/types.ts` | Modify | Add feature types |

## Testing Plan

### Unit Tests

- [ ] [Test case 1]
- [ ] [Test case 2]

### Integration Tests

- [ ] [Test case 1]
- [ ] [Test case 2]

### Manual Testing

- [ ] [Test scenario 1]
- [ ] [Test scenario 2]

## Rollout Strategy

1. [ ] Deploy to development environment
2. [ ] Internal testing and feedback
3. [ ] Deploy to staging
4. [ ] User acceptance testing
5. [ ] Production deployment

## Rollback Plan

[How to revert if issues are found]

## Documentation Updates

- [ ] Update README if needed
- [ ] Add JSDoc comments to functions
- [ ] Update API documentation
- [ ] Add user-facing help text
```
