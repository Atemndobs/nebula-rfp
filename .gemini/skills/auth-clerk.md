# Skill: Clerk Authentication Setup

## Purpose
Implement user authentication and authorization using Clerk, integrated with Convex for secure data access.

## Prerequisites

```bash
# Install dependencies
npm install @clerk/clerk-react convex
```

## Environment Variables

```env
# .env.local
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CONVEX_URL=https://your-project.convex.cloud

# Convex dashboard environment variables
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
```

## Clerk Dashboard Setup

1. Create a Clerk application at https://dashboard.clerk.com
2. Configure sign-in methods (Email, Google, GitHub, etc.)
3. Get publishable key from API Keys section
4. Configure JWT template for Convex:
   - Go to JWT Templates
   - Create "convex" template
   - Use this template:
   ```json
   {
     "aud": "convex",
     "sub": "{{user.id}}",
     "name": "{{user.full_name}}",
     "email": "{{user.primary_email_address}}",
     "picture": "{{user.image_url}}"
   }
   ```

## Convex Auth Configuration

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

## App Entry Point Setup

```typescript
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App";

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

## Authentication Components

### Sign In/Out Buttons

```tsx
// components/AuthButtons.tsx
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";

export function AuthButtons() {
  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-10 h-10",
            },
          }}
        />
      </SignedIn>
    </div>
  );
}
```

### Protected Routes

```tsx
// components/ProtectedRoute.tsx
import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return fallback ?? <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
```

### Auth Guard for App Sections

```tsx
// components/AuthGuard.tsx
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
```

## Convex Functions with Auth

### Authenticated Queries

```typescript
// convex/rfps.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// Public query - no auth required
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rfps").take(10);
  },
});

// Authenticated query - requires sign in
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Return user-specific data
    return await ctx.db
      .query("rfps")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
  },
});
```

### Authenticated Mutations

```typescript
// convex/pursuits.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    rfpId: v.id("rfps"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("pursuits", {
      rfpId: args.rfpId,
      userId: identity.subject,
      userName: identity.name ?? "Unknown",
      userEmail: identity.email ?? "",
      status: args.status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### User Profile Sync

```typescript
// convex/users.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Sync user from Clerk on first sign-in
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: identity.name,
        email: identity.email,
        imageUrl: identity.pictureUrl,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
      role: "user", // Default role
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

## Schema with User Relations

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.string(), // "admin", "user", "viewer"
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  rfps: defineTable({
    // ... rfp fields
    createdBy: v.optional(v.string()), // Clerk user ID
  }),

  evaluations: defineTable({
    rfpId: v.id("rfps"),
    userId: v.string(), // Clerk user ID
    // ... other fields
  }).index("by_user", ["userId"]),

  pursuits: defineTable({
    rfpId: v.id("rfps"),
    userId: v.string(), // Clerk user ID
    // ... other fields
  }).index("by_user", ["userId"]),
});
```

## Role-Based Access Control

```typescript
// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await requireAuth(ctx);

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return { identity, user };
}

// Usage in mutations
export const deleteRfp = mutation({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx); // Throws if not admin
    await ctx.db.delete(args.rfpId);
  },
});
```

## React Hooks for Auth State

```tsx
// hooks/useCurrentUser.ts
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);

  return {
    clerkUser,
    convexUser,
    isLoaded: clerkLoaded && convexUser !== undefined,
    isAdmin: convexUser?.role === "admin",
    isSignedIn: !!clerkUser,
  };
}
```

## Header Integration

```tsx
// components/Header.tsx
import { AuthButtons } from "./AuthButtons";
import { useCurrentUser } from "../hooks/useCurrentUser";

export function Header() {
  const { convexUser, isAdmin } = useCurrentUser();

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">RFP Discovery</h1>
        {isAdmin && (
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
            Admin
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {convexUser && (
          <span className="text-sm text-gray-600">
            {convexUser.name}
          </span>
        )}
        <AuthButtons />
      </div>
    </header>
  );
}
```

## Webhook for User Events (Optional)

For syncing user data when profile changes in Clerk:

```typescript
// convex/http.ts (Convex HTTP endpoint)
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();

    if (payload.type === "user.updated") {
      await ctx.runMutation(internal.users.syncFromWebhook, {
        clerkId: payload.data.id,
        name: `${payload.data.first_name} ${payload.data.last_name}`,
        email: payload.data.email_addresses[0]?.email_address,
        imageUrl: payload.data.image_url,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
```
