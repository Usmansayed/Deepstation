#!/usr/bin/env python3
"""
GCP / Vertex AI — turn raw Wefunder JSON into structured startup records.

This is the step you run on YOUR machine or CI with Google credentials
(application-default login or a service account). It does NOT use the
Cursor agent; it calls Gemini on Vertex with Google Search grounding.

Prereqs:
  gcloud auth application-default login
  gcloud config set project YOUR_PROJECT_ID
  gcloud services enable aiplatform.googleapis.com
  pip install -r requirements.txt

Env (same as repo-root vertex_google_search_demo.py):
  GOOGLE_CLOUD_PROJECT   - optional; falls back to ADC default project
  GOOGLE_CLOUD_LOCATION  - default global (required for gemini-3-flash-preview; use us-central1 for older models)
  VERTEX_GEMINI_MODEL    - default gemini-3-flash-preview (alias: GEMINI_VERTEX_MODEL)

Optional:
  export STRUCTURE_CHUNK_SIZE=6

Input:  data/wefunder/raw/campaigns.json  (from fetch_raw.py)
Output: data/wefunder/structured/chunks/chunk_*.json
         data/wefunder/structured/merged.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RAW = REPO_ROOT / "data" / "wefunder" / "raw" / "campaigns.json"
PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "SYSTEM_STRUCTURE.md"

from wefunder_media import enrich_record_from_raw, normalize_slug


def load_dotenv_layers() -> None:
    """Match local dev: optional repo-root .env, then server/.env (overrides)."""
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


def extract_json_array(text: str) -> list:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        while lines and lines[-1].strip() == "```":
            lines.pop()
        text = "\n".join(lines).strip()
    try:
        v = json.loads(text)
        if isinstance(v, list):
            return v
        if isinstance(v, dict) and "startups" in v and isinstance(v["startups"], list):
            return v["startups"]
    except json.JSONDecodeError:
        pass
    i = text.find("[")
    j = text.rfind("]")
    if i == -1 or j <= i:
        raise ValueError("Model output did not contain a JSON array.")
    return json.loads(text[i : j + 1])


def chunk_list(items: list, n: int) -> list[list]:
    return [items[i : i + n] for i in range(0, len(items), n)]


def resolve_gcp_project() -> str:
    """Same pattern as vertex_google_search_demo.py / vertex_agent_gemini_demo.py."""
    try:
        from google.auth import default

        _, adc_project = default()
    except Exception:  # noqa: BLE001
        adc_project = None
    return (os.environ.get("GOOGLE_CLOUD_PROJECT") or adc_project or "").strip()


def main() -> int:
    load_dotenv_layers()
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=REPO_ROOT / "data" / "wefunder" / "structured",
    )
    ap.add_argument("--chunk-size", type=int, default=int(os.environ.get("STRUCTURE_CHUNK_SIZE", "6")))
    ap.add_argument("--max-chunks", type=int, default=0, help="0 = all chunks (for 100+ startups)")
    args = ap.parse_args()

    project = resolve_gcp_project()
    if not project:
        print(
            "No GCP project. Set GOOGLE_CLOUD_PROJECT or run:\n"
            "  gcloud config set project YOUR_PROJECT_ID\n"
            "  gcloud auth application-default login",
            file=sys.stderr,
        )
        return 1

    if not args.raw.is_file():
        print(f"Missing raw file: {args.raw} — run fetch_raw.py first.", file=sys.stderr)
        return 1

    raw_items = json.loads(args.raw.read_text(encoding="utf-8"))
    if not isinstance(raw_items, list):
        print("Raw file must be a JSON array of Wefunder records.", file=sys.stderr)
        return 1

    system = PROMPT_PATH.read_text(encoding="utf-8") if PROMPT_PATH.is_file() else ""
    if not system.strip():
        print(f"Missing prompt file: {PROMPT_PATH}", file=sys.stderr)
        return 1

    try:
        import google.genai as genai
        from google.genai import types
    except ImportError as e:
        print("Install google-genai: pip install -r requirements.txt", e, file=sys.stderr)
        return 1

    # gemini-3-flash-preview is deployed on the global endpoint (see Vertex model docs).
    location = (os.environ.get("GOOGLE_CLOUD_LOCATION") or "global").strip()
    model = (
        os.environ.get("VERTEX_GEMINI_MODEL") or os.environ.get("GEMINI_VERTEX_MODEL") or "gemini-3-flash-preview"
    ).strip()

    client = genai.Client(
        vertexai=True,
        project=project,
        location=location,
    )

    chunks_dir = args.out_dir / "chunks"
    err_dir = args.out_dir / "errors"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    err_dir.mkdir(parents=True, exist_ok=True)

    chunks = chunk_list(raw_items, max(1, args.chunk_size))
    if args.max_chunks:
        chunks = chunks[: args.max_chunks]

    all_flat: list[dict] = []
    for idx, chunk in enumerate(chunks):
        user = (
            "Here is a JSON array of RAW Wefunder campaign objects (media URLs, slugs, text). "
            "Transform EVERY object in this array into our platform schema. "
            "Return ONLY a JSON array (no markdown) of startup objects. "
            "Use web search when company_location, sector, funding story, or logo URL is unclear or missing.\n\n"
            f"RAW_CHUNK:\n{json.dumps(chunk, ensure_ascii=False)}"
        )
        print(f"Chunk {idx + 1}/{len(chunks)} ({len(chunk)} rows) -> Vertex {model} ...")
        text = ""
        try:
            tool = types.Tool(google_search=types.GoogleSearch())
            response = client.models.generate_content(
                model=model,
                contents=user,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=1.0,
                    tools=[tool],
                ),
            )
            text = response.text or ""
            structured = extract_json_array(text)
            if not isinstance(structured, list):
                raise ValueError("Parsed JSON is not an array")
            out_path = chunks_dir / f"chunk_{idx:04d}.json"
            out_path.write_text(json.dumps(structured, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            all_flat.extend(structured)
            print(f"  -> {len(structured)} records written to {out_path.name}")
        except Exception as e:  # noqa: BLE001
            err_file = err_dir / f"chunk_{idx:04d}.txt"
            err_file.write_text(f"{e}\n\n--- raw model text below ---\n\n{text}", encoding="utf-8")
            print(f"  ERROR: {e} (details {err_file})", file=sys.stderr)
            return 1
        time.sleep(float(os.environ.get("STRUCTURE_SLEEP_SEC", "2")))

    # Dedupe by slug (last wins)
    by_slug: dict[str, dict] = {}
    for row in all_flat:
        if isinstance(row, dict) and row.get("slug"):
            by_slug[str(row["slug"]).strip().lower()] = row
    merged = list(by_slug.values())

    raw_by_id: dict[str, dict] = {}
    raw_by_slug: dict[str, dict] = {}
    for r in raw_items:
        if not isinstance(r, dict):
            continue
        rid = r.get("id") or r.get("objectID")
        if rid is not None:
            raw_by_id[str(rid)] = r
        slug_key = normalize_slug(r, "").strip().lower()
        if slug_key:
            raw_by_slug[slug_key] = r

    enriched: list[dict] = []
    for row in merged:
        if not isinstance(row, dict):
            continue
        raw = raw_by_id.get(str(row.get("id", ""))) or raw_by_slug.get(
            str(row.get("slug", "")).strip().lower()
        )
        if raw:
            enriched.append(enrich_record_from_raw(row, raw))
        else:
            enriched.append(row)
    merged = enriched

    merged_path = args.out_dir / "merged.json"
    merged_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Merged {len(merged)} unique slugs (media enriched from raw) -> {merged_path}")
    print("Next: cd apex-invest-hub && npm run validate-data  # point validate at merged if you wire it")
    print("Then: python sync_to_mongo.py --input <merged.json>")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
