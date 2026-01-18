# RFP System Diagrams

## ⚠️ CTO Architecture Mandate

> [!CAUTION]
> These diagrams reflect the mandate: **Build on what exists. DO NOT redesign.**
> - Existing UI components are marked with ✓
> - New additions are marked with 🆕
> - Changes must be additive only

---

## Table of Contents

1. [Executive Diagrams](#executive-diagrams)
   - System Overview (showing what's new vs existing)
   - Execution Order
   - UI Changes Map
2. [Developer Diagrams](#developer-diagrams)
   - Technical Architecture
   - Eligibility Engine Flow
   - Data Model ERD
   - Admin Panel Layout

---

# Executive Diagrams

## 1. System Overview (Existing + New)

This diagram shows the current system (v1) and what gets added (v2).

```mermaid
flowchart LR
    subgraph Sources["📥 Data Sources"]
        RFPM["RFPMart<br/>✓ EXISTING"]
        SAM["SAM.gov<br/>🆕 NEW"]
        EMMA["eMMA<br/>🆕 NEW"]
    end
    
    subgraph Engine["🧠 RFP Engine"]
        INGEST["Ingestion<br/>✓ Existing + Connectors"]
        GATE["Eligibility Gate<br/>🆕 NEW<br/>⚡ RULES-FIRST"]
        SCORE["Scoring<br/>✓ EXISTING"]
    end
    
    subgraph UI["📺 UI Views"]
        HOME["Home View<br/>✓ KEEP AS-IS<br/>+ badges only"]
        DATA["Data View<br/>✓ UNCHANGED"]
        ADMIN["Admin View<br/>✓ KEEP<br/>+ new panels"]
    end
    
    Sources --> INGEST
    INGEST --> GATE
    GATE --> SCORE
    SCORE --> UI
    
    style RFPM fill:#4CAF50,color:#fff
    style SAM fill:#FFF3E0,stroke:#F57C00
    style EMMA fill:#FFF3E0,stroke:#F57C00
    style GATE fill:#FFF3E0,stroke:#F57C00
    style HOME fill:#E8F5E9,stroke:#388E3C
    style DATA fill:#E8F5E9,stroke:#388E3C
    style ADMIN fill:#E8F5E9,stroke:#388E3C
```

**Legend:**
- ✓ = Existing (do not change)
- 🆕 = New (additive enhancement)

---

## 2. Execution Order (MANDATORY)

> [!IMPORTANT]
> Follow this sequence exactly to avoid rework.

```mermaid
flowchart TD
    S1["Step 1<br/>Schema + Dedupe<br/>📦 Backend only"]
    S2["Step 2<br/>Eligibility Gate<br/>⚡ Rules-first"]
    S3["Step 3<br/>Source Connectors<br/>🔌 SAM.gov + eMMA"]
    S4["Step 4<br/>Scoring Weights<br/>⚖️ + Exclusions"]
    S5["Step 5<br/>Pursuit Workflow<br/>📋 Pipeline"]
    
    S1 --> S2 --> S3 --> S4 --> S5
    
    S1 -.- N1["No UI changes"]
    S2 -.- N2["+ Eligibility badge"]
    S3 -.- N3["+ Source badge"]
    S4 -.- N4["+ Admin panels"]
    S5 -.- N5["+ Start Pursuit btn"]
    
    style S1 fill:#E3F2FD,stroke:#1565C0
    style S2 fill:#FFEBEE,stroke:#C62828
    style S3 fill:#E8F5E9,stroke:#2E7D32
    style S4 fill:#FFF3E0,stroke:#F57C00
    style S5 fill:#F3E5F5,stroke:#7B1FA2
```

---

## 3. UI Changes Map (Minimal Additions Only)

```mermaid
flowchart TB
    subgraph KEEP["Existing UI — ✓ DO NOT CHANGE"]
        HOME["Home View<br/>• Filters<br/>• RFP Cards<br/>• CSV Export"]
        DATA["Data View<br/>• Raw records"]
        ADMIN["Admin View<br/>• Auto Refresh<br/>• AI Provider<br/>• AI Toggle<br/>• Prompt Template<br/>• Criteria Settings"]
        THEME["Theme Toggle"]
    end
    
    subgraph ADD["Additive Enhancements — 🆕"]
        B1["+ EligibilityBadge<br/>on RfpCard"]
        B2["+ SourceBadge<br/>on RfpCard"]
        BTN["+ Start Pursuit<br/>button"]
        P1["+ Sources Panel"]
        P2["+ Eligibility Rules Panel"]
        P3["+ Scoring Weights Panel"]
        P4["+ Exclusions Panel"]
    end
    
    HOME -.->|"add to card"| B1
    HOME -.->|"add to card"| B2
    HOME -.->|"add to card"| BTN
    ADMIN -.->|"add below"| P1
    ADMIN -.->|"add below"| P2
    ADMIN -.->|"add below"| P3
    ADMIN -.->|"add below"| P4
    
    style KEEP fill:#E8F5E9,stroke:#2E7D32
    style ADD fill:#FFF3E0,stroke:#F57C00
```

---

## 4. Value Flow

```mermaid
flowchart TD
    A["More Sources<br/>SAM.gov + eMMA"] -->|"5x opportunities"| B["Eligibility Gate<br/>⚡ Rules-first"]
    B -->|"Zero wasted<br/>effort"| C["Weighted Scoring"]
    C -->|"Focus on<br/>winners"| D["Pursuit Tracking"]
    D -->|"Nothing falls<br/>through"| E["Submit Proposals"]
    E -->|"Build track<br/>record"| F["AWS Partner ↑"]
    
    style A fill:#2196F3,color:#fff
    style B fill:#F44336,color:#fff
    style C fill:#4CAF50,color:#fff
    style D fill:#FF9800,color:#fff
    style E fill:#9C27B0,color:#fff
    style F fill:#00BCD4,color:#fff
```

---

# Developer Diagrams

## 5. Technical Architecture (Existing vs New)

```mermaid
flowchart TB
    subgraph External["External Services"]
        SAM["SAM.gov API<br/>🆕 NEW"]
        EMMA["eMMA Portal<br/>🆕 NEW"]
        RFPM["RFPMart<br/>✓ EXISTING"]
    end
    
    subgraph Connectors["Connector Layer 🆕"]
        SAMCON["SamGovConnector"]
        EMMACON["EmmaConnector"]
        RFPMCON["RfpMartConnector<br/>REFACTOR existing"]
    end
    
    subgraph Core["Core Services"]
        NORM["Normalizer 🆕"]
        DEDUP["Deduplicator 🆕"]
        ELIG["Eligibility Gate 🆕<br/>⚡ RULES-FIRST"]
        EVAL["evaluationService<br/>✓ KEEP"]
        FIT["fitAnalysisService<br/>✓ KEEP"]
    end
    
    subgraph AI["AI Providers ✓ KEEP"]
        GEMINI["Gemini"]
        OPENAI["OpenAI"]
        ANTHROPIC["Anthropic"]
    end
    
    subgraph Storage["Data Layer"]
        LOCAL["localStorage<br/>✓ EXISTING"]
    end
    
    subgraph Frontend["React Components"]
        HOME["HomeView ✓<br/>+ badges"]
        ADMIN["AdminView ✓<br/>+ panels"]
        RAW["RawDataView ✓"]
    end
    
    SAM --> SAMCON
    EMMA --> EMMACON
    RFPM --> RFPMCON
    
    SAMCON & EMMACON & RFPMCON --> NORM
    NORM --> DEDUP
    DEDUP --> ELIG
    ELIG --> EVAL
    EVAL --> FIT
    FIT -.- GEMINI & OPENAI & ANTHROPIC
    
    DEDUP --> LOCAL
    ELIG --> LOCAL
    EVAL --> LOCAL
    
    LOCAL --> HOME & ADMIN & RAW
    
    style External fill:#FFEBEE,stroke:#C62828
    style Connectors fill:#FFF3E0,stroke:#FF8F00
    style Core fill:#FFF8E1,stroke:#FF8F00
    style AI fill:#E3F2FD,stroke:#1565C0
    style Storage fill:#E8F5E9,stroke:#2E7D32
    style Frontend fill:#E8F5E9,stroke:#2E7D32
```

---

## 6. Eligibility Engine Flow (Rules-First)

> [!CAUTION]
> **Implementation Rule:** Rules-based extraction first. AI is optional enhancement.

```mermaid
flowchart TD
    START([Normalized<br/>Opportunity]) --> RULES["Apply Rule<br/>Patterns"]
    
    RULES --> USA{"USA Org<br/>detected?"}
    USA -->|"Pattern<br/>matched"| QUAL{"Nebula<br/>qualifies?"}
    USA -->|"Not found"| SEC
    
    QUAL -->|"No"| PARTNER["PARTNER_REQUIRED"]
    QUAL -->|"Yes"| SEC
    
    SEC{"Security<br/>Clearance?"}
    SEC -->|"Required"| REJ1["REJECTED"]
    SEC -->|"No"| SET
    
    SET{"Set-Aside?"}
    SET -->|"Not qualified"| REJ2["REJECTED"]
    SET -->|"OK/None"| DEAD
    
    DEAD{"Deadline<br/>< 5 days?"}
    DEAD -->|"Yes"| REJ3["REJECTED"]
    DEAD -->|"No"| ONSITE
    
    ONSITE{"On-Site<br/>Heavy?"}
    ONSITE -->|"Yes"| REJ4["REJECTED"]
    ONSITE -->|"No"| ELIG["ELIGIBLE"]
    
    PARTNER --> STORE["Store Result<br/>+ reasons + evidence"]
    REJ1 --> STORE
    REJ2 --> STORE
    REJ3 --> STORE
    REJ4 --> STORE
    ELIG --> STORE
    
    STORE --> SCORE["Then Run<br/>Scoring"]
    
    style PARTNER fill:#FF9800,color:#fff
    style REJ1 fill:#F44336,color:#fff
    style REJ2 fill:#F44336,color:#fff
    style REJ3 fill:#F44336,color:#fff
    style REJ4 fill:#F44336,color:#fff
    style ELIG fill:#4CAF50,color:#fff
```

---

## 7. Data Model ERD

```mermaid
erDiagram
    OPPORTUNITY ||--o{ SOURCE_RECORD : "ingested from"
    OPPORTUNITY ||--o| EVALUATION : has
    OPPORTUNITY ||--o| PURSUIT : becomes
    
    OPPORTUNITY {
        string id PK
        string title
        string description
        string buyer_name
        date submissionDeadline
        string dedupeHash
    }
    
    SOURCE_RECORD {
        string id PK
        string opportunityId FK
        enum source
        json rawPayload
        datetime fetchedAt
    }
    
    EVALUATION {
        string id PK
        string opportunityId FK
        enum eligibilityStatus
        string[] eligibilityReasons
        string[] evidenceSnippets
        json dimensionScores
        int totalScore
    }
    
    PURSUIT {
        string id PK
        string opportunityId FK
        enum stage
        string[] owners
        enum outcome
    }
    
    ADMIN_CONFIG {
        json aiConfig
        json eligibilityRules
        json sourcesConfig
        json scoringWeights
    }
```

---

## 8. Admin Panel Layout (Existing + New)

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ Auto Refresh Scheduler                           ✓ EXISTING  │
│   Interval: [24] hours                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🤖 AI Provider Selection                            ✓ EXISTING  │
│   [ Gemini ▼ ]  ✅ AI Analysis ENABLED                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📝 Core Prompt Template                             ✓ EXISTING  │
│   [editable prompt]                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📊 Evaluation Criteria Settings                     ✓ EXISTING  │
│   ☑ Technical Relevance  ☑ Scope Fit  ...                      │
└─────────────────────────────────────────────────────────────────┘

                    ─────────── NEW PANELS BELOW ───────────

┌─────────────────────────────────────────────────────────────────┐
│ 🔌 Sources & Connectors                                    🆕   │
│ ☑ RFPMart    Last: 2h ago ✓   ☑ SAM.gov    Last: 4h ago ✓     │
│ ☐ eMMA       Not configured   ☐ GovTribe   Subscription         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🚫 Eligibility Rules (Hard Gate)                           🆕   │
│ ☑ USA Org Only → PARTNER_REQUIRED                               │
│ ☑ Security Clearance → REJECT                                   │
│ ☑ Deadline < 5 days → REJECT                                    │
│ ☑ Heavy On-Site → REJECT                                        │
│ Out-of-Scope: [construction, hvac, asbestos...]                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ⚖️ Scoring Weights & Thresholds                            🆕   │
│ Tech Relevance [●●●○○]   Scope Fit [●●●●●]                     │
│ "Good Fit" threshold: >= [4] / 6                               │
│ Must-pass: ☑ Scope Fit  ☑ Logistics                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ➖ Negative Keywords / Exclusions                          🆕   │
│ ⚠️ Generic terms to review: [software] [systems] [Website]     │
│ Hard exclusions: [clearance required] [construction] [HVAC]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. RfpCard Component (Minimal Changes)

```
┌─────────────────────────────────────────────────────────────────┐
│ [SAM.gov] 🆕   Website Redesign Services                       │
│              [✓ Eligible] 🆕                                   │
├─────────────────────────────────────────────────────────────────┤
│ Agency: Department of Commerce                                  │
│ Deadline: Feb 15, 2026                                         │
│ Budget: ~$75,000                                               │
├─────────────────────────────────────────────────────────────────┤
│ Score: ●●●●○○ 4/6                                              │
│ Tech ✓  Scope ✓  Category ✓  Client ✓  Logistics ○  Skills ○  │
├─────────────────────────────────────────────────────────────────┤
│ [☐ Select]  [View Details]  [Start Pursuit] 🆕                 │
└─────────────────────────────────────────────────────────────────┘
```

**Changes to RfpCard (additive only):**
- 🆕 Source badge (top left)
- 🆕 Eligibility badge (next to title)
- 🆕 "Start Pursuit" button (bottom, enabled only if Eligible/Partner Required)

---

## 10. AI Response Compatibility

```mermaid
flowchart LR
    subgraph V1["v1 Response ✓ MUST WORK"]
        R1["{<br/>foundKeywords: [...],<br/>isMatch: bool<br/>}"]
    end
    
    subgraph V2["v2 Response (Optional)"]
        R2["{<br/>foundKeywords: [...],<br/>isMatch: bool,<br/>confidence: 0-1,<br/>evidenceSnippets: [...],<br/>detectedConstraints: [...]<br/>}"]
    end
    
    V1 -->|"Always<br/>supported"| PARSER["Response<br/>Parser"]
    V2 -->|"Enhanced<br/>display"| PARSER
    PARSER --> EVAL["Evaluation<br/>Service"]
    
    style V1 fill:#4CAF50,color:#fff
    style V2 fill:#E3F2FD,stroke:#1565C0
```

**Compatibility Rule:**
- If AI returns **only v1** → system works normally
- If AI returns **v2** → store and display evidence/confidence

---

## 11. Pursuit State Machine

```mermaid
stateDiagram-v2
    [*] --> New: Start Pursuit
    
    New --> Triage: Review
    Triage --> BidNoBid: Assess
    BidNoBid --> Capture: Decision = BID
    BidNoBid --> Archived: Decision = NO-BID
    
    Capture --> Draft: Begin Proposal
    Draft --> Review: Complete
    Review --> Submit: Approved
    Review --> Draft: Revisions
    
    Submit --> Outcome: Wait
    Outcome --> Won
    Outcome --> Lost
    
    Won --> [*]
    Lost --> [*]
    Archived --> [*]
```

---

## Export Notes

All diagrams use Mermaid syntax. For presentations:
1. **Executive audience:** Use diagrams 1, 2, 3, 4
2. **Developer audience:** Use diagrams 5, 6, 7, 8, 9, 10
3. **Full overview:** Use all diagrams

Diagrams can be exported via:
- GitHub/GitLab markdown rendering
- Mermaid Live Editor (PNG/SVG)
- Screenshot for presentations
