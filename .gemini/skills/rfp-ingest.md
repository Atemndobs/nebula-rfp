# Skill: RFP Ingestion

## Purpose
Ingest RFP opportunities from multiple data sources and normalize them to the canonical schema.

> [!IMPORTANT]
> **Architecture Mandate Alignment:**
> 1. **Additive Only:** Do not redesign existing Data/Home views when adding sources.
> 2. **Plan First:** Check `docs/features/rfp-strategy-2026/IMPLEMENTATION.md` before coding.
> 3. **Rules First:** Use the regex patterns below for eligibility pre-filtering (Phase 1/2).

## Supported Sources

### SAM.gov (Priority 1 - Federal)
- **API Endpoint**: https://api.sam.gov/opportunities/v2/search
- **Authentication**: API key required (register at SAM.gov)
- **Rate Limits**: 10 requests/second, 10,000/day
- **Key Fields**: noticeId, title, description, postedDate, responseDeadLine, naicsCode, placeOfPerformance

```typescript
// Example SAM.gov API call
const response = await fetch(
  `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&postedFrom=${fromDate}&limit=100`,
  { headers: { "Accept": "application/json" } }
);
```

### Maryland eMMA (Priority 1 - State)
- **Portal**: https://emma.maryland.gov
- **Method**: Web scraping or email alerts (no public API)
- **Key Categories**: IT Services, Software Development, Cloud Services

### RFPMart (Current)
- **API**: Existing integration in rfpDataService.ts
- **Categories**: Web, Mobile
- **Note**: Primary source until SAM.gov integration complete

## Canonical Schema

```typescript
interface Opportunity {
  id: string;
  externalId: string;
  source: "sam.gov" | "emma" | "rfpmart" | "govtribe" | "bidnet";
  title: string;
  description: string;
  summary?: string;
  location: string;
  category: string;
  naicsCode?: string;
  setAside?: string; // "Small Business", "8(a)", "HUBZone", etc.
  postedDate: Date;
  expiryDate: Date;
  url: string;
  attachments?: { name: string; url: string }[];
  rawData: Record<string, unknown>;
  ingestedAt: Date;
}
```

## Deduplication Logic

1. Check `externalId` + `source` combination
2. If exists, update with latest data
3. Track `lastUpdated` timestamp
4. Log changes for audit trail

## Eligibility Pre-filtering

During ingestion, flag opportunities with potential disqualifiers:

```typescript
const DISQUALIFIER_PATTERNS = [
  /u\.?s\.?\s*(citizen|company|organization)\s*only/i,
  /onshore\s*(only|required)/i,
  /on-?site\s*(required|mandatory)/i,
  /must\s*be\s*located\s*in/i,
  /security\s*clearance\s*required/i,
];

function detectDisqualifiers(text: string): string[] {
  return DISQUALIFIER_PATTERNS
    .filter(pattern => pattern.test(text))
    .map(pattern => pattern.source);
}
```

## Convex Implementation

```typescript
// convex/rfps.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const ingestFromSam = action({
  args: { apiKey: v.string(), daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (args.daysBack ?? 7));

    const response = await fetch(
      `https://api.sam.gov/opportunities/v2/search?api_key=${args.apiKey}&postedFrom=${fromDate.toISOString().split('T')[0]}&limit=100`
    );

    const data = await response.json();
    let ingested = 0;

    for (const opp of data.opportunitiesData ?? []) {
      await ctx.runMutation(internal.rfps.upsert, {
        externalId: opp.noticeId,
        source: "sam.gov",
        title: opp.title,
        description: opp.description,
        location: opp.placeOfPerformance?.state ?? "USA",
        category: opp.naicsCode ?? "Unknown",
        postedDate: new Date(opp.postedDate).getTime(),
        expiryDate: new Date(opp.responseDeadLine).getTime(),
        url: `https://sam.gov/opp/${opp.noticeId}/view`,
        rawData: opp,
      });
      ingested++;
    }

    return { ingested, source: "sam.gov" };
  },
});
```

## Scheduled Ingestion

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run SAM.gov ingestion every 6 hours
crons.interval(
  "ingest-sam-gov",
  { hours: 6 },
  internal.rfps.scheduledIngest,
  { source: "sam.gov" }
);

export default crons;
```

## Error Handling

- Retry failed API calls with exponential backoff
- Log errors with source, timestamp, and error details
- Continue processing remaining items on partial failures
- Alert on complete source failures
