#!/usr/bin/env python3
"""
Add `pitchMarkdown` to each structured startup using Vertex Gemini (same auth as vertex_batch_structure.py).

Does not re-run full structuring — reads existing merged.json + raw campaigns, asks the model for
Markdown per batch, merges by `id`, writes updated JSON.

  python vertex_addon_pitch_markdown.py --merged ../../data/startups.json --output ../../data/startups.json

Env: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION (default global), VERTEX_GEMINI_MODEL (default gemini-3-flash-preview)
Optional: PITCH_CHUNK_SIZE (default 4), PITCH_SLEEP_SEC (default 2)
  PITCH_USE_SEARCH=1 — enable Google Search (can conflict with strict JSON on some models)

Uses response_schema + application/json so pitchMarkdown is valid JSON (no broken escapes).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MERGED = REPO_ROOT / "data" / "startups.json"
DEFAULT_RAW = REPO_ROOT / "data" / "wefunder" / "raw" / "campaigns.json"
PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "SYSTEM_PITCH_MARKDOWN.md"

from wefunder_media import normalize_slug


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


def chunk_list(items: list, n: int) -> list[list]:
    return [items[i : i + n] for i in range(0, len(items), n)]


def resolve_gcp_project() -> str:
    try:
        from google.auth import default

        _, adc_project = default()
    except Exception:  # noqa: BLE001
        adc_project = None
    return (os.environ.get("GOOGLE_CLOUD_PROJECT") or adc_project or "").strip()


def index_raw(raw_items: list) -> tuple[dict[str, dict], dict[str, dict]]:
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
    return by_id, by_slug


def raw_for_structured(row: dict, by_id: dict[str, dict], by_slug: dict[str, dict]) -> dict:
    rid = str(row.get("id", ""))
    slug = str(row.get("slug", "")).strip().lower()
    return by_id.get(rid) or by_slug.get(slug) or {}


def main() -> int:
    load_dotenv_layers()
    ap = argparse.ArgumentParser()
    ap.add_argument("--merged", type=Path, default=DEFAULT_MERGED)
    ap.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    ap.add_argument("--output", type=Path, default=None, help="default: overwrite --merged")
    ap.add_argument("--chunk-size", type=int, default=int(os.environ.get("PITCH_CHUNK_SIZE", "4")))
    ap.add_argument("--max-chunks", type=int, default=0, help="0 = all")
    args = ap.parse_args()

    project = resolve_gcp_project()
    if not project:
        print(
            "No GCP project. Set GOOGLE_CLOUD_PROJECT or run gcloud auth application-default login.",
            file=sys.stderr,
        )
        return 1

    if not args.merged.is_file():
        print(f"Missing merged file: {args.merged}", file=sys.stderr)
        return 1
    if not args.raw.is_file():
        print(f"Missing raw file: {args.raw}", file=sys.stderr)
        return 1

    system = PROMPT_PATH.read_text(encoding="utf-8") if PROMPT_PATH.is_file() else ""
    if not system.strip():
        print(f"Missing prompt: {PROMPT_PATH}", file=sys.stderr)
        return 1

    merged: list[dict] = json.loads(args.merged.read_text(encoding="utf-8"))
    if not isinstance(merged, list):
        print("merged.json must be a JSON array", file=sys.stderr)
        return 1

    raw_items = json.loads(args.raw.read_text(encoding="utf-8"))
    if not isinstance(raw_items, list):
        print("raw campaigns must be a JSON array", file=sys.stderr)
        return 1

    by_id, by_slug = index_raw(raw_items)

    try:
        import google.genai as genai
        from google.genai import types
    except ImportError as e:
        print("Install google-genai:", e, file=sys.stderr)
        return 1

    location = (os.environ.get("GOOGLE_CLOUD_LOCATION") or "global").strip()
    model = (
        os.environ.get("VERTEX_GEMINI_MODEL") or os.environ.get("GEMINI_VERTEX_MODEL") or "gemini-3-flash-preview"
    ).strip()

    client = genai.Client(vertexai=True, project=project, location=location)

    pitch_response_schema = types.Schema(
        type=types.Type.ARRAY,
        items=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "id": types.Schema(type=types.Type.STRING),
                "pitchMarkdown": types.Schema(type=types.Type.STRING),
            },
            required=["id", "pitchMarkdown"],
        ),
    )

    chunks = chunk_list(merged, max(1, args.chunk_size))
    if args.max_chunks:
        chunks = chunks[: args.max_chunks]

    out_path = args.output or args.merged
    pitch_by_id: dict[str, str] = {}
    for row in merged:
        if not isinstance(row, dict):
            continue
        sid = str(row.get("id", "")).strip()
        pm = row.get("pitchMarkdown")
        if sid and isinstance(pm, str) and pm.strip():
            pitch_by_id[sid] = pm.strip()

    def apply_pitch_and_checkpoint() -> None:
        for row in merged:
            if not isinstance(row, dict):
                continue
            sid = str(row.get("id", "")).strip()
            if sid in pitch_by_id:
                row["pitchMarkdown"] = pitch_by_id[sid]
        out_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    for idx, chunk in enumerate(chunks):
        struct_min = [
            {
                "id": str(r.get("id", "")),
                "slug": r.get("slug"),
                "name": r.get("name"),
                "tagline": r.get("tagline"),
                "description": r.get("description"),
                "highlights": r.get("highlights"),
                "sector": r.get("sector"),
                "stage": r.get("stage"),
                "location": r.get("location"),
                "raising": r.get("raising"),
                "valuation": r.get("valuation"),
                "raised": r.get("raised"),
            }
            for r in chunk
        ]
        raw_min = [raw_for_structured(r, by_id, by_slug) for r in chunk]

        user = (
            "Produce pitchMarkdown for EACH startup. Return ONLY a JSON array of "
            '{"id": string, "pitchMarkdown": string} objects.\n\n'
            f"STRUCTURED_CHUNK:\n{json.dumps(struct_min, ensure_ascii=False)}\n\n"
            f"RAW_CHUNK:\n{json.dumps(raw_min, ensure_ascii=False)}"
        )

        print(f"Pitch chunk {idx + 1}/{len(chunks)} ({len(chunk)} rows) -> {model} ...")
        text = ""
        try:
            cfg_kw: dict = {
                "system_instruction": system,
                "temperature": 0.7,
                "response_mime_type": "application/json",
                "response_schema": pitch_response_schema,
            }
            if os.environ.get("PITCH_USE_SEARCH", "").strip().lower() in ("1", "true", "yes"):
                cfg_kw["tools"] = [types.Tool(google_search=types.GoogleSearch())]
            response = client.models.generate_content(
                model=model,
                contents=user,
                config=types.GenerateContentConfig(**cfg_kw),
            )
            text = response.text or ""
            rows = json.loads(text) if text.strip() else []
            if not isinstance(rows, list):
                raise ValueError("Model JSON is not an array")
            for item in rows:
                if not isinstance(item, dict):
                    continue
                sid = str(item.get("id", "")).strip()
                pm = item.get("pitchMarkdown")
                if sid and isinstance(pm, str) and pm.strip():
                    pitch_by_id[sid] = pm.strip()
            print(f"  -> parsed {len(rows)} rows, total pitch fields: {len(pitch_by_id)}")
            apply_pitch_and_checkpoint()
            print(f"  checkpoint -> {out_path}")
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR: {e}\n---\n{text[:2000]}", file=sys.stderr)
            return 1

        time.sleep(float(os.environ.get("PITCH_SLEEP_SEC", "2")))

    updated = sum(
        1 for row in merged if isinstance(row, dict) and str(row.get("pitchMarkdown", "")).strip()
    )
    print(f"Done — pitchMarkdown set for {updated} / {len(merged)} records in {out_path}")
    print("Next: copy merged to data/startups.json if needed, npm run validate-data, npm run seed, sync_to_mongo.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
