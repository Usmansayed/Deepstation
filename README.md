# Venture Flow (Deepstation)

**Core thesis:** investment AI should reason over **structured platform context** first, then use web grounding second.

---

## 1) Problem

Early-stage investing is still a fragmented workflow:

- discovery in listing portals,
- diligence in docs/spreadsheets,
- monitoring in ad-hoc founder updates,
- AI analysis in stateless chat tools.

This fragmentation creates predictable failure modes:

- **Context loss:** each tool sees only a slice of the decision surface.
- **Manual orchestration:** analysts keep reassembling context for every query.
- **Weak comparability:** startup narratives are easy to compare; execution evidence is not.
- **Stateless AI:** responses are often web-first and detached from internal platform memory.

---

## 2) Why Existing Solutions Fail

| Existing approach | Structural limitation |
|---|---|
| Startup listing platforms | Good for discovery, weak for longitudinal intelligence and cross-company reasoning. |
| Generic AI chat tools | No native memory of platform entities, signals, or investor workflow context. |
| Dashboard/CRM point tools | Data visibility exists, but no unified reasoning and orchestration layer. |
| Static diligence docs | Hard to keep fresh, expensive to maintain, poor for real-time decisioning. |

---

## 3) Our Unique Insight

The product advantage is **context orchestration**, not a better chat UI.

If each query is resolved through a retrieval pipeline that compiles:

- company index,
- dossier fields,
- execution signals,
- and campaign/listing joins,

then AI becomes workflow-native instead of prompt-native.

**Repeated principle:** this system is **context-first AI**.  
Model quality comes from orchestration + memory design, not only model size.

---

## 4) Solution

Venture Flow implements a **two-layer reasoning stack**:

1. **Primary layer: platform context retrieval**
   - Server builds a context bundle from index + dossier + structured metrics.
2. **Secondary layer: live web grounding**
   - Gemini uses Google Search grounding only for recency/external validation.

This enforces a deterministic priority:

- **Desk evidence first**
- **Web evidence second**

### Investment Workflow Standardization

- The platform includes a **standard YC-style SAFE agreement flow** as part of the funding workflow.
- SAFE is a first-class module in the Venture Flow system, alongside discovery, research, and execution scoring.
- The AI/research layer and SAFE workflow are connected so diligence context directly informs funding decisions.

### Workflow Intelligence Loop

1. User asks a question in AI Research desk.
2. API receives `messages + companyId`.
3. Context builder retrieves and composes relevant platform state.
4. Gemini generates structured output with source-aware reasoning.
5. UI renders concise sections for human scanning.

This is an **agentic orchestration flow**: retrieval, reasoning, formatting, and source separation happen in one runtime path.

---

## 5) Technical Architecture

```text
Frontend (React + TanStack)
  -> /api/ai-research/chat
      -> Context Builder (index, dossier, signals, campaign joins)
      -> Gemini Orchestrator (Vertex AI + Google Search grounding)
      -> Response normalizer (structured markdown contract)
  -> Research assistant UI
```

### Architecture Decisions

- **Server-side context assembly**
  - Keeps credentials out of browser.
  - Ensures consistent retrieval pipeline per request.
- **Memory through data, not chat length**
  - Durable memory lives in structured entities (index/dossiers), not long token history.
- **Separation of concerns**
  - ingestion, API orchestration, inference, and presentation are independently evolvable.
- **Scalable path**
  - Context assembly and dossier refresh can move to async workers/queues without API contract changes.

---

## 6) Google Technologies Used (and Why)

| Google technology | Why this choice | System impact |
|---|---|---|
| **Vertex AI Gemini** | Managed inference with production auth/governance patterns. | Reliable core reasoning service for real-time assistant + batch structuring. |
| **Google Search grounding (Gemini tool)** | Native way to attach fresh external evidence. | Improves recency and reduces unsupported claims when internal context is incomplete. |
| **Application Default Credentials (ADC)** | Standard server auth (`gcloud auth application-default login`). | Removes need for frontend keys; safer and cloud-aligned auth flow. |
| **`@google/genai` + `google-auth-library` (Node)** | Official Node path for Vertex + tools orchestration. | Consistent invocation, tool wiring, and auth behavior in API runtime. |
| **`google-genai` (Python tooling)** | Same model family across offline data pipelines. | Aligns batch structuring behavior with real-time assistant behavior. |

---

## 7) Workflow Intelligence and Automation

- **Context-aware retrieval pipeline**
  - Every response is backed by a compiled context block, not raw user text alone.
- **Source-aware reasoning**
  - System instructions enforce distinction between desk data and web-grounded data.
- **Output contract for decision speed**
  - Structured markdown sections + nested bullets for fast investor scanning.
- **Intelligent automation**
  - The assistant auto-selects when to use grounding tools versus internal context.

This is not a generic Q&A bot; it is a **research workflow engine**.

---

## 8) What Makes This Fundamentally Different

1. **Context-first architecture**
   - Most tools are model-first; Venture Flow is orchestration-first.
2. **Unified memory model**
   - Discovery, dossier analysis, and AI responses share one data contract.
3. **Grounding hierarchy**
   - Internal evidence is primary; web grounding is additive and explicit.
4. **Production-grade Google integration**
   - Vertex + ADC + grounding are core architecture decisions, not demo decoration.
5. **Scalable engineering path**
   - Clear module boundaries support queue-based refresh, auditability, and higher throughput.

---

## 9) Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TanStack Start/Router, Tailwind CSS, TypeScript |
| API | Node.js, Express, MongoDB |
| AI | Vertex AI Gemini, Google Search grounding |
| Data | Shared JSON fixtures (`/data`), schema validation, seed pipeline |
| Tooling | Vite, npm, ESLint, Prettier |

---

## 10) Repository Map

| Path | Purpose |
|---|---|
| `apex-invest-hub/` | Main product UI and integrated backend runtime |
| `server/` | Express API, models, AI orchestration services |
| `data/` | Shared startup/campaign/dossier datasets |
| `tools/wefunder/` | Ingestion and structuring utilities |
| `robust_problem_statement (2).md` | Expanded product/problem specification |

---

## 11) System Scope Summary

Venture Flow is a complete context-first investment intelligence system that includes:

- startup discovery and structured profile intelligence,
- EVS-style execution scoring and dossier analysis,
- context-aware AI research orchestration on Vertex Gemini,
- Google Search grounded evidence layering,
- and standardized YC-style SAFE workflow integration.
