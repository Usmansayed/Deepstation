/**
 * `uploads.wefunder.com` sits behind Cloudflare **browser challenges** — server-side
 * fetch (our image proxy) gets HTTP 403 and cannot return real image bytes. Those URLs
 * must load **directly in the browser** with `referrerPolicy="no-referrer"` (see
 * `imageReferrerPolicy`).
 *
 * Other hosts may still use the same-origin proxy when hotlinking is unreliable.
 */
const WEFUNDER_IMAGE_HOSTS = new Set(["uploads.wefunder.com", "www.wefunder.com", "wefunder.com"]);

const PROXY_HOSTS = new Set([
  "d2qbf73089ujv4.cloudfront.net",
  "dfon51l7zffjj.cloudfront.net",
  "uxmagic.blob.core.windows.net",
  "picsum.photos",
]);

function normalizeUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(t.startsWith("//") ? `https:${t}` : t);
  } catch {
    return null;
  }
}

/** Returns a same-origin proxy URL when the host requires it; otherwise the normalized absolute URL. */
export function proxiedImageSrc(url: string | undefined | null): string | undefined {
  const parsed = normalizeUrl(url ?? "");
  if (!parsed) return undefined;
  if (PROXY_HOSTS.has(parsed.hostname)) {
    return `/api/image-proxy?url=${encodeURIComponent(parsed.toString())}`;
  }
  return parsed.toString();
}

/** Use on `<img>` for Wefunder CDN so the request is not blocked as cross-site hotlinking. */
export function imageReferrerPolicy(url: string | undefined | null): "no-referrer" | undefined {
  const parsed = normalizeUrl(url ?? "");
  if (!parsed) return undefined;
  return WEFUNDER_IMAGE_HOSTS.has(parsed.hostname) ? "no-referrer" : undefined;
}
