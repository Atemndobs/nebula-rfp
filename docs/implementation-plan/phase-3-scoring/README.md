# Phase 3: Scoring Engine + Thresholds/Weights

**Duration**: Weeks 5-6
**Goal**: Multi-dimension fit scoring with explainable results

---

## Objectives

1. Implement 6-dimension binary scoring (0/1 per dimension)
2. Build Scoring Weights Admin for configuration
3. Support configurable thresholds and must-pass dimensions
4. Create negative keywords dictionary
5. Store score breakdown with evidence

---

## The 6 Dimensions (From CTO)

Scoring happens AFTER eligibility gate passes. Each dimension scores 0 or 1.

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Technical Relevance | Equal | Core stack match (React, AWS, serverless, etc.) |
| Scope Fit | Equal | What we actually deliver (portals, migrations, APIs) |
| Category Focus | Equal | Web/software/cloud/IT focus |
| Client Profile | Equal | US gov, tech-forward, agile/collaborative |
| Logistics | Equal | Remote/hybrid, clear SOW, realistic timeline |
| Skill Set Alignment | Equal | Our team coverage matches requirements |

**Good Fit Default Rule**: `totalScore >= 4` AND no "must-fail" eligibility issues

---

## Scoring Engine

```typescript
interface ScoringResult {
  totalScore: number;           // 0-6
  dimensions: DimensionScore[];
  isGoodFit: boolean;
  threshold: number;            // What was required
  scoredAt: number;
  configVersion: string;
}

interface DimensionScore {
  dimension: string;
  score: 0 | 1;
  weight: number;
  evidence: string[];
  matchedKeywords: string[];
  reasoning?: string;           // AI explanation if used
}
```

### Dimension 1: Technical Relevance

**Purpose**: Core stack match - do they need what we build with?

```typescript
const TECHNICAL_KEYWORDS = {
  strong: [
    'React', 'Next.js', 'TypeScript', 'Node.js',
    'AWS', 'Lambda', 'API Gateway', 'serverless', 'microservices',
    'Postgres', 'PostgreSQL', 'Aurora',
    'CI/CD', 'GitLab', 'Playwright', 'automated testing',
    'S3', 'CloudFront', 'CDN',
  ],
  moderate: [
    'JavaScript', 'Python', 'REST API', 'GraphQL',
    'cloud', 'web application', 'frontend', 'backend',
    'database', 'docker', 'kubernetes',
  ],
};

function scoreTechnicalRelevance(rfp: CanonicalOpportunity): DimensionScore {
  const text = rfp.fullDescription.toLowerCase();

  const strongMatches = TECHNICAL_KEYWORDS.strong.filter(kw =>
    text.includes(kw.toLowerCase())
  );
  const moderateMatches = TECHNICAL_KEYWORDS.moderate.filter(kw =>
    text.includes(kw.toLowerCase())
  );

  // Score 1 if strong matches OR multiple moderate matches
  const score = strongMatches.length >= 1 || moderateMatches.length >= 3 ? 1 : 0;

  return {
    dimension: 'Technical Relevance',
    score,
    weight: 1,
    evidence: strongMatches.map(kw =>
      extractSentenceContaining(rfp.fullDescription, kw)
    ).filter(Boolean),
    matchedKeywords: [...strongMatches, ...moderateMatches],
  };
}
```

### Dimension 2: Scope Fit

**Purpose**: What we actually deliver - matches our service offerings?

```typescript
const SCOPE_KEYWORDS = {
  positive: [
    'website redesign', 'web app redesign', 'modern frontend',
    'custom portal', 'dashboard', 'government portal', 'enterprise portal',
    'cloud migration', 'serverless backend',
    'API integration', 'REST API', 'GraphQL API',
    'mobile-responsive', 'responsive design',
    'user interface', 'UX design', 'UI/UX',
    'web application', 'progressive web app',
  ],
  negative: [
    'hardware installation', 'physical infrastructure',
    'staffing augmentation', 'body shop',
  ],
};

function scoreScopeFit(rfp: CanonicalOpportunity): DimensionScore {
  const text = rfp.fullDescription.toLowerCase();

  const positiveMatches = SCOPE_KEYWORDS.positive.filter(kw =>
    text.includes(kw.toLowerCase())
  );
  const negativeMatches = SCOPE_KEYWORDS.negative.filter(kw =>
    text.includes(kw.toLowerCase())
  );

  // Score 1 if positive matches AND no strong negative matches
  const score = positiveMatches.length >= 2 && negativeMatches.length === 0 ? 1 : 0;

  return {
    dimension: 'Scope Fit',
    score,
    weight: 1,
    evidence: positiveMatches.map(kw =>
      extractSentenceContaining(rfp.fullDescription, kw)
    ).filter(Boolean),
    matchedKeywords: positiveMatches,
  };
}
```

### Dimension 3: Category Focus

**Purpose**: Web design & development, software, cloud modernization

```typescript
const CATEGORY_KEYWORDS = [
  'web design', 'web development',
  'software development', 'application development',
  'cloud modernization', 'digital transformation',
  'portal development', 'dashboard development',
  'API development', 'integration services',
  'IT modernization', 'legacy modernization',
];

function scoreCategoryFocus(rfp: CanonicalOpportunity): DimensionScore {
  const text = rfp.fullDescription.toLowerCase();
  const title = rfp.title.toLowerCase();

  const matches = CATEGORY_KEYWORDS.filter(kw => {
    const lowerKw = kw.toLowerCase();
    return title.includes(lowerKw) || text.includes(lowerKw);
  });

  // Score 1 if category is clearly web/software
  const score = matches.length >= 1 ? 1 : 0;

  return {
    dimension: 'Category Focus',
    score,
    weight: 1,
    evidence: matches.map(kw =>
      extractSentenceContaining(rfp.fullDescription, kw)
    ).filter(Boolean),
    matchedKeywords: matches,
  };
}
```

### Dimension 4: Client Profile

**Purpose**: US federal/state/local agencies, tech-forward, agile

```typescript
const CLIENT_KEYWORDS = {
  preferredAgencies: [
    'federal agency', 'state agency', 'local government',
    'department of', 'bureau of', 'office of',
  ],
  techForward: [
    'agile', 'scrum', 'iterative', 'sprint',
    'devops', 'continuous', 'modern',
    'cloud-first', 'digital-first',
    'user-centered', 'human-centered',
  ],
};

function scoreClientProfile(rfp: CanonicalOpportunity): DimensionScore {
  const text = rfp.fullDescription.toLowerCase();

  const isGovBuyer = rfp.buyer.type === 'federal' ||
                     rfp.buyer.type === 'state' ||
                     rfp.buyer.type === 'local';

  const techForwardMatches = CLIENT_KEYWORDS.techForward.filter(kw =>
    text.includes(kw.toLowerCase())
  );

  // Score 1 if government buyer AND shows tech-forward signals
  const score = isGovBuyer && techForwardMatches.length >= 1 ? 1 : 0;

  return {
    dimension: 'Client Profile',
    score,
    weight: 1,
    evidence: techForwardMatches.map(kw =>
      extractSentenceContaining(rfp.fullDescription, kw)
    ).filter(Boolean),
    matchedKeywords: techForwardMatches,
  };
}
```

### Dimension 5: Logistics

**Purpose**: Remote/hybrid acceptable, clear SOW, realistic timeline

```typescript
const LOGISTICS_KEYWORDS = {
  positive: [
    'remote', 'hybrid', 'telework',
    'statement of work', 'SOW', 'detailed requirements',
    'clear requirements', 'well-defined',
  ],
  negative: [
    'onsite required', '100% onsite',
    'extremely tight', 'aggressive timeline',
    'ambiguous', 'TBD',
  ],
};

function scoreLogistics(rfp: CanonicalOpportunity): DimensionScore {
  const text = rfp.fullDescription.toLowerCase();

  const positiveMatches = LOGISTICS_KEYWORDS.positive.filter(kw =>
    text.includes(kw.toLowerCase())
  );
  const negativeMatches = LOGISTICS_KEYWORDS.negative.filter(kw =>
    text.includes(kw.toLowerCase())
  );

  // Check timeline reasonableness
  const daysRemaining = (rfp.dueDate - Date.now()) / (1000 * 60 * 60 * 24);
  const hasReasonableTimeline = daysRemaining >= 10;

  // Score 1 if positive signals, no negative, reasonable timeline
  const score = (positiveMatches.length >= 1 || hasReasonableTimeline) &&
                negativeMatches.length === 0 ? 1 : 0;

  return {
    dimension: 'Logistics',
    score,
    weight: 1,
    evidence: [
      ...positiveMatches.map(kw => extractSentenceContaining(rfp.fullDescription, kw)),
      hasReasonableTimeline ? `Timeline: ${Math.floor(daysRemaining)} days` : null,
    ].filter(Boolean) as string[],
    matchedKeywords: positiveMatches,
  };
}
```

### Dimension 6: Skill Set Alignment

**Purpose**: Needed roles map to our team coverage

```typescript
const SKILL_KEYWORDS = {
  roles: [
    'solution architect', 'architect',
    'product owner', 'product manager',
    'full stack', 'fullstack', 'frontend', 'backend',
    'UI/UX', 'UX designer', 'UI designer',
    'QA', 'quality assurance', 'test engineer', 'automation',
    'devops', 'infrastructure', 'cloud engineer',
  ],
  skills: [
    'react', 'typescript', 'javascript',
    'node', 'python',
    'aws', 'azure', 'gcp',
    'terraform', 'kubernetes',
    'figma', 'design system',
  ],
};

function scoreSkillSetAlignment(rfp: CanonicalOpportunity): DimensionScore {
  const text = rfp.fullDescription.toLowerCase();

  const roleMatches = SKILL_KEYWORDS.roles.filter(kw =>
    text.includes(kw.toLowerCase())
  );
  const skillMatches = SKILL_KEYWORDS.skills.filter(kw =>
    text.includes(kw.toLowerCase())
  );

  // Score 1 if roles and skills we have are mentioned
  const score = (roleMatches.length >= 2 || skillMatches.length >= 3) ? 1 : 0;

  return {
    dimension: 'Skill Set Alignment',
    score,
    weight: 1,
    evidence: [
      ...roleMatches.slice(0, 3).map(kw => extractSentenceContaining(rfp.fullDescription, kw)),
    ].filter(Boolean) as string[],
    matchedKeywords: [...roleMatches, ...skillMatches],
  };
}
```

---

## Complete Scoring Engine

```typescript
// services/scoring.ts

interface ScoringConfig {
  threshold: number;            // Default: 4
  mustPassDimensions: string[]; // e.g., ['Logistics', 'Scope Fit']
  weights: Record<string, number>;
  negativeKeywords: string[];   // From admin dictionary
}

export class ScoringEngine {
  private config: ScoringConfig;

  score(rfp: CanonicalOpportunity): ScoringResult {
    // Run all 6 dimension scorers
    const dimensions: DimensionScore[] = [
      scoreTechnicalRelevance(rfp),
      scoreScopeFit(rfp),
      scoreCategoryFocus(rfp),
      scoreClientProfile(rfp),
      scoreLogistics(rfp),
      scoreSkillSetAlignment(rfp),
    ];

    // Apply weights
    dimensions.forEach(d => {
      d.weight = this.config.weights[d.dimension] || 1;
    });

    // Calculate total
    const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);

    // Check must-pass dimensions
    const mustPassFailed = this.config.mustPassDimensions.some(dim => {
      const dimScore = dimensions.find(d => d.dimension === dim);
      return dimScore && dimScore.score === 0;
    });

    // Check negative keywords
    const hasNegative = this.checkNegativeKeywords(rfp);

    // Determine fit
    const isGoodFit = totalScore >= this.config.threshold &&
                      !mustPassFailed &&
                      !hasNegative;

    return {
      totalScore,
      dimensions,
      isGoodFit,
      threshold: this.config.threshold,
      scoredAt: Date.now(),
      configVersion: '1.0',
    };
  }

  private checkNegativeKeywords(rfp: CanonicalOpportunity): boolean {
    const text = rfp.fullDescription.toLowerCase();
    return this.config.negativeKeywords.some(kw =>
      text.includes(kw.toLowerCase())
    );
  }
}
```

---

## Scoring Admin Panel

```tsx
// components/admin/ScoringAdmin.tsx

export function ScoringAdmin() {
  const [config, setConfig] = useState<ScoringConfig>(DEFAULT_CONFIG);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Scoring Configuration</h2>

      {/* Threshold */}
      <Card>
        <CardHeader>
          <CardTitle>Good Fit Threshold</CardTitle>
          <CardDescription>
            Minimum total score (0-6) to be considered a Good Fit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.threshold]}
              min={1}
              max={6}
              step={1}
              onValueChange={([value]) => setConfig({ ...config, threshold: value })}
            />
            <span className="text-2xl font-bold">{config.threshold}/6</span>
          </div>
        </CardContent>
      </Card>

      {/* Must-Pass Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle>Must-Pass Dimensions</CardTitle>
          <CardDescription>
            Dimensions that MUST score 1 for Good Fit (regardless of total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map(dim => (
              <Button
                key={dim}
                variant={config.mustPassDimensions.includes(dim) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleMustPass(dim)}
              >
                {dim}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Negative Keywords Dictionary */}
      <Card>
        <CardHeader>
          <CardTitle>Negative Keywords (Do Not Bid)</CardTitle>
          <CardDescription>
            RFPs containing these keywords will NOT be marked Good Fit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {config.negativeKeywords.map((kw, idx) => (
              <Badge key={idx} variant="destructive" className="flex items-center gap-1">
                {kw}
                <X className="w-3 h-3 cursor-pointer" onClick={() => removeNegativeKeyword(idx)} />
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Add negative keyword..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addNegativeKeyword(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Default Negative Keywords */}
      <p className="text-sm text-muted-foreground">
        Default negatives: clearance, construction, HVAC, onsite-heavy, staffing augmentation
      </p>
    </div>
  );
}
```

---

## Score Display Component

```tsx
// components/rfp/ScoreBreakdown.tsx

export function ScoreBreakdown({ result }: { result: ScoringResult }) {
  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fit Score</h3>
          <p className="text-sm text-muted-foreground">
            Threshold: {result.threshold}/6
          </p>
        </div>
        <div className="text-right">
          <span className={`text-4xl font-bold ${
            result.isGoodFit ? 'text-success' : 'text-muted-foreground'
          }`}>
            {result.totalScore}/6
          </span>
          <Badge className="ml-2" variant={result.isGoodFit ? 'default' : 'secondary'}>
            {result.isGoodFit ? 'Good Fit' : 'Not a Fit'}
          </Badge>
        </div>
      </div>

      {/* Dimension Breakdown */}
      <div className="space-y-2">
        {result.dimensions.map((dim) => (
          <div key={dim.dimension} className="flex items-center gap-3">
            {dim.score === 1 ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
            <div className="flex-1">
              <span className="font-medium">{dim.dimension}</span>
              {dim.matchedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {dim.matchedKeywords.slice(0, 5).map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <span className="text-lg font-bold">{dim.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

### Week 5: Core Scoring Engine

- [ ] Create `ScoringResult` and `DimensionScore` interfaces
- [ ] Implement all 6 dimension scoring functions
- [ ] Create keyword configurations for each dimension
- [ ] Build `ScoringEngine` class
- [ ] Integrate with eligibility pipeline (score only eligible RFPs)

### Week 6: Admin + UI

- [ ] Create `ScoringConfig` interface
- [ ] Build Scoring Admin panel
- [ ] Implement threshold slider
- [ ] Implement must-pass dimensions selection
- [ ] Build negative keywords dictionary UI
- [ ] Create `ScoreBreakdown` component
- [ ] Add scoring to RFP card display

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Add ScoringResult, DimensionScore |
| `src/services/scoring.ts` | Create | Main scoring engine |
| `src/services/scoring/dimensions.ts` | Create | Individual dimension scorers |
| `src/services/scoring/keywords.ts` | Create | Keyword configurations |
| `src/components/admin/ScoringAdmin.tsx` | Create | Admin UI |
| `src/components/rfp/ScoreBreakdown.tsx` | Create | Display component |

---

*Reference: CTO Instructions Section 2B.3 (Scoring Weights), Section 3B (Fit Scoring)*
