# Skill: Proposal Template Management

## Purpose
Manage reusable proposal templates, capability blocks, and content library for rapid RFP response assembly.

## Content Library Structure

```typescript
interface ContentLibrary {
  templates: ProposalTemplate[];
  capabilityBlocks: CapabilityBlock[];
  caseStudies: CaseStudy[];
  teamBios: TeamBio[];
  boilerplate: BoilerplateSection[];
}

interface ProposalTemplate {
  id: string;
  name: string;
  type: "formal_rfp" | "unsolicited" | "capability_statement";
  sections: TemplateSection[];
  metadata: {
    lastUsed: Date;
    successRate: number; // % of wins using this template
    avgScore: number;
  };
}

interface TemplateSection {
  id: string;
  name: string;
  order: number;
  required: boolean;
  guidance: string;
  defaultContent: string;
  placeholders: string[]; // e.g., ["{{CLIENT_NAME}}", "{{PROJECT_SCOPE}}"]
}

interface CapabilityBlock {
  id: string;
  name: string;
  category: string; // "serverless" | "apis" | "devsecops" | "cloud_migration" | etc.
  content: string;
  keywords: string[]; // For auto-matching to RFP requirements
  lastUpdated: Date;
}

interface CaseStudy {
  id: string;
  title: string;
  client: string;
  industry: string;
  challenge: string;
  approach: string;
  results: string;
  technologies: string[];
  timeline: string;
  teamSize: number;
}

interface TeamBio {
  id: string;
  name: string;
  role: string;
  summary: string;
  expertise: string[];
  certifications: string[];
  yearsExperience: number;
}
```

## Formal RFP Response Template

```markdown
# [Client Name] - [Project Title]
## Proposal Response

### Cover Letter
[Personalized letter addressing key evaluation criteria and win themes]

---

## 1. Executive Summary

### 1.1 Value Proposition
{{VALUE_PROPOSITION}}

### 1.2 Understanding of Requirements
[Demonstrate understanding of client's needs and pain points]

### 1.3 Why Nebula Logix
- {{KEY_DIFFERENTIATOR_1}}
- {{KEY_DIFFERENTIATOR_2}}
- {{KEY_DIFFERENTIATOR_3}}

---

## 2. Technical Approach

### 2.1 Solution Architecture
{{ARCHITECTURE_DESCRIPTION}}

[Include architecture diagram]

### 2.2 Technology Stack
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | {{FRONTEND_TECH}} | {{RATIONALE}} |
| Backend | {{BACKEND_TECH}} | {{RATIONALE}} |
| Database | {{DATABASE_TECH}} | {{RATIONALE}} |
| Infrastructure | {{INFRA_TECH}} | {{RATIONALE}} |

### 2.3 Development Methodology
{{METHODOLOGY_DESCRIPTION}}

### 2.4 Quality Assurance
{{QA_APPROACH}}

---

## 3. Project Plan

### 3.1 Phases and Milestones
| Phase | Duration | Deliverables | Milestone |
|-------|----------|--------------|-----------|
| Discovery | {{DURATION}} | {{DELIVERABLES}} | {{MILESTONE}} |
| Design | {{DURATION}} | {{DELIVERABLES}} | {{MILESTONE}} |
| Development | {{DURATION}} | {{DELIVERABLES}} | {{MILESTONE}} |
| Testing | {{DURATION}} | {{DELIVERABLES}} | {{MILESTONE}} |
| Deployment | {{DURATION}} | {{DELIVERABLES}} | {{MILESTONE}} |

### 3.2 Timeline
{{GANTT_CHART_OR_TIMELINE}}

### 3.3 Risk Management
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {{RISK_1}} | {{L/M/H}} | {{L/M/H}} | {{MITIGATION}} |

---

## 4. Team & Staffing

### 4.1 Organization Chart
{{ORG_CHART}}

### 4.2 Key Personnel

#### {{ROLE_1}}: {{NAME}}
{{BIO_SUMMARY}}

**Relevant Experience:**
- {{EXPERIENCE_1}}
- {{EXPERIENCE_2}}

**Certifications:** {{CERTIFICATIONS}}

[Repeat for each key team member]

### 4.3 Staffing Plan
| Role | Name | Allocation | Duration |
|------|------|------------|----------|
| {{ROLE}} | {{NAME}} | {{%}} | {{DURATION}} |

---

## 5. Past Performance

### 5.1 Relevant Project Experience

#### Project 1: {{PROJECT_NAME}}
**Client:** {{CLIENT}}
**Value:** {{CONTRACT_VALUE}}
**Duration:** {{DURATION}}

**Challenge:** {{CHALLENGE_DESCRIPTION}}

**Approach:** {{APPROACH_DESCRIPTION}}

**Results:**
- {{RESULT_1}}
- {{RESULT_2}}
- {{RESULT_3}}

**Reference:**
{{REFERENCE_NAME}}, {{TITLE}}
{{CONTACT_INFO}}

[Repeat for 2-3 projects]

---

## 6. Security & Compliance

### 6.1 Security Approach
{{SECURITY_APPROACH}}

### 6.2 Compliance Standards
- [ ] WCAG 2.1 AA Accessibility
- [ ] Section 508 Compliance
- [ ] {{OTHER_COMPLIANCE}}

### 6.3 Data Protection
{{DATA_PROTECTION_APPROACH}}

---

## 7. Pricing

### 7.1 Pricing Model
{{PRICING_MODEL_DESCRIPTION}}

### 7.2 Cost Summary
| Item | Cost |
|------|------|
| {{LINE_ITEM}} | ${{AMOUNT}} |
| **Total** | **${{TOTAL}}** |

### 7.3 Rate Card
| Role | Hourly Rate |
|------|-------------|
| {{ROLE}} | ${{RATE}} |

### 7.4 Payment Terms
{{PAYMENT_TERMS}}

---

## 8. Assumptions & Clarifications

### 8.1 Assumptions
- {{ASSUMPTION_1}}
- {{ASSUMPTION_2}}

### 8.2 Clarification Questions
- {{QUESTION_1}}

---

## Appendices

### A. Certifications & Attestations
[Required forms and certifications]

### B. Detailed Resumes
[Full resumes for key personnel]

### C. Additional Case Studies
[Supplementary project examples]
```

## Unsolicited Proposal Template

```markdown
# Unsolicited Proposal: {{SOLUTION_NAME}}
## Prepared for {{CLIENT_NAME}}

---

## Executive Summary

### The Opportunity
{{PROBLEM_STATEMENT}}

### Proposed Solution
{{SOLUTION_SUMMARY}}

### Investment & ROI
- **Estimated Investment:** ${{RANGE}}
- **Expected ROI:** {{ROI_DESCRIPTION}}

---

## 1. Problem Statement

{{DETAILED_PROBLEM_DESCRIPTION}}

### Current State Challenges
- {{CHALLENGE_1}}
- {{CHALLENGE_2}}
- {{CHALLENGE_3}}

### Business Impact
{{BUSINESS_IMPACT}}

---

## 2. Proposed Solution

### 2.1 Solution Overview
{{SOLUTION_DESCRIPTION}}

### 2.2 Key Features
- {{FEATURE_1}}: {{BENEFIT}}
- {{FEATURE_2}}: {{BENEFIT}}
- {{FEATURE_3}}: {{BENEFIT}}

### 2.3 Technology Approach
{{TECHNOLOGY_APPROACH}}

---

## 3. Business Case

### 3.1 Benefits
| Benefit | Quantification |
|---------|----------------|
| {{BENEFIT}} | {{VALUE}} |

### 3.2 Risk Reduction
{{RISK_REDUCTION}}

### 3.3 Strategic Alignment
{{STRATEGIC_ALIGNMENT}}

---

## 4. Implementation Plan

### 4.1 Approach
{{IMPLEMENTATION_APPROACH}}

### 4.2 Timeline
{{HIGH_LEVEL_TIMELINE}}

### 4.3 Success Metrics
- {{METRIC_1}}
- {{METRIC_2}}

---

## 5. Investment

### 5.1 Estimated Range
${{LOW}} - ${{HIGH}}

### 5.2 Investment Options
| Option | Scope | Investment |
|--------|-------|------------|
| MVP | {{SCOPE}} | ${{AMOUNT}} |
| Full | {{SCOPE}} | ${{AMOUNT}} |

---

## 6. About Nebula Logix

{{COMPANY_OVERVIEW}}

### Relevant Experience
{{RELEVANT_EXPERIENCE_SUMMARY}}

---

## 7. Next Steps

1. {{NEXT_STEP_1}}
2. {{NEXT_STEP_2}}
3. {{NEXT_STEP_3}}

**Contact:**
{{CONTACT_NAME}}
{{CONTACT_TITLE}}
{{CONTACT_EMAIL}}
```

## Capability Blocks Library

```typescript
// convex/templates.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getCapabilityBlocks = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("capabilityBlocks");
    if (args.category) {
      q = q.filter((q) => q.eq(q.field("category"), args.category));
    }
    return await q.collect();
  },
});

// Auto-match blocks to RFP requirements
export const matchBlocksToRfp = query({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    const rfp = await ctx.db.get(args.rfpId);
    if (!rfp) return [];

    const blocks = await ctx.db.query("capabilityBlocks").collect();
    const text = `${rfp.title} ${rfp.description}`.toLowerCase();

    // Score each block by keyword matches
    const scored = blocks.map((block) => {
      const matches = block.keywords.filter((kw) =>
        text.includes(kw.toLowerCase())
      );
      return {
        ...block,
        matchScore: matches.length,
        matchedKeywords: matches,
      };
    });

    // Return top matches
    return scored
      .filter((b) => b.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  },
});

// Default capability blocks
export const seedCapabilityBlocks = mutation({
  args: {},
  handler: async (ctx) => {
    const blocks = [
      {
        name: "Serverless Architecture",
        category: "serverless",
        content: `Our serverless-first approach leverages AWS Lambda, API Gateway, and managed services to deliver highly scalable, cost-efficient solutions. Benefits include:

- **Zero infrastructure management**: Focus on business logic, not servers
- **Automatic scaling**: Handle traffic spikes without capacity planning
- **Pay-per-use pricing**: Only pay for actual compute consumption
- **Built-in high availability**: Multi-AZ deployment by default

We follow AWS Well-Architected Framework principles and have delivered 20+ serverless production systems.`,
        keywords: ["serverless", "lambda", "aws", "scalable", "cloud-native"],
      },
      {
        name: "API Development & Integration",
        category: "apis",
        content: `We specialize in designing and implementing modern APIs that enable seamless integration and digital transformation:

- **RESTful & GraphQL APIs**: Choose the right pattern for your use case
- **OpenAPI/Swagger documentation**: Complete API contracts for consumers
- **Authentication & authorization**: OAuth 2.0, JWT, API keys
- **Rate limiting & throttling**: Protect your services from abuse
- **Versioning strategy**: Maintain backwards compatibility

Our APIs serve millions of requests daily across government and enterprise clients.`,
        keywords: ["api", "rest", "graphql", "integration", "microservices"],
      },
      {
        name: "DevSecOps & CI/CD",
        category: "devsecops",
        content: `Security-integrated DevOps practices ensure rapid, reliable, and secure software delivery:

- **Infrastructure as Code**: Terraform, CloudFormation, CDK
- **CI/CD pipelines**: GitHub Actions, GitLab CI, AWS CodePipeline
- **Security scanning**: SAST, DAST, dependency vulnerability scanning
- **Container security**: Image scanning, runtime protection
- **Compliance automation**: Automated compliance checks and reporting

We help organizations achieve continuous compliance with FedRAMP, SOC 2, and other standards.`,
        keywords: ["devops", "ci/cd", "security", "automation", "deployment"],
      },
      {
        name: "Cloud Migration",
        category: "cloud_migration",
        content: `Our proven migration methodology minimizes risk and accelerates time-to-value:

**Assessment Phase**
- Application portfolio analysis
- Dependency mapping
- Migration strategy selection (6 Rs)

**Migration Execution**
- Lift-and-shift for quick wins
- Re-platforming for optimization
- Refactoring for cloud-native benefits

**Optimization**
- Cost optimization (FinOps practices)
- Performance tuning
- Security hardening

We have successfully migrated 50+ applications to AWS, reducing infrastructure costs by 30-50%.`,
        keywords: [
          "migration",
          "cloud",
          "modernization",
          "aws",
          "infrastructure",
        ],
      },
      {
        name: "Data Platform & Analytics",
        category: "data",
        content: `Modern data platforms that unlock insights and enable data-driven decisions:

- **Data lake architecture**: S3, Glue, Athena, Lake Formation
- **Real-time streaming**: Kinesis, Kafka, event-driven processing
- **ETL/ELT pipelines**: Automated data transformation and quality
- **Analytics & BI**: QuickSight, Tableau integration
- **ML/AI ready**: SageMaker integration, feature stores

Our data solutions handle petabytes of data while maintaining governance and security.`,
        keywords: ["data", "analytics", "etl", "pipeline", "database"],
      },
    ];

    for (const block of blocks) {
      await ctx.db.insert("capabilityBlocks", {
        ...block,
        lastUpdated: Date.now(),
      });
    }

    return { seeded: blocks.length };
  },
});
```

## Proposal Assembly

```typescript
// convex/proposals.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const assembleProposal = action({
  args: {
    rfpId: v.id("rfps"),
    templateId: v.string(),
    selectedBlocks: v.array(v.string()),
    selectedCaseStudies: v.array(v.string()),
    selectedTeam: v.array(v.string()),
    customizations: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get RFP details
    const rfp = await ctx.runQuery(internal.rfps.get, { id: args.rfpId });
    if (!rfp) throw new Error("RFP not found");

    // Get template
    const template = await ctx.runQuery(internal.templates.getTemplate, {
      id: args.templateId,
    });

    // Get selected content
    const blocks = await ctx.runQuery(internal.templates.getCapabilityBlocks, {
      ids: args.selectedBlocks,
    });
    const caseStudies = await ctx.runQuery(internal.templates.getCaseStudies, {
      ids: args.selectedCaseStudies,
    });
    const team = await ctx.runQuery(internal.templates.getTeamBios, {
      ids: args.selectedTeam,
    });

    // Assemble proposal content
    let content = template.content;

    // Replace placeholders
    content = content
      .replace(/\{\{CLIENT_NAME\}\}/g, extractClientName(rfp))
      .replace(/\{\{PROJECT_TITLE\}\}/g, rfp.title)
      .replace(/\{\{SUBMISSION_DATE\}\}/g, formatDate(new Date()));

    // Insert capability blocks
    const technicalSection = blocks.map((b) => b.content).join("\n\n");
    content = content.replace(
      /\{\{TECHNICAL_APPROACH\}\}/g,
      technicalSection
    );

    // Insert case studies
    const caseStudySection = caseStudies
      .map(formatCaseStudy)
      .join("\n\n---\n\n");
    content = content.replace(
      /\{\{CASE_STUDIES\}\}/g,
      caseStudySection
    );

    // Insert team bios
    const teamSection = team.map(formatTeamBio).join("\n\n");
    content = content.replace(/\{\{TEAM_BIOS\}\}/g, teamSection);

    // Save draft
    await ctx.runMutation(internal.pursuits.saveDraft, {
      rfpId: args.rfpId,
      content,
    });

    return { content, wordCount: countWords(content) };
  },
});

function formatCaseStudy(cs: CaseStudy): string {
  return `### ${cs.title}
**Client:** ${cs.client}
**Industry:** ${cs.industry}

**Challenge:** ${cs.challenge}

**Approach:** ${cs.approach}

**Results:**
${cs.results}

**Technologies:** ${cs.technologies.join(", ")}
`;
}

function formatTeamBio(bio: TeamBio): string {
  return `#### ${bio.name} - ${bio.role}
${bio.summary}

**Expertise:** ${bio.expertise.join(", ")}
**Certifications:** ${bio.certifications.join(", ")}
**Experience:** ${bio.yearsExperience}+ years
`;
}
```

## UI Component

```tsx
// components/ProposalBuilder.tsx
export function ProposalBuilder({ rfpId }: { rfpId: Id<"rfps"> }) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>();
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [selectedCaseStudies, setSelectedCaseStudies] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);

  const templates = useQuery(api.templates.list);
  const matchedBlocks = useQuery(api.templates.matchBlocksToRfp, { rfpId });
  const caseStudies = useQuery(api.templates.getCaseStudies);
  const team = useQuery(api.templates.getTeamBios);

  const assemble = useMutation(api.proposals.assembleProposal);

  const handleAssemble = async () => {
    const result = await assemble({
      rfpId,
      templateId: selectedTemplate!,
      selectedBlocks,
      selectedCaseStudies,
      selectedTeam,
    });
    // Navigate to draft editor
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Template Selection */}
      <section>
        <h3>1. Select Template</h3>
        <TemplateSelector
          templates={templates}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
        />
      </section>

      {/* Content Selection */}
      <section>
        <h3>2. Select Content</h3>
        <h4>Recommended Capability Blocks</h4>
        <BlockSelector
          blocks={matchedBlocks}
          selected={selectedBlocks}
          onSelect={setSelectedBlocks}
        />

        <h4>Case Studies</h4>
        <CaseStudySelector
          studies={caseStudies}
          selected={selectedCaseStudies}
          onSelect={setSelectedCaseStudies}
        />

        <h4>Team Members</h4>
        <TeamSelector
          team={team}
          selected={selectedTeam}
          onSelect={setSelectedTeam}
        />
      </section>

      {/* Preview & Assemble */}
      <section>
        <h3>3. Preview & Assemble</h3>
        <ProposalPreview
          template={selectedTemplate}
          blocks={selectedBlocks}
          caseStudies={selectedCaseStudies}
          team={selectedTeam}
        />
        <button
          onClick={handleAssemble}
          disabled={!selectedTemplate}
          className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded"
        >
          Assemble Proposal
        </button>
      </section>
    </div>
  );
}
```
