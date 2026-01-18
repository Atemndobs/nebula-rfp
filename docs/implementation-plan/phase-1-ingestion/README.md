# Phase 1: Multi-Source Ingestion + Canonical Schema + Dedupe

**Duration**: Weeks 1-2
**Goal**: All data sources feeding a normalized, deduplicated dataset

---

## Objectives

1. Implement connectors for all priority data sources
2. Normalize all RFPs into a single canonical schema
3. Deduplicate records across sources with traceability
4. Build Sources Admin panel for connector management

---

## Canonical Opportunity Schema (Required)

All connectors MUST normalize data into this structure:

```typescript
interface CanonicalOpportunity {
  // Identity
  id: string;                    // Internal unique ID
  externalIds: SourceReference[]; // All source IDs for dedupe traceability

  // Core Fields (REQUIRED)
  title: string;
  fullDescription: string;       // Complete RFP text
  buyer: {
    name: string;               // Agency/organization name
    type: 'federal' | 'state' | 'local' | 'other';
  };
  location: {
    state?: string;
    city?: string;
    isRemoteAllowed?: boolean;
  };

  // Dates
  postedDate: number;           // Unix timestamp
  dueDate: number;              // Unix timestamp
  dueTime?: string;             // Time string if available

  // Value
  estimatedValue?: number;      // Budget if available
  valueRange?: {
    min?: number;
    max?: number;
  };
  contractType?: string;        // FFP, T&M, IDIQ, etc.

  // Contact
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  // Classification
  categories: string[];         // NAICS codes if available
  setAside?: string;            // Small business set-aside type

  // Attachments
  attachments: Attachment[];
  sourceUrl: string;            // Original listing URL

  // Evidence (for eligibility/scoring)
  evidenceSnippets: string[];   // Key excerpts from description

  // Metadata
  ingestedAt: number;
  lastUpdatedAt: number;
  source: string;               // Primary source name
}

interface SourceReference {
  source: string;               // 'sam.gov', 'emma', 'rfpmart', etc.
  externalId: string;           // ID in that source
  url: string;                  // Direct link
  fetchedAt: number;
}

interface Attachment {
  name: string;
  url: string;
  type?: string;                // 'pdf', 'doc', 'xlsx', etc.
  size?: number;
}
```

---

## Connector Implementations

### Priority 1: SAM.gov Connector

```typescript
// services/connectors/samGov.ts

interface SamGovConfig {
  apiKey: string;
  baseUrl: string;
  queries: SamGovQuery[];
  refreshIntervalMinutes: number;
  rateLimitPerMinute: number;
}

interface SamGovQuery {
  keywords: string[];
  naicsCodes?: string[];
  postedFrom?: string;          // ISO date
  responseDeadlineFrom?: string;
  setAside?: string[];
  enabled: boolean;
}

export class SamGovConnector implements DataSourceConnector {
  private config: SamGovConfig;
  private lastFetchTimestamp: number = 0;
  private errorCount: number = 0;

  async fetch(): Promise<RawOpportunity[]> {
    const opportunities: RawOpportunity[] = [];

    for (const query of this.config.queries.filter(q => q.enabled)) {
      try {
        const results = await this.executeQuery(query);
        opportunities.push(...results);

        // Respect rate limits
        await this.delay(60000 / this.config.rateLimitPerMinute);
      } catch (error) {
        this.errorCount++;
        this.logError('SAM.gov query failed', { query, error });
        // Continue with other queries - failure isolation
      }
    }

    this.lastFetchTimestamp = Date.now();
    return opportunities;
  }

  normalize(raw: SamGovResponse): CanonicalOpportunity {
    return {
      id: generateId(),
      externalIds: [{
        source: 'sam.gov',
        externalId: raw.noticeId,
        url: `https://sam.gov/opp/${raw.noticeId}/view`,
        fetchedAt: Date.now(),
      }],
      title: raw.title,
      fullDescription: raw.description?.body || '',
      buyer: {
        name: raw.department?.name || raw.agency?.name || 'Unknown',
        type: 'federal',
      },
      location: {
        state: raw.placeOfPerformance?.state?.code,
        city: raw.placeOfPerformance?.city?.name,
        isRemoteAllowed: this.detectRemoteAllowed(raw),
      },
      postedDate: new Date(raw.postedDate).getTime(),
      dueDate: new Date(raw.responseDeadLine).getTime(),
      estimatedValue: raw.award?.amount,
      contractType: raw.typeOfSetAside,
      contact: {
        name: raw.pointOfContact?.[0]?.fullName,
        email: raw.pointOfContact?.[0]?.email,
        phone: raw.pointOfContact?.[0]?.phone,
      },
      categories: raw.naicsCodes || [],
      setAside: raw.typeOfSetAside,
      attachments: (raw.resourceLinks || []).map(link => ({
        name: link.description || link.url,
        url: link.url,
      })),
      sourceUrl: `https://sam.gov/opp/${raw.noticeId}/view`,
      evidenceSnippets: this.extractEvidenceSnippets(raw),
      ingestedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      source: 'sam.gov',
    };
  }

  private extractEvidenceSnippets(raw: SamGovResponse): string[] {
    const snippets: string[] = [];
    const text = raw.description?.body || '';

    // Extract sentences containing key terms for eligibility/scoring
    const keyTerms = [
      'clearance', 'onsite', 'remote', 'US-based', 'domestic',
      '8(a)', 'small business', 'set-aside', 'SDVOSB', 'HUBZone'
    ];

    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (keyTerms.some(term => lower.includes(term.toLowerCase()))) {
        snippets.push(sentence.trim());
      }
    }

    return snippets.slice(0, 10); // Limit to 10 snippets
  }

  getHealth(): ConnectorHealth {
    return {
      source: 'sam.gov',
      status: this.errorCount > 5 ? 'error' : this.errorCount > 0 ? 'warning' : 'healthy',
      lastSuccessfulFetch: this.lastFetchTimestamp,
      errorCount: this.errorCount,
      message: this.errorCount > 0 ? `${this.errorCount} errors in recent fetches` : 'OK',
    };
  }
}
```

### Priority 1: Maryland eMMA Connector

```typescript
// services/connectors/emma.ts

export class EmmaConnector implements DataSourceConnector {
  // eMMA doesn't have a public API - requires web scraping
  // Use puppeteer or cheerio for extraction

  async fetch(): Promise<RawOpportunity[]> {
    // Note: Implement respectful scraping with delays
    const opportunities: RawOpportunity[] = [];

    try {
      const listingPage = await this.fetchListingPage();
      const links = this.extractOpportunityLinks(listingPage);

      for (const link of links) {
        await this.delay(2000); // Be respectful
        const detail = await this.fetchDetailPage(link);
        opportunities.push(this.parseDetailPage(detail));
      }
    } catch (error) {
      this.logError('eMMA fetch failed', error);
    }

    return opportunities;
  }

  normalize(raw: EmmaRawData): CanonicalOpportunity {
    return {
      id: generateId(),
      externalIds: [{
        source: 'emma',
        externalId: raw.solicitationNumber,
        url: raw.url,
        fetchedAt: Date.now(),
      }],
      title: raw.title,
      fullDescription: raw.description,
      buyer: {
        name: raw.agency,
        type: 'state',
      },
      location: {
        state: 'MD',
        city: raw.city,
      },
      postedDate: this.parseDate(raw.postedDate),
      dueDate: this.parseDate(raw.closingDate),
      categories: raw.commodityCode ? [raw.commodityCode] : [],
      attachments: raw.documents.map(doc => ({
        name: doc.name,
        url: doc.url,
      })),
      sourceUrl: raw.url,
      evidenceSnippets: this.extractEvidenceSnippets(raw),
      ingestedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      source: 'emma',
    };
  }
}
```

### Existing: RFPMart Connector (Refactor)

```typescript
// services/connectors/rfpmart.ts

// Refactor existing RFPMart integration to implement ConnectorInterface
export class RfpMartConnector implements DataSourceConnector {
  // Existing logic, refactored to canonical schema
}
```

---

## Deduplication Service

```typescript
// services/deduplication.ts

interface DedupeResult {
  isNew: boolean;
  existingId?: string;
  mergedSources?: SourceReference[];
}

export class DeduplicationService {
  /**
   * Check if opportunity already exists, merge sources if duplicate
   */
  async checkAndMerge(
    opportunity: CanonicalOpportunity,
    existingOpportunities: CanonicalOpportunity[]
  ): Promise<DedupeResult> {
    // Strategy 1: Exact external ID match (same source)
    for (const existing of existingOpportunities) {
      for (const existingRef of existing.externalIds) {
        for (const newRef of opportunity.externalIds) {
          if (existingRef.source === newRef.source &&
              existingRef.externalId === newRef.externalId) {
            // Same opportunity from same source - update only
            return { isNew: false, existingId: existing.id };
          }
        }
      }
    }

    // Strategy 2: Fuzzy title + buyer + date match (cross-source)
    for (const existing of existingOpportunities) {
      if (this.isFuzzyMatch(opportunity, existing)) {
        // Same opportunity from different source - merge
        const mergedSources = [
          ...existing.externalIds,
          ...opportunity.externalIds,
        ];
        return {
          isNew: false,
          existingId: existing.id,
          mergedSources
        };
      }
    }

    return { isNew: true };
  }

  private isFuzzyMatch(a: CanonicalOpportunity, b: CanonicalOpportunity): boolean {
    // Title similarity > 85%
    const titleSimilarity = this.calculateSimilarity(a.title, b.title);
    if (titleSimilarity < 0.85) return false;

    // Same buyer (fuzzy)
    const buyerSimilarity = this.calculateSimilarity(a.buyer.name, b.buyer.name);
    if (buyerSimilarity < 0.8) return false;

    // Due date within 3 days
    const dateDiff = Math.abs(a.dueDate - b.dueDate);
    if (dateDiff > 3 * 24 * 60 * 60 * 1000) return false;

    return true;
  }

  private calculateSimilarity(a: string, b: string): number {
    // Levenshtein or Jaccard similarity
    const aWords = new Set(a.toLowerCase().split(/\s+/));
    const bWords = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...aWords].filter(x => bWords.has(x)));
    const union = new Set([...aWords, ...bWords]);
    return intersection.size / union.size;
  }
}
```

---

## Sources Admin Panel

### Data Model

```typescript
interface SourceConfig {
  id: string;
  name: string;                 // 'sam.gov', 'emma', 'rfpmart'
  displayName: string;          // 'SAM.gov', 'Maryland eMMA'
  enabled: boolean;

  // Scheduling
  refreshIntervalMinutes: number;
  lastFetchAt?: number;
  nextFetchAt?: number;

  // Query Configuration
  queries: SourceQuery[];

  // Rate Limiting
  rateLimitPerMinute: number;
  rateLimitPerHour: number;

  // Health
  status: 'healthy' | 'warning' | 'error' | 'disabled';
  errorCount: number;
  lastError?: string;
  lastErrorAt?: number;

  // Stats
  totalFetched: number;
  fetchedToday: number;
}

interface SourceQuery {
  id: string;
  name: string;                 // "IT Services", "Cloud Migration"
  enabled: boolean;
  keywords: string[];
  naicsCodes?: string[];
  states?: string[];
  setAsideTypes?: string[];
  postedWithinDays?: number;
  deadlineAfterDays?: number;
}
```

### Admin UI Component

```tsx
// components/admin/SourcesAdmin.tsx

export function SourcesAdmin() {
  const [sources, setSources] = useState<SourceConfig[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Data Sources</h2>
        <Button onClick={triggerAllFetches}>Refresh All Now</Button>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-4 gap-4">
        {sources.map(source => (
          <SourceHealthCard key={source.id} source={source} />
        ))}
      </div>

      {/* Source Configuration */}
      {sources.map(source => (
        <SourceConfigPanel key={source.id} source={source} />
      ))}
    </div>
  );
}

function SourceHealthCard({ source }: { source: SourceConfig }) {
  const statusColors = {
    healthy: 'bg-success/10 border-success',
    warning: 'bg-warning/10 border-warning',
    error: 'bg-destructive/10 border-destructive',
    disabled: 'bg-muted border-muted',
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[source.status]}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{source.displayName}</span>
        <Switch
          checked={source.enabled}
          onCheckedChange={(enabled) => updateSource(source.id, { enabled })}
        />
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        <p>Last fetch: {formatRelativeTime(source.lastFetchAt)}</p>
        <p>Fetched today: {source.fetchedToday}</p>
        {source.errorCount > 0 && (
          <p className="text-destructive">{source.errorCount} errors</p>
        )}
      </div>
    </div>
  );
}

function SourceConfigPanel({ source }: { source: SourceConfig }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{source.displayName} Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Refresh Interval */}
        <div>
          <Label>Refresh Interval (minutes)</Label>
          <Input
            type="number"
            value={source.refreshIntervalMinutes}
            onChange={(e) => updateSource(source.id, {
              refreshIntervalMinutes: parseInt(e.target.value)
            })}
          />
        </div>

        {/* Rate Limits */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Rate Limit (per minute)</Label>
            <Input type="number" value={source.rateLimitPerMinute} />
          </div>
          <div>
            <Label>Rate Limit (per hour)</Label>
            <Input type="number" value={source.rateLimitPerHour} />
          </div>
        </div>

        {/* Queries */}
        <div>
          <Label>Search Queries</Label>
          {source.queries.map(query => (
            <QueryEditor key={query.id} query={query} sourceId={source.id} />
          ))}
          <Button variant="outline" onClick={() => addQuery(source.id)}>
            Add Query
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Implementation Checklist

### Week 1: Core Infrastructure

- [ ] Define `CanonicalOpportunity` interface in `types.ts`
- [ ] Create connector interface `DataSourceConnector`
- [ ] Implement SAM.gov connector with normalization
- [ ] Implement deduplication service
- [ ] Set up local storage for opportunities (pre-Convex)
- [ ] Basic ingestion scheduler

### Week 2: Additional Sources + Admin

- [ ] Implement Maryland eMMA connector
- [ ] Refactor existing RFPMart connector
- [ ] Build Sources Admin panel UI
- [ ] Implement source health tracking
- [ ] Add query configuration UI
- [ ] Test cross-source deduplication
- [ ] Error handling and failure isolation

---

## Testing Checklist

- [ ] SAM.gov returns valid opportunities
- [ ] eMMA scraping extracts all fields
- [ ] Canonical schema validates correctly
- [ ] Duplicates from same source are updated (not created)
- [ ] Duplicates from different sources are merged
- [ ] Source health reflects actual status
- [ ] One broken connector doesn't break others
- [ ] Rate limits are respected

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Add CanonicalOpportunity, SourceConfig |
| `src/services/connectors/base.ts` | Create | Connector interface |
| `src/services/connectors/samGov.ts` | Create | SAM.gov connector |
| `src/services/connectors/emma.ts` | Create | eMMA connector |
| `src/services/connectors/rfpmart.ts` | Modify | Refactor to interface |
| `src/services/deduplication.ts` | Create | Dedupe logic |
| `src/services/ingestion.ts` | Create | Orchestration |
| `src/components/admin/SourcesAdmin.tsx` | Create | Admin UI |

---

*Reference: CTO Instructions Section 2A (Core Components 1-3)*
