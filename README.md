# Venture Flow (Deepstation)

**Community + Action-Oriented AI for startup investing:** AI that executes workflows, coordinates evidence, and drives decisions.

---

## 1) Community Problem

Community investors and founders depend on fragmented systems:

- discovery in listing platforms,
- diligence in spreadsheets/docs,
- updates in inconsistent founder channels,
- analysis in stateless AI chats.

This creates a real community gap: people can access opportunities, but cannot reliably evaluate execution quality at scale.

---

## 2) Why Existing Tools Fail

| Existing pattern | Structural failure |
|---|---|
| Generic AI chat | Stateless outputs, weak retrieval, no workflow execution. |
| Listing platforms | Good access layer, weak intelligence/orchestration layer. |
| Dashboard/CRM tools | Data visibility without action automation. |
| Manual analyst process | Repeated context setup, inconsistent reasoning, low throughput. |

### Root Causes

- Missing persistent context/memory tied to entities.
- Missing retrieval-first architecture.
- Missing orchestration from AI output to actionable workflow steps.

---

## 3) Core Insight

The key advantage is **workflow intelligence**, not chat UX.

Venture Flow treats AI as an execution runtime that:

- retrieves structured context,
- invokes tools/APIs,
- performs grounded reasoning,
- and returns action-ready outputs.

**Repeated principle:** this is context-first, action-oriented AI.  
System design (retrieval + memory + orchestration) drives quality.

---

## 4) Solution

Venture Flow runs a two-layer intelligence stack:

1. **Primary: platform retrieval layer**
   - startup index, dossiers, execution signals, campaign/listing joins.
2. **Secondary: grounded external layer**
   - Gemini + Google Search grounding for recency and external validation.

Deterministic reasoning order:

- **platform evidence first**
- **grounded web evidence second**

### Action-Oriented Scope

The system performs end-to-end intelligence workflow:

- discovery and comparison,
- evidence/risk synthesis,
- workflow-linked decision outputs,
- standardized **YC-style SAFE** integration in funding flow.

---

## 5) Workflow Execution Model

### Agent Workflow Loop

1. User submits query in AI Research desk.
2. API receives `messages + companyId`.
3. Context orchestrator builds scoped retrieval bundle.
4. Gemini runtime executes grounded reasoning with tool access.
5. Output contract layer returns structured decision blocks.
6. Decision blocks feed downstream action surfaces (including SAFE-linked flow).

This is orchestration-first execution: retrieval -> tools -> reasoning -> decision output -> workflow continuation.

---

## 6) Technical Architecture

```text
Frontend (React + TanStack)
  -> /api/ai-research/chat
      -> Context Orchestrator
          -> Retrieval Builder (index + dossier + signals + campaign joins)
          -> Gemini Runtime (Vertex AI)
              -> Tool Layer (Google Search grounding + platform APIs)
          -> Output Contract (structured markdown + source-aware sections)
  -> Action Surfaces (research desk, comparisons, SAFE workflow)
```

### Architecture Reasoning

- **Server-side context assembly** for secure, deterministic retrieval.
- **Memory through structured entities** (not long chat history).
- **Modular orchestration boundaries** across data, inference, and action layers.
- **Scalable path** via queue-compatible refresh and agent task execution.

---

## 7) Google Technologies Used (and Why)

| Google technology | Why selected | Action-oriented impact |
|---|---|---|
| **Vertex AI Gemini** | Managed inference runtime with production controls. | Core engine for real-time decisions and batch intelligence tasks. |
| **Google Search grounding (Gemini tool)** | Native external evidence retrieval for recency gaps. | Improves groundedness and reduces unsupported claims. |
| **Application Default Credentials (ADC)** | Standard secure backend auth (`gcloud auth application-default login`). | Enables backend tool/API execution without frontend secrets. |
| **`@google/genai` + `google-auth-library` (Node)** | Official SDK stack for Vertex + tool orchestration. | Stable integration for auth, inference, and tool wiring. |
| **`google-genai` (Python tooling)** | Shared model stack for offline pipelines. | Keeps batch structuring aligned with live assistant behavior. |
| **Google ADK-aligned agent workflow design** | Agentic execution model for multi-step tool-driven tasks. | Supports action workflows beyond response-only chat. |

---

## 8) Workflow Intelligence, Retrieval, and Automation

- **Retrieval system:** entity-scoped context bundle per request.
- **Grounded AI:** internal evidence priority + external grounding fallback.
- **Orchestration:** coordinated runtime for retrieval, inference, tools, and output normalization.
- **Automation:** output is action-ready for workflow progression.
- **Context awareness:** decisions are anchored to platform memory, not transient prompts.

This is AI that performs operational tasks, not only summarization.

---

## 9) Community + Action-Oriented Track Fit

### Community Impact

- Reduces information asymmetry for non-institutional investors.
- Improves founder-investor transparency through structured evidence.
- Makes diligence more accessible, consistent, and repeatable.

### Action Orientation

- Goes beyond Q&A/chat.
- Executes retrieval + tool use + grounded reasoning + workflow handoff.
- Connects decision intelligence to standardized SAFE-linked action flow.

### Technical Depth

- Retrieval pipeline, orchestration runtime, grounded inference, modular architecture, and scalable execution path.

---

## 10) What Makes Venture Flow Different

1. **Workflow-first AI architecture**  
   AI is integrated as an execution layer inside product workflows.

2. **Grounded retrieval hierarchy**  
   Platform context is primary; external search is scoped and additive.

3. **Action-linked outputs**  
   Response contracts are optimized for operational decisions and next steps.

4. **Unified memory model**  
   Discovery, dossiers, scoring, and AI reasoning share one context contract.

5. **Google Cloud-native execution**  
   Vertex + ADC + grounded tool use are core system behaviors.

---

## 11) Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TanStack Start/Router, Tailwind CSS, TypeScript |
| API/Orchestration | Node.js, Express, orchestration services |
| AI Runtime | Vertex AI Gemini, Google Search grounding |
| Data Layer | MongoDB + structured datasets in `/data` |
| Pipeline Tooling | Python ingestion and structuring utilities |
| Dev Tooling | Vite, npm, ESLint, Prettier |

---

## 12) Repository Map

| Path | Purpose |
|---|---|
| `apex-invest-hub/` | Product UI and integrated runtime routes |
| `server/` | API, models, orchestration services, AI endpoints |
| `data/` | Startup/campaign/dossier context datasets |
| `tools/wefunder/` | Ingestion and structuring pipeline utilities |
| `robust_problem_statement (2).md` | Expanded product/problem specification |
