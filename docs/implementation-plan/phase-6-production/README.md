# Phase 6: Persistence (Convex) + RBAC + Audit

**Duration**: Weeks 11-12
**Goal**: Production-ready system with auth, roles, and audit logging

---

## Objectives

1. Migrate all data from local storage to Convex
2. Integrate Clerk authentication
3. Implement role-based access control (RBAC)
4. Add audit logging for admin changes
5. Version prompts and criteria configurations
6. Set up observability (logs, errors, metrics)

---

## Convex Migration

### Database Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ==================== USERS ====================
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("user"),
      v.literal("viewer")
    ),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // ==================== OPPORTUNITIES (RFPs) ====================
  opportunities: defineTable({
    // External references (for deduplication)
    externalIds: v.array(v.object({
      source: v.string(),
      externalId: v.string(),
      url: v.string(),
      fetchedAt: v.number(),
    })),

    // Core fields
    title: v.string(),
    fullDescription: v.string(),
    buyer: v.object({
      name: v.string(),
      type: v.union(
        v.literal("federal"),
        v.literal("state"),
        v.literal("local"),
        v.literal("other")
      ),
    }),
    location: v.object({
      state: v.optional(v.string()),
      city: v.optional(v.string()),
      isRemoteAllowed: v.optional(v.boolean()),
    }),

    // Dates
    postedDate: v.number(),
    dueDate: v.number(),
    dueTime: v.optional(v.string()),

    // Value
    estimatedValue: v.optional(v.number()),
    valueRange: v.optional(v.object({
      min: v.optional(v.number()),
      max: v.optional(v.number()),
    })),
    contractType: v.optional(v.string()),

    // Contact
    contact: v.optional(v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    })),

    // Classification
    categories: v.array(v.string()),
    setAside: v.optional(v.string()),

    // Attachments
    attachments: v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.optional(v.string()),
      size: v.optional(v.number()),
    })),
    sourceUrl: v.string(),

    // Evidence
    evidenceSnippets: v.array(v.string()),

    // Primary source
    source: v.string(),

    // Metadata
    ingestedAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_source", ["source"])
    .index("by_due_date", ["dueDate"])
    .index("by_posted_date", ["postedDate"])
    .searchIndex("search_title", { searchField: "title" }),

  // ==================== SOURCES (Connector Config) ====================
  sources: defineTable({
    name: v.string(),
    displayName: v.string(),
    enabled: v.boolean(),

    // Scheduling
    refreshIntervalMinutes: v.number(),
    lastFetchAt: v.optional(v.number()),
    nextFetchAt: v.optional(v.number()),

    // Rate limiting
    rateLimitPerMinute: v.number(),
    rateLimitPerHour: v.number(),

    // Health
    status: v.union(
      v.literal("healthy"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("disabled")
    ),
    errorCount: v.number(),
    lastError: v.optional(v.string()),
    lastErrorAt: v.optional(v.number()),

    // Stats
    totalFetched: v.number(),
    fetchedToday: v.number(),

    // Query configurations stored separately
  })
    .index("by_name", ["name"]),

  sourceQueries: defineTable({
    sourceId: v.id("sources"),
    name: v.string(),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
    naicsCodes: v.optional(v.array(v.string())),
    states: v.optional(v.array(v.string())),
    setAsideTypes: v.optional(v.array(v.string())),
    postedWithinDays: v.optional(v.number()),
    deadlineAfterDays: v.optional(v.number()),
  })
    .index("by_source", ["sourceId"]),

  // ==================== EVALUATIONS ====================
  evaluations: defineTable({
    opportunityId: v.id("opportunities"),

    // Eligibility
    eligibility: v.object({
      status: v.union(
        v.literal("ELIGIBLE"),
        v.literal("PARTNER_REQUIRED"),
        v.literal("REJECTED")
      ),
      reasons: v.array(v.object({
        ruleId: v.string(),
        ruleName: v.string(),
        outcome: v.union(
          v.literal("pass"),
          v.literal("fail"),
          v.literal("flag")
        ),
        severity: v.union(v.literal("hard"), v.literal("soft")),
        evidence: v.string(),
        keywords: v.array(v.string()),
      })),
      evidenceSnippets: v.array(v.string()),
      rulesVersion: v.string(),
    }),

    // Scoring
    scoring: v.optional(v.object({
      totalScore: v.number(),
      dimensions: v.array(v.object({
        dimension: v.string(),
        score: v.number(),
        weight: v.number(),
        evidence: v.array(v.string()),
        matchedKeywords: v.array(v.string()),
      })),
      isGoodFit: v.boolean(),
      threshold: v.number(),
      configVersion: v.string(),
    })),

    // Metadata
    evaluatedAt: v.number(),
    evaluatedBy: v.union(v.literal("system"), v.literal("manual")),
  })
    .index("by_opportunity", ["opportunityId"])
    .index("by_eligibility_status", ["eligibility.status"]),

  // ==================== PURSUITS ====================
  pursuits: defineTable({
    opportunityId: v.id("opportunities"),

    // Status
    status: v.union(
      v.literal("new"),
      v.literal("triage"),
      v.literal("bid"),
      v.literal("no-bid"),
      v.literal("capture"),
      v.literal("draft"),
      v.literal("review"),
      v.literal("submitted"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("archived")
    ),

    // Decision
    decision: v.optional(v.union(v.literal("bid"), v.literal("no-bid"))),
    decisionBy: v.optional(v.string()),
    decisionAt: v.optional(v.number()),
    decisionReasons: v.array(v.string()),

    // Ownership
    captureManager: v.optional(v.string()),
    proposalLead: v.optional(v.string()),
    technicalLead: v.optional(v.string()),
    teamMembers: v.array(v.string()),

    // Content references
    pursuitBriefId: v.optional(v.id("pursuitBriefs")),
    complianceMatrixId: v.optional(v.id("complianceMatrices")),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_opportunity", ["opportunityId"])
    .index("by_status", ["status"])
    .index("by_capture_manager", ["captureManager"]),

  pursuitBriefs: defineTable({
    pursuitId: v.id("pursuits"),
    content: v.string(), // JSON stringified PursuitBrief
    generatedAt: v.number(),
    generatedBy: v.union(v.literal("ai"), v.literal("manual")),
    version: v.number(),
  })
    .index("by_pursuit", ["pursuitId"]),

  complianceMatrices: defineTable({
    pursuitId: v.id("pursuits"),
    requirements: v.string(), // JSON stringified requirements array
    completionPercent: v.number(),
    generatedAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_pursuit", ["pursuitId"]),

  pursuitNotes: defineTable({
    pursuitId: v.id("pursuits"),
    content: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_pursuit", ["pursuitId"]),

  pursuitActivity: defineTable({
    pursuitId: v.id("pursuits"),
    type: v.string(),
    description: v.string(),
    userId: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.string()), // JSON
  })
    .index("by_pursuit", ["pursuitId"])
    .index("by_timestamp", ["timestamp"]),

  // ==================== CONTENT LIBRARY ====================
  contentBlocks: defineTable({
    category: v.string(),
    name: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    variables: v.array(v.string()),
    relevantNaics: v.optional(v.array(v.string())),
    relevantKeywords: v.optional(v.array(v.string())),
    lastUsedAt: v.optional(v.number()),
    useCount: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"]),

  caseStudies: defineTable({
    clientName: v.string(),
    projectName: v.string(),
    industry: v.array(v.string()),
    technologies: v.array(v.string()),
    duration: v.string(),
    contractValue: v.optional(v.string()),
    summary: v.string(),
    challenge: v.string(),
    solution: v.string(),
    results: v.array(v.string()),
    contactReference: v.optional(v.object({
      name: v.string(),
      title: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_industry", ["industry"]),

  teamBios: defineTable({
    name: v.string(),
    title: v.string(),
    role: v.string(),
    yearsExperience: v.number(),
    education: v.array(v.string()),
    certifications: v.array(v.string()),
    skills: v.array(v.string()),
    summary: v.string(),
    shortBio: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_role", ["role"]),

  proposalTemplates: defineTable({
    name: v.string(),
    type: v.string(),
    description: v.string(),
    sections: v.string(), // JSON
    requiredFields: v.array(v.string()),
    optionalFields: v.array(v.string()),
    boilerplateVariables: v.array(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    version: v.string(),
    isDefault: v.boolean(),
  })
    .index("by_type", ["type"]),

  // ==================== CONFIGURATION ====================
  eligibilityRules: defineTable({
    ruleId: v.string(),
    name: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    defaultOutcome: v.string(),
    allowOverride: v.boolean(),
    keywords: v.array(v.string()),
    isRegex: v.boolean(),
    severity: v.string(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_rule_id", ["ruleId"]),

  scoringConfig: defineTable({
    key: v.string(), // 'current' for active config
    threshold: v.number(),
    mustPassDimensions: v.array(v.string()),
    weights: v.string(), // JSON
    negativeKeywords: v.array(v.string()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  // ==================== AUDIT LOGS ====================
  auditLogs: defineTable({
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    userId: v.string(),
    userEmail: v.string(),
    changes: v.string(), // JSON: { field, oldValue, newValue }
    timestamp: v.number(),
    metadata: v.optional(v.string()),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // ==================== INGESTION LOGS ====================
  ingestionLogs: defineTable({
    source: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed")
    ),
    fetchedCount: v.number(),
    newCount: v.number(),
    updatedCount: v.number(),
    duplicateCount: v.number(),
    errorCount: v.number(),
    errors: v.optional(v.array(v.string())),
  })
    .index("by_source", ["source"])
    .index("by_started_at", ["startedAt"]),
});
```

---

## Clerk Integration

### Provider Setup

```tsx
// main.tsx
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <RouterProvider router={router} />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### User Sync

```typescript
// convex/users.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      // Update last login
      await ctx.db.patch(existing._id, {
        lastLoginAt: Date.now(),
        name: args.name,
        email: args.email,
      });
      return existing._id;
    }

    // Create new user with default role
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role: "user",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});
```

---

## Role-Based Access Control (RBAC)

```typescript
// convex/lib/rbac.ts

type Role = "admin" | "manager" | "user" | "viewer";

interface Permission {
  action: string;
  resource: string;
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { action: "*", resource: "*" }, // Full access
  ],
  manager: [
    { action: "read", resource: "*" },
    { action: "create", resource: "pursuits" },
    { action: "update", resource: "pursuits" },
    { action: "create", resource: "evaluations" },
    { action: "read", resource: "admin.sources" },
    { action: "read", resource: "admin.scoring" },
  ],
  user: [
    { action: "read", resource: "opportunities" },
    { action: "read", resource: "evaluations" },
    { action: "read", resource: "pursuits" },
    { action: "create", resource: "pursuits" },
    { action: "update", resource: "pursuits" },
  ],
  viewer: [
    { action: "read", resource: "opportunities" },
    { action: "read", resource: "evaluations" },
    { action: "read", resource: "pursuits" },
  ],
};

export function hasPermission(
  userRole: Role,
  action: string,
  resource: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];

  return permissions.some(
    (p) =>
      (p.action === "*" || p.action === action) &&
      (p.resource === "*" || p.resource === resource)
  );
}

// Usage in mutations
export const updateScoringConfig = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !hasPermission(user.role, "update", "admin.scoring")) {
      throw new Error("Unauthorized: Admin access required");
    }

    // ... update logic
  },
});
```

### Protected Routes

```tsx
// components/ProtectedRoute.tsx

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: Role;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const user = useQuery(api.users.getCurrentUser);

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" />;
  }

  if (requiredRole && user && !hasMinimumRole(user.role, requiredRole)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}

// Usage
<Route
  path="/admin/*"
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminLayout />
    </ProtectedRoute>
  }
/>
```

---

## Audit Logging

```typescript
// convex/lib/audit.ts

interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userEmail: string;
  changes: { field: string; oldValue: any; newValue: any }[];
  metadata?: Record<string, any>;
}

export async function logAudit(
  ctx: MutationCtx,
  entry: AuditEntry
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    userId: entry.userId,
    userEmail: entry.userEmail,
    changes: JSON.stringify(entry.changes),
    timestamp: Date.now(),
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
  });
}

// Usage example
export const updateEligibilityRule = mutation({
  args: {
    ruleId: v.string(),
    updates: v.object({ /* ... */ }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("eligibilityRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();

    if (!existing) throw new Error("Rule not found");

    // Calculate changes
    const changes = Object.entries(args.updates).map(([field, newValue]) => ({
      field,
      oldValue: existing[field as keyof typeof existing],
      newValue,
    }));

    // Update
    await ctx.db.patch(existing._id, {
      ...args.updates,
      updatedAt: Date.now(),
      version: existing.version + 1,
    });

    // Audit log
    await logAudit(ctx, {
      action: "update",
      entityType: "eligibilityRules",
      entityId: args.ruleId,
      userId: user.clerkId,
      userEmail: user.email,
      changes,
    });
  },
});
```

### Audit Log UI

```tsx
// components/admin/AuditLog.tsx

export function AuditLog() {
  const logs = useQuery(api.audit.list, { limit: 100 });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Audit Log</h2>

      <div className="space-y-2">
        {logs?.map((log) => (
          <Card key={log._id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <Badge>{log.action}</Badge>
                  <span className="ml-2 font-medium">{log.entityType}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(log.timestamp)}
                </span>
              </div>

              <p className="text-sm mt-2">
                <span className="text-muted-foreground">By:</span> {log.userEmail}
              </p>

              {log.changes && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Changes:</span>
                  <ul className="list-disc pl-5 mt-1">
                    {JSON.parse(log.changes).map((change: any, i: number) => (
                      <li key={i}>
                        <code>{change.field}</code>:{" "}
                        <span className="text-destructive">{String(change.oldValue)}</span>
                        {" → "}
                        <span className="text-success">{String(change.newValue)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Observability

### Ingestion Logs

```typescript
// convex/ingestion.ts

export const logIngestionRun = mutation({
  args: {
    source: v.string(),
    status: v.string(),
    fetchedCount: v.number(),
    newCount: v.number(),
    updatedCount: v.number(),
    duplicateCount: v.number(),
    errorCount: v.number(),
    errors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ingestionLogs", {
      ...args,
      startedAt: Date.now(),
      completedAt: Date.now(),
      status: args.status as any,
    });
  },
});

export const getIngestionHealth = query({
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();

    const health = await Promise.all(
      sources.map(async (source) => {
        const recentLogs = await ctx.db
          .query("ingestionLogs")
          .withIndex("by_source", (q) => q.eq("source", source.name))
          .order("desc")
          .take(10);

        const successRate = recentLogs.filter(l => l.status === "success").length / recentLogs.length;

        return {
          source: source.name,
          displayName: source.displayName,
          enabled: source.enabled,
          status: source.status,
          lastFetch: source.lastFetchAt,
          errorCount: source.errorCount,
          successRate,
          recentLogs,
        };
      })
    );

    return health;
  },
});
```

### Error Tracking

```typescript
// services/errorTracking.ts

interface ErrorLog {
  type: "ingestion" | "scoring" | "ai" | "system";
  source?: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: number;
}

export async function logError(error: ErrorLog): Promise<void> {
  // Log to Convex
  await convex.mutation(api.errors.log, error);

  // Also log to console in development
  if (import.meta.env.DEV) {
    console.error(`[${error.type}] ${error.message}`, error.context);
  }
}

// Usage
try {
  await fetchFromSamGov();
} catch (error) {
  await logError({
    type: "ingestion",
    source: "sam.gov",
    message: error.message,
    stack: error.stack,
    context: { query: currentQuery },
    timestamp: Date.now(),
  });
}
```

---

## Implementation Checklist

### Week 11: Migration + Auth

- [ ] Create complete Convex schema
- [ ] Set up Clerk integration
- [ ] Implement user sync
- [ ] Create migration script from localStorage
- [ ] Implement RBAC system
- [ ] Create protected routes
- [ ] Test auth flow

### Week 12: Audit + Observability

- [ ] Implement audit logging
- [ ] Add audit logs to all admin mutations
- [ ] Create Audit Log UI
- [ ] Implement config versioning
- [ ] Set up ingestion logging
- [ ] Create health dashboard
- [ ] Error tracking integration
- [ ] Final testing and deployment

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `convex/schema.ts` | Create | Complete database schema |
| `convex/users.ts` | Create | User management |
| `convex/lib/rbac.ts` | Create | RBAC utilities |
| `convex/lib/audit.ts` | Create | Audit logging |
| `convex/auth.config.ts` | Create | Clerk config |
| `src/main.tsx` | Modify | Add providers |
| `src/components/ProtectedRoute.tsx` | Create | Route protection |
| `src/components/admin/AuditLog.tsx` | Create | Audit UI |
| `src/services/migration.ts` | Create | Data migration |

---

*Reference: CTO Instructions Section 2C (Data Model), Section 2D (Non-Functional Requirements), Section 2B.6 (Auditability)*
