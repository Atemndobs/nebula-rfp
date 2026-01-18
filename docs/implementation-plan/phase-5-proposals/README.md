# Phase 5: Proposal Templates + Content Library

**Duration**: Weeks 9-10
**Goal**: Automated brief & proposal generation with content library

---

## Objectives

1. Build template system for different proposal types
2. Create content library (capabilities, case studies, bios, boilerplate)
3. Implement pursuit brief generator
4. Build compliance matrix generator
5. Support Markdown + Word-compatible output

---

## Template System

### Template Types (From CTO)

| Template | Purpose | When Used |
|----------|---------|-----------|
| **Formal RFP Response** | Full proposal with volumes | Large federal/state RFPs |
| **Unsolicited Proposal** | Proactive capability pitch | When we identify opportunity |
| **Pursuit Brief** | Internal strategy document | Capture phase |
| **Compliance Matrix** | Requirements tracking | Throughout proposal |

```typescript
interface ProposalTemplate {
  id: string;
  name: string;
  type: 'formal_rfp' | 'unsolicited' | 'pursuit_brief' | 'compliance_matrix' | 'custom';
  description: string;

  // Structure
  sections: TemplateSection[];
  requiredFields: string[];
  optionalFields: string[];

  // Content
  boilerplateVariables: string[];  // e.g., {{company_name}}, {{contract_value}}

  // Metadata
  createdBy: string;
  createdAt: number;
  version: string;
  isDefault: boolean;
}

interface TemplateSection {
  id: string;
  name: string;
  order: number;
  required: boolean;
  defaultContent?: string;
  contentBlockCategory?: string;  // Links to content library
  aiPrompt?: string;             // For AI generation
  maxWords?: number;
}
```

### Default Formal RFP Template

```typescript
const FORMAL_RFP_TEMPLATE: ProposalTemplate = {
  id: 'formal_rfp_default',
  name: 'Federal RFP Response',
  type: 'formal_rfp',
  description: 'Standard federal RFP response format',
  sections: [
    {
      id: 'cover_letter',
      name: 'Cover Letter',
      order: 1,
      required: true,
      contentBlockCategory: 'cover_letter',
    },
    {
      id: 'executive_summary',
      name: 'Executive Summary',
      order: 2,
      required: true,
      aiPrompt: 'Generate executive summary highlighting key differentiators',
      maxWords: 500,
    },
    {
      id: 'technical_approach',
      name: 'Technical Approach',
      order: 3,
      required: true,
      aiPrompt: 'Describe technical approach based on RFP requirements',
    },
    {
      id: 'management_approach',
      name: 'Management Approach',
      order: 4,
      required: true,
      contentBlockCategory: 'management',
    },
    {
      id: 'past_performance',
      name: 'Past Performance',
      order: 5,
      required: true,
      contentBlockCategory: 'case_studies',
    },
    {
      id: 'team_qualifications',
      name: 'Team Qualifications',
      order: 6,
      required: true,
      contentBlockCategory: 'team_bios',
    },
    {
      id: 'pricing',
      name: 'Pricing / Cost Volume',
      order: 7,
      required: true,
      defaultContent: '[Pricing to be developed separately]',
    },
  ],
  requiredFields: ['rfpTitle', 'agencyName', 'dueDate'],
  optionalFields: ['naicsCode', 'contractValue', 'periodOfPerformance'],
  boilerplateVariables: [
    '{{company_name}}',
    '{{company_address}}',
    '{{duns_number}}',
    '{{cage_code}}',
  ],
  createdBy: 'system',
  createdAt: Date.now(),
  version: '1.0',
  isDefault: true,
};
```

---

## Content Library

```typescript
interface ContentBlock {
  id: string;
  category: ContentCategory;
  name: string;
  content: string;            // Markdown content
  tags: string[];
  variables: string[];        // Variables used in content

  // Matching
  relevantNaics?: string[];
  relevantKeywords?: string[];

  // Metadata
  lastUsedAt?: number;
  useCount: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

type ContentCategory =
  | 'capabilities'
  | 'case_studies'
  | 'team_bios'
  | 'boilerplate'
  | 'cover_letter'
  | 'management'
  | 'technical'
  | 'diagrams';

interface CaseStudy {
  id: string;
  clientName: string;
  projectName: string;
  industry: string[];
  technologies: string[];
  duration: string;
  contractValue?: string;
  summary: string;            // 2-3 sentences
  challenge: string;
  solution: string;
  results: string[];          // Quantified outcomes
  contactReference?: {
    name: string;
    title: string;
    email?: string;
    phone?: string;
  };
}

interface TeamBio {
  id: string;
  name: string;
  title: string;
  role: string;              // e.g., 'Solution Architect', 'Technical Lead'
  yearsExperience: number;
  education: string[];
  certifications: string[];
  skills: string[];
  summary: string;           // 2-3 paragraph bio
  shortBio: string;          // 1 paragraph
}
```

### Content Library UI

```tsx
// components/content/ContentLibrary.tsx

export function ContentLibrary() {
  const [category, setCategory] = useState<ContentCategory>('capabilities');
  const content = useQuery(api.content.list, { category });

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Categories Sidebar */}
      <div className="space-y-2">
        <h3 className="font-semibold mb-4">Categories</h3>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`w-full text-left px-3 py-2 rounded ${
              category === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {cat.icon} {cat.name}
            <Badge variant="outline" className="ml-2">
              {cat.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Content List */}
      <div className="col-span-3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{getCategoryName(category)}</h2>
          <Button onClick={() => setShowAdd(true)}>
            Add {getCategoryName(category)}
          </Button>
        </div>

        <div className="space-y-4">
          {content?.map((item) => (
            <ContentBlockCard key={item.id} block={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Pursuit Brief Generator

```typescript
interface PursuitBrief {
  id: string;
  pursuitId: string;
  generatedAt: number;
  generatedBy: 'ai' | 'manual';

  // Sections
  opportunityOverview: string;
  clientProfile: string;
  requirements: string[];
  technicalApproach: string;
  competitiveAnalysis: string;
  winThemes: string[];
  risksMitigations: RiskMitigation[];
  keyPersonnel: string[];
  timeline: string;
  nextSteps: string[];

  // Matching content
  suggestedCaseStudies: string[];  // ContentBlock IDs
  suggestedTeamMembers: string[];  // TeamBio IDs
}

interface RiskMitigation {
  risk: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

// AI Generation
async function generatePursuitBrief(
  rfp: CanonicalOpportunity,
  config: AIConfig
): Promise<PursuitBrief> {
  const prompt = `
Generate a pursuit brief for the following RFP opportunity.

RFP Title: ${rfp.title}
Agency: ${rfp.buyer.name}
Description: ${rfp.fullDescription}
Due Date: ${formatDate(rfp.dueDate)}
Estimated Value: ${rfp.estimatedValue || 'Not specified'}

Generate a comprehensive pursuit brief with:
1. Opportunity Overview (2-3 paragraphs)
2. Client Profile (what we know about the buyer)
3. Key Requirements (bulleted list)
4. Recommended Technical Approach
5. Competitive Analysis (who else might bid, our differentiators)
6. 3-5 Win Themes (key messages)
7. Risks and Mitigations
8. Suggested Key Personnel roles
9. Timeline to proposal submission
10. Immediate Next Steps

Format as JSON matching the PursuitBrief interface.
`;

  const response = await callAI(prompt, config);
  return JSON.parse(response);
}
```

### Brief UI

```tsx
// components/pursuit/PursuitBriefView.tsx

export function PursuitBriefView({ brief }: { brief: PursuitBrief }) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pursuit Brief</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToMarkdown}>
            Export MD
          </Button>
          <Button variant="outline" onClick={exportToWord}>
            Export DOCX
          </Button>
        </div>
      </div>

      {/* Overview */}
      <Section title="Opportunity Overview">
        <Markdown>{brief.opportunityOverview}</Markdown>
      </Section>

      {/* Client Profile */}
      <Section title="Client Profile">
        <Markdown>{brief.clientProfile}</Markdown>
      </Section>

      {/* Requirements */}
      <Section title="Key Requirements">
        <ul className="list-disc pl-5 space-y-1">
          {brief.requirements.map((req, i) => (
            <li key={i}>{req}</li>
          ))}
        </ul>
      </Section>

      {/* Win Themes */}
      <Section title="Win Themes">
        <div className="grid grid-cols-2 gap-4">
          {brief.winThemes.map((theme, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Badge className="mb-2">Theme {i + 1}</Badge>
                <p>{theme}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Risks */}
      <Section title="Risks & Mitigations">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risk</TableHead>
              <TableHead>L</TableHead>
              <TableHead>I</TableHead>
              <TableHead>Mitigation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brief.risksMitigations.map((rm, i) => (
              <TableRow key={i}>
                <TableCell>{rm.risk}</TableCell>
                <TableCell>
                  <Badge variant={rm.likelihood === 'high' ? 'destructive' : 'secondary'}>
                    {rm.likelihood}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={rm.impact === 'high' ? 'destructive' : 'secondary'}>
                    {rm.impact}
                  </Badge>
                </TableCell>
                <TableCell>{rm.mitigation}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      {/* Next Steps */}
      <Section title="Next Steps">
        <div className="space-y-2">
          {brief.nextSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox id={`step-${i}`} />
              <label htmlFor={`step-${i}`}>{step}</label>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
```

---

## Compliance Matrix Generator

```typescript
interface ComplianceMatrix {
  id: string;
  pursuitId: string;
  rfpId: string;

  // Requirements extracted from RFP
  requirements: ComplianceRequirement[];

  // Metadata
  generatedAt: number;
  lastUpdatedAt: number;
  completionPercent: number;
}

interface ComplianceRequirement {
  id: string;
  section: string;           // RFP section reference
  requirement: string;       // The actual requirement text
  type: 'mandatory' | 'desirable' | 'informational';
  status: 'not_started' | 'in_progress' | 'compliant' | 'partial' | 'non_compliant';

  // Response
  responseLocation?: string; // Where we address this in our proposal
  responseContent?: string;  // Draft response text
  evidence?: string;         // Supporting evidence

  // Tracking
  assignedTo?: string;
  notes?: string;
}

// AI Extraction
async function extractRequirements(
  rfp: CanonicalOpportunity,
  config: AIConfig
): Promise<ComplianceRequirement[]> {
  const prompt = `
Analyze the following RFP and extract all requirements that must be addressed in a proposal response.

RFP Title: ${rfp.title}
RFP Content: ${rfp.fullDescription}

For each requirement, identify:
1. The section reference (if available)
2. The exact requirement text
3. Whether it's mandatory, desirable, or informational
4. Keywords that indicate the requirement type (shall, must, will = mandatory; should, may = desirable)

Return as JSON array of requirements.
`;

  const response = await callAI(prompt, config);
  const extracted = JSON.parse(response);

  return extracted.map((req: any, index: number) => ({
    id: generateId(),
    section: req.section || `REQ-${index + 1}`,
    requirement: req.requirement,
    type: req.type || 'mandatory',
    status: 'not_started',
  }));
}
```

### Compliance Matrix UI

```tsx
// components/pursuit/ComplianceMatrix.tsx

export function ComplianceMatrixView({ matrix }: { matrix: ComplianceMatrix }) {
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'mandatory'>('all');

  const filtered = matrix.requirements.filter(req => {
    if (filter === 'incomplete') return req.status !== 'compliant';
    if (filter === 'mandatory') return req.type === 'mandatory';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Compliance Matrix</h2>
          <p className="text-sm text-muted-foreground">
            {matrix.completionPercent}% complete ({
              matrix.requirements.filter(r => r.status === 'compliant').length
            } of {matrix.requirements.length})
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requirements</SelectItem>
              <SelectItem value="incomplete">Incomplete Only</SelectItem>
              <SelectItem value="mandatory">Mandatory Only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportMatrix}>
            Export
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={matrix.completionPercent} className="h-2" />

      {/* Requirements Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Section</TableHead>
            <TableHead>Requirement</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-32">Assigned</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-mono text-sm">{req.section}</TableCell>
              <TableCell>
                <p className="line-clamp-2">{req.requirement}</p>
                {req.responseContent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Response: {req.responseLocation}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={req.type === 'mandatory' ? 'destructive' : 'secondary'}>
                  {req.type}
                </Badge>
              </TableCell>
              <TableCell>
                <StatusSelect
                  value={req.status}
                  onChange={(status) => updateRequirement(req.id, { status })}
                />
              </TableCell>
              <TableCell>
                <AssigneeSelect
                  value={req.assignedTo}
                  onChange={(assignedTo) => updateRequirement(req.id, { assignedTo })}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Export Formats

```typescript
// services/export.ts

// Markdown Export
function exportToMarkdown(brief: PursuitBrief): string {
  return `
# Pursuit Brief: ${brief.title}

## Opportunity Overview
${brief.opportunityOverview}

## Client Profile
${brief.clientProfile}

## Key Requirements
${brief.requirements.map(r => `- ${r}`).join('\n')}

## Technical Approach
${brief.technicalApproach}

## Win Themes
${brief.winThemes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
${brief.risksMitigations.map(r =>
  `| ${r.risk} | ${r.likelihood} | ${r.impact} | ${r.mitigation} |`
).join('\n')}

## Next Steps
${brief.nextSteps.map(s => `- [ ] ${s}`).join('\n')}

---
Generated: ${formatDate(brief.generatedAt)}
`;
}

// Word Export (using docx library)
async function exportToWord(brief: PursuitBrief): Promise<Blob> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: `Pursuit Brief: ${brief.title}`,
          heading: HeadingLevel.HEADING_1,
        }),
        // ... build out document
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
```

---

## Implementation Checklist

### Week 9: Templates + Content Library

- [ ] Create `ProposalTemplate` interface
- [ ] Build default templates (Formal RFP, Unsolicited, Brief)
- [ ] Create `ContentBlock` interface
- [ ] Build Content Library UI
- [ ] Implement case study management
- [ ] Implement team bio management
- [ ] Build template editor

### Week 10: Generators + Export

- [ ] Implement pursuit brief generator (AI)
- [ ] Build brief display UI
- [ ] Implement compliance matrix extractor (AI)
- [ ] Build compliance matrix UI
- [ ] Implement Markdown export
- [ ] Implement Word (DOCX) export
- [ ] Content matching for RFPs (suggest relevant content)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Add ProposalTemplate, ContentBlock, etc. |
| `src/services/templates.ts` | Create | Template management |
| `src/services/contentLibrary.ts` | Create | Content block management |
| `src/services/briefGenerator.ts` | Create | AI brief generation |
| `src/services/complianceMatrix.ts` | Create | Matrix extraction |
| `src/services/export.ts` | Create | MD/DOCX export |
| `src/components/content/ContentLibrary.tsx` | Create | Library UI |
| `src/components/pursuit/PursuitBriefView.tsx` | Create | Brief display |
| `src/components/pursuit/ComplianceMatrix.tsx` | Create | Matrix UI |

---

*Reference: CTO Instructions Section 2A.7 (Proposal Acceleration)*
