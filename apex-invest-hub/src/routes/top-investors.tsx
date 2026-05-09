import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Grid2x2, ListFilter, ListIcon, UserCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getTopInvestors } from "@/lib/api";
import { showAppWidget } from "@/lib/feature-widget";
import type { TopInvestor } from "@/lib/data-schemas";
import investorsFallback from "../../../data/platform/top_investors.json";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/top-investors")({
  component: TopInvestorsPage,
});

function TopInvestorsPage() {
  const navigate = useNavigate();
  const [investors, setInvestors] = useState<TopInvestor[]>(investorsFallback as TopInvestor[]);
  const [entityTab, setEntityTab] = useState<"angels" | "vc">("angels");
  const [metric, setMetric] = useState("power");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [onlyTopFive, setOnlyTopFive] = useState(false);
  const [activeThisWeek, setActiveThisWeek] = useState(false);
  const [followed, setFollowed] = useState<string[]>([]);

  useEffect(() => {
    getTopInvestors()
      .then(setInvestors)
      .catch((err) => {
        console.error("Failed to load top investors", err);
        setInvestors(investorsFallback as TopInvestor[]);
      });
  }, []);

  const visible = useMemo(() => {
    let rows = [...investors];
    if (onlyTopFive) rows = rows.filter((item) => item.rank <= 5);
    if (activeThisWeek) rows = rows.filter((item) => item.rank % 2 === 1);
    if (entityTab === "vc") rows = rows.filter((item) => item.rank <= 3 || item.name.includes("Capital"));
    if (metric === "returns") rows.sort((a, b) => b.rank - a.rank);
    if (metric === "influence") rows.sort((a, b) => b.blurb.length - a.blurb.length);
    if (metric === "scouts") rows.sort((a, b) => a.site.localeCompare(b.site));
    if (metric === "contributors") rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [activeThisWeek, entityTab, investors, metric, onlyTopFive]);

  return (
    <AppShell activeSection="deals">
      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/discover" })}
          className="min-w-56 rounded-lg border border-border px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
        >
          <p className="font-semibold">Community Rounds</p>
          <p className="text-xs text-muted-foreground">Open to all investors</p>
        </button>
        <button
          type="button"
          className="min-w-56 rounded-lg border border-primary px-4 py-3 text-left text-sm text-foreground shadow-sm"
        >
          <p className="font-semibold">Top Investors</p>
          <p className="text-xs text-muted-foreground">Invest alongside top investors</p>
        </button>
      </div>

      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Top Investors</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Climb the ranks. Spot great startups. Earn cash and carry.
          </p>
          <div className="mt-4 flex items-center gap-5 text-sm">
            <button
              type="button"
              className={`pb-1 ${entityTab === "angels" ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"}`}
              onClick={() => setEntityTab("angels")}
            >
              Angels
            </button>
            <button
              type="button"
              className={`pb-1 ${entityTab === "vc" ? "border-b-2 border-foreground font-medium text-foreground" : "text-muted-foreground"}`}
              onClick={() => setEntityTab("vc")}
            >
              VC Firms
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span>$0</span>
          <span>0 pts</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-md bg-foreground px-3 py-2 text-xs font-semibold text-white">
                Earn Rewards
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Rewards</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => showAppWidget("+25 pts", "Daily check-in credited to your investor score (demo).")}
              >
                Daily Check-in Bonus
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => showAppWidget("Referral sent", "Invite link copied — earn carry when friends invest (demo).")}
              >
                Referral Points
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => showAppWidget("Streak extended", "3-week leaderboard streak — bonus multiplier active (demo).")}
              >
                Leaderboard Streak
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            className={`rounded-full px-4 py-2 ${metric === "power" ? "bg-[#11213f] text-white" : "border border-border"}`}
            onClick={() => setMetric("power")}
          >
            Power Ranking
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 ${metric === "returns" ? "bg-[#11213f] text-white" : "border border-border"}`}
            onClick={() => setMetric("returns")}
          >
            Best Returns
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 ${metric === "influence" ? "bg-[#11213f] text-white" : "border border-border"}`}
            onClick={() => setMetric("influence")}
          >
            Most Influential
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 ${metric === "scouts" ? "bg-[#11213f] text-white" : "border border-border"}`}
            onClick={() => setMetric("scouts")}
          >
            Top Scouts
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 ${metric === "contributors" ? "bg-[#11213f] text-white" : "border border-border"}`}
            onClick={() => setMetric("contributors")}
          >
            Top Contributors
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-md border p-2 ${viewMode === "grid" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            onClick={() => setViewMode("grid")}
          >
            <Grid2x2 size={14} />
          </button>
          <button
            type="button"
            className={`rounded-md border p-2 ${viewMode === "list" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            onClick={() => setViewMode("list")}
          >
            <ListIcon size={14} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ListFilter size={14} />
                  Filter
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Investor Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={onlyTopFive} onCheckedChange={(v) => setOnlyTopFive(v === true)}>
                Top 5 only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={activeThisWeek} onCheckedChange={(v) => setActiveThisWeek(v === true)}>
                Active this week
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <section className={viewMode === "grid" ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5" : "grid grid-cols-1 gap-4"}>
        {visible.map((investor) => (
          <article key={investor.rank} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative">
              <img
                src={`https://picsum.photos/seed/investor-${investor.seed}/520/320`}
                alt={investor.name}
                className="h-44 w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-bold">
                #{investor.rank}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="absolute right-2 top-2 rounded-full bg-black/30 p-1 text-white">
                    <UserCircle2 size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() =>
                      setFollowed((current) =>
                        current.includes(investor.seed)
                          ? current.filter((seed) => seed !== investor.seed)
                          : [...current, investor.seed],
                      )
                    }
                  >
                    {followed.includes(investor.seed) ? "Unfollow" : "Follow"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      showAppWidget("Compare investors", `Benchmarking ${investor.name} against your thesis filters (demo).`)
                    }
                  >
                    Compare
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      showAppWidget("Investor dossier", `Opening diligence pack for ${investor.name} (demo).`)
                    }
                  >
                    View Profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="p-3">
              <h2 className="text-lg font-semibold">{investor.name}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{investor.blurb}</p>
              <p className="mt-2 text-xs text-muted-foreground">{investor.site}</p>
              {followed.includes(investor.seed) && (
                <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Following
                </span>
              )}
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
