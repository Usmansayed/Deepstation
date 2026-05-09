import type {
  AiResearchDossierResponse,
  AiResearchIndexPayload,
} from "./ai-research-from-startups";

function clip(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function formatUsdShort(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

/** Compact text block injected into Gemini so answers prioritize on-platform listings + desk data. */
export function buildAiResearchPlatformContext(
  index: AiResearchIndexPayload,
  dossier?: AiResearchDossierResponse | null,
): string {
  const lines: string[] = [];
  lines.push("## Platform research desk (Reg CF listings merged with Wefunder campaign scrape)");
  const d = index.deskStats;
  lines.push(
    `Desk stats: ${d.campaignsInIndex} campaigns in index, ${d.listingsInIndex} listings, ${d.linkedPairs} linked listing×campaign pairs, ${formatUsdShort(d.totalRaisedUsd)} total raised (reported), ~${d.totalInvestorsReported} investors (where reported), avg Wefunder quality score ${d.avgQualityScore.toFixed(2)}.`,
  );
  lines.push("");
  lines.push("### Indexed companies (answer about these first when the user is on this platform)");
  for (const c of index.companies.slice(0, 48)) {
    lines.push(
      `- **${c.name}** (id/slug: \`${c.id}\`, ticker ${c.ticker}) · ${c.sector} · conviction ${c.confidence}% · ${c.risk} risk · timing: ${c.timing} · trend ${c.trend} · thesis: ${clip(c.thesis, 220)}`,
    );
  }
  lines.push("");
  lines.push("### Activity feed (merged signals)");
  for (const t of index.activityFeed.slice(0, 14)) {
    lines.push(`- ${t}`);
  }
  lines.push("");
  lines.push("### Desk reasoning timeline");
  for (const t of index.reasoningTimeline.slice(0, 10)) {
    lines.push(`- ${t}`);
  }

  if (dossier) {
    lines.push("");
    lines.push(`## Focus company dossier (slug/id: \`${dossier.id}\`)`);
    const m = dossier.memo as Record<string, unknown>;
    const memoKeys = [
      "oneLiner",
      "snapshotLine",
      "overview",
      "thesis",
      "sentiment",
      "marketOpportunity",
      "competitiveAdvantage",
      "reasoningNarrative",
      "chartCaption",
    ] as const;
    for (const k of memoKeys) {
      const v = m[k];
      if (typeof v === "string" && v.trim()) lines.push(`**memo.${k}:** ${v}`);
    }
    const arrKeys = ["whyBullets", "supportingSignals", "risks", "investorSummary"] as const;
    for (const k of arrKeys) {
      const v = m[k];
      if (Array.isArray(v) && v.length)
        lines.push(
          `**memo.${k}:** ${(v as string[]).map((x) => clip(String(x), 400)).join(" · ")}`,
        );
    }
    const sec = m.secondaryInsight as { title?: string; body?: string } | undefined;
    if (sec?.title && sec?.body)
      lines.push(`**memo.secondaryInsight:** ${sec.title} — ${sec.body}`);

    const intel = dossier.intel as Record<string, unknown>;
    const intelTextKeys = [
      "primaryGrowthSignal",
      "whyNow",
      "structuralTailwind",
      "opportunityType",
      "marketAnalysis",
      "competitorBreakdown",
      "sentimentDeepDive",
      "fundingHistory",
      "riskFraming",
      "riskScenarios",
    ] as const;
    for (const k of intelTextKeys) {
      const v = intel[k];
      if (typeof v === "string" && v.trim()) lines.push(`**intel.${k}:** ${v}`);
    }
    const metrics = intel.metrics as
      | Array<{ label?: string; value?: string; implication?: string }>
      | undefined;
    if (metrics?.length) {
      lines.push("**intel.metrics:**");
      for (const row of metrics.slice(0, 12)) {
        if (row.label)
          lines.push(`  - ${row.label}: ${row.value ?? "—"} — ${row.implication ?? ""}`);
      }
    }
    if (dossier.wefunder) {
      lines.push("**wefunder snapshot (issuer-reported scrape):**");
      lines.push(JSON.stringify(dossier.wefunder, null, 2));
    }
  }

  return lines.join("\n");
}
