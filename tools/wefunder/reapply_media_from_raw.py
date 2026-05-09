#!/usr/bin/env python3
"""Refresh logo/heroImage/slug on data/startups.json from raw campaigns (no Gemini)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

from wefunder_media import enrich_record_from_raw, normalize_slug


def main() -> int:
    raw_path = REPO_ROOT / "data" / "wefunder" / "raw" / "campaigns.json"
    startups_path = REPO_ROOT / "data" / "startups.json"
    if not raw_path.is_file():
        print(f"Missing {raw_path}", file=sys.stderr)
        return 1
    if not startups_path.is_file():
        print(f"Missing {startups_path}", file=sys.stderr)
        return 1

    raw_items = json.loads(raw_path.read_text(encoding="utf-8"))
    by_id: dict[str, dict] = {}
    by_slug: dict[str, dict] = {}
    for r in raw_items:
        if not isinstance(r, dict):
            continue
        rid = r.get("id") or r.get("objectID")
        if rid is not None:
            by_id[str(rid)] = r
        sk = normalize_slug(r, "").strip().lower()
        if sk:
            by_slug[sk] = r

    startups = json.loads(startups_path.read_text(encoding="utf-8"))
    updated = 0
    for s in startups:
        if not isinstance(s, dict):
            continue
        raw_row = by_id.get(str(s.get("id", ""))) or by_slug.get(str(s.get("slug", "")).strip().lower())
        if not raw_row:
            continue
        merged = enrich_record_from_raw(s, raw_row)
        s.clear()
        s.update(merged)
        updated += 1

    startups_path.write_text(json.dumps(startups, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Re-applied media from raw for {updated} records -> {startups_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
