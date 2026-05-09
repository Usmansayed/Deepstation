import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { StartupLogoMark } from "@/components/startup-logo";
import { showAppWidget } from "@/lib/feature-widget";
import { getStartups, type ApiStartup } from "@/lib/api";

type FounderUpdate = ApiStartup["updates"][number];
const UPDATE_TYPES = ["traction", "milestone", "product", "team", "fundraise"] as const;
type UpdateType = (typeof UPDATE_TYPES)[number];

export const Route = createFileRoute("/founder")({
  head: () => ({ meta: [{ title: "Founder Studio — Clarion" }, { name: "description", content: "Manage your startup profile and post transparent updates." }] }),
  component: Founder,
});

function Founder() {
  const [base, setBase] = useState<ApiStartup | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [updates, setUpdates] = useState<FounderUpdate[]>([]);
  const [draft, setDraft] = useState<{ title: string; body: string; type: UpdateType }>({
    title: "",
    body: "",
    type: "traction",
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    mrr: "$80,000",
    mom: "31%",
    customers: "42",
    nps: "72",
  });

  useEffect(() => {
    getStartups()
      .then((list) => {
        const s = list.find((x) => x.slug === "lumen-health") ?? list[0] ?? null;
        setBase(s);
        if (s) {
          setUpdates(
            s.updates.map((u) => ({
              ...u,
              type: (UPDATE_TYPES.includes(u.type as UpdateType) ? u.type : "traction") as UpdateType,
            })),
          );
        }
      })
      .catch((err) => {
        console.error("Failed to load founder startup", err);
        setLoadError(true);
      });
  }, []);

  const submit = () => {
    if (!draft.title.trim()) return;
    if (editing) {
      setUpdates((u) => u.map((x) => x.id === editing ? { ...x, ...draft } : x));
      setEditing(null);
    } else {
      setUpdates((u) => [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          title: draft.title,
          body: draft.body,
          type: draft.type,
        },
        ...u,
      ]);
    }
    setDraft({ title: "", body: "", type: "traction" });
  };

  const startEdit = (u: FounderUpdate) => {
    setEditing(u.id);
    setDraft({
      title: u.title,
      body: u.body,
      type: (UPDATE_TYPES.includes(u.type as UpdateType) ? u.type : "traction") as UpdateType,
    });
  };
  const remove = (id: string) => setUpdates((u) => u.filter((x) => x.id !== id));

  if (!base) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-20 w-full text-sm text-muted-foreground">
          {loadError
            ? "Could not load startups. Start the API (cd server && npm run dev) and seed Mongo (npm run seed)."
            : "Loading…"}
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-20 w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <StartupLogoMark
              logo={base.logo}
              alt=""
              fallback="🏢"
              boxClass="h-14 w-14"
              emojiClass="text-3xl"
              className="border-border bg-surface-2"
              identityKey={base.slug}
            />
            <div>
              <div className="text-xs uppercase tracking-wider text-primary">Founder Studio</div>
              <h1 className="text-3xl font-bold mt-0.5">{base.name}</h1>
              <p className="text-muted-foreground text-sm">{base.tagline}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Stat label="Followers" value={`${base.followers}`} />
            <Stat label="Credibility" value={String(base.credibility)} accent />
            <Stat label="Updates" value={`${updates.length}`} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-10">
          {/* Composer */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-card rounded-2xl p-6 border">
              <h3 className="font-semibold mb-4">{editing ? "Edit update" : "Post a transparent update"}</h3>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {UPDATE_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setDraft((d) => ({ ...d, type: t }))}
                      className={`px-3 py-1.5 rounded-full text-xs border transition ${draft.type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  placeholder="Update title — e.g. Crossed $100K MRR"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="w-full bg-surface border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <textarea
                  placeholder="Share traction, learnings, or milestones with your investors…"
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={4}
                  className="w-full bg-surface border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">{base.followers} subscribed investors will be notified.</div>
                  <div className="flex gap-2">
                    {editing && <button onClick={() => { setEditing(null); setDraft({ title: "", body: "", type: "traction" }); }} className="text-sm text-muted-foreground px-3 py-2">Cancel</button>}
                    <button onClick={submit} className="rounded-lg bg-gradient-primary text-primary-foreground px-5 py-2.5 font-medium shadow-glow hover:opacity-90 transition">
                      {editing ? "Save changes" : "Publish update"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Your updates</h3>
              {updates.map((u) => (
                <div key={u.id} className="bg-gradient-card rounded-xl p-4 border flex justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="uppercase tracking-wider text-primary">{u.type}</span>
                      <span>·</span>
                      <span>{new Date(u.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="font-medium mt-1">{u.title}</div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{u.body}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => startEdit(u)} className="text-xs text-muted-foreground hover:text-primary">Edit</button>
                    <button onClick={() => remove(u.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-card rounded-2xl p-6 border">
              <h3 className="font-semibold mb-4">Traction metrics</h3>
              <div className="mb-3">
                <label className="text-xs text-muted-foreground">MRR</label>
                <input
                  value={metrics.mrr}
                  onChange={(e) => setMetrics((m) => ({ ...m, mrr: e.target.value }))}
                  className="mt-1 w-full bg-surface border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-3">
                <label className="text-xs text-muted-foreground">MoM growth</label>
                <input
                  value={metrics.mom}
                  onChange={(e) => setMetrics((m) => ({ ...m, mom: e.target.value }))}
                  className="mt-1 w-full bg-surface border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-3">
                <label className="text-xs text-muted-foreground">Active customers</label>
                <input
                  value={metrics.customers}
                  onChange={(e) => setMetrics((m) => ({ ...m, customers: e.target.value }))}
                  className="mt-1 w-full bg-surface border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-3">
                <label className="text-xs text-muted-foreground">NPS</label>
                <input
                  value={metrics.nps}
                  onChange={(e) => setMetrics((m) => ({ ...m, nps: e.target.value }))}
                  className="mt-1 w-full bg-surface border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                className="mt-2 w-full rounded-lg border px-4 py-2 text-sm hover:bg-surface transition"
                onClick={() =>
                  showAppWidget("Metrics published", "Investors now see your latest traction snapshot on the profile.")
                }
              >
                Save metrics
              </button>
            </div>

            <div className="bg-gradient-card rounded-2xl p-6 border">
              <h3 className="font-semibold mb-2">Profile health</h3>
              <p className="text-xs text-muted-foreground mb-4">Higher scores attract more investor reach.</p>
              <Bar label="Profile completeness" value={95} />
              <Bar label="Update consistency" value={88} />
              <Bar label="Traction transparency" value={92} />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-2.5 border min-w-[110px]">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-gradient-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
