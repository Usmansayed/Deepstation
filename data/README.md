# Data layer

All mock content the platform renders ships from this folder. The frontend, the
Vite worker store, and the Mongo seed scripts read these files instead of
keeping their own copies.

## Layout

| Path | Used by |
| --- | --- |
| `startups.json` | `apex-invest-hub/src/lib/mock-data.ts`, `apex-invest-hub/src/backend/store.ts`, `server/scripts/seed.js` |
| `startup_profiles/_default.json` | `/startup/$slug` rich tabs (journey, KPIs, Q&A, etc.) |
| `ai_research/companies.json` | `/ai-research` cards, activity feed, reasoning timeline |
| `ai_research/dossiers/{id}.json` | `/ai-research/$companyId` memo + intel layers |
| `ai_research/dossier_default.json` | Fallback dossier when a company has no per-id file |
| `platform/messages.json` | `/messages` thread list and message history |
| `platform/cash_transactions.json` | `/cash` ledger |
| `platform/top_investors.json` | `/top-investors` leaderboard |
| `platform/demo_user.json` | `/profile` defaults (name, location, bio, focus, avatar) |
| `ui/discover_categories.json` | `/discover` filters (category icons, stages, regions, etc.) |

## Validation

Schemas live in
[`apex-invest-hub/src/lib/data-schemas.ts`](../apex-invest-hub/src/lib/data-schemas.ts)
and are duplicated as plain JS in
[`apex-invest-hub/scripts/validate-data.mjs`](../apex-invest-hub/scripts/validate-data.mjs).

```bash
cd apex-invest-hub
npm run validate-data
```

Add a new fixture by adding the JSON file, exporting a Zod schema from
`data-schemas.ts`, and adding the matching JS schema + `checks` entry in
`validate-data.mjs`.

## Wefunder → startups (raw scrape + GCP Gemini + Python Mongo sync)

Do **not** use the old Node “fetch and rewrite `startups.json`” path — it was
removed. Use the Python toolkit instead:

- **Raw scrape (Apify, no reshaping):** `tools/wefunder/fetch_raw.py` →
  `data/wefunder/raw/campaigns.json` (default **150** rows; set `WEFUNDER_LIMIT`
  for 100+).
- **Structure + web search:** **`tools/wefunder/vertex_batch_structure.py`**
  on **your GCP project** (Vertex Gemini + Google Search grounding). Prompts
  live in `tools/wefunder/prompts/`. Output: `data/wefunder/structured/merged.json`.
- **Database sync:** **`tools/wefunder/sync_to_mongo.py`** — validates the
  public startup shape and upserts Mongo `startups` (adds badges/heartbeat
  like `server/scripts/seed.js`).

Full runbook: [`tools/wefunder/AGENT_FLOW.md`](../tools/wefunder/AGENT_FLOW.md).

## Mongo alignment

`server/scripts/seed.js` reads `startups.json` directly and inserts into the
`Startup` collection. Optional collections seeded from this layer:

| Collection | Source |
| --- | --- |
| `StartupProfile` | `startup_profiles/_default.json` (one shared profile per slug) |
| `AiResearchCompany` | `ai_research/companies.json` |
| `AiResearchDossier` | `ai_research/dossiers/*.json` |
| `MessageThread` | `platform/messages.json` |
| `CashTransaction` | `platform/cash_transactions.json` |
| `TopInvestor` | `platform/top_investors.json` |

API-derived fields on startups (`evs`, `ghostStatus`, `engagement`) are still
computed at read time by `server/src/services/startupMapper.js` — do not store
them in JSON.
