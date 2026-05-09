#!/usr/bin/env python3
"""
Download ONLY raw Wefunder rows from Apify (no schema rewrite).

Uses actor: jupri/wefunder
Auth: APIFY_KEY | APIFY_TOKEN | apify_key in server/.env (repo root) or env.

Default: at least 100 campaigns (override with WEFUNDER_LIMIT).

Writes:
  data/wefunder/raw/campaigns.json       — array of raw API objects (media fields preserved)
  data/wefunder/raw/campaigns.meta.json   — run id, item count, timestamp
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "data" / "wefunder" / "raw"
DEFAULT_OUT = RAW_DIR / "campaigns.json"


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


def apify_token() -> str:
    return (
        os.environ.get("APIFY_KEY", "")
        or os.environ.get("APIFY_TOKEN", "")
        or os.environ.get("apify_key", "")
    ).strip()


def run_actor_and_collect(token: str, limit: int, extra_input: dict) -> tuple[list, str]:
    actor_id = "jupri~wefunder"
    base = f"https://api.apify.com/v2/acts/{actor_id}/runs"
    body = {"limit": max(1, min(1000, limit)), **extra_input}
    params = {"token": token, "waitForFinish": 900}

    with httpx.Client(timeout=httpx.Timeout(920.0)) as client:
        r = client.post(base, params=params, json=body)
        if r.status_code == 403:
            try:
                err = r.json().get("error") or {}
                if err.get("type") == "full-permission-actor-not-approved":
                    url = (err.get("data") or {}).get("approvalUrl", "")
                    print(
                        "Apify: this Actor needs permission approval in your account.\n"
                        f"Open: {url}\n"
                        "Then re-run fetch_raw.py.",
                        file=sys.stderr,
                    )
            except Exception:  # noqa: BLE001
                pass
        r.raise_for_status()
        run = r.json().get("data") or r.json()
        ds_id = run.get("defaultDatasetId")
        if not ds_id:
            raise RuntimeError(f"No defaultDatasetId in run response: {run!r:.500}")

        items: list = []
        offset = 0
        page = 1000
        while True:
            dr = client.get(
                f"https://api.apify.com/v2/datasets/{ds_id}/items",
                params={"token": token, "format": "json", "clean": "1", "offset": offset, "limit": page},
            )
            dr.raise_for_status()
            batch = dr.json()
            if not batch:
                break
            if not isinstance(batch, list):
                raise RuntimeError("Dataset response was not a JSON array")
            items.extend(batch)
            if len(batch) < page:
                break
            offset += page

        return items, str(run.get("id", ""))


def main() -> int:
    load_dotenv_layers()
    token = apify_token()
    if not token:
        print("Set APIFY_KEY, APIFY_TOKEN, or apify_key (e.g. in server/.env)", file=sys.stderr)
        return 1

    limit = int(os.environ.get("WEFUNDER_LIMIT", "150"))
    out = Path(os.environ.get("WEFUNDER_RAW_OUT", str(DEFAULT_OUT)))
    out.parent.mkdir(parents=True, exist_ok=True)

    extra = {}
    for k in ("search", "category", "sort", "fields"):
        v = os.environ.get(f"WEFUNDER_{k.upper()}")
        if v:
            extra[k] = v

    print(f"Apify jupri/wefunder limit={limit} extra={list(extra.keys()) or '{}'} ...")
    items, run_id = run_actor_and_collect(token, limit, extra)
    print(f"Downloaded {len(items)} raw rows (run id={run_id})")

    if len(items) < 100:
        print("Warning: fewer than 100 rows. Raise WEFUNDER_LIMIT or check actor filters.", file=sys.stderr)

    out.write_text(json.dumps(items, indent=2) + "\n", encoding="utf-8")
    meta = {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "actor": "jupri/wefunder",
        "runId": run_id,
        "itemCount": len(items),
        "limitRequested": limit,
    }
    meta_out = out.with_name(f"{out.stem}.meta.json")
    meta_out.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")
    print(f"Wrote {meta_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
