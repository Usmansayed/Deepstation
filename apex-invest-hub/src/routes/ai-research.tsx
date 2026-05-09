import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  Globe,
  MessageSquareText,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Waves,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AiResearchAssistantFloating } from "@/components/ai-research-assistant-floating";
import { showAppWidget } from "@/lib/feature-widget";
import { useAiResearchIndex } from "@/lib/ai-research-data";
import type { AiResearchCompany as CompanyCard } from "@/lib/data-schemas";
import { formatMoney } from "@/lib/api";

export type { CompanyCard };

export const Route = createFileRoute("/ai-research")({
  component: AiResearchRoute,
});

function MiniLine({ values }: { values: number[] }) {
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - v}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-16 w-full">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        points={points}
        className="text-primary"
      />
    </svg>
  );
}

function AiResearchRoute() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetailRoute = pathname.startsWith("/ai-research/") && pathname !== "/ai-research/";
  const { data: catalog, error: catalogError, companies } = useAiResearchIndex();
  const activityFeed = catalog?.activityFeed ?? [];
  const reasoningTimeline = catalog?.reasoningTimeline ?? [];

  const thesisFileRef = useRef<HTMLInputElement>(null);

  const deskStatTiles = useMemo(() => {
    const desk = catalog?.deskStats;
    const avgConf = companies.length
      ? Math.round(companies.reduce((acc, co) => acc + co.confidence, 0) / companies.length)
      : 0;
    if (!desk) {
      return [
        ["Wefunder campaigns", "—"],
        ["Listings linked", "—"],
        ["Capital in scrape", "—"],
        ["Avg conviction", avgConf ? `${avgConf}%` : "—"],
      ] as const;
    }
    return [
      ["Wefunder campaigns", String(desk.campaignsInIndex)],
      ["Listings × campaigns", String(desk.linkedPairs)],
      ["Capital in scrape", formatMoney(desk.totalRaisedUsd)],
      ["Avg conviction", `${avgConf}%`],
    ] as const;
  }, [catalog, companies]);

  const topSectorTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const co of companies) {
      counts.set(co.sector, (counts.get(co.sector) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label]) => label);
  }, [companies]);

  const interestSections = useMemo(() => {
    const c = companies;
    const safe = (i: number) => c[Math.min(i, c.length - 1)];
    return [
      {
        id: "for-you",
        label: "For You",
        title: "AI startups matched to your investing profile",
        description:
          "Ranked by your recent focus: AI infrastructure, workflow automation, and high signal-to-noise execution updates.",
        items: [safe(0), safe(2), safe(3)],
      },
      {
        id: "high-conviction",
        label: "High Conviction",
        title: "Most actionable setups this week",
        description: "Strong confidence + improving timing + attractive risk-adjusted upside.",
        items: [safe(0), safe(2), safe(1)],
      },
      {
        id: "emerging-signals",
        label: "Emerging Signals",
        title: "Early opportunities with asymmetric upside",
        description:
          "Still forming, but showing unusual traction signals in hiring, sentiment, and insider behavior.",
        items: [safe(1), safe(3), safe(0)],
      },
    ];
  }, [companies]);

  if (isDetailRoute) {
    return <Outlet />;
  }

  if (catalogError) {
    return (
      <AppShell activeSection="research">
        <p className="text-sm text-destructive">
          Could not load research catalog. Is the API running?
        </p>
      </AppShell>
    );
  }

  if (!catalog || companies.length === 0) {
    return (
      <AppShell activeSection="research">
        <p className="text-sm text-muted-foreground">Loading research data…</p>
      </AppShell>
    );
  }

  return (
    <AppShell activeSection="research">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-6 text-slate-100 shadow-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.15),transparent_50%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                <BrainCircuit size={12} />
                Autonomous AI Research Engine
              </p>
              <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-4xl">
                AI continuously analyzes markets, companies, sentiment, and capital flows in real
                time.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                Desk is wired to real Reg CF data: each row joins{" "}
                <span className="font-medium text-cyan-100">data/wefunder/raw/campaigns.json</span>{" "}
                with the structured listing export by slug — facts, revenue, cash, investor counts,
                and funding velocity come from the scrape.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                  onClick={() => {
                    showAppWidget(
                      "Market-wide scan",
                      "Refreshing signals across crowdfunded and institutional cohorts (demo).",
                    );
                    navigate({
                      to: "/ai-research/$companyId",
                      params: { companyId: companies[0].id },
                    });
                  }}
                >
                  Start Analysis
                </button>
                <Link
                  to="/ai-research/$companyId"
                  params={{ companyId: companies[0].id }}
                  className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium"
                >
                  Analyze Company
                </Link>
                <input
                  ref={thesisFileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    showAppWidget(
                      "Thesis received",
                      file ? `${file.name} is queued for NLP parsing (demo).` : "No file selected.",
                    );
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium"
                  onClick={() => thesisFileRef.current?.click()}
                >
                  <Upload size={14} />
                  Upload Investment Thesis
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {deskStatTiles.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {topSectorTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="space-y-4">
            {interestSections.map((section) => (
              <article key={section.id} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {section.label}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">{section.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>

                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                  {section.items.map((company) => (
                    <Link
                      key={`${section.id}-${company.id}`}
                      to="/ai-research/$companyId"
                      params={{ companyId: company.id }}
                      className="min-w-[275px] snap-start overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary/40 hover:bg-muted/40"
                    >
                      <img
                        src={company.image}
                        alt={company.name}
                        className="h-36 w-full object-cover"
                      />
                      <div className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{company.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {company.ticker} · {company.sector}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {company.confidence}%
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {company.thesis}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5">{company.timing}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            {company.risk} risk
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <AiResearchAssistantFloating
        title="Autonomous AI Assistant"
        subtitle="Market-wide research desk"
        activityFeed={activityFeed}
        reasoningTimeline={reasoningTimeline}
      />
    </AppShell>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Icon size={16} className="text-muted-foreground" />
      </div>
      {children}
    </article>
  );
}

function WorkspacePanel({ title, icon: Icon }: { title: string; icon: typeof Activity }) {
  const copyByTitle: Record<string, { summary: string; details: string; trend: number[] }> = {
    "Financial Analysis & Growth Charts": {
      summary:
        "Revenue quality improved over the last 4 quarters with stronger retention-driven expansion rather than one-off contract spikes.",
      details:
        "AI model confidence increases when growth consistency, margin expansion, and cash efficiency move in the same direction for at least two sequential quarters.",
      trend: [22, 28, 33, 41, 47, 56, 63, 71],
    },
    "Competitive Landscape & Market Positioning": {
      summary:
        "The company is gaining share in its core segment while competitors are trading off growth for margin stabilization.",
      details:
        "Positioning score combines feature velocity, enterprise conversion rate, and pricing power against peer clusters.",
      trend: [31, 35, 39, 42, 48, 55, 57, 62],
    },
    "AI-generated Investment Thesis": {
      summary:
        "Current setup favors a measured accumulation strategy due to favorable demand signals and improving operational leverage.",
      details:
        "Base case supports upside continuation; downside risk is primarily execution drift rather than category collapse.",
      trend: [26, 24, 33, 38, 44, 49, 58, 66],
    },
    "Risk Factors & Scenario Simulations": {
      summary:
        "Primary risks include delayed enterprise sales cycles, margin compression from aggressive competitor pricing, and concentration in two key channels.",
      details:
        "Stress tests show acceptable downside under moderate macro slowdown; severe downside requires both demand shock and execution miss.",
      trend: [61, 58, 55, 53, 50, 47, 45, 43],
    },
    "Source References & Citation Integrity": {
      summary:
        "References are cross-validated across filings, earnings materials, reputable market datasets, and tracked company disclosures.",
      details:
        "The assistant weighs conflicting sources by historical reliability score and recency before final confidence calibration.",
      trend: [40, 44, 49, 53, 56, 61, 64, 69],
    },
    "AI Reasoning Chain": {
      summary:
        "Reasoning path is explicit: detect signal -> validate with external evidence -> compare peer baselines -> generate recommendation.",
      details:
        "Each recommendation includes traceable assumptions so investors can challenge or re-run the thesis with different parameters.",
      trend: [28, 34, 37, 43, 48, 52, 60, 65],
    },
    "Research Action Timeline": {
      summary:
        "Actions are sequenced from discovery to synthesis, ensuring the thesis is supported by progressively stronger evidence layers.",
      details:
        "Timeline confidence rises as independent data streams converge on the same directional conclusion.",
      trend: [19, 26, 32, 40, 46, 54, 61, 67],
    },
  };
  const copy = copyByTitle[title] ?? {
    summary: "AI-generated section summary with evidence-backed interpretation.",
    details: "Structured reasoning with transparent assumptions and source validation.",
    trend: [20, 28, 35, 44, 52, 59, 63, 68],
  };

  return (
    <section className="rounded-xl border border-border/60 bg-card/70 p-4">
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
        <h4 className="text-[0.92rem] font-semibold text-foreground">{title}</h4>
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90">{copy.summary}</p>
        <MiniLine values={copy.trend} />
        <p className="text-xs leading-relaxed text-muted-foreground">{copy.details}</p>
      </div>
    </section>
  );
}
