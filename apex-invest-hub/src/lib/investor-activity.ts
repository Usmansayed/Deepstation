/** Append-only activity log for profile (investments, discussion). */

const KEY = "ventureflow:investor-activity";

export type ActivityEntry =
  | {
      kind: "invest";
      id: string;
      slug: string;
      companyName: string;
      amount: number;
      at: string;
    }
  | {
      kind: "question";
      id: string;
      slug: string;
      companyName: string;
      excerpt: string;
      at: string;
    }
  | {
      kind: "comment";
      id: string;
      slug: string;
      companyName: string;
      excerpt: string;
      at: string;
    };

function readAll(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: ActivityEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 200)));
    window.dispatchEvent(new CustomEvent("ventureflow-activity-change"));
  } catch {
    /* ignore */
  }
}

export function loadInvestorActivity(): ActivityEntry[] {
  return readAll().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function appendInvestorActivity(entry: Omit<ActivityEntry, "id" | "at"> & { id?: string }) {
  const id = entry.id ?? `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const at = new Date().toISOString();
  const full = { ...entry, id, at } as ActivityEntry;
  const next = [full, ...readAll()].slice(0, 200);
  writeAll(next);
  return full;
}

export function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
