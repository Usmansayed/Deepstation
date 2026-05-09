"""Pick https image URLs from raw Wefunder API objects (never discard CDN media)."""
from __future__ import annotations

from typing import Any


def to_https(url: str | None) -> str | None:
    if not url or not isinstance(url, str):
        return None
    t = url.strip()
    if not t or t == "noLogo.png":
        return None
    if t.startswith("//"):
        return f"https:{t}"
    if t.startswith("http://") or t.startswith("https://"):
        return t
    if t.startswith("/"):
        if t.startswith("//"):
            return f"https:{t}"
        return f"https://wefunder.com{t}"
    return f"https://{t.lstrip('/')}"


def _nested_url(obj: Any) -> str | None:
    if isinstance(obj, str):
        return to_https(obj)
    if isinstance(obj, dict):
        u = obj.get("url")
        if isinstance(u, str):
            return to_https(u)
    return None


def pick_logo_url(raw: dict[str, Any]) -> str | None:
    """Square / mark: use API `logo.url` first (…/blob.jpeg|png), not xxl_blob paths, per campaigns.json."""
    logo = raw.get("logo")
    if isinstance(logo, dict):
        # Raw Wefunder objects expose logo.url as the canonical asset; xxl/xl are separate filenames.
        for key in ("url", "large", "xl", "medium", "small", "thumbnail", "xxl"):
            cand = logo.get(key)
            u = _nested_url(cand) if cand is not None else None
            if u:
                return u
    card = raw.get("custom_card_photo_url") or raw.get("card_photo")
    if isinstance(card, dict):
        for key in ("retina", "normal"):
            u = _nested_url(card.get(key))
            if u:
                return u
    for key in ("founder_avatar_url", "video_cover"):
        u = to_https(raw.get(key)) if raw.get(key) else None
        if u:
            return u
    return None


def pick_hero_url(raw: dict[str, Any]) -> str | None:
    """Wide hero: video still / custom card / card_photo."""
    u = to_https(raw.get("video_cover"))
    if u:
        return u
    card = raw.get("custom_card_photo_url") or raw.get("card_photo")
    if isinstance(card, dict):
        for key in ("retina", "normal"):
            u = _nested_url(card.get(key))
            if u:
                return u
    logo = raw.get("logo")
    if isinstance(logo, dict):
        u = _nested_url(logo.get("url") or logo.get("large") or logo.get("xl"))
        if u:
            return u
    return pick_logo_url(raw)


def normalize_slug(raw: dict[str, Any], fallback: str) -> str:
    s = raw.get("url") or raw.get("slug") or fallback
    s = str(s).strip().lower()
    if "/" in s:
        s = s.rsplit("/", 1)[-1]
    out = "".join(c if c.isalnum() or c == "-" else "-" for c in s)
    while "--" in out:
        out = out.replace("--", "-")
    return out.strip("-")[:72] or fallback


def enrich_record_from_raw(structured: dict[str, Any], raw: dict[str, Any]) -> dict[str, Any]:
    """Force media + slug from raw so Gemini omissions do not drop Wefunder CDN assets."""
    logo = pick_logo_url(raw)
    hero = pick_hero_url(raw)
    slug = normalize_slug(raw, str(structured.get("slug", "company")))
    row = {**structured, "slug": slug}
    if logo:
        row["logo"] = logo
    if hero:
        row["heroImage"] = hero
    elif logo:
        row["heroImage"] = logo
    return row
