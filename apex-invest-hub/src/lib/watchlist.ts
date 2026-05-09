/** Watchlist: Discover bookmarks + startup Subscribe (slug-based, persisted). */

const BOOKMARK_SLUGS_KEY = "ventureflow:watchlist-bookmark-slugs";
const SUBSCRIBED_SLUGS_KEY = "ventureflow:watchlist-subscribed-slugs";
/** @deprecated migrated on read */
const LEGACY_IDS_KEY = "ventureflow:watchlist-discover-ids";

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ventureflow-watchlist-change"));
  }
}

function readStrings(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeStrings(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(values));
    notify();
  } catch {
    /* ignore */
  }
}

/** All slugs that should appear in Discover → Saved. */
export function loadWatchlistedSlugs(): Set<string> {
  const bookmarked = readStrings(BOOKMARK_SLUGS_KEY);
  const subscribed = readStrings(SUBSCRIBED_SLUGS_KEY);
  return new Set([...bookmarked, ...subscribed]);
}

export function loadBookmarkedSlugs(): string[] {
  return readStrings(BOOKMARK_SLUGS_KEY);
}

export function loadSubscribedSlugs(): string[] {
  return readStrings(SUBSCRIBED_SLUGS_KEY);
}

export function toggleBookmarkSlug(slug: string) {
  const cur = readStrings(BOOKMARK_SLUGS_KEY);
  const has = cur.includes(slug);
  writeStrings(BOOKMARK_SLUGS_KEY, has ? cur.filter((s) => s !== slug) : [...cur, slug]);
}

export function addSubscribedSlug(slug: string) {
  const cur = readStrings(SUBSCRIBED_SLUGS_KEY);
  if (cur.includes(slug)) return;
  writeStrings(SUBSCRIBED_SLUGS_KEY, [...cur, slug]);
}

/** One-time migration from id-based storage (no catalog → drop legacy ids). */
export function migrateLegacyWatchlistIfNeeded() {
  if (typeof window === "undefined") return;
  try {
    const legacy = localStorage.getItem(LEGACY_IDS_KEY);
    if (!legacy) return;
    localStorage.removeItem(LEGACY_IDS_KEY);
  } catch {
    /* ignore */
  }
}
