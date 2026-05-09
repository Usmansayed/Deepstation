import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  ChartBar,
  CreditCard,
  ExternalLink,
  Layers,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  formatMoney,
  getStartups,
  runDueDiligence,
  type ApiStartup,
  type DueDiligenceReport,
} from "@/lib/api";

export const Route = createFileRoute("/vc")({
  component: VC,
});

function VC() {
  const [startups, setStartups] = useState<ApiStartup[]>([]);
  const sorted = useMemo(() => [...startups].sort((a, b) => b.momentum - a.momentum), [startups]);
  const [selected, setSelected] = useState<ApiStartup | null>(null);
  const [report, setReport] = useState<DueDiligenceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState<"all" | "active">("all");

  useEffect(() => {
    getStartups()
      .then((data) => {
        setStartups(data);
        setSelected(data[0] ?? null);
      })
      .catch((error) => console.error("Failed to load startups", error));
  }, []);

  const generate = async () => {
    if (!selected) return;
    setLoading(true);
    setReport(null);
    try {
      const result = await runDueDiligence(selected.slug);
      setReport(result);
    } catch (error) {
      console.error("Failed to run due diligence", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="flex min-h-screen overflow-hidden">
        <aside className="hidden w-64 flex-col border-r border-border bg-muted/20 lg:flex">
          <div className="p-6">
            <div className="mb-8 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap size={18} />
              </span>
              <span className="text-xl font-bold tracking-tight">VentureFlow</span>
            </div>
            <nav className="space-y-1 text-sm">
              <Link
                to="/vc"
                className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 font-bold text-primary"
              >
                <ChartBar size={16} />
                Dashboard
              </Link>
              <Link to="/portfolio" className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground hover:bg-muted">
                <Layers size={16} />
                Portfolio
              </Link>
              <Link to="/discover" className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground hover:bg-muted">
                <Search size={16} />
                Discover
              </Link>
              <Link to="/messages" className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground hover:bg-muted">
                <Bell size={16} />
                Updates
              </Link>
              <Link to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground hover:bg-muted">
                <Settings size={16} />
                Settings
              </Link>
            </nav>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <header className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold">Investor Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, Alex. Your portfolio is up 12.4% this year.</p>
            </div>
            <Link
              to="/messages"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Open inbox"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-background bg-destructive" />
            </Link>
          </header>

          <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard size={18} />
                </span>
                <span className="text-xs font-bold text-tertiary">+8.2%</span>
              </div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Total Invested</p>
              <p className="text-2xl font-extrabold">$42,500.00</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                  <Layers size={18} />
                </span>
              </div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Active Investments</p>
              <p className="text-2xl font-extrabold">{sorted.length} Companies</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Calendar size={18} />
                </span>
              </div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Next Payout</p>
              <p className="text-2xl font-extrabold">Sept 12, 2024</p>
            </article>
          </section>

          <section className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold">Growth Performance</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart
                    data={sorted.slice(0, 6).map((item, index) => ({
                      month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][index],
                      value: Math.round(item.raising / 1000),
                    }))}
                  >
                    <defs>
                      <linearGradient id="portfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0052FF" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#0052FF" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748B" }} />
                    <YAxis hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#0052FF" strokeWidth={2} fill="url(#portfolio)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-bold">Recent Activity</h2>
              <div className="space-y-6 text-sm text-muted-foreground">
                <p>Investment Confirmed - You invested $5,000 in SolarGrid.</p>
                <p>New Update Posted - A new milestone update is available.</p>
                <p>Tax Document Ready - Download your latest K-1.</p>
              </div>
            </article>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">My Portfolio</h2>
              <button
                type="button"
                onClick={() => setPortfolioFilter((f) => (f === "all" ? "active" : "all"))}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {portfolioFilter === "all" ? "Show active only" : "Show all"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Invested</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Current Value</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted
                    .slice(0, 3)
                    .map((company, index) => ({ company, index }))
                    .filter(({ index }) => (portfolioFilter === "active" ? index !== 2 : true))
                    .map(({ company, index }) => (
                    <tr key={company.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <button type="button" className="flex items-center gap-3" onClick={() => setSelected(company)}>
                          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                            {company.name[0]}
                          </span>
                          <span className="text-sm font-bold">{company.name}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{formatMoney(company.raising / 4)}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${index === 2 ? "bg-muted text-muted-foreground" : "bg-tertiary/10 text-tertiary"}`}>
                          {index === 2 ? "Pending" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">{formatMoney(company.raising / 3)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link to="/startup/$slug" params={{ slug: company.slug }} className="text-muted-foreground hover:text-primary">
                          <ExternalLink size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selected && (
            <section className="mt-8 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">AI Due Diligence for {selected.name}</p>
                <button onClick={generate} disabled={loading} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  {loading ? "Analyzing..." : "Generate AI insight"}
                </button>
              </div>
              {(loading || report) && (
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {loading ? "Analyzing verified startup data..." : report?.findings.join(" ")}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
