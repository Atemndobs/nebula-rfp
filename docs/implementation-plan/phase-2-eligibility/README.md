# Phase 2: Eligibility Gate + Admin Rules + Evidence Snippets

**Duration**: Weeks 3-4
**Goal**: Hard filters blocking unwinnable bids BEFORE scoring

**Priority**: P0 - HIGHEST PRIORITY MISSING CAPABILITY

---

## Objectives

1. Implement all 7 eligibility hard filters
2. Build Eligibility Rules Admin for configuration
3. Store evidence snippets with every decision
4. Output exactly one of: `ELIGIBLE`, `PARTNER_REQUIRED`, `REJECTED`

---

## Eligibility Gate Output (Required)

Every RFP MUST have an eligibility assessment with this structure:

```typescript
interface EligibilityAssessment {
  status: 'ELIGIBLE' | 'PARTNER_REQUIRED' | 'REJECTED';
  reasons: EligibilityReason[];
  evidenceSnippets: string[];
  assessedAt: number;
  assessedBy: 'system' | 'manual';
  rulesVersion: string;         // For auditability
}

interface EligibilityReason {
  ruleId: string;               // e.g., 'us_organization', 'security_clearance'
  ruleName: string;             // Human readable
  outcome: 'pass' | 'fail' | 'flag';
  severity: 'hard' | 'soft';    // Hard = auto-reject, Soft = flag for review
  evidence: string;             // Matched text snippet
  keywords: string[];           // Keywords that triggered
}
```

---

## The 7 Hard Filters (From CTO)

### Filter 1: US Organization / Onshore Requirement

**Logic**: If RFP explicitly requires "US organization only / onshore only"
- If we do NOT have qualifying US entity: `PARTNER_REQUIRED` or `REJECTED` (configurable)

**Evidence Keywords**:
```typescript
const US_ORG_KEYWORDS = [
  'onshore',
  'US-based',
  'United States only',
  'no offshore',
  'domestic only',
  'US organization',
  'must be located in the United States',
  'US citizens only',
  'work must be performed in the US',
];
```

**Implementation**:
```typescript
function checkUsOrganization(rfp: CanonicalOpportunity, config: EligibilityConfig): EligibilityReason | null {
  const text = rfp.fullDescription.toLowerCase();
  const matched = US_ORG_KEYWORDS.filter(kw => text.includes(kw.toLowerCase()));

  if (matched.length > 0) {
    // Extract the sentence containing the keyword
    const evidence = extractSentenceContaining(rfp.fullDescription, matched[0]);

    return {
      ruleId: 'us_organization',
      ruleName: 'US Organization Requirement',
      outcome: config.hasUsEntity ? 'pass' : 'fail',
      severity: 'hard',
      evidence,
      keywords: matched,
    };
  }

  return null; // No requirement detected
}
```

---

### Filter 2: Security Clearance

**Logic**: If any clearance is required: `REJECTED`

**Evidence Keywords**:
```typescript
const CLEARANCE_KEYWORDS = [
  'secret clearance',
  'top secret',
  'TS/SCI',
  'SCI',
  'clearance required',
  'security clearance',
  'must have clearance',
  'active clearance',
  'public trust',           // Flag, not always reject
  'background investigation',
];
```

**Implementation**:
```typescript
function checkSecurityClearance(rfp: CanonicalOpportunity): EligibilityReason | null {
  const text = rfp.fullDescription.toLowerCase();
  const matched = CLEARANCE_KEYWORDS.filter(kw => text.includes(kw.toLowerCase()));

  if (matched.length > 0) {
    const evidence = extractSentenceContaining(rfp.fullDescription, matched[0]);

    // Public trust is softer requirement
    const isHard = matched.some(kw =>
      ['secret', 'top secret', 'ts/sci', 'sci'].includes(kw.toLowerCase())
    );

    return {
      ruleId: 'security_clearance',
      ruleName: 'Security Clearance Requirement',
      outcome: 'fail',
      severity: isHard ? 'hard' : 'soft',
      evidence,
      keywords: matched,
    };
  }

  return null;
}
```

---

### Filter 3: Set-Aside / Certification Restrictions

**Logic**: If set-aside requires credentials we don't hold: `REJECTED`
- Config option: mark `PARTNER_REQUIRED` if we can bid via qualified prime

**Evidence Keywords**:
```typescript
const SET_ASIDE_KEYWORDS = [
  '8(a)',
  '8a',
  'SDVOSB',
  'Service-Disabled Veteran',
  'HUBZone',
  'WOSB',
  'EDWOSB',
  'Women-Owned Small Business',
  'small business set-aside',
  'total small business',
  'SBA-certified',
  'VOSB',
  'veteran-owned',
];

// Certifications we hold (from config)
interface CertificationConfig {
  is8a: boolean;
  isSDVOSB: boolean;
  isHUBZone: boolean;
  isWOSB: boolean;
  isSmallBusiness: boolean;
  canPartnerForSetAside: boolean;
}
```

**Implementation**:
```typescript
function checkSetAside(rfp: CanonicalOpportunity, certs: CertificationConfig): EligibilityReason | null {
  const text = rfp.fullDescription.toLowerCase();
  const setAside = rfp.setAside?.toLowerCase() || '';

  // Check each set-aside type
  const checks = [
    { keywords: ['8(a)', '8a'], have: certs.is8a },
    { keywords: ['sdvosb', 'service-disabled veteran'], have: certs.isSDVOSB },
    { keywords: ['hubzone'], have: certs.isHUBZone },
    { keywords: ['wosb', 'edwosb', 'women-owned'], have: certs.isWOSB },
    { keywords: ['small business set-aside', 'total small business'], have: certs.isSmallBusiness },
  ];

  for (const check of checks) {
    const matched = check.keywords.filter(kw =>
      text.includes(kw) || setAside.includes(kw)
    );

    if (matched.length > 0 && !check.have) {
      const evidence = extractSentenceContaining(rfp.fullDescription, matched[0]);

      return {
        ruleId: 'set_aside',
        ruleName: 'Set-Aside Certification Required',
        outcome: certs.canPartnerForSetAside ? 'flag' : 'fail',
        severity: certs.canPartnerForSetAside ? 'soft' : 'hard',
        evidence,
        keywords: matched,
      };
    }
  }

  return null;
}
```

---

### Filter 4: Onsite / Location Constraints

**Logic**:
- If onsite-heavy requirement: `REJECTED` or `PARTNER_REQUIRED` (configurable)
- If hybrid/limited onsite: allowed but flagged

**Evidence Keywords**:
```typescript
const ONSITE_KEYWORDS = {
  hard: [
    'onsite required',
    '5 days/week onsite',
    '5 days a week onsite',
    'full-time onsite',
    'must be local',
    'no remote',
    '100% onsite',
    'on-site only',
    'must work on-site',
  ],
  soft: [
    'hybrid',
    'occasional onsite',
    'some onsite',
    'periodic onsite',
    '2-3 days onsite',
    'partial onsite',
  ],
};
```

**Implementation**:
```typescript
function checkOnsiteRequirement(rfp: CanonicalOpportunity, config: EligibilityConfig): EligibilityReason | null {
  const text = rfp.fullDescription.toLowerCase();

  // Check hard onsite first
  const hardMatched = ONSITE_KEYWORDS.hard.filter(kw => text.includes(kw.toLowerCase()));
  if (hardMatched.length > 0) {
    const evidence = extractSentenceContaining(rfp.fullDescription, hardMatched[0]);
    return {
      ruleId: 'onsite_requirement',
      ruleName: 'Full-Time Onsite Required',
      outcome: config.allowPartnerForOnsite ? 'flag' : 'fail',
      severity: config.allowPartnerForOnsite ? 'soft' : 'hard',
      evidence,
      keywords: hardMatched,
    };
  }

  // Check soft onsite (flag only)
  const softMatched = ONSITE_KEYWORDS.soft.filter(kw => text.includes(kw.toLowerCase()));
  if (softMatched.length > 0) {
    const evidence = extractSentenceContaining(rfp.fullDescription, softMatched[0]);
    return {
      ruleId: 'onsite_requirement',
      ruleName: 'Partial Onsite Required',
      outcome: 'flag',
      severity: 'soft',
      evidence,
      keywords: softMatched,
    };
  }

  return null;
}
```

---

### Filter 5: Minimum Proposal Time

**Logic**: If deadline is less than **5 days** from discovery: `REJECTED` (configurable threshold)

**Implementation**:
```typescript
function checkMinimumProposalTime(
  rfp: CanonicalOpportunity,
  config: { minimumDays: number }
): EligibilityReason | null {
  const now = Date.now();
  const daysRemaining = (rfp.dueDate - now) / (1000 * 60 * 60 * 24);

  if (daysRemaining < config.minimumDays) {
    return {
      ruleId: 'minimum_time',
      ruleName: 'Insufficient Proposal Time',
      outcome: 'fail',
      severity: 'hard',
      evidence: `Due date: ${formatDate(rfp.dueDate)} (${Math.floor(daysRemaining)} days remaining)`,
      keywords: [],
    };
  }

  // Warning if close to threshold
  if (daysRemaining < config.minimumDays + 2) {
    return {
      ruleId: 'minimum_time',
      ruleName: 'Low Proposal Time Warning',
      outcome: 'flag',
      severity: 'soft',
      evidence: `Due date: ${formatDate(rfp.dueDate)} (${Math.floor(daysRemaining)} days remaining)`,
      keywords: [],
    };
  }

  return null;
}
```

---

### Filter 6: Out-of-Scope Domain

**Logic**: If primarily physical infrastructure: `REJECTED`

**Negative Keywords**:
```typescript
const OUT_OF_SCOPE_KEYWORDS = [
  'construction',
  'HVAC',
  'plumbing',
  'electrical works',
  'asbestos',
  'roofing',
  'bridge',
  'concrete',
  'demolition',
  'excavation',
  'paving',
  'masonry',
  'carpentry',
  'landscaping',
  'janitorial',
  'food service',
  'medical equipment',
  'vehicle maintenance',
  'fleet management',
];
```

**Implementation**:
```typescript
function checkOutOfScopeDomain(rfp: CanonicalOpportunity): EligibilityReason | null {
  const text = rfp.fullDescription.toLowerCase();
  const title = rfp.title.toLowerCase();

  const matched = OUT_OF_SCOPE_KEYWORDS.filter(kw => {
    const lowerKw = kw.toLowerCase();
    // Check if it's a primary focus (in title or mentioned multiple times)
    const inTitle = title.includes(lowerKw);
    const count = (text.match(new RegExp(lowerKw, 'gi')) || []).length;
    return inTitle || count >= 3;
  });

  if (matched.length > 0) {
    const evidence = extractSentenceContaining(rfp.fullDescription, matched[0]);
    return {
      ruleId: 'out_of_scope',
      ruleName: 'Out of Scope Domain',
      outcome: 'fail',
      severity: 'hard',
      evidence: evidence || `Title contains: ${matched.join(', ')}`,
      keywords: matched,
    };
  }

  return null;
}
```

---

### Filter 7: Category Must Be "Software / Digital"

**Logic**: If category is clearly not web/software/IT: `REJECTED` or "Needs Review"

**Positive Categories (Must match at least one)**:
```typescript
const SOFTWARE_CATEGORIES = [
  'information technology',
  'software',
  'web development',
  'web design',
  'application development',
  'cloud',
  'digital',
  'systems integration',
  'IT services',
  'computer',
  'programming',
  'database',
  'network',
  'cybersecurity',
  'data analytics',
];

const SOFTWARE_NAICS = [
  '541511', // Custom Computer Programming
  '541512', // Computer Systems Design
  '541513', // Computer Facilities Management
  '541519', // Other Computer Related Services
  '518210', // Data Processing, Hosting
  '519130', // Internet Publishing
];
```

**Implementation**:
```typescript
function checkSoftwareCategory(rfp: CanonicalOpportunity): EligibilityReason | null {
  const text = rfp.fullDescription.toLowerCase();
  const categories = rfp.categories.map(c => c.toLowerCase());

  // Check NAICS codes
  const hasRelevantNaics = rfp.categories.some(naics =>
    SOFTWARE_NAICS.includes(naics)
  );

  // Check keyword presence
  const matchedKeywords = SOFTWARE_CATEGORIES.filter(kw =>
    text.includes(kw.toLowerCase())
  );

  if (hasRelevantNaics || matchedKeywords.length >= 2) {
    return null; // Passes - is software related
  }

  // No clear software indicators
  return {
    ruleId: 'category_fit',
    ruleName: 'Not Software/Digital Category',
    outcome: 'flag', // Needs review, not auto-reject
    severity: 'soft',
    evidence: `Categories: ${categories.join(', ')}. No clear software/IT indicators found.`,
    keywords: [],
  };
}
```

---

## Complete Eligibility Engine

```typescript
// services/eligibility.ts

interface EligibilityConfig {
  // Organization status
  hasUsEntity: boolean;
  certifications: CertificationConfig;

  // Rule settings
  minimumDays: number;              // Default: 5
  allowPartnerForOnsite: boolean;   // Default: true
  allowPartnerForUsOrg: boolean;    // Default: true

  // Custom keywords (admin-configurable)
  additionalRejectKeywords: string[];
  additionalFlagKeywords: string[];
}

export class EligibilityEngine {
  private config: EligibilityConfig;

  assess(rfp: CanonicalOpportunity): EligibilityAssessment {
    const reasons: EligibilityReason[] = [];

    // Run all 7 filters
    const filters = [
      () => checkUsOrganization(rfp, this.config),
      () => checkSecurityClearance(rfp),
      () => checkSetAside(rfp, this.config.certifications),
      () => checkOnsiteRequirement(rfp, this.config),
      () => checkMinimumProposalTime(rfp, { minimumDays: this.config.minimumDays }),
      () => checkOutOfScopeDomain(rfp),
      () => checkSoftwareCategory(rfp),
    ];

    for (const filter of filters) {
      const result = filter();
      if (result) {
        reasons.push(result);
      }
    }

    // Determine overall status
    const status = this.determineStatus(reasons);

    // Collect all evidence snippets
    const evidenceSnippets = [
      ...reasons.map(r => r.evidence),
      ...rfp.evidenceSnippets,
    ].filter(Boolean);

    return {
      status,
      reasons,
      evidenceSnippets,
      assessedAt: Date.now(),
      assessedBy: 'system',
      rulesVersion: this.config.version || '1.0',
    };
  }

  private determineStatus(reasons: EligibilityReason[]): 'ELIGIBLE' | 'PARTNER_REQUIRED' | 'REJECTED' {
    // Any hard fail = REJECTED
    const hardFails = reasons.filter(r => r.severity === 'hard' && r.outcome === 'fail');
    if (hardFails.length > 0) {
      return 'REJECTED';
    }

    // Any soft fail with partner option = PARTNER_REQUIRED
    const softFails = reasons.filter(r => r.severity === 'soft' && r.outcome === 'fail');
    const flags = reasons.filter(r => r.outcome === 'flag');
    if (softFails.length > 0 || flags.some(f => f.ruleId === 'set_aside' || f.ruleId === 'onsite_requirement')) {
      return 'PARTNER_REQUIRED';
    }

    return 'ELIGIBLE';
  }
}
```

---

## Eligibility Rules Admin

```typescript
interface EligibilityRuleConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Outcome configuration
  defaultOutcome: 'REJECTED' | 'PARTNER_REQUIRED' | 'FLAG';
  allowOverride: boolean;

  // Keywords
  keywords: string[];
  isRegex: boolean;

  // Severity
  severity: 'hard' | 'soft';
}

// Default rule configurations
const DEFAULT_RULES: EligibilityRuleConfig[] = [
  {
    id: 'us_organization',
    name: 'US Organization Requirement',
    description: 'Detects requirements for US-based organizations',
    enabled: true,
    defaultOutcome: 'PARTNER_REQUIRED',
    allowOverride: true,
    keywords: ['onshore', 'US-based', 'United States only', 'no offshore', 'domestic only'],
    isRegex: false,
    severity: 'hard',
  },
  {
    id: 'security_clearance',
    name: 'Security Clearance',
    description: 'Detects security clearance requirements',
    enabled: true,
    defaultOutcome: 'REJECTED',
    allowOverride: false,
    keywords: ['secret clearance', 'top secret', 'TS/SCI', 'SCI', 'clearance required'],
    isRegex: false,
    severity: 'hard',
  },
  // ... more rules
];
```

### Admin UI

```tsx
// components/admin/EligibilityRulesAdmin.tsx

export function EligibilityRulesAdmin() {
  const [rules, setRules] = useState<EligibilityRuleConfig[]>(DEFAULT_RULES);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Eligibility Rules</h2>
          <p className="text-sm text-muted-foreground">
            Configure hard filters that run BEFORE scoring
          </p>
        </div>
        <Badge variant="outline">P0 Priority</Badge>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map(rule => (
          <RuleConfigCard key={rule.id} rule={rule} onUpdate={updateRule} />
        ))}
      </div>

      {/* Add Custom Rule */}
      <Button variant="outline" onClick={() => setShowAddRule(true)}>
        Add Custom Rule
      </Button>
    </div>
  );
}

function RuleConfigCard({
  rule,
  onUpdate
}: {
  rule: EligibilityRuleConfig;
  onUpdate: (id: string, updates: Partial<EligibilityRuleConfig>) => void;
}) {
  return (
    <Card className={rule.enabled ? '' : 'opacity-50'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{rule.name}</CardTitle>
            <Badge variant={rule.severity === 'hard' ? 'destructive' : 'secondary'}>
              {rule.severity}
            </Badge>
          </div>
          <Switch
            checked={rule.enabled}
            onCheckedChange={(enabled) => onUpdate(rule.id, { enabled })}
          />
        </div>
        <CardDescription>{rule.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outcome Selection */}
        <div>
          <Label>Default Outcome</Label>
          <Select
            value={rule.defaultOutcome}
            onValueChange={(value) => onUpdate(rule.id, {
              defaultOutcome: value as EligibilityRuleConfig['defaultOutcome']
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REJECTED">REJECTED</SelectItem>
              <SelectItem value="PARTNER_REQUIRED">PARTNER REQUIRED</SelectItem>
              <SelectItem value="FLAG">FLAG for Review</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Keywords */}
        <div>
          <Label>Detection Keywords</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {rule.keywords.map((kw, idx) => (
              <Badge key={idx} variant="outline" className="flex items-center gap-1">
                {kw}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeKeyword(rule.id, idx)}
                />
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Add keyword..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addKeyword(rule.id, e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            className="mt-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Evidence Snippets Display

```tsx
// components/rfp/EligibilityBadge.tsx

export function EligibilityBadge({ assessment }: { assessment: EligibilityAssessment }) {
  const statusConfig = {
    ELIGIBLE: { color: 'bg-success/10 text-success', icon: CheckCircle },
    PARTNER_REQUIRED: { color: 'bg-warning/10 text-warning', icon: AlertTriangle },
    REJECTED: { color: 'bg-destructive/10 text-destructive', icon: XCircle },
  };

  const config = statusConfig[assessment.status];
  const Icon = config.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${config.color}`}>
          <Icon className="w-4 h-4" />
          {assessment.status.replace('_', ' ')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-3">
          <h4 className="font-medium">Eligibility Assessment</h4>

          {/* Reasons */}
          <div className="space-y-2">
            {assessment.reasons.map((reason, idx) => (
              <div key={idx} className="text-sm">
                <div className="flex items-center gap-2">
                  {reason.outcome === 'pass' && <CheckCircle className="w-4 h-4 text-success" />}
                  {reason.outcome === 'fail' && <XCircle className="w-4 h-4 text-destructive" />}
                  {reason.outcome === 'flag' && <AlertTriangle className="w-4 h-4 text-warning" />}
                  <span className="font-medium">{reason.ruleName}</span>
                </div>
                {reason.evidence && (
                  <p className="ml-6 text-muted-foreground text-xs mt-1 italic">
                    "{reason.evidence}"
                  </p>
                )}
                {reason.keywords.length > 0 && (
                  <div className="ml-6 mt-1 flex flex-wrap gap-1">
                    {reason.keywords.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Assessed {formatRelativeTime(assessment.assessedAt)} (v{assessment.rulesVersion})
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Implementation Checklist

### Week 3: Core Eligibility Engine

- [ ] Create `EligibilityAssessment` interface
- [ ] Implement all 7 filter functions
- [ ] Create `EligibilityEngine` class
- [ ] Add evidence snippet extraction utility
- [ ] Integrate with opportunity ingestion pipeline
- [ ] Store eligibility with each opportunity

### Week 4: Admin + UI

- [ ] Create `EligibilityRuleConfig` interface
- [ ] Build Eligibility Rules Admin UI
- [ ] Keyword management (add/remove)
- [ ] Outcome configuration per rule
- [ ] Create `EligibilityBadge` component
- [ ] Add eligibility to RFP card display
- [ ] Test all 7 filters with real data

---

## Testing Checklist

- [ ] US Organization detection works
- [ ] Security Clearance detection works
- [ ] Set-Aside detection works with all certification types
- [ ] Onsite detection distinguishes hard vs soft requirements
- [ ] Minimum time calculation is accurate
- [ ] Out-of-scope domain detection works
- [ ] Category check flags non-software correctly
- [ ] Evidence snippets are extracted correctly
- [ ] Admin changes are reflected immediately
- [ ] PARTNER_REQUIRED shows when configured

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Add EligibilityAssessment, EligibilityReason |
| `src/services/eligibility.ts` | Create | Main eligibility engine |
| `src/services/eligibility/filters.ts` | Create | Individual filter implementations |
| `src/services/eligibility/keywords.ts` | Create | Keyword configurations |
| `src/components/admin/EligibilityRulesAdmin.tsx` | Create | Admin UI |
| `src/components/rfp/EligibilityBadge.tsx` | Create | Display component |

---

*Reference: CTO Instructions Section 2A.4 (Eligibility Gate), Section 2B.2 (Eligibility Rules Admin), Section 3A (Filtering Criteria)*
