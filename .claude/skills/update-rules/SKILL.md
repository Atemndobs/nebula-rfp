---
name: update-rules
description: Capture session learnings and update project instruction files (CLAUDE.md, GEMINI.md, .claude/rules.md, .codex/rules.md). Run at the end of each session to continuously improve organizational knowledge and development practices.
allowed-tools: Read, Edit, Grep, Glob
---

# Update Rules Skill

## Purpose

Create a **meta-learning system** that systematically captures insights from each development session and encodes them into project instruction files. This ensures that:

- Technical patterns and conventions are documented as they emerge
- Common pitfalls and solutions are preserved
- Architectural decisions and their rationale are recorded
- Development workflows continuously improve
- Organizational knowledge compounds over time

## When to Use

Invoke `/update-rules` at the end of a development session to:

1. **Capture learnings** from the work completed
2. **Analyze patterns** and decisions made
3. **Update instruction files** with new knowledge
4. **Maintain consistency** across all rules files

## Learning Categories

The skill extracts and categorizes learnings into:

### 1. **Technical Patterns**
- Code patterns that emerged or were refined
- Architecture decisions and trade-offs
- Performance optimizations discovered
- Type safety improvements

### 2. **Workflow Improvements**
- Development process enhancements
- Tool usage patterns
- Testing strategies
- Debugging techniques

### 3. **Domain Knowledge**
- Business logic insights
- Data model understandings
- API integration patterns
- Third-party service learnings

### 4. **Best Practices**
- Conventions established
- Anti-patterns to avoid
- Error handling strategies
- Security considerations

### 5. **Project-Specific Insights**
- Phase-specific learnings
- Feature implementation patterns
- Integration approaches
- Deployment knowledge

## Rules Files Structure

The skill updates these files, each with a specific audience:

| File | Audience | Focus |
|------|----------|-------|
| `CLAUDE.md` | Claude Code (Lead Engineer) | Project context, architecture, leadership responsibilities |
| `GEMINI.md` | Gemini (Design Lead) | Design patterns, frontend implementation, UI/UX guidelines |
| `CODEX.md` | Codex (Senior Engineer) | Backend patterns, execution workflows, implementation guidelines |
| `.claude/rules.md` | Claude Code | Detailed coding conventions, patterns, technical rules |
| `.codex/rules.md` | Codex (Senior Engineer) | Backend implementation patterns, Convex usage, API patterns |

## Execution Flow

When `/update-rules` is invoked:

### Step 1: Session Analysis
```
1. Review conversation history
2. Identify file changes made
3. Extract code patterns implemented
4. Note decisions and rationale
5. Capture challenges overcome
6. Identify reusable patterns
```

### Step 2: Learning Extraction
```
For each learning, document:
- What was built/discovered
- Why this approach was chosen
- Alternatives considered
- When to apply this pattern
- Relevant file locations
```

### Step 3: Categorize Learnings
```
Organize by:
- Technical patterns (code structure, architecture)
- Workflow improvements (process, tooling)
- Domain knowledge (business logic, data models)
- Best practices (conventions, anti-patterns)
- Project-specific (phase work, integrations)
```

### Step 4: Rules File Updates
```
For each rules file:
1. Read current content
2. Identify relevant section for new learning
3. Check for conflicts with existing rules
4. Merge learning into appropriate section
5. Maintain file structure and formatting
6. Preserve existing content
```

## Update Strategy

### Additive Updates (Preferred)
```markdown
## New Pattern: [Pattern Name]

**Context:** [When this applies]

**Implementation:**
\`\`\`typescript
// Code example
\`\`\`

**Rationale:** [Why this approach]

**See also:** [Related file:line]
```

### Enhancement Updates
```markdown
## [Existing Section]

**Enhanced guidance:**
- [New insight that refines existing rule]
- [Additional context or example]

**Updated pattern:**
\`\`\`typescript
// Improved implementation
\`\`\`
```

### Conflict Resolution
```
If new learning conflicts with existing rule:
1. Flag the conflict explicitly
2. Present both approaches with trade-offs
3. Recommend user decision
4. Do NOT silently override existing rules
```

## Output Format

After execution, provide:

### Learning Summary
```markdown
## Session Learnings Captured

**Session focus:** [Brief description]

**Learnings extracted:** [Number] total
- Technical patterns: [Number]
- Workflow improvements: [Number]
- Domain knowledge: [Number]
- Best practices: [Number]
- Project-specific: [Number]

---

## Key Learnings

### 1. [Learning Name]
**Category:** [Technical Pattern / Workflow / Domain / Best Practice / Project-Specific]

**What:** [One sentence description]

**Why it matters:** [Value/impact]

**Applied to:** [Which rules files were updated]

**Location:** [File paths where this pattern exists]

---

### 2. [Next Learning]
[Repeat structure]

---

## Files Updated

| File | Sections Modified | Changes |
|------|-------------------|---------|
| CLAUDE.md | [Section names] | [Summary of changes] |
| GEMINI.md | [Section names] | [Summary of changes] |
| CODEX.md | [Section names] | [Summary of changes] |
| .claude/rules.md | [Section names] | [Summary of changes] |
| .codex/rules.md | [Section names] | [Summary of changes] |

---

## Conflicts Detected

[If any conflicts were found]

**Conflict in [filename]:**
- **Existing rule:** [Summary]
- **New learning:** [Summary]
- **Recommendation:** [Suggested resolution]

---

## Next Actions

1. Review updated rules files for accuracy
2. Resolve any conflicts identified above
3. Consider updating related documentation
```

## Update Guidelines

### DO
- ✅ Extract concrete, actionable patterns
- ✅ Include code examples when relevant
- ✅ Reference specific files and line numbers
- ✅ Maintain existing file structure
- ✅ Preserve all existing content
- ✅ Add new sections when appropriate
- ✅ Link related patterns together
- ✅ Document rationale for decisions
- ✅ Include "when to use" guidance
- ✅ Flag conflicts for user resolution

### DON'T
- ❌ Delete existing rules without explicit approval
- ❌ Override conflicting rules silently
- ❌ Add vague or theoretical guidance
- ❌ Include learnings without context
- ❌ Break existing file formatting
- ❌ Duplicate content across files
- ❌ Add rules that contradict existing ones
- ❌ Include session-specific details that won't generalize

## Section Mapping

### CLAUDE.md Sections
```
- Organizational Structure → Team workflow learnings
- CRITICAL: Before Writing Any Code → Pre-coding checklists
- Critical Patterns → Code patterns, DO/DON'T lists
- Quick Reference → Code snippets and examples
- Mermaid Diagram Rule → Diagram conventions
- User Learning Style → Communication preferences
- Available Skills → New skills registry
```

### GEMINI.md Sections
```
- Your Core Responsibilities → Design process learnings
- Design Standards → UI/UX patterns, component conventions
- Tech Stack → Frontend technology patterns
- Critical Patterns → Frontend code patterns
- Quick Reference → React/Tailwind patterns
- Mermaid Diagram Guidelines → Visualization patterns
- Coding Standards → Design-specific conventions
```

### CODEX.md Sections
```
- Your Role: Senior Engineer → Implementation responsibilities
- CRITICAL: Before Writing Any Code → Backend workflow
- Tech Stack → Backend technology patterns
- Critical Patterns → Execution patterns, Convex usage
- Coding Standards → Backend conventions
- Development Workflows → Build/test/deploy patterns
```

### .claude/rules.md Sections
```
- CRITICAL: Before Writing Any Code → Development workflow
- Tech Stack → Technology usage patterns
- Critical Patterns → Convex patterns, optimization techniques
- Coding Standards → TypeScript, naming conventions
- Development Workflows → Command patterns, environment setup
```

### .codex/rules.md Sections
```
- CRITICAL: Before Writing Any Code → Backend workflow
- Tech Stack → Backend technology patterns
- Critical Patterns → Convex usage, API patterns
- Coding Standards → Backend code conventions
- Quick Reference → Backend snippets
```

## Examples

### Example 1: Technical Pattern

**Learning:** Implemented stats aggregation to avoid bandwidth issues

**Updates:**
- **CLAUDE.md**: Add to "Critical Patterns - DO" section
- **CODEX.md**: Add to "Critical Patterns" with implementation guidance
- **.claude/rules.md**: Add "Stats Aggregation Pattern" with full example
- **.codex/rules.md**: Add to backend patterns with Convex-specific guidance
- **GEMINI.md**: No update (backend pattern)

### Example 2: Workflow Improvement

**Learning:** Use TodoWrite tool to track multi-step tasks

**Updates:**
- **CLAUDE.md**: Add to "Task Management" section
- **CODEX.md**: Add to workflow patterns
- **.claude/rules.md**: Add workflow pattern with when/how guidance
- **.codex/rules.md**: Add task tracking reminder
- **GEMINI.md**: Add task tracking for design work

### Example 3: Design Convention

**Learning:** Always quote Mermaid labels with special characters

**Updates:**
- **CLAUDE.md**: Update "Mermaid Diagram Rule" section
- **GEMINI.md**: Update "Mermaid Diagram Guidelines" with examples
- **CODEX.md**: Add to documentation conventions
- **.claude/rules.md**: Add to documentation conventions
- **.codex/rules.md**: Add to documentation patterns

## Conflict Resolution Process

When conflicting guidance is detected:

```markdown
## ⚠️ CONFLICT DETECTED

**File:** [filename]
**Section:** [section name]

**Existing Rule:**
> [Quote existing rule]

**New Learning:**
> [Describe new learning]

**Analysis:**
[Explain why these conflict]

**Recommendations:**

**Option A: Replace** (if new learning supersedes old)
- Update rule to: [new version]
- Rationale: [why this is better]

**Option B: Merge** (if both have value)
- Combined rule: [merged version]
- Context: [when to use each approach]

**Option C: Keep Separate** (if context-dependent)
- Keep existing: [for these cases]
- Add new: [for these cases]

**User Decision Required:** [What user needs to confirm]
```

## Invocation

User runs `/update-rules` at the end of a session:

```
User: /update-rules
```

The skill then:
1. Analyzes the entire session
2. Extracts 3-8 key learnings
3. Updates all relevant rules files
4. Provides summary report
5. Flags any conflicts for user review

## Notes

- **Focus on patterns over specifics** - Extract reusable knowledge, not session details
- **Maintain file integrity** - Never break existing structure or delete content
- **User is final arbiter** - Flag conflicts, don't resolve them unilaterally
- **Be selective** - Not every session detail is a learning worth encoding
- **Link knowledge** - Cross-reference related patterns across files
- **Include provenance** - Note which files/sessions introduced patterns
- **Keep it actionable** - Every rule should be clear enough to apply immediately
