# Architecture: PostHog Integration

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTHOG INTEGRATION                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │       PostHog Cloud         │
                    │   (us.i.posthog.com)        │
                    │                             │
                    │  • Event storage            │
                    │  • User profiles            │
                    │  • Dashboards               │
                    │  • Feature flags (future)   │
                    │                             │
                    └─────────────▲───────────────┘
                                  │
                                  │ HTTPS (events)
                                  │
┌─────────────────────────────────┼───────────────────────────────────────────┐
│                         REACT APPLICATION                                   │
├─────────────────────────────────┼───────────────────────────────────────────┤
│                                 │                                           │
│  ┌──────────────────────────────┴──────────────────────────────────────┐   │
│  │                      PostHog Provider                                │   │
│  │                    (src/lib/posthog.ts)                              │   │
│  │                                                                      │   │
│  │  • Initialize SDK with project key                                  │   │
│  │  • Configure autocapture                                            │   │
│  │  • Set privacy options                                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                  │
│         │                       │                       │                  │
│         ▼                       ▼                       ▼                  │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐            │
│  │   Clerk     │        │ useAnalytics│        │ Components  │            │
│  │  Identity   │───────▶│    Hook     │◀───────│   Events    │            │
│  │   Sync      │        │             │        │             │            │
│  └─────────────┘        └─────────────┘        └─────────────┘            │
│                                                                             │
│  User signs in ──▶ posthog.identify(clerkId)                               │
│  User action   ──▶ posthog.capture('event', { props })                     │
│  User signs out ──▶ posthog.reset()                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EVENT FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. PAGE LOAD
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  main.tsx │───▶│ initPH() │───▶│ identify │───▶│ pageview │
   │          │    │          │    │ (Clerk)  │    │ (auto)   │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘

2. USER ACTION
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Click   │───▶│useAnalyt-│───▶│ capture  │───▶│ PostHog  │
   │  Button  │    │ics hook  │    │ (event)  │    │  Cloud   │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘

3. SESSION END
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Logout  │───▶│  reset() │───▶│ New anon │
   │  /close  │    │          │    │ session  │
   └──────────┘    └──────────┘    └──────────┘
```

## Component Structure

```
src/
├── lib/
│   └── posthog.ts              # PostHog initialization & config
│
├── hooks/
│   └── useAnalytics.ts         # React hook for tracking
│
├── components/
│   └── providers/
│       └── PostHogProvider.tsx # Clerk-PostHog identity sync
│
└── main.tsx                    # Provider setup
```

## API Design

### Initialization Module (`lib/posthog.ts`)

```typescript
// Exports
export function initPostHog(): void
export const posthog: PostHog
export const POSTHOG_EVENTS: Record<string, string>  // Event name constants
```

### Analytics Hook (`hooks/useAnalytics.ts`)

```typescript
interface UseAnalyticsReturn {
  track: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
  posthog: PostHog;
}

export function useAnalytics(): UseAnalyticsReturn
```

### Event Schema

All events follow this structure:

```typescript
interface BaseEventProperties {
  timestamp: string;      // ISO 8601 (auto)
  sessionId: string;      // PostHog session (auto)
  userId?: string;        // Clerk user ID (if authenticated)
}

interface RfpEventProperties extends BaseEventProperties {
  rfpId: string;
  source: 'sam_gov' | 'emma' | 'rfpmart' | 'govtribe';
  score?: number;
}

interface EvaluationEventProperties extends BaseEventProperties {
  rfpId: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'ollama';
  duration_ms?: number;
}
```

## Configuration Options

| Option | Value | Rationale |
|--------|-------|-----------|
| `person_profiles` | `'identified_only'` | GDPR compliance, reduce costs |
| `capture_pageview` | `true` | Automatic page tracking |
| `capture_pageleave` | `true` | Session duration tracking |
| `autocapture` | `true` | Reduce manual instrumentation |
| `disable_session_recording` | `true` (initial) | Privacy, can enable later |
| `persistence` | `'localStorage'` | Default, persists across sessions |

## Security Considerations

- [x] API key is publishable (safe for client)
- [x] No PII in event properties beyond email (user-consented)
- [x] `person_profiles: 'identified_only'` limits anonymous tracking
- [x] Session recording disabled by default
- [ ] Consider cookie consent banner (future)
- [ ] Document data retention policy

## Integration Points

| System | Integration | Purpose |
|--------|-------------|---------|
| Clerk | `useUser()` → `posthog.identify()` | User identification |
| React Router | Page changes → pageview | Navigation tracking |
| Convex | N/A (client-side only) | No server integration needed |

## Future Enhancements

1. **Feature Flags** - Use PostHog feature flags for gradual rollouts
2. **Session Recording** - Enable for debugging UX issues
3. **Experiments** - A/B testing for UI changes
4. **Server-side Events** - Track Convex actions (if needed)

## Cost Analysis

| Tier | Events/Month | Cost | Notes |
|------|--------------|------|-------|
| Free | 1M | $0 | Sufficient for current scale |
| Growth | 2M+ | $0.00045/event | ~$450/M events |

**Current estimate:** ~10k events/month = $0 (well within free tier)

## Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| PostHog | Open source, feature-rich | Newer than competitors | ✅ Selected |
| Mixpanel | Mature, great funnels | Expensive at scale | ❌ Cost |
| Amplitude | Enterprise features | Complex setup | ❌ Overkill |
| Plausible | Privacy-first, simple | No user tracking | ❌ Too limited |
| Self-hosted PH | Full control | Ops overhead | ❌ Later option |
