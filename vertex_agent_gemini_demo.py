#!/usr/bin/env python3
"""
Vertex AI + Gemini on GCP using Application Default Credentials (ADC).

This uses the Google Gen AI SDK in Vertex mode - the supported path for Gemini on GCP
(see: Vertex AI generative AI SDK migration).

What this script covers:
  - one-shot generation (`generate_content`)
  - multi-turn chat (`chats`) - typical pattern for agent-like behavior before you
    deploy to Agent Platform (managed runtime, sessions, memory bank)

Prerequisites (terminal, after `gcloud auth login` and
`gcloud auth application-default login`):

  gcloud config set project YOUR_PROJECT_ID
  gcloud services enable aiplatform.googleapis.com

Optional environment variables:
  GOOGLE_CLOUD_PROJECT   - overrides the project from ADC
  GOOGLE_CLOUD_LOCATION  - region (default: us-central1)
  VERTEX_GEMINI_MODEL    - model id (default: gemini-2.5-flash)
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
            "No GCP project found. Set GOOGLE_CLOUD_PROJECT or run:\n"
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


def demo_generate_content(client: genai.Client, model: str) -> None:
    print("\n" + "=" * 60)
    print("1. generate_content (single turn)")
    print("=" * 60)
    response = client.models.generate_content(
        model=model,
        contents="In one sentence, what is Vertex AI?",
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=256,
        ),
    )
    print(response.text)


def demo_chat(client: genai.Client, model: str) -> None:
    print("\n" + "=" * 60)
    print("2. chats (multi-turn, stateful on the client)")
    print("=" * 60)
    chat = client.chats.create(model=model)
    r1 = chat.send_message("My favorite number is 7. Remember that.")
    print("Turn 1:", r1.text.strip().split("\n")[0][:200], "...")
    r2 = chat.send_message("What is my favorite number? Reply with just the digit.")
    print("Turn 2:", r2.text.strip())


def demo_streaming(client: genai.Client, model: str) -> None:
    print("\n" + "=" * 60)
    print("3. Streaming (generate_content_stream)")
    print("=" * 60)
    stream = client.models.generate_content_stream(
        model=model,
        contents="Say hello in exactly five words.",
    )
    for chunk in stream:
        if chunk.text:
            print(chunk.text, end="", flush=True)
    print()


def note_agent_platform() -> None:
    print("\n" + "=" * 60)
    print("Vertex Agent Platform (managed agents)")
    print("=" * 60)
    print(
        """
For production agents (sessions, Memory Bank, tracing, scaling), deploy to
Agent Platform Runtime - e.g. Agent Development Kit (ADK), LangChain, or
LangGraph - then call your deployed agent endpoint from your app.

Console: Vertex AI - Agent Builder / Agent Platform
Docs: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/reasoning-engine

The Interactions API in google-genai (client.interactions) is aimed at unified
model/agent flows on the Gemini API; on Vertex, prefer generate_content and
chats until Google documents Vertex parity for your model.
""".strip()
    )


def main() -> None:
    client, project, location = _client()
    model = DEFAULT_MODEL

    print("=" * 60)
    print("Vertex AI / Gemini (google-genai, vertexai=True)")
    print("=" * 60)
    print(f"Project:  {project}")
    print(f"Location: {location}")
    print(f"Model:    {model}")

    demo_generate_content(client, model)
    demo_chat(client, model)
    demo_streaming(client, model)
    note_agent_platform()

    print("\n" + "=" * 60)
    print("Done.")
    print("=" * 60)


if __name__ == "__main__":
    main()
