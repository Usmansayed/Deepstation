/** Normalize Wefunder `//…` or site-relative media URLs for opening in a new tab. */
export function wefunderAssetUrl(u: unknown): string | undefined {
  if (u == null) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://wefunder.com${s.startsWith("/") ? s : `/${s}`}`;
}

export function wefunderListingUrl(slug: string): string {
  const t = slug.replace(/^\/+/, "").trim();
  return `https://wefunder.com/${encodeURIComponent(t)}`;
}
