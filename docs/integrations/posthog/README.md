# PostHog Integration

## Overview

**Status:** ✅ Active
**Priority:** Low (nice-to-have)
**Estimated Effort:** 2-3 hours (full) | 30 min (minimal) — ✅ Completed

PostHog provides product analytics to understand how users interact with RFP Discovery. This helps identify which features are used most, where users drop off, and what to prioritize.

## Problem Statement

Currently, we have no visibility into:
- Which RFPs users actually view/shortlist
- Which AI providers users prefer
- Where users spend time in the app
- Feature adoption rates
- Conversion funnel (view → evaluate → pursue → bid)

## Proposed Solution

Integrate PostHog JS SDK for client-side event tracking with Clerk user identification.

## Value Proposition

| Insight                 | Business Impact                    |
| ----------------------- | ---------------------------------- |
| Most-viewed RFP sources | Prioritize data source development |
| Filter usage patterns   | Improve default filters            |
| AI evaluation frequency | Optimize AI costs                  |
| Pursuit conversion rate | Measure platform effectiveness     |
| Feature adoption        | Guide roadmap decisions            |

## Key Events to Track

| Event                 | Trigger                 | Priority |
| --------------------- | ----------------------- | -------- |
| `rfp_viewed`          | RFP card expanded       | P1       |
| `rfp_shortlisted`     | Added to shortlist      | P1       |
| `evaluation_run`      | AI evaluation triggered | P1       |
| `pursuit_decision`    | Bid/No-bid clicked      | P1       |
| `csv_exported`        | Export button clicked   | P2       |
| `filter_applied`      | Filter changed          | P2       |
| `ai_settings_changed` | AI config updated       | P3       |

## Implementation Options

| Option         | Effort  | Scope                     | Recommendation              |
| -------------- | ------- | ------------------------- | --------------------------- |
| **A. Full**    | 2-3 hrs | All events + dashboards   | For data-driven teams       |
| **B. Minimal** | 30 min  | Pageviews + identity only | **Recommended start**       |
| **C. Defer**   | 0       | None                      | If focused on core features |

## Quick Start (Option B)

```bash
npm install posthog-js
```

Add to `.env.local`:
```env
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for full setup guide.

## Dependencies

- Clerk (for user identification)
- PostHog account (free tier: 1M events/month)

## Related Documents

- [Architecture](./ARCHITECTURE.md) - Technical design
- [Implementation](./IMPLEMENTATION.md) - Step-by-step guide
- [System Architecture](../../implementation-plan/architecture/README.md)
