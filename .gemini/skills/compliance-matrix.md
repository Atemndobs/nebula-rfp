# Skill: Compliance Matrix Generation

## Purpose
Generate compliance matrices to track RFP requirements against proposal responses, ensuring complete coverage of all mandatory elements.

## Compliance Matrix Structure

```typescript
interface ComplianceMatrix {
  rfpId: string;
  rfpTitle: string;
  createdAt: Date;
  updatedAt: Date;
  status: "draft" | "in_review" | "complete";
  sections: ComplianceSection[];
  summary: {
    totalRequirements: number;
    addressed: number;
    pending: number;
    notApplicable: number;
  };
}

interface ComplianceSection {
  id: string;
  name: string;
  requirements: ComplianceRequirement[];
}

interface ComplianceRequirement {
  id: string;
  reference: string;        // RFP section reference (e.g., "Section 3.2.1")
  requirement: string;      // Original requirement text
  type: "mandatory" | "desirable" | "informational";
  category: RequirementCategory;
  responseSection: string;  // Proposal section that addresses this
  responseText: string;     // Draft response or reference
  evidence: string;         // Supporting evidence or document
  owner: string;           // Team member responsible
  status: "pending" | "draft" | "review" | "complete" | "n/a";
  notes: string;
}

type RequirementCategory =
  | "technical"
  | "management"
  | "past_performance"
  | "pricing"
  | "certifications"
  | "staffing"
  | "security"
  | "compliance"
  | "other";
```

## Template Output

```markdown
# Compliance Matrix: [RFP Title]

**RFP ID:** [External ID]
**Agency:** [Client Name]
**Deadline:** [Date]
**Last Updated:** [Date]

## Summary
| Status | Count |
|--------|-------|
| Complete | X |
| Draft | X |
| Pending | X |
| N/A | X |
| **Total** | **X** |

---

## Section 1: Technical Requirements

| Ref | Requirement | Type | Response Section | Status | Owner |
|-----|-------------|------|------------------|--------|-------|
| 3.1.1 | System must support 1000 concurrent users | M | 4.2 Performance | ✅ | John |
| 3.1.2 | Cloud deployment on FedRAMP authorized platform | M | 4.3 Infrastructure | 🔶 | Sarah |
| 3.1.3 | API documentation using OpenAPI 3.0 | D | 4.4 Documentation | ⏳ | - |

**Legend:** M = Mandatory, D = Desirable, I = Informational
**Status:** ✅ Complete, 🔶 Draft, ⏳ Pending, ➖ N/A

---

## Section 2: Management Requirements

| Ref | Requirement | Type | Response Section | Status | Owner |
|-----|-------------|------|------------------|--------|-------|
| 4.1.1 | Provide project management plan | M | 5.1 PM Approach | ✅ | Lead |
| 4.1.2 | Weekly status reports | M | 5.2 Reporting | ✅ | Lead |

---

## Section 3: Past Performance

| Ref | Requirement | Type | Response Section | Status | Owner |
|-----|-------------|------|------------------|--------|-------|
| 5.1.1 | Three relevant project references | M | 6.1 References | 🔶 | BD |

---

## Submission Checklist

- [ ] All mandatory requirements addressed
- [ ] Technical volume complete
- [ ] Management volume complete
- [ ] Past performance volume complete
- [ ] Pricing volume complete
- [ ] All forms signed and included
- [ ] Format requirements met (page limits, fonts, margins)
- [ ] Electronic submission tested
- [ ] Red team review complete
- [ ] Final proofread complete
```

## Extraction Logic

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateMatrix = action({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    const rfp = await ctx.runQuery(internal.rfps.get, { id: args.rfpId });
    if (!rfp) throw new Error("RFP not found");

    // Use AI to extract requirements from RFP text
    const requirements = await extractRequirements(rfp);

    // Group into sections
    const sections = groupRequirements(requirements);

    // Create matrix
    const matrix: ComplianceMatrix = {
      rfpId: args.rfpId,
      rfpTitle: rfp.title,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "draft",
      sections,
      summary: calculateSummary(sections),
    };

    // Save to database
    await ctx.runMutation(internal.pursuits.saveComplianceMatrix, {
      rfpId: args.rfpId,
      matrix: JSON.stringify(matrix),
    });

    return matrix;
  },
});

async function extractRequirements(rfp: RFP): Promise<ComplianceRequirement[]> {
  const prompt = `
Analyze this RFP and extract ALL requirements (mandatory, desirable, informational).

RFP Title: ${rfp.title}
RFP Content: ${rfp.description}

For each requirement, identify:
1. Section reference (if available, otherwise use sequential numbering)
2. The exact requirement text
3. Type: mandatory (must/shall/required), desirable (should/may), or informational
4. Category: technical, management, past_performance, pricing, certifications, staffing, security, compliance, other

Respond with JSON array:
[
  {
    "reference": "3.1.1",
    "requirement": "System must support...",
    "type": "mandatory",
    "category": "technical"
  }
]
`;

  const response = await callAIProvider(prompt);
  const parsed = JSON.parse(response);

  return parsed.map((req: any, index: number) => ({
    id: `req-${index + 1}`,
    reference: req.reference || `${index + 1}`,
    requirement: req.requirement,
    type: req.type,
    category: req.category,
    responseSection: "",
    responseText: "",
    evidence: "",
    owner: "",
    status: "pending",
    notes: "",
  }));
}

function groupRequirements(requirements: ComplianceRequirement[]): ComplianceSection[] {
  const groups = new Map<string, ComplianceRequirement[]>();

  for (const req of requirements) {
    const existing = groups.get(req.category) || [];
    existing.push(req);
    groups.set(req.category, existing);
  }

  const categoryNames: Record<string, string> = {
    technical: "Technical Requirements",
    management: "Management Requirements",
    past_performance: "Past Performance",
    pricing: "Pricing Requirements",
    certifications: "Certifications & Compliance",
    staffing: "Staffing Requirements",
    security: "Security Requirements",
    compliance: "Regulatory Compliance",
    other: "Other Requirements",
  };

  return Array.from(groups.entries()).map(([category, reqs]) => ({
    id: category,
    name: categoryNames[category] || category,
    requirements: reqs,
  }));
}
```

## Update and Track Progress

```typescript
// convex/pursuits.ts
export const updateRequirement = mutation({
  args: {
    rfpId: v.id("rfps"),
    requirementId: v.string(),
    updates: v.object({
      responseSection: v.optional(v.string()),
      responseText: v.optional(v.string()),
      evidence: v.optional(v.string()),
      owner: v.optional(v.string()),
      status: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pursuit = await ctx.db
      .query("pursuits")
      .withIndex("by_rfp", q => q.eq("rfpId", args.rfpId))
      .first();

    if (!pursuit?.complianceMatrix) {
      throw new Error("Compliance matrix not found");
    }

    const matrix = JSON.parse(pursuit.complianceMatrix);

    // Find and update the requirement
    for (const section of matrix.sections) {
      const req = section.requirements.find(r => r.id === args.requirementId);
      if (req) {
        Object.assign(req, args.updates);
        break;
      }
    }

    // Recalculate summary
    matrix.summary = calculateSummary(matrix.sections);
    matrix.updatedAt = new Date();

    await ctx.db.patch(pursuit._id, {
      complianceMatrix: JSON.stringify(matrix),
      updatedAt: Date.now(),
    });

    return matrix;
  },
});

export const getComplianceProgress = query({
  args: { rfpId: v.id("rfps") },
  handler: async (ctx, args) => {
    const pursuit = await ctx.db
      .query("pursuits")
      .withIndex("by_rfp", q => q.eq("rfpId", args.rfpId))
      .first();

    if (!pursuit?.complianceMatrix) return null;

    const matrix = JSON.parse(pursuit.complianceMatrix);
    return {
      summary: matrix.summary,
      byCategory: matrix.sections.map(s => ({
        category: s.name,
        total: s.requirements.length,
        complete: s.requirements.filter(r => r.status === "complete").length,
      })),
    };
  },
});
```

## Export Formats

```typescript
export function exportToMarkdown(matrix: ComplianceMatrix): string {
  // Returns the markdown template shown above
}

export function exportToCsv(matrix: ComplianceMatrix): string {
  const headers = [
    "Section",
    "Reference",
    "Requirement",
    "Type",
    "Response Section",
    "Status",
    "Owner",
    "Notes"
  ];

  const rows = matrix.sections.flatMap(section =>
    section.requirements.map(req => [
      section.name,
      req.reference,
      `"${req.requirement.replace(/"/g, '""')}"`,
      req.type,
      req.responseSection,
      req.status,
      req.owner,
      `"${req.notes.replace(/"/g, '""')}"`
    ])
  );

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

export function exportToJson(matrix: ComplianceMatrix): string {
  return JSON.stringify(matrix, null, 2);
}
```

## UI Component

```tsx
// components/ComplianceMatrixView.tsx
export function ComplianceMatrixView({ rfpId }: { rfpId: string }) {
  const matrix = useQuery(api.pursuits.getComplianceMatrix, { rfpId });
  const updateReq = useMutation(api.pursuits.updateRequirement);

  if (!matrix) return <GenerateMatrixButton rfpId={rfpId} />;

  return (
    <div className="p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Complete" value={matrix.summary.addressed} color="green" />
        <SummaryCard label="In Progress" value={matrix.summary.pending} color="yellow" />
        <SummaryCard label="Pending" value={matrix.summary.totalRequirements - matrix.summary.addressed - matrix.summary.pending} color="gray" />
        <SummaryCard label="Total" value={matrix.summary.totalRequirements} color="blue" />
      </div>

      {/* Requirements Table */}
      {matrix.sections.map(section => (
        <ComplianceSection
          key={section.id}
          section={section}
          onUpdate={(reqId, updates) =>
            updateReq({ rfpId, requirementId: reqId, updates })
          }
        />
      ))}

      {/* Export Buttons */}
      <div className="mt-6 flex gap-2">
        <ExportButton format="markdown" matrix={matrix} />
        <ExportButton format="csv" matrix={matrix} />
        <ExportButton format="json" matrix={matrix} />
      </div>
    </div>
  );
}
```
