#!/usr/bin/env python3
"""
Grounding with Google Search (Vertex AI) via google-genai.

Uses the Google Search tool on Gemini so the model can ground answers in web results.
Docs: https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search

Requires ADC (gcloud auth application-default login) and Vertex AI enabled.

Env:
  GOOGLE_CLOUD_PROJECT   - optional override
  GOOGLE_CLOUD_LOCATION  - default us-central1 (global also works for this API)
  VERTEX_GEMINI_MODEL    - default gemini-2.5-flash

Bulk Wefunder structuring uses the same client pattern:
  tools/wefunder/vertex_batch_structure.py
"""

from __future__ import annotations

import os
import sys

import google.genai as genai
from google.auth import default
from google.genai import types

DEFAULT_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
DEFAULT_MODEL = os.environ.get("VERTEX_GEMINI_MODEL", "gemini-2.5-flash")


def _client() -> tuple[genai.Client, str, str]:
    _, project = default()
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or project
    if not project:
        print(
            "No GCP project. Set GOOGLE_CLOUD_PROJECT or:\n"
            "  gcloud config set project YOUR_PROJECT_ID",
            file=sys.stderr,
        )
        sys.exit(1)
    client = genai.Client(
        vertexai=True,
        project=project,
        location=DEFAULT_LOCATION,
    )
    return client, project, DEFAULT_LOCATION


def _summarize_grounding(response: types.GenerateContentResponse) -> None:
    cand = response.candidates[0] if response.candidates else None
    if not cand or not cand.grounding_metadata:
        print("\n(No grounding_metadata in response.)")
        return

    gm = cand.grounding_metadata
    print("\n--- Grounding summary ---")
    if gm.web_search_queries:
        print("Search queries:", gm.web_search_queries)

    chunks = gm.grounding_chunks or []
    seen = set()
    for ch in chunks:
        web = getattr(ch, "web", None)
        if not web:
            continue
        key = (web.domain, web.title)
        if key in seen:
            continue
        seen.add(key)
        title = web.title or web.domain or "?"
        print(f"  - {title}")

    supports = gm.grounding_supports or []
    if supports:
        print("Supported segments:", len(supports))


def main() -> None:
    client, project, location = _client()
    model = DEFAULT_MODEL

    # Time-sensitive question so search grounding matters
    prompt = (
        "What are today's top headlines from a major world news source? "
        "Give 3 bullet points with short titles only. If you used search, say so briefly."
    )

    print("Project:", project)
    print("Location:", location)
    print("Model:", model)
    print()

    tool = types.Tool(
        google_search=types.GoogleSearch(
            # Optional: exclude_domains=["example.com"],
        )
    )

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=1.0,
            tools=[tool],
        ),
    )

    print("--- Answer ---")
    print(response.text or "(empty)")
    _summarize_grounding(response)


if __name__ == "__main__":
    main()
