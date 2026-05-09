#!/usr/bin/env python3
"""
Push *already structured* startup records into MongoDB `startups` collection.

Input must match the public startup JSON shape used by the frontend / seed
(`apex-invest-hub` Zod StartupSchema): id, slug, name, tagline, description,
logo (emoji OR https URL), sector, stage, location, founded, raising,
valuation, raised, credibility, momentum, followers, founders, updates,
traction, highlights.

This script does NOT call Apify or Gemini — run `vertex_batch_structure.py`
(or your own agent) first to produce JSON, then:

  python sync_to_mongo.py --input ../../data/startups.json

Attaches full raw rows from `campaigns.json` as `wefunderCampaign` when --raw is set.

Mongo-only fields (verificationBadges, lastHeartbeatAt, …) are added here
to mirror `server/scripts/seed.js` `buildStartupSeed`.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parents[2]
STAGES = frozenset({"Pre-seed", "Seed", "Series A", "Series B"})
UPDATE_TYPES = frozenset({"milestone", "product", "traction", "team", "fundraise"})
BADGE_SOURCES = frozenset(
    {"stripe", "github", "google-analytics", "mixpanel", "posthog", "razorpay", "linkedin"}
)

DEFAULT_RAW_CAMPAIGNS = REPO_ROOT / "data" / "wefunder" / "raw" / "campaigns.json"


def index_raw_campaigns(raw_items: list) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    from wefunder_media import normalize_slug

    by_id: dict[str, dict[str, Any]] = {}
    by_slug: dict[str, dict[str, Any]] = {}
    for r in raw_items:
        if not isinstance(r, dict):
            continue
        rid = r.get("id") or r.get("objectID")
        if rid is not None:
            by_id[str(rid)] = r
        sk = normalize_slug(r, "").strip().lower()
        if sk:
            by_slug[sk] = r
    return by_id, by_slug


def load_dotenv_layers() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    root_env = REPO_ROOT / ".env"
    server_env = REPO_ROOT / "server" / ".env"
    if root_env.is_file():
        load_dotenv(root_env, override=False)
    if server_env.is_file():
        load_dotenv(server_env, override=True)


def db_name_from_uri(uri: str) -> str:
    p = urlparse(uri.replace("mongodb+srv://", "mongodb://", 1))
    name = (p.path or "").lstrip("/").split("?")[0]
    return name or "deepstation"


def iso_days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def infer_badges(score: int) -> list[dict[str, Any]]:
    return [
        {"label": "Revenue Verified", "source": "stripe", "verified": score > 55},
        {"label": "Users Verified", "source": "google-analytics", "verified": score > 52},
        {"label": "Engineering Verified", "source": "github", "verified": score > 45},
        {"label": "Team Verified", "source": "linkedin", "verified": score > 40},
    ]


def validate_public_record(s: dict[str, Any], idx: int) -> None:
    req = [
        "id",
        "slug",
        "name",
        "tagline",
        "description",
        "logo",
        "sector",
        "stage",
        "location",
        "founded",
        "raising",
        "valuation",
        "raised",
        "credibility",
        "momentum",
        "followers",
        "founders",
        "updates",
        "traction",
        "highlights",
    ]
    for k in req:
        if k not in s:
            raise ValueError(f"record[{idx}] missing field {k!r}")
    if s["stage"] not in STAGES:
        raise ValueError(f"record[{idx}] invalid stage {s['stage']!r}")
    if len(s["traction"]) < 6:
        raise ValueError(f"record[{idx}] traction must have at least 6 months")
    if len(s["highlights"]) < 2:
        raise ValueError(f"record[{idx}] highlights must have at least 2 strings")
    if not isinstance(s["founders"], list) or len(s["founders"]) < 1:
        raise ValueError(f"record[{idx}] founders must be a non-empty array")
    for u in s["updates"]:
        if u.get("type") not in UPDATE_TYPES:
            raise ValueError(f"record[{idx}] bad update.type {u.get('type')!r}")


def build_mongo_doc(s: dict[str, Any], i: int, raw_row: dict[str, Any] | None = None) -> dict[str, Any]:
    credibility = int(s["credibility"])
    followers = int(s["followers"])
    doc: dict[str, Any] = {
        "slug": str(s["slug"]).strip().lower(),
        "name": str(s["name"]),
        "sector": str(s["sector"]),
        "stage": str(s["stage"]),
        "tagline": str(s["tagline"]),
        "description": str(s["description"]),
        "location": str(s["location"]),
        "founded": str(s["founded"]),
        "founders": [{"name": f["name"], "role": f["role"], "bio": f.get("bio", ""), "verified": bool(f.get("verified", False))} for f in s["founders"]],
        "credibility": credibility,
        "momentum": int(s["momentum"]),
        "raising": int(s["raising"]),
        "valuation": int(s["valuation"]),
        "followers": followers,
        "logo": str(s["logo"]),
        "heroImage": str(s.get("heroImage") or "").strip(),
        "pitchMarkdown": str(s.get("pitchMarkdown") or "").strip(),
        "raised": int(s["raised"]),
        "highlights": list(s["highlights"]),
        "traction": [{"month": t["month"], "revenue": int(t["revenue"]), "users": int(t["users"])} for t in s["traction"]],
        "updates": [
            {"id": str(u["id"]), "date": str(u["date"]), "type": str(u["type"]), "title": str(u["title"]), "body": str(u["body"])}
            for u in s["updates"]
        ],
        "verificationBadges": infer_badges(credibility),
        "lastHeartbeatAt": iso_days_ago((i + 1) * 4),
        "founderResponseHours": 4 + i * 2,
        "milestoneHitRate": max(45, min(96, credibility - 4)),
        "communityEngagement": max(30, min(95, round((followers / 700) * 100))),
    }
    if raw_row:
        doc["wefunderCampaign"] = raw_row
    return doc


def load_records(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "startups" in data:
        data = data["startups"]
    if not isinstance(data, list):
        raise ValueError("JSON root must be an array of startup objects (or {startups: [...]})")
    return data


def main() -> int:
    load_dotenv_layers()
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", type=Path, required=True, help="merged.json or startups.json array")
    ap.add_argument(
        "--raw",
        type=Path,
        default=DEFAULT_RAW_CAMPAIGNS,
        help="Wefunder campaigns.json — merged into each doc as wefunderCampaign (default: data/wefunder/raw/campaigns.json)",
    )
    ap.add_argument("--no-raw", action="store_true", help="Do not attach wefunderCampaign")
    ap.add_argument("--dry-run", action="store_true", help="validate only, no writes")
    args = ap.parse_args()

    uri = (os.environ.get("MONGODB_URI") or "").strip()
    if not uri and not args.dry_run:
        print("MONGODB_URI is required unless --dry-run", file=sys.stderr)
        return 1

    records = load_records(args.input.resolve())
    print(f"Loaded {len(records)} structured records from {args.input}")

    by_id: dict[str, dict[str, Any]] = {}
    by_slug: dict[str, dict[str, Any]] = {}
    if not args.no_raw and args.raw.is_file():
        raw_list = json.loads(args.raw.read_text(encoding="utf-8"))
        if isinstance(raw_list, list):
            by_id, by_slug = index_raw_campaigns(raw_list)
            print(f"Indexed {len(by_id)} raw campaigns from {args.raw.name} for wefunderCampaign")
        else:
            print("Warning: raw file is not a JSON array — skipping wefunderCampaign", file=sys.stderr)
    elif not args.no_raw:
        print(f"Warning: raw file not found ({args.raw}) — wefunderCampaign omitted", file=sys.stderr)

    mongo_docs: list[dict[str, Any]] = []
    for i, s in enumerate(records):
        validate_public_record(s, i)
        raw_row = None
        if by_id or by_slug:
            raw_row = by_id.get(str(s.get("id", ""))) or by_slug.get(str(s.get("slug", "")).strip().lower())
        mongo_docs.append(build_mongo_doc(s, i, raw_row))

    if args.dry_run:
        print("Dry run OK — all records validated.")
        return 0

    from pymongo import MongoClient

    client = MongoClient(uri)
    dbn = db_name_from_uri(uri)
    col = client[dbn]["startups"]
    replaced = 0
    for doc in mongo_docs:
        r = col.replace_one({"slug": doc["slug"]}, doc, upsert=True)
        replaced += int(r.modified_count or r.upserted_id is not None or r.matched_count)
    client.close()
    print(f"Upserted/replaced {len(mongo_docs)} documents in {dbn}.startups")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
