# Skill: Convex Database Setup

## Purpose
Set up Convex as the real-time database and backend for the RFP Discovery platform, replacing localStorage-based storage.

## Prerequisites

```bash
# Install Convex
npm install convex

# Initialize Convex in the project
npx convex dev
```

## Project Setup

### 1. Create Convex Directory Structure

```
rfp-discovery/
└── convex/
    ├── _generated/          # Auto-generated (don't edit)
    ├── schema.ts            # Database schema
    ├── auth.config.ts       # Clerk auth configuration
    ├── rfps.ts              # RFP queries and mutations
    ├── evaluations.ts       # Evaluation functions
    ├── pursuits.ts          # Pursuit workflow functions
    ├── users.ts             # User management
    ├── settings.ts          # App settings
    ├── crons.ts             # Scheduled jobs
    └── lib/
        ├── auth.ts          # Auth helpers
        └── utils.ts         # Utility functions
```

### 2. Environment Setup

```env
# .env.local
VITE_CONVEX_URL=https://your-project.convex.cloud

# Set in Convex Dashboard (not in .env.local)
# GEMINI_API_KEY=...
# OPENAI_API_KEY=...
# SAM_GOV_API_KEY=...
# CLERK_ISSUER_URL=...
```

## Complete Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (synced from Clerk)
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.string(), // "admin" | "user" | "viewer"
    preferences: v.optional(v.object({
      theme: v.string(),
      defaultSource: v.optional(v.string()),
      notificationsEnabled: v.boolean(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // RFP Opportunities
  rfps: defineTable({
    externalId: v.string(),
    source: v.string(), // "sam.gov" | "emma" | "rfpmart" | "bidnet"
    title: v.string(),
    description: v.string(),
    summary: v.optional(v.string()),
    location: v.string(),
    category: v.string(),
    naicsCode: v.optional(v.string()),
    setAside: v.optional(v.string()),
    postedDate: v.number(),
    expiryDate: v.number(),
    url: v.string(),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.optional(v.string()),
    }))),
    eligibilityFlags: v.optional(v.array(v.string())),
    rawData: v.optional(v.any()),
    ingestedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_external_id", ["externalId", "source"])
    .index("by_source", ["source"])
    .index("by_expiry", ["expiryDate"])
    .index("by_posted", ["postedDate"])
    .searchIndex("search_title_description", {
      searchField: "title",
      filterFields: ["source", "category"],
    }),

  // Evaluations
  evaluations: defineTable({
    rfpId: v.id("rfps"),
    userId: v.string(),
    evaluationType: v.string(), // "logic" | "ai" | "hybrid"
    aiProvider: v.optional(v.string()),
    score: v.number(),
    isFit: v.boolean(),
    criteriaResults: v.array(v.object({
      criterionId: v.string(),
      criterionName: v.string(),
      weight: v.number(),
      met: v.boolean(),
      score: v.number(),
      matchedKeywords: v.array(v.string()),
      details: v.string(),
    })),
    eligibility: v.object({
      eligible: v.boolean(),
      status: v.string(), // "ok" | "needs_partner" | "reject"
      disqualifiers: v.array(v.string()),
    }),
    reasoning: v.optional(v.string()),
    evaluatedAt: v.number(),
  })
    .index("by_rfp", ["rfpId"])
    .index("by_user", ["userId"])
    .index("by_score", ["score"]),

  // Pursuits (Bid Tracking)
  pursuits: defineTable({
    rfpId: v.id("rfps"),
    userId: v.string(),
    status: v.string(), // "new" | "triage" | "bid" | "no-bid" | "capture" | "draft" | "review" | "submitted" | "won" | "lost"
    decision: v.optional(v.string()), // "pursue" | "maybe" | "skip"
    decisionBy: v.optional(v.string()),
    decisionAt: v.optional(v.number()),
    brief: v.optional(v.string()), // JSON pursuit brief
    complianceMatrix: v.optional(v.string()), // JSON compliance matrix
    proposalDraft: v.optional(v.string()),
    notes: v.optional(v.string()),
    teamMembers: v.optional(v.array(v.string())),
    deadlineReminders: v.optional(v.array(v.number())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_rfp", ["rfpId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  // Evaluation Criteria Configuration
  criteria: defineTable({
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    weight: v.number(),
    enabled: v.boolean(),
    keywords: v.array(v.object({
      value: v.string(),
      enabled: v.boolean(),
    })),
    minMatches: v.number(),
    systemInstruction: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_order", ["order"]),

  // AI Provider Settings
  aiSettings: defineTable({
    userId: v.string(),
    provider: v.string(), // "gemini" | "openai" | "anthropic" | etc.
    model: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    isEnabled: v.boolean(),
    corePrompt: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Ingestion Logs
  ingestionLogs: defineTable({
    source: v.string(),
    status: v.string(), // "started" | "completed" | "failed"
    recordsProcessed: v.number(),
    recordsInserted: v.number(),
    recordsUpdated: v.number(),
    errors: v.optional(v.array(v.string())),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_source", ["source"])
    .index("by_started", ["startedAt"]),

  // Activity Log (Audit Trail)
  activityLog: defineTable({
    userId: v.string(),
    action: v.string(), // "evaluate" | "decide" | "export" | "update_settings"
    entityType: v.string(), // "rfp" | "pursuit" | "criteria"
    entityId: v.optional(v.string()),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),
});
```

## Core Functions

### RFP Queries and Mutations

```typescript
// convex/rfps.ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// List RFPs with filtering
export const list = query({
  args: {
    source: v.optional(v.string()),
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    minScore: v.optional(v.number()),
    showOnlyFit: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("rfps");

    // Apply source filter
    if (args.source) {
      q = q.withIndex("by_source", (q) => q.eq("source", args.source));
    }

    // Get results
    const rfps = await q.order("desc").take(args.limit ?? 50);

    // If we need evaluation data, join it
    const rfpsWithEvaluation = await Promise.all(
      rfps.map(async (rfp) => {
        const evaluation = await ctx.db
          .query("evaluations")
          .withIndex("by_rfp", (q) => q.eq("rfpId", rfp._id))
          .order("desc")
          .first();

        return { ...rfp, evaluation };
      })
    );

    // Apply score/fit filters in memory (after join)
    let filtered = rfpsWithEvaluation;
    if (args.minScore !== undefined) {
      filtered = filtered.filter(
        (r) => r.evaluation && r.evaluation.score >= args.minScore!
      );
    }
    if (args.showOnlyFit) {
      filtered = filtered.filter((r) => r.evaluation?.isFit);
    }

    return filtered;
  },
});

// Get single RFP with full details
export const get = query({
  args: { id: v.id("rfps") },
  handler: async (ctx, args) => {
    const rfp = await ctx.db.get(args.id);
    if (!rfp) return null;

    const evaluation = await ctx.db
      .query("evaluations")
      .withIndex("by_rfp", (q) => q.eq("rfpId", args.id))
      .order("desc")
      .first();

    const pursuit = await ctx.db
      .query("pursuits")
      .withIndex("by_rfp", (q) => q.eq("rfpId", args.id))
      .first();

    return { ...rfp, evaluation, pursuit };
  },
});

// Upsert RFP (for ingestion)
export const upsert = internalMutation({
  args: {
    externalId: v.string(),
    source: v.string(),
    title: v.string(),
    description: v.string(),
    location: v.string(),
    category: v.string(),
    postedDate: v.number(),
    expiryDate: v.number(),
    url: v.string(),
    rawData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rfps")
      .withIndex("by_external_id", (q) =>
        q.eq("externalId", args.externalId).eq("source", args.source)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return { id: existing._id, action: "updated" };
    }

    const id = await ctx.db.insert("rfps", {
      ...args,
      ingestedAt: now,
      updatedAt: now,
    });
    return { id, action: "inserted" };
  },
});

// Search RFPs by text
export const search = query({
  args: {
    query: v.string(),
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let searchQuery = ctx.db
      .query("rfps")
      .withSearchIndex("search_title_description", (q) => {
        let sq = q.search("title", args.query);
        if (args.source) {
          sq = sq.eq("source", args.source);
        }
        return sq;
      });

    return await searchQuery.take(args.limit ?? 20);
  },
});
```

### Settings Management

```typescript
// convex/settings.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all criteria
export const getCriteria = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("criteria").withIndex("by_order").collect();
  },
});

// Update criterion
export const updateCriterion = mutation({
  args: {
    id: v.id("criteria"),
    updates: v.object({
      enabled: v.optional(v.boolean()),
      weight: v.optional(v.number()),
      keywords: v.optional(
        v.array(
          v.object({
            value: v.string(),
            enabled: v.boolean(),
          })
        )
      ),
      systemInstruction: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      userId: identity.subject,
      action: "update_settings",
      entityType: "criteria",
      entityId: args.id,
      details: args.updates,
      timestamp: Date.now(),
    });
  },
});

// Seed default criteria
export const seedDefaultCriteria = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("criteria").first();
    if (existing) return { message: "Criteria already exist" };

    const defaultCriteria = [
      {
        name: "technical_relevance",
        displayName: "Technical Relevance",
        description: "Alignment with cloud, serverless, and modern tech stack",
        weight: 25,
        enabled: true,
        keywords: [
          { value: "aws", enabled: true },
          { value: "cloud", enabled: true },
          { value: "serverless", enabled: true },
          { value: "react", enabled: true },
          { value: "api", enabled: true },
          { value: "kubernetes", enabled: true },
        ],
        minMatches: 2,
        order: 1,
      },
      {
        name: "scope_fit",
        displayName: "Scope Fit",
        description: "Project type matches our delivery capabilities",
        weight: 20,
        enabled: true,
        keywords: [
          { value: "website redesign", enabled: true },
          { value: "platform modernization", enabled: true },
          { value: "cloud migration", enabled: true },
          { value: "api development", enabled: true },
        ],
        minMatches: 1,
        order: 2,
      },
      // ... other criteria
    ];

    const now = Date.now();
    for (const criterion of defaultCriteria) {
      await ctx.db.insert("criteria", {
        ...criterion,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { message: "Default criteria seeded" };
  },
});

// Get AI settings for user
export const getAiSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("aiSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

// Update AI settings
export const updateAiSettings = mutation({
  args: {
    provider: v.string(),
    model: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    isEnabled: v.boolean(),
    corePrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("aiSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("aiSettings", {
        userId: identity.subject,
        ...args,
        updatedAt: Date.now(),
      });
    }
  },
});
```

## React Integration

### Provider Setup

```typescript
// src/providers/ConvexProvider.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

### Using Queries

```typescript
// components/RfpList.tsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function RfpList() {
  const rfps = useQuery(api.rfps.list, {
    source: "sam.gov",
    showOnlyFit: true,
    limit: 50,
  });

  if (rfps === undefined) {
    return <LoadingSpinner />;
  }

  return (
    <div className="grid gap-4">
      {rfps.map((rfp) => (
        <RfpCard key={rfp._id} rfp={rfp} />
      ))}
    </div>
  );
}
```

### Using Mutations

```typescript
// components/EvaluateButton.tsx
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function EvaluateButton({ rfpId }: { rfpId: Id<"rfps"> }) {
  const evaluate = useMutation(api.evaluations.evaluate);
  const [isLoading, setIsLoading] = useState(false);

  const handleEvaluate = async () => {
    setIsLoading(true);
    try {
      await evaluate({ rfpId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleEvaluate}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
    >
      {isLoading ? "Evaluating..." : "Evaluate"}
    </button>
  );
}
```

## Scheduled Jobs

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Ingest from SAM.gov every 6 hours
crons.interval(
  "ingest-sam-gov",
  { hours: 6 },
  internal.ingestion.runSamGovIngestion
);

// Clean up expired RFPs daily
crons.daily(
  "cleanup-expired",
  { hourUTC: 6, minuteUTC: 0 },
  internal.maintenance.cleanupExpiredRfps
);

// Send deadline reminders
crons.hourly(
  "deadline-reminders",
  { minuteUTC: 0 },
  internal.notifications.checkDeadlineReminders
);

export default crons;
```

## Migration from localStorage

```typescript
// utils/migration.ts
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function useMigrateFromLocalStorage() {
  const seedCriteria = useMutation(api.settings.seedDefaultCriteria);
  const updateAiSettings = useMutation(api.settings.updateAiSettings);

  return async () => {
    // Seed default criteria if needed
    await seedCriteria();

    // Migrate AI settings from localStorage
    const storedSettings = localStorage.getItem("aiSettings");
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      await updateAiSettings({
        provider: settings.provider || "gemini",
        model: settings.model,
        isEnabled: settings.isEnabled ?? false,
      });
      localStorage.removeItem("aiSettings");
    }

    // Clean up other localStorage items
    localStorage.removeItem("criteriaConfig");
    localStorage.removeItem("theme");
  };
}
```

## Development Commands

```bash
# Start Convex dev server (watches for changes)
npx convex dev

# Deploy to production
npx convex deploy

# Run a function manually
npx convex run rfps:list

# Open Convex dashboard
npx convex dashboard

# Generate types
npx convex codegen

# View logs
npx convex logs
```
