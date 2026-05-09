# Wefunder → structured startups → Mongo

See **[AGENT_FLOW.md](./AGENT_FLOW.md)** for the full runbook (raw scrape → **GCP Gemini** → DB sync).

## Apify: first-time `jupri/wefunder`

The actor may return **403** until you approve **full account access** for it in the Apify console. The API error includes an `approvalUrl`; `fetch_raw.py` prints it when that happens.

**Dataset size:** In practice this actor appears to return about **95 unique** live listings (raising `limit` or merging many `search` / `category` runs still dedupes to the same id set). Plan structuring/sync for ~95 rows, or add another scraper if you truly need 100+ distinct Wefunder companies.

## Scripts

| Script | Purpose |
| --- | --- |
| `fetch_raw.py` | Apify `jupri/wefunder` → `data/wefunder/raw/campaigns.json` (raw JSON, media preserved). |
| `fetch_raw_bulk.py` | Same actor, merges **default + category** runs until **100+** unique campaigns (actor often caps ~95 per single run). |
| `vertex_batch_structure.py` | Vertex Gemini + Google Search → `data/wefunder/structured/merged.json`. |
| `sync_to_mongo.py` | Validates structured JSON, upserts MongoDB `startups` (mirrors `server/scripts/seed.js` extras). |

## Quick commands

```bash
cd tools/wefunder
pip install -r requirements.txt

# Apify token: server/.env → APIFY_KEY | APIFY_TOKEN | apify_key
set WEFUNDER_LIMIT=150
python fetch_raw.py

REM Gemini 3 Flash preview uses the global Vertex endpoint:
REM set GOOGLE_CLOUD_PROJECT=your-project
set GOOGLE_CLOUD_LOCATION=global
set VERTEX_GEMINI_MODEL=gemini-3-flash-preview
python vertex_batch_structure.py

python sync_to_mongo.py --input ../../data/wefunder/structured/merged.json --dry-run
python sync_to_mongo.py --input ../../data/wefunder/structured/merged.json
```

To also refresh bundled JSON for the Vite worker / `validate-data`, copy merged output over the canonical file **after** validation:

```bash
copy ..\..\data\wefunder\structured\merged.json ..\..\data\startups.json
cd ..\..\apex-invest-hub
npm run validate-data
```

## Prompts

Edit `prompts/SYSTEM_STRUCTURE.md` to tighten how Gemini uses search and how conservative estimates should be.
