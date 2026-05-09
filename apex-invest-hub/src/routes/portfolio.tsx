import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, getStartups, type ApiStartup } from "@/lib/api";

export const Route = createFileRoute("/portfolio")({
  component: Portfolio,
});

const ALL_VALUE = "all";
const MICRO_FUND_SCALE = 0.0001;

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

/** Illustrative cost basis per company */
function invested(s: ApiStartup) {
  return (s.raising / 4) * MICRO_FUND_SCALE;
}

/** Illustrative current NAV / mark */
function mark(s: ApiStartup) {
  return (s.valuation / 12) * MICRO_FUND_SCALE;
}

function formatMoneyOneDecimal(v: number) {
  return formatMoney(Number(v.toFixed(1)));
}

function moic(s: ApiStartup) {
  const inv = invested(s);
  return inv > 0 ? mark(s) / inv : 0;
}

/** Display ownership % — derived for demo (real systems pull from cap table) */
function ownershipIllustrative(s: ApiStartup) {
  return Number((1.1 + (hashSeed(s.slug) % 55) / 10).toFixed(1));
}

function Portfolio() {
  const [startups, setStartups] = useState<ApiStartup[]>([]);
  const [selectedId, setSelectedId] = useState<string>(ALL_VALUE);

  useEffect(() => {
    getStartups()
      .then(setStartups)
      .catch((error) => console.error("Failed to load startups", error));
  }, []);

  const sortedByName = useMemo(() => [...startups].sort((a, b) => a.name.localeCompare(b.name)), [startups]);

  const selected = useMemo(
    () => (selectedId === ALL_VALUE ? null : startups.find((s) => s.id === selectedId) ?? null),
    [startups, selectedId],
  );

  useEffect(() => {
    if (selectedId !== ALL_VALUE && !startups.some((s) => s.id === selectedId)) {
      setSelectedId(ALL_VALUE);
    }
  }, [startups, selectedId]);

  const aggregate = useMemo(() => {
    const rows = sortedByName;
    const totalInvested = rows.reduce((acc, s) => acc + invested(s), 0);
    const totalMark = rows.reduce((acc, s) => acc + mark(s), 0);
    const pnl = totalMark - totalInvested;
    const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
    const tvpi = totalInvested > 0 ? totalMark / totalInvested : 0;
    const active = rows.filter((s) => s.ghostStatus.heartbeat === "Active").length;
    const watch = rows.filter((s) => s.ghostStatus.heartbeat === "Warning").length;
    const irrEstimate = totalInvested > 0 ? Math.min(48, Math.max(-15, pnlPct * 0.42 + (rows.length > 3 ? 4 : 0))) : 0;
    return {
      totalInvested,
      totalMark,
      pnl,
      pnlPct,
      count: rows.length,
      tvpi,
      dpi: 0,
      rvpi: tvpi,
      irrEstimate,
      active,
      watch,
      dormant: rows.length - active - watch,
    };
  }, [sortedByName]);

  const sectorAlloc = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sortedByName) {
      m[s.sector] = (m[s.sector] ?? 0) + mark(s);
    }
    const total = Object.values(m).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(m)
      .map(([sector, v]) => ({ sector, pct: (v / total) * 100, value: v }))
      .sort((a, b) => b.pct - a.pct);
  }, [sortedByName]);

  const activityFeed = useMemo(() => {
    const items: Array<{ id: string; date: string; title: string; body: string; startup: string; slug: string; type: string }> = [];
    for (const s of sortedByName) {
      for (const u of s.updates ?? []) {
        items.push({
          id: `${s.id}-${u.id}`,
          date: u.date,
          title: u.title,
          body: u.body,
          startup: s.name,
          slug: s.slug,
          type: u.type,
        });
      }
    }
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  }, [sortedByName]);

  const aggregateChart = useMemo(() => {
    const labels = [
      "Jan", "Jan", "Feb", "Feb", "Mar", "Mar", "Apr", "Apr", "May", "May", "Jun", "Jun",
      "Jul", "Jul", "Aug", "Aug", "Sep", "Sep", "Oct", "Oct", "Nov", "Nov", "Dec", "Dec",
    ];
    const seedBase = sortedByName.reduce((acc, s) => acc + hashSeed(s.slug), 0) || 97;
    let value = Math.max(8, sortedByName.reduce((acc, s) => acc + mark(s), 0) * 0.32);
    return labels.map((label, i) => {
      const wave = Math.sin((i + seedBase % 7) * 0.72) * 1.15;
      const drift = i < 8 ? 0.95 : i < 15 ? -0.18 : 0.82;
      const shock = ((hashSeed(`${seedBase}-${i}`) % 13) - 6) * 0.24;
      value = Math.max(4, value + drift + wave + shock);
      return {
        month: label,
        value: Number(value.toFixed(1)),
      };
    });
  }, [sortedByName]);

  const singleChart = useMemo(() => {
    if (!selected) return [];
    const t = selected.traction;
    if (t?.length) {
      return t.map((row) => ({ month: row.month, value: Math.round(row.revenue / 1000) }));
    }
    const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    return months.map((m, i) => ({
      month: m,
      value: Math.round(mark(selected) * 0.06 + selected.momentum * i * 0.8 + (hashSeed(selected.slug + i) % 12)),
    }));
  }, [selected]);

  const positionPnl = selected ? mark(selected) - invested(selected) : 0;
  const positionPnlPct = selected && invested(selected) > 0 ? (positionPnl / invested(selected)) * 100 : 0;

  return (
    <AppShell
      activeSection="portfolio"
      mainClassName="flex flex-1 flex-col bg-[#f4f5f7] px-5 py-8 md:px-10 md:py-10 lg:px-14 lg:py-12"
      contentClassName="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col"
    >
      <div className="sticky top-0 z-20 -mx-5 mb-8 border-b border-zinc-200/90 bg-[#f4f5f7]/95 px-5 py-4 backdrop-blur-sm md:-mx-10 md:px-10 lg:-mx-14 lg:px-14">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">Portfolio</h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500 md:text-sm">
              LP-style overview: fund metrics, allocation, and activity. Scroll for holdings — or pick a company above.
            </p>
          </div>
          <div className="w-full sm:max-w-sm">
            <label htmlFor="holding-select" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Holding
            </label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger id="holding-select" className="h-10 w-full border-zinc-200 bg-white text-left text-sm">
                <SelectValue placeholder="Select startup" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All holdings — fund view</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-8 pb-20 md:gap-10 md:pb-24">
        <AllHoldingsView
          aggregate={aggregate}
          chartData={aggregateChart}
          rows={sortedByName}
          sectorAlloc={sectorAlloc}
          activityFeed={activityFeed}
        />
      </div>
    </AppShell>
  );
}

function AllHoldingsView({
  aggregate,
  chartData,
  rows,
  sectorAlloc,
  activityFeed,
}: {
  aggregate: {
    totalInvested: number;
    totalMark: number;
    pnl: number;
    pnlPct: number;
    count: number;
    tvpi: number;
    dpi: number;
    rvpi: number;
    irrEstimate: number;
    active: number;
    watch: number;
    dormant: number;
  };
  chartData: { month: string; value: number }[];
  rows: ApiStartup[];
  sectorAlloc: { sector: string; pct: number; value: number }[];
  activityFeed: Array<{ id: string; date: string; title: string; body: string; startup: string; slug: string; type: string }>;
}) {
  const up = aggregate.pnlPct >= 0;
  const featuredRows = rows.slice(0, 6);
  const [activeRange, setActiveRange] = useState<"1M" | "6M" | "1Y" | "ALL">("1Y");

  const rangedChartData = useMemo(() => {
    const rangeToPoints = {
      "1M": 4,
      "6M": 12,
      "1Y": 24,
      ALL: chartData.length,
    } as const;
    const points = rangeToPoints[activeRange];
    return activeRange === "ALL" ? chartData : chartData.slice(-Math.min(points, chartData.length));
  }, [activeRange, chartData]);

  const xTickInterval = rangedChartData.length > 20 ? 3 : rangedChartData.length > 10 ? 1 : 0;

  return (
    <>
      <section className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <div>
            <h2 className="text-5xl font-bold tracking-tight text-zinc-900 md:text-6xl">{formatMoney(aggregate.totalMark)}</h2>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Total portfolio value</p>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-zinc-200 pt-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Unrealized gains</p>
              <p className={`mt-1 text-2xl font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "+" : ""}{aggregate.pnlPct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Realized returns</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">—</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Total invested</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatMoney(aggregate.totalInvested)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Active inv.</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">{aggregate.active}</p>
            </div>
          </div>
        </div>

        <section className="min-w-0 rounded-sm border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-8 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Portfolio growth</h3>
            <div className="flex items-center gap-1 rounded-sm border border-zinc-200 bg-zinc-50 p-1 text-xs">
              {(["1M", "6M", "1Y", "ALL"] as const).map((range) => {
                const isActive = activeRange === range;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setActiveRange(range)}
                    className={`rounded-sm px-3 py-1 transition-colors ${
                      isActive ? "border border-zinc-200 bg-white font-semibold text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {range === "ALL" ? "All" : range}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-56 md:h-64 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rangedChartData} margin={{ top: 10, right: 4, left: 2, bottom: 4 }}>
                <defs>
                  <linearGradient id="aggFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78dca0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#78dca0" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e4e4e7" strokeDasharray="2 4" vertical={false} />
                <Area type="linear" dataKey="value" stroke="#7ee0a6" strokeWidth={2.5} fill="url(#aggFill)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} interval={xTickInterval} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} width={34} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  cursor={{ stroke: "#a1a1aa", strokeDasharray: "3 3", strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "4px", color: "#18181b" }}
                  labelStyle={{ color: "#71717a", fontSize: "11px" }}
                  itemStyle={{ color: "#16a34a", fontSize: "12px", fontWeight: 600 }}
                  formatter={(val: number) => [`${val.toFixed(1)} USD`, "Value"]}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Active investments</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featuredRows.map((company) => {
            const inv = invested(company);
            const mk = mark(company);
            const weight = aggregate.totalMark > 0 ? (mk / aggregate.totalMark) * 100 : 0;
            const insight = company.updates?.[0]?.title ?? (company.ghostStatus.heartbeat === "Active" ? "Momentum remains healthy across core metrics." : "Monitoring progress and upcoming milestones.");
            const positive = moic(company) >= 1;
            return (
              <article key={company.id} className="relative overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm">
                <div className={`absolute left-0 top-0 h-1 w-full ${positive ? "bg-primary" : "bg-zinc-300"}`} />
                <div className="space-y-5 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-zinc-900">{company.name}</h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">{company.sector}</p>
                    </div>
                    <span className="rounded-sm bg-zinc-100 px-2 py-1 text-xs font-medium text-primary">{weight.toFixed(0)}% Port.</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Invested</span>
                      <span className="text-sm font-medium text-zinc-900">{formatMoney(inv)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Valuation</span>
                      <span className="text-sm font-medium text-zinc-900">{formatMoney(mk)}</span>
                    </div>
                  </div>
                  <div className={`rounded-sm border p-3 text-sm leading-relaxed ${positive ? "border-primary/20 bg-primary/5 text-zinc-800" : "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>
                    {positive ? <TrendingUp className="mr-2 inline h-4 w-4 text-primary" /> : <Activity className="mr-2 inline h-4 w-4 text-zinc-500" />}
                    {insight}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <section className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Allocation by sector</h2>
          <ul className="space-y-4">
            {sectorAlloc.length === 0 ? (
              <li className="text-sm text-zinc-500">No data</li>
            ) : (
              sectorAlloc.map((s) => (
                <li key={s.sector}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-zinc-800">{s.sector}</span>
                    <span className="tabular-nums text-zinc-500">{s.pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.min(100, s.pct)}%` }} />
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Top sector</p>
              <p className="mt-1 font-medium text-zinc-900">{sectorAlloc[0]?.sector ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Top 3 concentration</p>
              <p className="mt-1 font-medium text-zinc-900">{sectorAlloc.slice(0, 3).reduce((acc, item) => acc + item.pct, 0).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Sector count</p>
              <p className="mt-1 font-medium text-zinc-900">{sectorAlloc.length}</p>
            </div>
          </div>
        </section>

        <section className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-500" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Recent activity</h2>
          </div>
          <ul className="space-y-4 text-sm">
            {activityFeed.length === 0 ? (
              <li className="text-zinc-500">No portfolio updates yet.</li>
            ) : (
              activityFeed.slice(0, 7).map((a) => (
                <li key={a.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                  <p className="text-xs text-zinc-400">{a.date}</p>
                  <Link to="/startup/$slug" params={{ slug: a.slug }} className="mt-1 inline-block font-semibold text-primary hover:underline">
                    {a.startup}
                  </Link>
                  <p className="mt-1 line-clamp-2 leading-relaxed text-zinc-700">{a.title}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-4 md:px-6 md:py-5">
          <h2 className="text-sm font-bold text-zinc-900 md:text-base">Holdings</h2>
          <p className="mt-1 text-xs text-zinc-500 md:text-sm">
            Stage, health, and return — click a row for company detail.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 md:px-6">Company</th>
                <th className="px-4 py-3 md:px-6">Stage</th>
                <th className="px-4 py-3 md:px-6">Sector</th>
                <th className="px-4 py-3 md:px-6">Status</th>
                <th className="px-4 py-3 text-right md:px-6">Invested</th>
                <th className="px-4 py-3 text-right md:px-6">Mark</th>
                <th className="px-4 py-3 text-right md:px-6">MOIC</th>
                <th className="px-4 py-3 text-right md:px-6">Return</th>
                <th className="px-4 py-3 md:px-6">Last update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((company) => {
                const inv = invested(company);
                const mk = mark(company);
                const m = moic(company);
                const retPct = inv > 0 ? ((mk - inv) / inv) * 100 : 0;
                const pos = retPct >= 0;
                const last = company.updates?.[0]?.date ?? `${company.ghostStatus.daysSinceLastUpdate}d ago`;
                const hb = company.ghostStatus.heartbeat;
                const statusClass =
                  hb === "Active" ? "bg-emerald-500/10 text-emerald-800" : hb === "Warning" ? "bg-amber-500/10 text-amber-800" : "bg-zinc-100 text-zinc-600";
                return (
                  <tr key={company.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-3.5 font-medium text-zinc-900 md:px-6">{company.name}</td>
                    <td className="px-4 py-3.5 text-zinc-600 md:px-6">{company.stage}</td>
                    <td className="px-4 py-3.5 text-zinc-600 md:px-6">{company.sector}</td>
                    <td className="px-4 py-3.5 md:px-6">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusClass}`}>{hb}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-zinc-800 md:px-6">{formatMoneyOneDecimal(inv)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-zinc-800 md:px-6">{formatMoneyOneDecimal(mk)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-medium text-zinc-900 md:px-6">{m.toFixed(2)}x</td>
                    <td className={`px-4 py-3.5 text-right tabular-nums font-semibold md:px-6 ${pos ? "text-emerald-600" : "text-red-600"}`}>
                      {pos ? "+" : ""}
                      {retPct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 md:px-6">{last}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <p className="px-6 py-10 text-center text-sm text-zinc-500">No holdings loaded.</p> : null}
      </section>
    </>
  );
}

function SingleHoldingView({
  company,
  chartData,
  positionPnl,
  positionPnlPct,
  rows,
  onSelectRow,
}: {
  company: ApiStartup;
  chartData: { month: string; value: number }[];
  positionPnl: number;
  positionPnlPct: number;
  rows: ApiStartup[];
  onSelectRow: (id: string) => void;
}) {
  const inv = invested(company);
  const mk = mark(company);
  const up = positionPnlPct >= 0;
  const m = moic(company);
  const own = ownershipIllustrative(company);
  const entryPost = company.valuation;
  const lastT = company.traction?.[company.traction.length - 1];

  return (
    <>
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-zinc-900 md:text-2xl">{company.name}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 md:text-base">{company.tagline}</p>
          </div>
          <Link
            to="/startup/$slug"
            params={{ slug: company.slug }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
          >
            Profile
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-sm font-bold text-zinc-900 md:text-base">Operating &amp; revenue trend</h2>
        <div className="h-64 md:h-80 lg:h-[22rem]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} width={36} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-zinc-500">No series.</p>
          )}
        </div>
        <p className="mt-4 text-xs text-zinc-500 md:text-sm">
          {company.traction?.length ? "Indexed from self-reported traction." : "Synthetic series when filings are not connected."}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-zinc-500 md:text-sm">Investment terms</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3">
              <dt className="text-zinc-500">Security</dt>
              <dd className="text-right font-medium text-zinc-900">SAFE · MFN</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3">
              <dt className="text-zinc-500">Ownership (est.)</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">{own}%</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3">
              <dt className="text-zinc-500">Invested</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">{formatMoney(inv)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3">
              <dt className="text-zinc-500">Current mark</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">{formatMoney(mk)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3">
              <dt className="text-zinc-500">MOIC</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">{m.toFixed(2)}x</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3">
              <dt className="text-zinc-500">Post-money (ref.)</dt>
              <dd className="tabular-nums text-zinc-900">{formatMoney(entryPost)}</dd>
            </div>
            <div className="flex justify-between gap-4 pt-1">
              <dt className="text-zinc-500">P&amp;L</dt>
              <dd className={`font-semibold tabular-nums ${up ? "text-emerald-600" : "text-red-600"}`}>
                {formatMoney(positionPnl)} ({up ? "+" : ""}
                {positionPnlPct.toFixed(1)}%)
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-zinc-500 md:text-sm">Health &amp; data</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3">
              <dt className="text-zinc-500">Reporting</dt>
              <dd>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                    company.ghostStatus.heartbeat === "Active"
                      ? "bg-emerald-500/10 text-emerald-800"
                      : "bg-amber-500/10 text-amber-800"
                  }`}
                >
                  {company.ghostStatus.heartbeat}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3">
              <dt className="text-zinc-500">Days since update</dt>
              <dd className="tabular-nums text-zinc-900">{company.ghostStatus.daysSinceLastUpdate}</dd>
            </div>
            <div className="flex justify-between gap-4 pb-3">
              <dt className="text-zinc-500">EVS tier</dt>
              <dd className="text-right text-zinc-900">
                {company.evs.tier} ({company.evs.total})
              </dd>
            </div>
          </dl>
          {lastT ? (
            <div className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
              <span className="font-semibold text-zinc-800">Latest traction ({lastT.month}):</span>{" "}
              {formatMoney(lastT.revenue)} rev · {lastT.users.toLocaleString()} users
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-sm font-bold text-zinc-900 md:text-base">Company</h2>
          <p className="text-sm leading-relaxed text-zinc-600 md:text-base">{company.description}</p>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 md:text-sm">
            <span>{company.location}</span>
            <span className="text-zinc-300">·</span>
            <span>Founded {company.founded}</span>
            <span className="text-zinc-300">·</span>
            <span>{company.stage}</span>
            <span className="text-zinc-300">·</span>
            <span>{company.sector}</span>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-zinc-500 md:text-sm">EVS breakdown</h3>
          <ul className="space-y-3 text-sm">
            {(
              [
                ["Trajectory", company.evs.metricTrajectory],
                ["Updates", company.evs.updateConsistency],
                ["Milestones", company.evs.milestoneDelivery],
                ["Founders", company.evs.founderResponsiveness],
                ["Verification", company.evs.dataVerificationLevel],
                ["Community", company.evs.communitySignals],
              ] as const
            ).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                <span className="text-zinc-600">{k}</span>
                <span className="tabular-nums font-medium text-zinc-900">{v}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {company.founders?.length ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-sm font-bold text-zinc-900 md:text-base">Founders</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {company.founders.map((f) => (
              <li key={f.name} className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-3 text-sm">
                <p className="font-semibold text-zinc-900">{f.name}</p>
                <p className="mt-0.5 text-zinc-500">{f.role}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {company.updates?.length ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-sm font-bold text-zinc-900 md:text-base">Updates &amp; insights</h2>
          <ul className="divide-y divide-zinc-100">
            {company.updates.slice(0, 6).map((u) => (
              <li key={u.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-400">{u.date}</span>
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">{u.type}</span>
                </div>
                <p className="mt-2 font-medium text-zinc-900">{u.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{u.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 md:text-base">All holdings</h2>
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
            onClick={() => onSelectRow(ALL_VALUE)}
          >
            Back to fund view
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => {
            const isActive = item.id === company.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectRow(item.id)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  isActive ? "border-primary bg-primary/5" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.sector} · {item.stage}
                </p>
                <p className="mt-2 text-xs font-medium text-zinc-700">
                  Mark {formatMoney(mark(item))} · MOIC {moic(item).toFixed(2)}x
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
