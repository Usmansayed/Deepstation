#!/usr/bin/env python3
"""
Collect 100+ unique Wefunder campaigns by merging several Apify runs.

The jupri/wefunder actor often returns ~90–95 rows for a single default query;
combining the unfiltered run with multiple `category` slices yields more unique ids.

Env:
  WEFUNDER_LIMIT       — per-run limit (default 250)
  WEFUNDER_RAW_OUT     — output JSON path (default data/wefunder/raw/campaigns.json)

Optional:
  WEFUNDER_BULK_CATEGORIES — comma-separated extra categories (merged with built-in list)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from fetch_raw import DEFAULT_OUT, apify_token, load_dotenv_layers, run_actor_and_collect

REPO_ROOT = Path(__file__).resolve().parents[2]

BUILTIN_CATEGORIES = [
    "technology",
    "health",
    "food",
    "climate",
    "finance",
    "education",
    "biotech",
    "media",
    "real-estate",
    "consumer",
    "saas",
    "ai",
    "hardware",
    "travel",
    "energy",
]


def main() -> int:
    load_dotenv_layers()
    token = apify_token()
    if not token:
        print("Set APIFY_KEY, APIFY_TOKEN, or apify_key", file=sys.stderr)
        return 1

    limit = int(os.environ.get("WEFUNDER_LIMIT", "250"))
    out = Path(os.environ.get("WEFUNDER_RAW_OUT", str(DEFAULT_OUT)))
    out.parent.mkdir(parents=True, exist_ok=True)

    extra_cats = [
        c.strip()
        for c in (os.environ.get("WEFUNDER_BULK_CATEGORIES") or "").split(",")
        if c.strip()
    ]
    categories = BUILTIN_CATEGORIES + [c for c in extra_cats if c not in BUILTIN_CATEGORIES]

    by_id: dict[int | str, dict] = {}
    runs: list[dict] = []

    # 1) Default listing (no category)
    print("Run: default (no category) …")
    items, rid = run_actor_and_collect(token, limit, {})
    runs.append({"slice": "default", "runId": rid, "count": len(items)})
    for row in items:
        key = row.get("id") or row.get("objectID")
        if key is not None:
            by_id[key] = row
    print(f"  -> {len(items)} rows, unique so far: {len(by_id)}")

    # 2) Per-category slices
    for cat in categories:
        print(f"Run: category={cat!r} …")
        try:
            items, rid = run_actor_and_collect(token, limit, {"category": cat})
        except Exception as e:  # noqa: BLE001
            print(f"  skip ({e})", file=sys.stderr)
            continue
        before = len(by_id)
        for row in items:
            key = row.get("id") or row.get("objectID")
            if key is not None:
                by_id[key] = row
        runs.append({"slice": f"category:{cat}", "runId": rid, "count": len(items), "new_unique": len(by_id) - before})
        print(f"  -> {len(items)} rows, unique so far: {len(by_id)}")
        if len(by_id) >= 105:
            print("Stopped early: reached 100+ unique campaigns.")
            break

    merged = list(by_id.values())
    meta = {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "actor": "jupri/wefunder",
        "mode": "fetch_raw_bulk",
        "uniqueCount": len(merged),
        "limitPerRun": limit,
        "runs": runs,
    }

    out.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    meta_out = out.with_name(f"{out.stem}.meta.json")
    meta_out.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(merged)} unique campaigns -> {out}")
    print(f"Wrote {meta_out}")
    if len(merged) < 100:
        print("Warning: still fewer than 100 unique rows. Add WEFUNDER_BULK_CATEGORIES or check Apify plan.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
