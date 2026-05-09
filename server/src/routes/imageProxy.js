import { URL } from "node:url";

/**
 * Hosts we allow fetching server-side. Do **not** add uploads.wefunder.com — Cloudflare
 * returns 403 challenge HTML to non-browser clients; load those images in the SPA with
 * referrerPolicy="no-referrer" instead (see apex-invest-hub proxied-image-url.ts).
 */
const ALLOWED_HOSTS = new Set([
  "d2qbf73089ujv4.cloudfront.net",
  "dfon51l7zffjj.cloudfront.net",
  "uxmagic.blob.core.windows.net",
  "picsum.photos",
]);

/**
 * GET /api/image-proxy?url=https%3A%2F%2F...
 */
export async function imageProxyHandler(req, res) {
  const raw = req.query.url;
  if (!raw || typeof raw !== "string") {
    return res.status(400).json({ error: "Missing url query parameter" });
  }

  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return res.status(400).json({ error: "Invalid protocol" });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return res.status(403).json({ error: "Host not allowed" });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": "DeepstationImageProxy/1.0" },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: "Upstream returned error", status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    console.error("image-proxy fetch failed:", err.message || err);
    return res.status(502).json({ error: "Fetch failed" });
  }
}
