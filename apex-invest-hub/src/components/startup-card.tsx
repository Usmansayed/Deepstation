import { Link } from "@tanstack/react-router";
import { StartupLogoMark } from "@/components/startup-logo";
import type { Startup } from "@/lib/mock-data";
import { formatMoney } from "@/lib/mock-data";

export function StartupCard({ s }: { s: Startup }) {
  return (
    <Link
      to="/startup/$slug"
      params={{ slug: s.slug }}
      className="group bg-gradient-card rounded-2xl p-5 border hover:border-primary/50 transition-all hover:shadow-glow hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <StartupLogoMark
            logo={s.logo}
            alt=""
            boxClass="h-12 w-12"
            className="bg-surface-2"
            emojiClass="text-2xl"
            identityKey={s.slug}
          />
          <div>
            <div className="font-semibold text-base group-hover:text-primary transition-colors">{s.name}</div>
            <div className="text-xs text-muted-foreground">{s.sector} · {s.stage}</div>
          </div>
        </div>
        <CredibilityBadge score={s.credibility} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{s.tagline}</p>
      <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
        <Metric label="Raising" value={formatMoney(s.raising)} />
        <Metric label="Valuation" value={formatMoney(s.valuation)} />
        <Metric label="Momentum" value={`${s.momentum}`} accent />
      </div>
    </Link>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

export function CredibilityBadge({ score }: { score: number }) {
  const tone = score >= 85 ? "text-primary border-primary/40 bg-primary/10" : score >= 70 ? "text-warning border-warning/40 bg-warning/10" : "text-muted-foreground border-border bg-surface";
  return (
    <div className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${tone}`}>
      {score} <span className="opacity-60 font-normal">credibility</span>
    </div>
  );
}
