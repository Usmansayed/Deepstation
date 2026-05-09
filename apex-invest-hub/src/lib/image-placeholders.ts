/** Deterministic picsum image for a stable seed (slug, url suffix, etc.). */
export function picsumSeedUrl(seed: string, width: number, height: number): string {
  const s = seed.trim() || "placeholder";
  return `https://picsum.photos/seed/${encodeURIComponent(s)}/${width}/${height}`;
}
