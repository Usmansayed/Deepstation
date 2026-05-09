import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { AiResearchAssistantFloating } from "@/components/ai-research-assistant-floating";
import { fetchDossierForCompany, useAiResearchIndex } from "@/lib/ai-research-data";
import { formatMoney } from "@/lib/api";
import type { WefunderSnapshotPayload } from "@/lib/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/ai-research/$companyId")({
  component: AiResearchCompanyRoute,
});

const CHART_PRIMARY = "hsl(221, 100%, 50%)";
const CHART_MUTED = "hsl(215, 16%, 47%)";

type MemoContent = {
  oneLiner: string;
  /** Single scannable line: what they do + wedge (exec snapshot) */
  snapshotLine: string;
  sentiment: string;
  overview: string;
  thesis: string;
  whyBullets: string[];
  supportingSignals: string[];
  marketOpportunity: string;
  competitiveAdvantage: string;
  risks: string[];
  reasoningNarrative: string;
  investorSummary: string[];
  chartCaption: string;
  chartValues: number[];
  secondaryInsight: { title: string; body: string };
};

type MetricSnapshot = {
  label: string;
  value: string;
  delta?: string;
  implication: string;
};

type EvidenceBlock = {
  headline: string;
  supportingSignal: string;
  confidence: "high" | "medium" | "emerging";
  implication: string;
  inference: string;
};

type AiSignal = { text: string; kind: "up" | "steady" | "watch" };

type IntelLayer = {
  marketSentimentScore: string;
  growthTrajectory: string;
  riskProfile: string;
  momentumTags: string[];
  /** One-line anchor for the executive summary */
  primaryGrowthSignal: string;
  /** Strategic framing: why timing matters now */
  whyNow: string;
  /** Macro / sector tailwind in one breath */
  structuralTailwind: string;
  /** e.g. "Quality compounder" — shown in hero */
  opportunityType: string;
  /** Opens the unified Evidence & signals section */
  evidenceSectionIntro: string;
  chartConvictionProves: string;
  chartConvictionInterpretation: string;
  chartPositioningProves: string;
  chartPositioningInterpretation: string;
  chartSentimentProves: string;
  chartSentimentInterpretation: string;
  /** Intro copy for the risks section (intellectual honesty) */
  riskFraming: string;
  aiReasoningTimeline: string[];
  metrics: MetricSnapshot[];
  positioningPeers: { name: string; score: number }[];
  sentimentSeries: { period: string; net: number }[];
  evidence: EvidenceBlock[];
  aiSignals: AiSignal[];
  aiDetected: string[];
  marketAnalysis: string;
  competitorBreakdown: string;
  sentimentDeepDive: string;
  fundingHistory: string;
  riskScenarios: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function confidenceLabel(c: number) {
  if (c >= 85) return "High conviction";
  if (c >= 75) return "Strong";
  if (c >= 65) return "Constructive";
  return "Conditional";
}

function AiResearchCompanyRoute() {
  const { companyId } = Route.useParams();
  const { data: catalog, error: catalogError, companies } = useAiResearchIndex();
  const selected = companies.find((company) => company.id === companyId);
  const [dossier, setDossier] = useState<{ memo: MemoContent; intel: IntelLayer } | null>(null);
  const [wefunder, setWefunder] = useState<WefunderSnapshotPayload | null>(null);
  const [dossierError, setDossierError] = useState<Error | null>(null);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setDossier(null);
    setWefunder(null);
    setDossierError(null);
    fetchDossierForCompany(selected.id)
      .then((row) => {
        if (cancelled) return;
        setDossier({ memo: row.memo as MemoContent, intel: row.intel as IntelLayer });
        setWefunder(row.wefunder ?? null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setDossierError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const memo = dossier?.memo ?? null;
  const intel = dossier?.intel ?? null;

  const compositeSeries = useMemo(() => {
    if (!memo) return [];
    return memo.chartValues.map((v, i) => ({
      month: MONTHS[i] ?? `M${i + 1}`,
      index: v,
    }));
  }, [memo]);

  const keySignals = useMemo(() => (intel ? intel.aiDetected.slice(0, 5) : []), [intel]);

  const takeawayBlurb = useMemo(() => memo?.investorSummary.join(" ") ?? "", [memo]);

  const sidebarSignalLabels = ["Primary signal", "Quality check", "Operating read"];

  if (catalogError || dossierError) {
    return (
      <AppShell activeSection="research">
        <div className="rounded-xl border border-border/60 bg-card/50 px-6 py-10">
          <p className="text-sm text-destructive">
            Could not load research data. Is the API running?
          </p>
          <Link
            to="/ai-research"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <ArrowLeft size={14} />
            Back to AI Research
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!catalog || !selected || !memo || !intel) {
    return (
      <AppShell activeSection="research">
        <div className="rounded-xl border border-border/60 bg-card/50 px-6 py-10">
          <p className="text-sm text-muted-foreground">
            {!catalog || companies.length === 0
              ? "Loading research catalog…"
              : !selected
                ? "This company is not in the catalog."
                : "Loading dossier…"}
          </p>
          {!selected ? (
            <Link
              to="/ai-research"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              <ArrowLeft size={14} />
              Back to AI Research
            </Link>
          ) : null}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeSection="research"
      mainClassName="flex-1 px-3 py-5 sm:px-4 sm:py-6 md:px-5 lg:px-6"
      contentClassName="mx-auto w-full min-w-0 max-w-4xl xl:max-w-5xl"
    >
      <article className="min-w-0 pb-24">
        <Link
          to="/ai-research"
          className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          AI Research
        </Link>

        {wefunder ? (
          <section className="mb-8 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.07] p-4 dark:bg-cyan-950/40 md:p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
              Wefunder campaign · campaigns.json #{wefunder.campaignId}
            </p>
            <p className="text-sm font-medium leading-snug text-foreground">{wefunder.fact}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <p className="mt-0.5 font-medium capitalize text-foreground">
                  {wefunder.label.replace(/_/g, " ")} · {wefunder.percentFunded}% funded
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Annual revenue
                </p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {wefunder.annualRevenue != null ? formatMoney(wefunder.annualRevenue) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Cash in bank
                </p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {wefunder.cashInBank != null ? formatMoney(wefunder.cashInBank) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Investors
                </p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {wefunder.investorCount?.toLocaleString() ??
                    wefunder.totalInvestorsThisCampaign?.toLocaleString() ??
                    "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  7d / 30d flow
                </p>
                <p className="mt-0.5 text-xs font-medium tabular-nums text-foreground">
                  {wefunder.fundingPastWeek != null ? formatMoney(wefunder.fundingPastWeek) : "—"} ·{" "}
                  {wefunder.fundingPastMonth != null ? formatMoney(wefunder.fundingPastMonth) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quality score
                </p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {wefunder.qualityScore.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 sm:col-span-2 xl:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Terms
                </p>
                <p className="mt-0.5 text-xs text-foreground">{wefunder.termsHeadline}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Security: {wefunder.securityType}
                </p>
              </div>
            </div>
            {wefunder.tagLabels.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {wefunder.tagLabels.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Executive summary hero (reference layout) */}
        <header className="mb-10 border-b border-border pb-8 pt-2 md:mb-12">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:gap-8">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {selected.sector}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ticker: {selected.ticker}
                </span>
              </div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                {selected.name}
              </h1>
              <p className="mb-6 mt-2 max-w-2xl text-lg font-medium leading-snug text-muted-foreground md:text-xl">
                {memo.snapshotLine}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {memo.sentiment}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  Horizon: {selected.timing}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{memo.oneLiner}</p>
            </div>
            <ConfidenceOrb
              compact
              percent={selected.confidence}
              subtitle={confidenceLabel(selected.confidence)}
            />
          </div>
        </header>

        {/* Key metrics snapshot — 4-up grid */}
        <section className="mb-10 md:mb-12">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {intel.metrics.slice(0, 4).map((m) => (
              <div key={m.label} className="flex flex-col rounded border border-border bg-card p-4">
                <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </span>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                    {m.value}
                  </span>
                  {m.delta ? (
                    <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {m.delta}
                    </span>
                  ) : null}
                </div>
                <p className="mt-auto text-sm leading-snug text-muted-foreground">
                  {m.implication}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Main canvas: thesis + chart | sidebar */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:mb-12 xl:grid-cols-12 xl:gap-6 2xl:gap-8">
          <div className="flex min-w-0 flex-col gap-10 xl:col-span-8 xl:gap-12">
            <section>
              <h2 className="mb-4 border-b border-border pb-2 font-heading text-lg font-semibold text-foreground md:text-xl">
                Investment thesis
              </h2>
              <div className="max-w-none space-y-4 text-base leading-relaxed text-foreground md:text-[1.0625rem] md:leading-[1.65]">
                <p>{memo.thesis}</p>
                <p className="text-foreground/90">{memo.competitiveAdvantage}</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 border-b border-border pb-2 font-heading text-lg font-semibold text-foreground md:text-xl">
                Visual evidence: conviction build
              </h2>
              <div className="relative flex min-h-[280px] flex-col justify-end rounded border border-border bg-card p-3 sm:p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {intel.chartConvictionProves}
                </p>
                <div className="relative z-0 h-48 w-full min-w-0 sm:h-56 md:h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={compositeSeries}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="convictionFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 6"
                        vertical={false}
                        stroke="hsl(214, 32%, 91%)"
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: CHART_MUTED, fontSize: 10 }}
                        dy={4}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: CHART_MUTED, fontSize: 10 }}
                        width={28}
                        domain={["dataMin - 4", "dataMax + 4"]}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid hsl(214, 32%, 91%)",
                          fontSize: 11,
                        }}
                      />
                      <ReferenceLine
                        y={compositeSeries[Math.floor(compositeSeries.length / 2)]?.index}
                        stroke={CHART_PRIMARY}
                        strokeDasharray="4 4"
                        strokeOpacity={0.35}
                      />
                      <Area
                        type="monotone"
                        dataKey="index"
                        stroke={CHART_PRIMARY}
                        strokeWidth={2}
                        fill="url(#convictionFill)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="relative z-10 mt-4 inline-block max-w-md rounded border border-border bg-background/90 px-3 py-3 shadow-sm backdrop-blur-sm">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Key observation
                  </p>
                  <p className="text-sm leading-snug text-foreground">
                    {intel.chartConvictionInterpretation}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-8 xl:col-span-4">
            <section>
              <h3 className="mb-4 border-b border-border pb-2 font-heading text-lg font-semibold text-foreground">
                Key signals
              </h3>
              <div className="flex flex-col gap-3">
                {intel.aiSignals.slice(0, 3).map((sig, i) => {
                  const borderLeft =
                    sig.kind === "up"
                      ? "border-l-primary"
                      : sig.kind === "watch"
                        ? "border-l-amber-500"
                        : "border-l-emerald-600";
                  const Icon =
                    sig.kind === "up" ? TrendingUp : sig.kind === "watch" ? AlertTriangle : Lock;
                  const iconClass =
                    sig.kind === "up"
                      ? "text-primary"
                      : sig.kind === "watch"
                        ? "text-amber-600"
                        : "text-emerald-600 dark:text-emerald-400";
                  return (
                    <div
                      key={`${sig.text}-${i}`}
                      className={`rounded border border-border bg-card p-3 border-l-4 ${borderLeft}`}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {sidebarSignalLabels[i] ?? "Signal"}
                        </span>
                        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
                      </div>
                      <p className="mb-1 font-mono text-sm text-foreground">{sig.text}</p>
                      <p className="text-xs leading-snug text-muted-foreground">
                        {keySignals[i] ?? memo.supportingSignals[i] ?? "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded border border-border bg-muted/30 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                Risk factors
              </h3>
              <p className="mb-3 text-xs leading-snug text-muted-foreground">{intel.riskFraming}</p>
              <ul className="list-disc space-y-2 pl-4 text-sm leading-snug text-foreground">
                {memo.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </section>

            <section className="rounded border border-primary/20 bg-primary/5 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                Investor takeaway
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{takeawayBlurb}</p>
            </section>
          </aside>
        </div>

        {/* Deep research */}
        <section className="border-t border-border pt-8">
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground md:text-xl">
            Deep research
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Context, peer charts, metrics, and model trace — expand as needed.
          </p>
          <Accordion type="single" collapsible className="w-full rounded-md border border-border">
            <AccordionItem value="context" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Company &amp; market context
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">What they do — </span>
                  {memo.overview}
                </p>
                <p>
                  <span className="font-medium text-foreground">Market — </span>
                  {memo.marketOpportunity}
                </p>
                <p>
                  <span className="font-medium text-foreground">Tailwind — </span>
                  {intel.structuralTailwind}
                </p>
                <p>
                  <span className="font-medium text-foreground">Why now — </span>
                  {intel.whyNow}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    {memo.secondaryInsight.title} —{" "}
                  </span>
                  {memo.secondaryInsight.body}
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="drivers" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Thesis drivers &amp; cross-checks
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc space-y-1 pl-4">
                  {memo.whyBullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <ul className="list-disc space-y-1 pl-4">
                  {memo.supportingSignals.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="model" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Model feature flags
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {intel.aiSignals.map((s) => (
                    <AiSignalCard key={s.text} {...s} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="metrics" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Full metric strip
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {intel.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="min-w-[140px] flex-1 rounded-md border border-border/40 bg-muted/20 px-2 py-2"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {m.label}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {m.value}
                      </p>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {m.implication}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="evidence" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Evidence blocks
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                {intel.evidence.map((block) => (
                  <EvidenceBlockCard key={block.headline} block={block} />
                ))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sentchart" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Sentiment trajectory
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-2 text-xs text-muted-foreground">{intel.chartSentimentProves}</p>
                <p className="mb-3 text-xs leading-snug text-foreground/90">
                  <span className="font-medium">Read:</span> {intel.chartSentimentInterpretation}
                </p>
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={intel.sentimentSeries}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 6"
                        vertical={false}
                        stroke="hsl(214, 32%, 91%)"
                      />
                      <XAxis
                        dataKey="period"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: CHART_MUTED, fontSize: 10 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: CHART_MUTED, fontSize: 10 }}
                        width={24}
                        domain={["dataMin - 4", "dataMax + 6"]}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke={CHART_PRIMARY}
                        strokeWidth={2}
                        dot={{ r: 2, fill: CHART_PRIMARY, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="peers" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Peer positioning
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-2 text-xs text-muted-foreground">{intel.chartPositioningProves}</p>
                <p className="mb-3 text-xs leading-snug text-foreground/90">
                  <span className="font-medium">Read:</span> {intel.chartPositioningInterpretation}
                </p>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={intel.positioningPeers}
                      layout="vertical"
                      margin={{ top: 2, right: 8, left: 2, bottom: 2 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 6"
                        horizontal={false}
                        stroke="hsl(214, 32%, 91%)"
                      />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={82}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: CHART_MUTED, fontSize: 10 }}
                      />
                      <Tooltip cursor={{ fill: "hsl(210, 40%, 98%)" }} />
                      <Bar
                        dataKey="score"
                        radius={[0, 6, 6, 0]}
                        fill={CHART_PRIMARY}
                        opacity={0.88}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="reasoning" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Reasoning narrative
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {memo.reasoningNarrative}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="timeline" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Reasoning timeline
              </AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-muted-foreground">
                  {intel.aiReasoningTimeline.map((stepText) => (
                    <li key={stepText}>{stepText}</li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="market" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Market diagnostics
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {intel.marketAnalysis}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="comp" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Benchmark comparisons
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {intel.competitorBreakdown}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sent" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Sentiment notes
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {intel.sentimentDeepDive}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="fund" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Funding history
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {intel.fundingHistory}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="risk" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Stress scenarios
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {intel.riskScenarios}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="growth" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Primary growth signal (full)
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {intel.primaryGrowthSignal}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sources" className="border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Sources &amp; validation
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Filings and earnings text, curated alt datasets, hiring and web signals, peer
                benchmarks — conflicts resolved by reliability and recency, not averaging.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </article>

      <AiResearchAssistantFloating
        key={companyId}
        companyId={companyId}
        title="Research assistant"
        subtitle={selected.name}
        fabLabel="Ask AI"
        activityFeed={catalog?.activityFeed ?? []}
        reasoningTimeline={catalog?.reasoningTimeline ?? intel.aiReasoningTimeline}
        initialMessages={[
          {
            role: "assistant",
            text: `Ask anything about **${selected.name}** (${selected.ticker}). I’ll use this dossier and desk listings first, then the web for anything missing or time-sensitive.`,
          },
        ]}
      />
    </AppShell>
  );
}

function ConfidenceOrb({
  percent,
  subtitle,
  compact,
}: {
  percent: number;
  subtitle: string;
  compact?: boolean;
}) {
  const r = compact ? 40 : 52;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const size = compact ? 102 : 132;
  const stroke = compact ? 6 : 8;
  const cx = 60;
  const cy = 60;
  return (
    <div className={`flex flex-col items-center ${compact ? "shrink-0 sm:items-end" : ""}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="-rotate-90 transform"
          width={size}
          height={size}
          viewBox="0 0 120 120"
          aria-hidden
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="hsl(214, 32%, 91%)"
            strokeWidth={stroke}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={CHART_PRIMARY}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-semibold tabular-nums tracking-tight text-foreground ${compact ? "text-2xl" : "text-3xl"}`}
          >
            {percent}
          </span>
          <span
            className={`font-medium uppercase tracking-wider text-muted-foreground ${compact ? "text-[9px]" : "text-[10px]"}`}
          >
            score
          </span>
        </div>
      </div>
      <p
        className={`text-center font-medium text-foreground ${compact ? "mt-1 max-w-[7rem] text-[10px] leading-tight" : "mt-2 text-xs"}`}
      >
        {subtitle}
      </p>
      <p
        className={`text-center text-muted-foreground ${compact ? "mt-0.5 max-w-[7.5rem] text-[9px] leading-tight" : "mt-0.5 text-[11px]"}`}
      >
        {convictionSubcopy(percent)}
      </p>
    </div>
  );
}

function convictionSubcopy(p: number) {
  if (p >= 85) return "Corroboration stack is thick — still define falsifiers.";
  if (p >= 75) return "Lean long — proof metrics matter next.";
  if (p >= 65) return "Workable long — execution still the swing factor.";
  return "Show-me — upside needs clean prints.";
}

function AiSignalCard({ text, kind }: AiSignal) {
  const border =
    kind === "up"
      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
      : kind === "watch"
        ? "border-amber-500/25 bg-amber-500/[0.06]"
        : "border-border/50 bg-muted/20";
  const dot =
    kind === "up" ? "bg-emerald-500" : kind === "watch" ? "bg-amber-500" : "bg-primary/70";
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 ${border}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <p className="text-sm font-medium leading-relaxed text-foreground">{text}</p>
    </div>
  );
}

function EvidenceBlockCard({ block }: { block: EvidenceBlock }) {
  const confLabel =
    block.confidence === "high"
      ? "High confidence"
      : block.confidence === "medium"
        ? "Medium confidence"
        : "Emerging";
  return (
    <div className="relative pl-4 md:pl-5">
      <div
        className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-primary/40 to-transparent"
        aria-hidden
      />
      <h3 className="text-base font-semibold text-foreground md:text-lg">{block.headline}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Signal:</span> {block.supportingSignal}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
          {confLabel}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        <span className="font-medium text-foreground">Implication:</span> {block.implication}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">What to infer:</span> {block.inference}
      </p>
    </div>
  );
}
