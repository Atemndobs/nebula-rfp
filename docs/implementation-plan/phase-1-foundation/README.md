# Phase 1: Foundation

**Duration**: 2 Weeks (Days 1-14)
**Goal**: Get core infrastructure working with SAM.gov integration

---

## Executive View

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1: FOUNDATION                         │
│                                                                 │
│  Week 1: Infrastructure          Week 2: Data Pipeline          │
│  ┌─────────────────────┐        ┌─────────────────────┐        │
│  │ ☐ Convex Setup      │        │ ☐ SAM.gov API       │        │
│  │ ☐ Clerk Auth        │        │ ☐ Eligibility Gate  │        │
│  │ ☐ Database Schema   │        │ ☐ Basic UI          │        │
│  │ ☐ Project Structure │        │ ☐ Testing           │        │
│  └─────────────────────┘        └─────────────────────┘        │
│                                                                 │
│  Outcome: Users can log in and browse federal RFPs              │
└─────────────────────────────────────────────────────────────────┘
```

### Success Criteria

| Metric | Target |
|--------|--------|
| SAM.gov RFPs ingested | 100+ opportunities |
| User authentication | Working login/logout |
| Data freshness | Auto-refresh every 6 hours |
| Eligibility flags detected | 90%+ accuracy |

---

## Developer Implementation Guide

### Week 1: Infrastructure Setup (Days 1-7)

#### Day 1-2: Convex & Clerk Setup

**Objective**: Get database and auth working

**Step 1: Install Dependencies**
```bash
cd rfp-discovery
npm install convex @clerk/clerk-react
```

**Step 2: Initialize Convex**
```bash
npx convex dev
# Follow prompts to create project
# Note your deployment URL
```

**Step 3: Create Environment File**
```env
# .env.local
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

**Step 4: Set Up Clerk**
1. Go to https://dashboard.clerk.com
2. Create new application "RFP Discovery"
3. Enable Email + Google sign-in
4. Copy Publishable Key to `.env.local`
5. Create JWT template for Convex:
   - Name: `convex`
   - Claims: `{ "aud": "convex" }`

**Step 5: Configure Convex Auth**
```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};
```

**Step 6: Set Convex Environment Variables**
In Convex Dashboard → Settings → Environment Variables:
```
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
```

**Verification Checklist:**
- [ ] `npx convex dev` runs without errors
- [ ] Convex dashboard shows your tables
- [ ] Clerk dashboard shows your application
- [ ] Environment variables set in both places

---

#### Day 3-4: Database Schema

**Objective**: Create the data model for RFPs

**File: `convex/schema.ts`**
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users synced from Clerk
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.string(), // "admin" | "user"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // RFP Opportunities (canonical schema)
  rfps: defineTable({
    // Identity
    externalId: v.string(),
    source: v.string(), // "sam.gov" | "emma" | "rfpmart"

    // Core fields
    title: v.string(),
    description: v.string(),
    summary: v.optional(v.string()),

    // Classification
    location: v.string(),
    category: v.string(),
    naicsCode: v.optional(v.string()),
    setAside: v.optional(v.string()),

    // Dates
    postedDate: v.number(),
    expiryDate: v.number(),

    // Links
    url: v.string(),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
    }))),

    // Eligibility
    eligibilityFlags: v.optional(v.array(v.string())),

    // Raw data for debugging
    rawData: v.optional(v.any()),

    // Timestamps
    ingestedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_external_id", ["externalId", "source"])
    .index("by_source", ["source"])
    .index("by_expiry", ["expiryDate"])
    .index("by_posted", ["postedDate"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["source", "category"],
    }),

  // Ingestion logs for monitoring
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
});
```

**Verification:**
```bash
npx convex dev
# Should show: Schema updated
```

---

#### Day 5-6: Provider Setup & Basic Queries

**Objective**: Wire up React with Convex + Clerk

**File: `src/main.tsx`**
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>
);
```

**File: `convex/rfps.ts`** (Basic Queries)
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// List RFPs with pagination
export const list = query({
  args: {
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("rfps");

    if (args.source) {
      q = q.withIndex("by_source", (q) => q.eq("source", args.source));
    }

    return await q.order("desc").take(args.limit ?? 50);
  },
});

// Get single RFP
export const get = query({
  args: { id: v.id("rfps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Search RFPs
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rfps")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm)
      )
      .take(20);
  },
});
```

---

#### Day 7: User Sync & Auth Components

**File: `convex/users.ts`**
```typescript
import { mutation, query } from "./_generated/server";

export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
        imageUrl: identity.pictureUrl,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
      role: "user",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getCurrentUser = query({
  args: {},
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

**File: `src/components/AuthButtons.tsx`**
```tsx
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";

export function AuthButtons() {
  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
```

---

### Week 2: Data Pipeline (Days 8-14)

#### Day 8-10: SAM.gov API Integration

**Objective**: Ingest federal RFPs from SAM.gov

**Step 1: Get SAM.gov API Key**
1. Register at https://sam.gov
2. Go to Profile → API Keys
3. Request "Opportunities Public API" access
4. Add to Convex environment variables:
   ```
   SAM_GOV_API_KEY=your-api-key
   ```

**File: `convex/ingestion/samGov.ts`**
```typescript
import { action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// SAM.gov API response types
interface SamOpportunity {
  noticeId: string;
  title: string;
  description?: string;
  postedDate: string;
  responseDeadLine: string;
  naicsCode?: string;
  setAsideDescription?: string;
  placeOfPerformance?: {
    state?: string;
    city?: string;
  };
  pointOfContact?: {
    email?: string;
    fullName?: string;
  };
}

// Eligibility patterns to detect
const ELIGIBILITY_PATTERNS = [
  { pattern: /u\.?s\.?\s*(citizen|company|organization)\s*only/i, flag: "us-org-only" },
  { pattern: /onshore\s*(only|required)/i, flag: "onshore-required" },
  { pattern: /on-?site\s*(required|mandatory)/i, flag: "onsite-required" },
  { pattern: /security\s*clearance\s*(required|mandatory)/i, flag: "clearance-required" },
  { pattern: /small\s*business\s*set[- ]?aside/i, flag: "small-business" },
  { pattern: /8\(a\)\s*(set[- ]?aside|program)/i, flag: "8a-set-aside" },
  { pattern: /hubzone/i, flag: "hubzone" },
  { pattern: /service[- ]disabled\s*veteran/i, flag: "sdvosb" },
  { pattern: /women[- ]owned/i, flag: "wosb" },
];

function detectEligibilityFlags(text: string): string[] {
  const flags: string[] = [];
  for (const { pattern, flag } of ELIGIBILITY_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(flag);
    }
  }
  return flags;
}

export const ingestFromSamGov = action({
  args: {
    daysBack: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.SAM_GOV_API_KEY;
    if (!apiKey) {
      throw new Error("SAM_GOV_API_KEY not configured in Convex environment");
    }

    // Log start
    const logId = await ctx.runMutation(internal.ingestion.logStart, {
      source: "sam.gov",
    });

    try {
      // Calculate date range
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - (args.daysBack ?? 7));

      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      // Build API URL
      const params = new URLSearchParams({
        api_key: apiKey,
        postedFrom: formatDate(fromDate),
        postedTo: formatDate(toDate),
        limit: String(args.limit ?? 100),
        ptype: "o", // Opportunities only
      });

      const url = `https://api.sam.gov/opportunities/v2/search?${params}`;

      // Fetch data
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`SAM.gov API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const opportunities: SamOpportunity[] = data.opportunitiesData ?? [];

      // Process each opportunity
      let inserted = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const opp of opportunities) {
        try {
          // Combine text for eligibility detection
          const fullText = `${opp.title ?? ""} ${opp.description ?? ""}`;
          const eligibilityFlags = detectEligibilityFlags(fullText);

          const result = await ctx.runMutation(internal.rfps.upsert, {
            externalId: opp.noticeId,
            source: "sam.gov",
            title: opp.title ?? "Untitled Opportunity",
            description: opp.description ?? "",
            location: opp.placeOfPerformance?.state ?? "USA",
            category: opp.naicsCode ?? "Unknown",
            naicsCode: opp.naicsCode,
            setAside: opp.setAsideDescription,
            postedDate: new Date(opp.postedDate).getTime(),
            expiryDate: new Date(opp.responseDeadLine).getTime(),
            url: `https://sam.gov/opp/${opp.noticeId}/view`,
            eligibilityFlags,
            rawData: opp,
          });

          if (result.action === "inserted") inserted++;
          else updated++;
        } catch (error) {
          errors.push(`${opp.noticeId}: ${error}`);
        }
      }

      // Log completion
      await ctx.runMutation(internal.ingestion.logComplete, {
        logId,
        recordsProcessed: opportunities.length,
        recordsInserted: inserted,
        recordsUpdated: updated,
        errors: errors.length > 0 ? errors : undefined,
      });

      return {
        success: true,
        processed: opportunities.length,
        inserted,
        updated,
        errors: errors.length,
      };
    } catch (error) {
      // Log failure
      await ctx.runMutation(internal.ingestion.logFailed, {
        logId,
        error: String(error),
      });
      throw error;
    }
  },
});
```

**File: `convex/ingestion/index.ts`** (Logging helpers)
```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const logStart = internalMutation({
  args: { source: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ingestionLogs", {
      source: args.source,
      status: "started",
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      startedAt: Date.now(),
    });
  },
});

export const logComplete = internalMutation({
  args: {
    logId: v.id("ingestionLogs"),
    recordsProcessed: v.number(),
    recordsInserted: v.number(),
    recordsUpdated: v.number(),
    errors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      status: "completed",
      recordsProcessed: args.recordsProcessed,
      recordsInserted: args.recordsInserted,
      recordsUpdated: args.recordsUpdated,
      errors: args.errors,
      completedAt: Date.now(),
    });
  },
});

export const logFailed = internalMutation({
  args: {
    logId: v.id("ingestionLogs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      status: "failed",
      errors: [args.error],
      completedAt: Date.now(),
    });
  },
});
```

---

#### Day 11-12: RFP Upsert & Deduplication

**File: `convex/rfps.ts`** (Add upsert mutation)
```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const upsert = internalMutation({
  args: {
    externalId: v.string(),
    source: v.string(),
    title: v.string(),
    description: v.string(),
    location: v.string(),
    category: v.string(),
    naicsCode: v.optional(v.string()),
    setAside: v.optional(v.string()),
    postedDate: v.number(),
    expiryDate: v.number(),
    url: v.string(),
    eligibilityFlags: v.optional(v.array(v.string())),
    rawData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check for existing record
    const existing = await ctx.db
      .query("rfps")
      .withIndex("by_external_id", (q) =>
        q.eq("externalId", args.externalId).eq("source", args.source)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return { id: existing._id, action: "updated" as const };
    }

    // Insert new
    const id = await ctx.db.insert("rfps", {
      ...args,
      ingestedAt: now,
      updatedAt: now,
    });
    return { id, action: "inserted" as const };
  },
});
```

---

#### Day 13-14: Basic UI & Testing

**File: `src/components/RfpList.tsx`**
```tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RfpCard } from "./RfpCard";
import { LoadingSpinner } from "./LoadingSpinner";

interface RfpListProps {
  source?: string;
  limit?: number;
}

export function RfpList({ source, limit = 50 }: RfpListProps) {
  const rfps = useQuery(api.rfps.list, { source, limit });

  if (rfps === undefined) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (rfps.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No RFPs found. Try running an ingestion.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rfps.map((rfp) => (
        <RfpCard key={rfp._id} rfp={rfp} />
      ))}
    </div>
  );
}
```

**File: `src/components/RfpCard.tsx`**
```tsx
import { Doc } from "../../convex/_generated/dataModel";

interface RfpCardProps {
  rfp: Doc<"rfps">;
}

export function RfpCard({ rfp }: RfpCardProps) {
  const daysRemaining = Math.ceil(
    (rfp.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const isExpiringSoon = daysRemaining <= 7;
  const isExpired = daysRemaining < 0;

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-muted-foreground uppercase">
          {rfp.source}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded ${
            isExpired
              ? "bg-destructive/20 text-destructive"
              : isExpiringSoon
                ? "bg-warning/20 text-warning"
                : "bg-success/20 text-success"
          }`}
        >
          {isExpired
            ? "Expired"
            : `${daysRemaining} days left`}
        </span>
      </div>

      <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
        {rfp.title}
      </h3>

      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
        {rfp.description || "No description available"}
      </p>

      {/* Eligibility Flags */}
      {rfp.eligibilityFlags && rfp.eligibilityFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {rfp.eligibilityFlags.map((flag) => (
            <span
              key={flag}
              className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{rfp.location}</span>
        <a
          href={rfp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          View Details →
        </a>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

### Infrastructure Tests
- [ ] `npx convex dev` starts without errors
- [ ] Clerk sign-in works
- [ ] User syncs to Convex on first login
- [ ] Database tables visible in Convex dashboard

### SAM.gov Integration Tests
- [ ] API key accepted by SAM.gov
- [ ] Ingestion action completes successfully
- [ ] RFPs appear in database
- [ ] Eligibility flags detected correctly
- [ ] Deduplication works (run twice, no duplicates)

### UI Tests
- [ ] RFP list loads
- [ ] Cards display correctly
- [ ] Eligibility flags shown
- [ ] External links work
- [ ] Responsive on mobile

---

## Handoff Criteria for Phase 2

Phase 1 is complete when:

1. ✅ Users can sign in with Clerk
2. ✅ SAM.gov RFPs are ingested (100+ records)
3. ✅ Eligibility flags are detected
4. ✅ Basic RFP list UI works
5. ✅ No critical bugs

**Next**: [Phase 2 - Intelligence Engine](../phase-2-intelligence/README.md)
