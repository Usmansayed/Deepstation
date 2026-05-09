# FounderProof

**Evidence-driven startup discovery and research — where AI is grounded in your platform’s data, not just the open web.**

---

## Project overview

FounderProof is a credibility and intelligence layer for early-stage investing. Startups surface structured execution signals; investors get fast, context-aware research instead of deck archaeology. This repository is our **hackathon build**: a working vertical slice of profiles, scoring, discovery, and an **AI research desk** that reasons over **merged Reg CF / listing data** before it reaches for public search.

We treat fundraising artifacts (e.g. **YC-style SAFE** templates) as a **standardized, repeatable instrument** in the product story — reducing legal friction in the demo narrative without claiming to replace counsel.

---

## The problem

Early-stage investing still runs on **fragmented tools**: crowdfunding portals for access, spreadsheets for notes, generic LLM tabs for “research,” and email for whatever updates founders choose to send.

**What breaks in practice:**

- **No single source of truth** — issuer data, campaign facts, and investor notes live in different places.
- **Stateless AI** — chatbots answer from the public web; they don’t **prioritize** what your platform already knows (dossiers, scores, scraped campaign fields).
- **Manual orchestration** — analysts re-type context into prompts; nothing **remembers** the desk’s structure.
- **Trust asymmetry** — polished narratives travel faster than **verifiable execution** signals.

---

## Why existing solutions fall short

| Typical approach | Limitation |
|----------------|------------|
| Portal-only workflows | Great for listing; weak for **cross-startup intelligence** and research memory. |
| Generic AI assistants | **Hallucination-prone** when not tied to structured platform context. |
| Enterprise research bots | Often **external-data-only**; no first-class integration with **your** listings and scores. |
| Point tools (CRM, metrics) | Don’t compose into a **single research surface** for investors. |

---

## Our solution

**One desk, two layers of grounding:**

1. **Platform layer** — startups, EVS-style execution signals, dossiers, and **joined campaign / listing exports** (e.g. Wefunder-aligned facts) injected into the model as **first-class context**.
2. **Live layer** — **Google Search–grounded Gemini** on **Vertex AI** when freshness or external validation matters.

The AI assistant is **not** a standalone chat product. It is a **research surface** on top of structured data: answers are instructed to **lead with desk facts**, separate **“from the desk”** vs **“from the web”**, and use **narrow-panel-friendly markdown** (sections, nested bullets) so results stay scannable.

---

## Product in one workflow

**Founder loop**
- Create a structured profile (narrative + traction context), connect verification-ready data sources, publish updates.
- Build a trust trajectory over time through consistency, not one-time fundraising storytelling.

**Investor loop**
- Discover startups by conviction, sector, and timing windows.
- Open a dossier, ask follow-ups in the AI desk, and get platform-first answers with web-backed augmentation when needed.

**Research loop**
- Catalog + campaign exports are normalized into a shared data layer.
- The assistant receives compiled context per query, so each response starts from desk memory instead of cold-start prompting.

---

## Key features (hackathon slice)

- **Startup profiles** — standardized narrative + traction framing for discovery.
- **Execution Velocity Score (EVS)** — multi-signal score with transparent breakdown (demo-grade engine over fixture data).
- **Ghost / heartbeat signals** — credibility decay concept surfaced in UX (execution vs. silence).
- **Investor discovery** — filterable catalog, watchlist, and “desk” stats.
- **AI Research desk** — company dossiers, intel layers, charts, and a **floating grounded assistant** (Vertex Gemini + optional Google Search tool).
- **Data pipeline hooks** — raw campaign scrape → **GCP Gemini (Vertex)** batch structuring in Python; Mongo/API seed path for a **single data directory** consumed by the app.

---

## System architecture (abstract)

```
┌─────────────────────────────────────────────────────────────────┐
│  Client (TanStack Start / React)                                 │
│  Discovery · Profiles · AI Research · Portfolio · Cash (fixtures)  │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP /api/*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  API plane                                                       │
│  • Node (Express + MongoDB) — CRUD, AI research chat, fixtures    │
│  • TanStack server / Worker — same routes when not proxied         │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│ Data directory   │ │ MongoDB (seed)  │ │ Vertex AI (Gemini)      │
│ startups,        │ │ optional        │ │ ADC auth, grounding,    │
│ campaigns,       │ │ production path │ │ @google/genai (Node)    │
│ ai_research/*    │ │                 │ │ google-genai (Python)   │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
```

**Design intent:** the **frontend never holds GCP credentials**. Queries go **server → Vertex**; context is **assembled server-side** from the index + dossiers so the model stays **anchored to platform truth**.

**Runtime behavior (high level):**
1. User asks a question in the floating assistant.
2. Frontend sends `messages + optional companyId` to `/api/ai-research/chat`.
3. API compiles context from index + dossier (+ joined campaign fields where available).
4. Vertex Gemini answers with Google Search grounding enabled when useful.
5. UI renders structured markdown optimized for narrow panels.

---

## Google technologies used (meaningful integration)

| Technology | Role |
|------------|------|
| **Vertex AI · Gemini** | Primary LLM for research chat and for **offline batch structuring** of raw campaign JSON (Python), same auth pattern as `gcloud auth application-default login`. |
| **Google Search grounding** | Optional tool on Gemini so answers can cite **recency** and external facts **after** desk context — not instead of it. |
| **Application Default Credentials** | Production-style GCP auth on the API server (`google-auth-library` + `@google/genai`); avoids “API key only” demos when judges expect cloud-native integration. |
| **Generative AI SDKs** | **`@google/genai` (Node)** in the API path; **`google-genai` (Python)** in tooling — aligned with official **Vertex** samples (e.g. grounding with Google Search). |

*We are not ticking a box: grounding and Vertex are what make “research” **credible** in a hackathon narrative — tied to **your** data and **verifiable** web augmentation.*

---

## Tech stack

| Layer | Choices |
|-------|---------|
| **Frontend** | React 19, **TanStack Router / Start**, Vite, Tailwind CSS, shadcn-style UI primitives |
| **API** | Express (MongoDB), shared JSON fixtures under `/data`, optional Worker entry for TanStack deploys |
| **AI / GCP** | **Vertex AI Gemini**, `@google/genai`, `google-auth-library`, Python `google-genai` for batch jobs |
| **Data** | Zod-validated fixtures; Wefunder-oriented raw + structured paths; seed scripts |
| **Tooling** | ESLint, Prettier, TypeScript |

---

## What makes this unique

1. **Context-first AI** — system prompts and API payloads **force** platform + scrape context ahead of generic knowledge; web search is **labeled**, not silent.
2. **Desk + dossier model** — research isn’t a blank thread; it’s **layered intel** (memo, metrics, evidence blocks) the model must respect.
3. **Same GCP story as serious ML teams** — Vertex + ADC + grounding, not only a browser API key — reads as **deployable**, not toy.
4. **Honest scope** — we show **orchestration** (data → API → grounded UI) rather than claiming full exchange infrastructure; **SAFE framing** follows familiar **Y Combinator** documentation patterns for **standardization**, not legal advice.
5. **Workflow intelligence** — EVS, ghost signals, and structured profiles point to a system that **remembers execution** instead of resetting every chat.

---

## Technical depth (judge-facing)

- **Stateful research without storing model state**
  - We persist product state in structured data (index, dossiers, metrics), then inject the right slice per request.
  - This avoids fragile long-chat dependence and keeps reasoning auditable.

- **Grounding hierarchy**
  - Priority 1: platform context (our listings and computed signals).
  - Priority 2: Google Search grounding for recency and external validation.
  - Result: lower hallucination risk than web-only prompting.

- **Auth model aligned with production cloud workflows**
  - Vertex path uses ADC (`gcloud auth application-default login`) on server runtimes.
  - API key fallback exists for constrained environments, but cloud-native auth is the primary story.

- **Data-contract discipline**
  - Shared `/data` fixtures + schema validation reduce drift between UI, API, and AI context builders.
  - Same entities power discovery cards, dossier pages, and assistant responses.

---

## Challenges we hit (and how we addressed them)

- **Stateless chat vs. structured truth** — Fixed by **injecting** a compiled **platform context block** (index + optional dossier) on every `/api/ai-research/chat` call and strict **output-format** rules (headings, nested bullets; no pipe-heavy one-liners).
- **“AI says invest” risk** — Analysis-first copy, confidence-aware framing in product docs; disclaimers in UX where appropriate.
- **Auth realism for judges** — Dual path: **Vertex + ADC** for local/server demo; optional **API key** fallback for constrained hosts — documented in server env examples.
- **Narrow assistant UI** — Markdown styling tuned for **~⅓ width** panels; outside-click dismiss and clear section hierarchy.

---

## Future vision

- **Deeper verification** — OAuth-read integrations (payments, analytics, repo activity) feeding EVS automatically.
- **Portfolio memory** — investor-specific thesis objects and **persistent** research threads tied to positions.
- **Operational scale** — queue-based dossier refresh, audit logs on AI citations, regional compliance modules (building on the **India-first** framing in our product spec).

---

## Quick start (hackathon demo)

1. **Install**
   - `cd apex-invest-hub && npm install`
   - `cd ../server && npm install`

2. **Authenticate Vertex (recommended path)**
   - `gcloud auth application-default login`
   - `gcloud config set project YOUR_PROJECT_ID`
   - `gcloud services enable aiplatform.googleapis.com`

3. **Run API**
   - `cd server`
   - Configure `MONGODB_URI` in `server/.env` (already gitignored)
   - `npm run dev`

4. **Run frontend**
   - `cd apex-invest-hub`
   - `npm run dev`

5. **Demo flow**
   - Open `/ai-research`
   - Launch assistant
   - Ask comparison/risk queries and inspect desk-first structured answers

---

## Repository map (quick)

| Path | Purpose |
|------|---------|
| `apex-invest-hub/` | Main web app (TanStack Start) |
| `server/` | Express API, Mongo models, **Vertex-backed research chat** |
| `data/` | Shared fixtures, AI research JSON, Wefunder raw paths |
| `tools/wefunder/` | Scrape + **Vertex Gemini** structuring pipeline (Python) |
| `robust_problem_statement (2).md` | Full FounderProof product / problem deep-dive |

---

<p align="center"><strong>Built for Google hackathon judging — grounded AI, real architecture, honest scope.</strong></p>
