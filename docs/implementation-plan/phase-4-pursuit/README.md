# Phase 4: Pursuit Workflow + Bid/No-Bid + Alerts

**Duration**: Weeks 7-8
**Goal**: Full pipeline from discovery to submission

---

## Objectives

1. Implement complete pipeline stages
2. Support owner assignment for each pursuit
3. Build bid/no-bid decision workflow with checklist
4. Create deadline alert system
5. Track notes and activity log

---

## Pipeline Stages (From CTO)

```
NEW → TRIAGE → BID/NO-BID → CAPTURE → DRAFT → REVIEW → SUBMIT → OUTCOME → ARCHIVED
```

| Stage | Description | Actions Available |
|-------|-------------|-------------------|
| **NEW** | Just ingested, unreviewed | View, Move to Triage |
| **TRIAGE** | Under initial review | View, Bid, No-Bid |
| **BID** | Decision to pursue | Assign Owner, Start Capture |
| **NO-BID** | Decision to skip | Record Reason, Archive |
| **CAPTURE** | Gathering intel, building strategy | Generate Brief, Add Notes |
| **DRAFT** | Writing proposal | Edit, Generate Sections |
| **REVIEW** | Red team / final review | Approve, Request Changes |
| **SUBMIT** | Ready to send | Mark Submitted |
| **OUTCOME** | Awaiting result | Mark Won/Lost |
| **ARCHIVED** | Closed | View History |

---

## Data Model

```typescript
interface Pursuit {
  id: string;
  rfpId: string;

  // Status
  status: PursuitStatus;
  previousStatuses: StatusChange[];

  // Decision
  decision?: 'bid' | 'no-bid';
  decisionBy?: string;
  decisionAt?: number;
  decisionReasons: string[];
  bidNoBidChecklist?: BidNoBidChecklist;

  // Ownership
  captureManager?: string;
  proposalLead?: string;
  technicalLead?: string;
  teamMembers: string[];

  // Deadlines
  rfpDeadline: number;
  internalDeadlines: InternalDeadline[];

  // Content
  pursuitBrief?: PursuitBrief;
  complianceMatrix?: ComplianceMatrix;
  proposalDrafts: ProposalDraft[];

  // Tracking
  notes: Note[];
  activityLog: ActivityEntry[];

  // Metadata
  createdAt: number;
  updatedAt: number;
}

type PursuitStatus =
  | 'new'
  | 'triage'
  | 'bid'
  | 'no-bid'
  | 'capture'
  | 'draft'
  | 'review'
  | 'submitted'
  | 'won'
  | 'lost'
  | 'archived';

interface StatusChange {
  from: PursuitStatus;
  to: PursuitStatus;
  changedBy: string;
  changedAt: number;
  reason?: string;
}

interface InternalDeadline {
  name: string;              // "Technical Volume Draft"
  dueAt: number;
  status: 'pending' | 'completed' | 'overdue';
}
```

---

## Bid/No-Bid Checklist

```typescript
interface BidNoBidChecklist {
  completedAt?: number;
  completedBy?: string;
  items: ChecklistItem[];
  overallScore: number;      // Calculated from items
  recommendation: 'bid' | 'no-bid' | 'review';
}

interface ChecklistItem {
  id: string;
  category: 'fit' | 'capacity' | 'competitive' | 'financial';
  question: string;
  answer: 'yes' | 'no' | 'partial' | 'unknown';
  weight: number;            // 1-5 importance
  notes?: string;
}

// Default Checklist Questions
const BID_NO_BID_QUESTIONS: Omit<ChecklistItem, 'answer' | 'notes'>[] = [
  // Fit
  {
    id: 'fit_1',
    category: 'fit',
    question: 'Does this align with our core capabilities?',
    weight: 5,
  },
  {
    id: 'fit_2',
    category: 'fit',
    question: 'Do we have relevant past performance?',
    weight: 4,
  },
  {
    id: 'fit_3',
    category: 'fit',
    question: 'Is this the type of client we want to work with?',
    weight: 3,
  },

  // Capacity
  {
    id: 'capacity_1',
    category: 'capacity',
    question: 'Do we have team members available for this work?',
    weight: 5,
  },
  {
    id: 'capacity_2',
    category: 'capacity',
    question: 'Can we meet the proposal deadline?',
    weight: 5,
  },
  {
    id: 'capacity_3',
    category: 'capacity',
    question: 'Do we have capacity to write a quality proposal?',
    weight: 4,
  },

  // Competitive
  {
    id: 'competitive_1',
    category: 'competitive',
    question: 'Are we likely to be competitive on price?',
    weight: 3,
  },
  {
    id: 'competitive_2',
    category: 'competitive',
    question: 'Do we have unique differentiators for this?',
    weight: 4,
  },
  {
    id: 'competitive_3',
    category: 'competitive',
    question: 'Is the playing field fair (not wired)?',
    weight: 3,
  },

  // Financial
  {
    id: 'financial_1',
    category: 'financial',
    question: 'Is the contract value appropriate for our effort?',
    weight: 4,
  },
  {
    id: 'financial_2',
    category: 'financial',
    question: 'Are the payment terms acceptable?',
    weight: 3,
  },
];

function calculateBidRecommendation(checklist: BidNoBidChecklist): 'bid' | 'no-bid' | 'review' {
  let score = 0;
  let maxScore = 0;

  for (const item of checklist.items) {
    maxScore += item.weight * 2; // Max is 2 points per weight

    if (item.answer === 'yes') {
      score += item.weight * 2;
    } else if (item.answer === 'partial') {
      score += item.weight;
    }
    // 'no' and 'unknown' add 0
  }

  const percentage = score / maxScore;

  if (percentage >= 0.7) return 'bid';
  if (percentage >= 0.5) return 'review';
  return 'no-bid';
}
```

---

## Owner Assignment

```typescript
interface TeamAssignment {
  role: 'capture_manager' | 'proposal_lead' | 'technical_lead' | 'contributor';
  userId: string;
  name: string;
  email: string;
  assignedAt: number;
  assignedBy: string;
}

// Role descriptions
const ROLE_DESCRIPTIONS = {
  capture_manager: 'Owns the pursuit strategy and client relationship',
  proposal_lead: 'Manages proposal writing and compliance',
  technical_lead: 'Develops technical approach and solution',
  contributor: 'Contributes sections or review feedback',
};
```

### Assignment UI

```tsx
// components/pursuit/TeamAssignment.tsx

export function TeamAssignment({ pursuit }: { pursuit: Pursuit }) {
  const users = useQuery(api.users.list);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capture Manager */}
        <RoleAssignment
          role="capture_manager"
          label="Capture Manager"
          description={ROLE_DESCRIPTIONS.capture_manager}
          currentUser={pursuit.captureManager}
          users={users}
          onAssign={(userId) => assignRole(pursuit.id, 'capture_manager', userId)}
        />

        {/* Proposal Lead */}
        <RoleAssignment
          role="proposal_lead"
          label="Proposal Lead"
          description={ROLE_DESCRIPTIONS.proposal_lead}
          currentUser={pursuit.proposalLead}
          users={users}
          onAssign={(userId) => assignRole(pursuit.id, 'proposal_lead', userId)}
        />

        {/* Technical Lead */}
        <RoleAssignment
          role="technical_lead"
          label="Technical Lead"
          description={ROLE_DESCRIPTIONS.technical_lead}
          currentUser={pursuit.technicalLead}
          users={users}
          onAssign={(userId) => assignRole(pursuit.id, 'technical_lead', userId)}
        />

        {/* Contributors */}
        <div>
          <Label>Contributors</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {pursuit.teamMembers.map(member => (
              <Badge key={member} variant="outline">
                {getUserName(member)}
              </Badge>
            ))}
            <AddContributorButton pursuitId={pursuit.id} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Deadline Alerts

```typescript
interface DeadlineAlert {
  pursuitId: string;
  rfpTitle: string;
  deadline: number;
  daysRemaining: number;
  severity: 'info' | 'warning' | 'critical';
  type: 'rfp_deadline' | 'internal_deadline';
  message: string;
}

// Alert thresholds (configurable)
const ALERT_THRESHOLDS = {
  critical: 2,  // Less than 2 days
  warning: 5,   // Less than 5 days
  info: 10,     // Less than 10 days
};

function generateDeadlineAlerts(pursuits: Pursuit[]): DeadlineAlert[] {
  const alerts: DeadlineAlert[] = [];
  const now = Date.now();

  for (const pursuit of pursuits) {
    // Skip completed/archived
    if (['submitted', 'won', 'lost', 'archived', 'no-bid'].includes(pursuit.status)) {
      continue;
    }

    const daysRemaining = (pursuit.rfpDeadline - now) / (1000 * 60 * 60 * 24);

    if (daysRemaining < ALERT_THRESHOLDS.critical) {
      alerts.push({
        pursuitId: pursuit.id,
        rfpTitle: pursuit.rfpTitle,
        deadline: pursuit.rfpDeadline,
        daysRemaining: Math.floor(daysRemaining),
        severity: 'critical',
        type: 'rfp_deadline',
        message: `CRITICAL: ${Math.floor(daysRemaining)} days until deadline!`,
      });
    } else if (daysRemaining < ALERT_THRESHOLDS.warning) {
      alerts.push({
        pursuitId: pursuit.id,
        rfpTitle: pursuit.rfpTitle,
        deadline: pursuit.rfpDeadline,
        daysRemaining: Math.floor(daysRemaining),
        severity: 'warning',
        type: 'rfp_deadline',
        message: `Warning: ${Math.floor(daysRemaining)} days remaining`,
      });
    }

    // Check internal deadlines too
    for (const internal of pursuit.internalDeadlines) {
      if (internal.status === 'completed') continue;

      const internalDays = (internal.dueAt - now) / (1000 * 60 * 60 * 24);
      if (internalDays < 0) {
        alerts.push({
          pursuitId: pursuit.id,
          rfpTitle: pursuit.rfpTitle,
          deadline: internal.dueAt,
          daysRemaining: Math.floor(internalDays),
          severity: 'critical',
          type: 'internal_deadline',
          message: `OVERDUE: ${internal.name}`,
        });
      }
    }
  }

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
```

### Alerts UI

```tsx
// components/pursuit/DeadlineAlerts.tsx

export function DeadlineAlerts() {
  const pursuits = useQuery(api.pursuits.listActive);
  const alerts = useMemo(() =>
    pursuits ? generateDeadlineAlerts(pursuits) : [],
    [pursuits]
  );

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold flex items-center gap-2">
        <Bell className="w-4 h-4" />
        Deadline Alerts
      </h3>
      {alerts.map((alert) => (
        <Alert key={`${alert.pursuitId}-${alert.type}`} variant={
          alert.severity === 'critical' ? 'destructive' :
          alert.severity === 'warning' ? 'warning' : 'default'
        }>
          <AlertTitle>{alert.rfpTitle}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

---

## Activity Log

```typescript
interface ActivityEntry {
  id: string;
  pursuitId: string;
  type: ActivityType;
  description: string;
  userId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

type ActivityType =
  | 'status_change'
  | 'assignment'
  | 'note_added'
  | 'document_generated'
  | 'decision_made'
  | 'deadline_set'
  | 'submission';

function logActivity(
  pursuitId: string,
  type: ActivityType,
  description: string,
  userId: string,
  metadata?: Record<string, any>
): ActivityEntry {
  return {
    id: generateId(),
    pursuitId,
    type,
    description,
    userId,
    timestamp: Date.now(),
    metadata,
  };
}

// Example usage
logActivity(
  pursuit.id,
  'status_change',
  `Status changed from ${oldStatus} to ${newStatus}`,
  currentUser.id,
  { oldStatus, newStatus }
);
```

---

## Pipeline View

```tsx
// components/pursuit/PipelineView.tsx

const PIPELINE_STAGES: PursuitStatus[] = [
  'new', 'triage', 'bid', 'capture', 'draft', 'review', 'submitted'
];

export function PipelineView() {
  const pursuits = useQuery(api.pursuits.list);

  const byStage = useMemo(() => {
    const grouped: Record<PursuitStatus, Pursuit[]> = {} as any;
    for (const stage of PIPELINE_STAGES) {
      grouped[stage] = [];
    }
    for (const pursuit of pursuits || []) {
      if (grouped[pursuit.status]) {
        grouped[pursuit.status].push(pursuit);
      }
    }
    return grouped;
  }, [pursuits]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          pursuits={byStage[stage]}
        />
      ))}
    </div>
  );
}

function PipelineColumn({
  stage,
  pursuits
}: {
  stage: PursuitStatus;
  pursuits: Pursuit[];
}) {
  return (
    <div className="flex-shrink-0 w-72 bg-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold capitalize">{stage.replace('-', ' ')}</h3>
        <Badge variant="secondary">{pursuits.length}</Badge>
      </div>

      <div className="space-y-3">
        {pursuits
          .sort((a, b) => a.rfpDeadline - b.rfpDeadline)
          .map((pursuit) => (
            <PursuitCard key={pursuit.id} pursuit={pursuit} />
          ))}
      </div>
    </div>
  );
}

function PursuitCard({ pursuit }: { pursuit: Pursuit }) {
  const daysRemaining = Math.floor(
    (pursuit.rfpDeadline - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="cursor-pointer hover:border-primary transition-colors">
      <CardContent className="p-3">
        <h4 className="font-medium text-sm line-clamp-2">{pursuit.rfpTitle}</h4>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{pursuit.source}</span>
          <span className={daysRemaining < 5 ? 'text-destructive' : ''}>
            {daysRemaining}d left
          </span>
        </div>

        {pursuit.captureManager && (
          <div className="mt-2">
            <Avatar className="w-5 h-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Implementation Checklist

### Week 7: Core Workflow

- [ ] Create `Pursuit` interface with all fields
- [ ] Implement status transition logic
- [ ] Build bid/no-bid checklist system
- [ ] Create owner assignment functionality
- [ ] Implement activity logging
- [ ] Build notes system

### Week 8: UI + Alerts

- [ ] Build Pipeline View (Kanban-style)
- [ ] Create Pursuit Detail page
- [ ] Implement deadline alert system
- [ ] Build Team Assignment UI
- [ ] Create Bid/No-Bid workflow UI
- [ ] Add Activity Log display
- [ ] Test status transitions

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Add Pursuit, BidNoBidChecklist, etc. |
| `src/services/pursuit.ts` | Create | Pursuit workflow logic |
| `src/services/alerts.ts` | Create | Deadline alert generation |
| `src/components/pursuit/PipelineView.tsx` | Create | Kanban board |
| `src/components/pursuit/PursuitDetail.tsx` | Create | Detail view |
| `src/components/pursuit/TeamAssignment.tsx` | Create | Assignment UI |
| `src/components/pursuit/BidNoBidChecklist.tsx` | Create | Checklist UI |
| `src/components/pursuit/DeadlineAlerts.tsx` | Create | Alerts display |
| `src/components/pursuit/ActivityLog.tsx` | Create | Activity timeline |

---

*Reference: CTO Instructions Section 2A.6 (Pursuit Workflow), Section 4 (UI Requirements)*
