# Wefunder → Mongo agent flow (GCP Gemini, not Cursor)

This is a **simple three-step pipeline**. The **Cursor coding agent** should only maintain scripts; **you** (or Cloud Build / Workflows) run the steps with **your** Apify + GCP credentials.

## Roles

| Step | Who runs it | What it does |
| --- | --- | --- |
| 1. Raw scrape | You / CI | `fetch_raw.py` — Apify `jupri/wefunder`, **no rewriting**, saves full rows + media URLs to `data/wefunder/raw/campaigns.json` (target **100+** rows via `WEFUNDER_LIMIT`). |
| 2. Structure | **Vertex AI Gemini** (Google Search grounding) | `vertex_batch_structure.py` — reads raw file, sends chunks to Gemini on **your GCP project**, model fills missing facts via **web search**, writes `data/wefunder/structured/merged.json`. |
| 3. DB sync | You / CI | `sync_to_mongo.py` — validates public schema, adds Mongo-only fields (badges, heartbeat…), **upserts** `startups` collection. |

## One-time setup

```bash
# Apify token in server/.env (already used elsewhere)
# APIFY_KEY=...   or apify_key=...

# Google ADC (human login) or service account JSON for automation
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable aiplatform.googleapis.com

# Same env as `vertex_google_search_demo.py` (repo root). Optional: copy `.env.example` → `.env`
# export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID   # optional if gcloud default project is set
# export GOOGLE_CLOUD_LOCATION=global           # required for gemini-3-flash-preview
# export VERTEX_GEMINI_MODEL=gemini-3-flash-preview
```

Install Python deps once:

```bash
cd tools/wefunder
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Run (100+ startups)

```bash
# 1) Raw — default limit 150 (override with WEFUNDER_LIMIT=200)
set WEFUNDER_LIMIT=150
python fetch_raw.py

# 2) Gemini on Vertex — chunks raw file; can take several minutes
python vertex_batch_structure.py --raw ../../data/wefunder/raw/campaigns.json

# 3) Validate JSON against the same rules as the app (optional but recommended)
#    Copy merged.json to data/startups.json OR add a validate path — see tools/wefunder/README.md

# 4) Push to Mongo
python sync_to_mongo.py --input ../../data/wefunder/structured/merged.json
```

## If something fails

- **Chunk errors**: see `data/wefunder/structured/errors/chunk_*.txt` (model output + exception).
- **Validation**: fix `merged.json` or adjust `prompts/SYSTEM_STRUCTURE.md` and re-run **only** step 2 for failed chunks (you can add `--max-chunks 1` while debugging).

## What “agent” means here

- **Not** the Cursor chat agent browsing the web.
- **Yes** a **fixed playbook** (this file) + **Vertex Gemini** with **Google Search** executing `vertex_batch_structure.py`.

If you later move step 2 to **Cloud Run** or **Vertex AI Pipelines**, keep the same inputs/outputs so `sync_to_mongo.py` stays unchanged.
