# Implementation: PostHog Integration

## Prerequisites

- [ ] PostHog account created (https://posthog.com)
- [ ] Project API key obtained from PostHog dashboard
- [ ] Clerk authentication working

## Implementation Steps

### Phase 1: Setup (30 minutes)

#### 1.1 Install Package

```bash
npm install posthog-js
```

#### 1.2 Add Environment Variables

Add to `.env.local`:

```env
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

Add to `.env.example` (without real values):

```env
# PostHog Analytics (optional)
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

#### 1.3 Create PostHog Module

Create `src/lib/posthog.ts`:

```typescript
import posthog from 'posthog-js';

/**
 * Initialize PostHog analytics.
 * Call this once in main.tsx before React renders.
 */
export function initPostHog(): void {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;

  if (!apiKey) {
    console.warn('[PostHog] No API key found, analytics disabled');
    return;
  }

  posthog.init(apiKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',

    // Privacy settings
    person_profiles: 'identified_only',

    // Automatic tracking
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,

    // Disable until needed
    disable_session_recording: true,

    // Performance
    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        // Disable in development to avoid polluting data
        // posthog.opt_out_capturing();
        console.log('[PostHog] Initialized in development mode');
      }
    },
  });
}

/**
 * Event name constants for type safety.
 */
export const POSTHOG_EVENTS = {
  // RFP Events
  RFP_VIEWED: 'rfp_viewed',
  RFP_SHORTLISTED: 'rfp_shortlisted',
  RFP_REMOVED_FROM_SHORTLIST: 'rfp_removed_from_shortlist',

  // Evaluation Events
  EVALUATION_RUN: 'evaluation_run',
  EVALUATION_COMPLETED: 'evaluation_completed',

  // Pursuit Events
  PURSUIT_DECISION: 'pursuit_decision',
  PURSUIT_STATUS_CHANGED: 'pursuit_status_changed',

  // Export Events
  CSV_EXPORTED: 'csv_exported',

  // Settings Events
  FILTER_APPLIED: 'filter_applied',
  AI_SETTINGS_CHANGED: 'ai_settings_changed',
  DATA_SOURCE_TOGGLED: 'data_source_toggled',
} as const;

export { posthog };
```

#### 1.4 Create Analytics Hook

Create `src/hooks/useAnalytics.ts`:

```typescript
import { useCallback } from 'react';
import { posthog, POSTHOG_EVENTS } from '../lib/posthog';

interface UseAnalyticsReturn {
  /**
   * Track a custom event.
   * @param event - Event name (use POSTHOG_EVENTS constants)
   * @param properties - Optional event properties
   */
  track: (event: string, properties?: Record<string, unknown>) => void;

  /**
   * Identify a user (called automatically on Clerk sign-in).
   */
  identify: (userId: string, traits?: Record<string, unknown>) => void;

  /**
   * Reset user identity (called automatically on sign-out).
   */
  reset: () => void;

  /**
   * Direct access to PostHog instance for advanced usage.
   */
  posthog: typeof posthog;

  /**
   * Event name constants.
   */
  events: typeof POSTHOG_EVENTS;
}

/**
 * React hook for PostHog analytics.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { track, events } = useAnalytics();
 *
 *   const handleClick = () => {
 *     track(events.RFP_VIEWED, { rfpId: '123', source: 'sam_gov' });
 *   };
 * }
 * ```
 */
export function useAnalytics(): UseAnalyticsReturn {
  const track = useCallback((event: string, properties?: Record<string, unknown>) => {
    posthog.capture(event, properties);
  }, []);

  const identify = useCallback((userId: string, traits?: Record<string, unknown>) => {
    posthog.identify(userId, traits);
  }, []);

  const reset = useCallback(() => {
    posthog.reset();
  }, []);

  return {
    track,
    identify,
    reset,
    posthog,
    events: POSTHOG_EVENTS,
  };
}
```

#### 1.5 Create Identity Provider

Create `src/components/providers/PostHogIdentifier.tsx`:

```typescript
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { posthog } from '../../lib/posthog';

interface PostHogIdentifierProps {
  children: React.ReactNode;
}

/**
 * Syncs Clerk user identity with PostHog.
 * Wrap this around your app inside ClerkProvider.
 */
export function PostHogIdentifier({ children }: PostHogIdentifierProps) {
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      // Identify user in PostHog with Clerk ID
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        createdAt: user.createdAt,
      });
    } else {
      // Clear identity on logout
      posthog.reset();
    }
  }, [isSignedIn, isLoaded, user]);

  return <>{children}</>;
}
```

#### 1.6 Update main.tsx

Modify `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import App from './App';
import { initPostHog } from './lib/posthog';
import { PostHogIdentifier } from './components/providers/PostHogIdentifier';
import './index.css';

// Initialize PostHog before React renders
initPostHog();

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <PostHogIdentifier>
          <App />
        </PostHogIdentifier>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>
);
```

---

### Phase 2: Add Key Events (1-2 hours)

Once the foundation is in place, add tracking to key components:

#### 2.1 RFP Card Events

```typescript
// In RfpCard.tsx
import { useAnalytics } from '../hooks/useAnalytics';

function RfpCard({ rfp }: { rfp: RFP }) {
  const { track, events } = useAnalytics();

  const handleExpand = () => {
    track(events.RFP_VIEWED, {
      rfpId: rfp.id,
      source: rfp.source,
      score: rfp.score,
    });
  };

  const handleShortlist = () => {
    track(events.RFP_SHORTLISTED, {
      rfpId: rfp.id,
      source: rfp.source,
      score: rfp.score,
    });
    // ... existing shortlist logic
  };
}
```

#### 2.2 Evaluation Events

```typescript
// In evaluation trigger component
const handleEvaluate = async () => {
  const startTime = Date.now();

  track(events.EVALUATION_RUN, {
    rfpId,
    provider: selectedProvider,
  });

  await runEvaluation();

  track(events.EVALUATION_COMPLETED, {
    rfpId,
    provider: selectedProvider,
    duration_ms: Date.now() - startTime,
  });
};
```

#### 2.3 Filter Events

```typescript
// In FilterControls.tsx
const handleFilterChange = (filterType: string, value: string) => {
  track(events.FILTER_APPLIED, {
    filterType,
    value,
  });
  // ... existing filter logic
};
```

---

### Phase 3: Verify & Dashboard (30 minutes)

#### 3.1 Verify Events

1. Open PostHog dashboard → Live Events
2. Trigger actions in your app
3. Confirm events appear with correct properties

#### 3.2 Create Dashboard

Suggested dashboard widgets:

| Widget | Type | Query |
|--------|------|-------|
| Active Users | Number | Unique users (7 days) |
| RFPs Viewed | Number | Count of `rfp_viewed` |
| Top Sources | Bar chart | `rfp_viewed` grouped by `source` |
| Evaluation Usage | Line chart | `evaluation_run` over time |
| AI Provider Usage | Pie chart | `evaluation_run` grouped by `provider` |

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Modify | Add `posthog-js` dependency |
| `.env.local` | Modify | Add PostHog keys |
| `.env.example` | Modify | Document PostHog vars |
| `src/lib/posthog.ts` | Create | Initialization & constants |
| `src/hooks/useAnalytics.ts` | Create | React hook |
| `src/components/providers/PostHogIdentifier.tsx` | Create | Clerk sync |
| `src/main.tsx` | Modify | Add provider |

---

## Testing Checklist

### Unit Tests

- [ ] `initPostHog` handles missing API key gracefully
- [ ] `useAnalytics` hook returns expected interface
- [ ] Events are captured with correct properties

### Integration Tests

- [ ] User identification syncs with Clerk sign-in
- [ ] Identity resets on sign-out
- [ ] Events appear in PostHog dashboard

### Manual Testing

- [ ] Open app → pageview captured
- [ ] Sign in → user identified with email
- [ ] View RFP → `rfp_viewed` event captured
- [ ] Shortlist RFP → `rfp_shortlisted` event captured
- [ ] Sign out → identity reset

---

## Rollback Plan

If issues occur:

1. **Quick disable:** Remove `VITE_POSTHOG_KEY` from environment
2. **Full removal:**
   ```bash
   npm uninstall posthog-js
   ```
   Remove PostHog-related files and imports

---

## Troubleshooting

### Events not appearing

1. Check browser console for PostHog errors
2. Verify API key is correct
3. Check if ad blockers are blocking PostHog

### User not identified

1. Verify Clerk `useUser()` returns user data
2. Check `PostHogIdentifier` is inside `ClerkProvider`
3. Look for `posthog.identify()` calls in network tab

### High event volume

1. Check autocapture settings
2. Consider disabling autocapture, use manual tracking only
3. Filter out development events in PostHog

---

## Next Steps After Implementation

1. [ ] Set up PostHog project and get API key
2. [ ] Implement Phase 1 (foundation)
3. [ ] Deploy to staging and verify
4. [ ] Add key events (Phase 2)
5. [ ] Create analytics dashboard
6. [ ] Document insights in weekly reviews
