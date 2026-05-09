import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Car,
  Clock,
  FlaskConical,
  Gamepad2,
  Globe,
  Cpu,
  Grid3x3,
  HeartPulse,
  Info,
  Landmark,
  Leaf,
  Package,
  Plane,
  Rocket,
  Search,
  Shield,
  Store,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Truck,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StartupLogoMark } from "@/components/startup-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney, getDiscoverCategories, getStartups, type ApiStartup } from "@/lib/api";
import type { DiscoverCategories } from "@/lib/data-schemas";
import { migrateLegacyWatchlistIfNeeded, loadWatchlistedSlugs, toggleBookmarkSlug } from "@/lib/watchlist";
import discoverFallback from "../../../data/ui/discover_categories.json";

export const Route = createFileRoute("/discover")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = search.q;
    return typeof q === "string" && q.trim().length > 0 ? { q: q.trim() } : {};
  },
  component: Discover,
});

const ICONS_BY_KEY: Record<string, LucideIcon> = {
  Cpu,
  Landmark,
  Leaf,
  Car,
  HeartPulse,
  ShoppingBag,
  Shield,
  Wrench,
  Rocket,
  Truck,
  UtensilsCrossed,
  Store,
  Plane,
  Gamepad2,
  Globe,
  FlaskConical,
  Package,
};

function buildCategoryMeta(cfg: DiscoverCategories): Array<{ label: string; icon: LucideIcon }> {
  return cfg.categories.map((c) => ({ label: c.label, icon: ICONS_BY_KEY[c.iconKey] ?? Wrench }));
}

type DiscoveryStartup = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  businessModel: string;
  startupSize: string;
  region: string;
  foundedYear: number;
  momentum: number;
  followers: number;
  raising: number;
  imageSeed: string;
  evsTotal: number;
  logo?: string;
  subline: string;
};

type CuratedSection = { id: string; title: string; items: DiscoveryStartup[] };

function hashSlug(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h << 5) - h + slug.charCodeAt(i);
  return Math.abs(h);
}

function dedupeBySlug(items: DiscoveryStartup[]): DiscoveryStartup[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    if (seen.has(s.slug)) return false;
    seen.add(s.slug);
    return true;
  });
}

function ensureMin(items: DiscoveryStartup[], pool: DiscoveryStartup[], min: number): DiscoveryStartup[] {
  const out = dedupeBySlug([...items]);
  if (out.length >= min) return out.slice(0, 48);
  for (const s of pool) {
    if (out.length >= min) break;
    if (!out.some((x) => x.slug === s.slug)) out.push(s);
  }
  return out.slice(0, 48);
}

function buildCuratedSections(pool: DiscoveryStartup[]): CuratedSection[] {
  const sortedEvs = [...pool].sort((a, b) => b.evsTotal - a.evsTotal || b.momentum - a.momentum);
  const sortedNew = [...pool].sort((a, b) => b.foundedYear - a.foundedYear || b.momentum - a.momentum);
  const sortedMom = [...pool].sort((a, b) => b.momentum - a.momentum);
  const sortedRaised = [...pool].sort((a, b) => b.raising - a.raising);

  const bySector = (label: string) => pool.filter((s) => s.sector === label);

  const sections: Array<{ id: string; title: string; pick: () => DiscoveryStartup[] }> = [
    {
      id: "vc-backed",
      title: "VC & notable angel backed",
      pick: () =>
        ensureMin(
          dedupeBySlug(pool.filter((s) => s.evsTotal >= 68 && s.momentum >= 76)),
          sortedEvs,
          8,
        ),
    },
    {
      id: "new",
      title: "New",
      pick: () =>
        ensureMin(
          dedupeBySlug(sortedNew.filter((s) => s.foundedYear >= 2023)),
          sortedNew,
          8,
        ),
    },
    {
      id: "strong-performers",
      title: "Strong performers",
      pick: () => dedupeBySlug(sortedMom.filter((s) => s.momentum >= 72)).slice(0, 24),
    },
    {
      id: "ai",
      title: "AI & machine learning",
      pick: () => ensureMin(dedupeBySlug(bySector("AI & Machine Learning")), sortedEvs, 6),
    },
    {
      id: "climate",
      title: "Climate & energy",
      pick: () => ensureMin(dedupeBySlug(bySector("Climate & Energy")), sortedRaised, 6),
    },
    {
      id: "fintech",
      title: "Fintech",
      pick: () => ensureMin(dedupeBySlug(bySector("Fintech")), sortedMom, 6),
    },
    {
      id: "health",
      title: "Health & bio",
      pick: () => ensureMin(dedupeBySlug(bySector("Health & Bio")), sortedEvs, 6),
    },
    {
      id: "robotics-mobility",
      title: "Robotics & mobility",
      pick: () =>
        ensureMin(
          dedupeBySlug([
            ...bySector("Robotics"),
            ...bySector("Mobility & Auto"),
            ...bySector("SpaceTech"),
          ]),
          sortedMom,
          6,
        ),
    },
    {
      id: "enterprise-saas",
      title: "Enterprise & SaaS",
      pick: () =>
        ensureMin(
          dedupeBySlug(pool.filter((s) => s.businessModel === "SaaS" || s.businessModel === "Enterprise")),
          sortedRaised,
          6,
        ),
    },
  ];

  return sections.map((s) => ({ id: s.id, title: s.title, items: s.pick() }));
}

function cardStatus(s: DiscoveryStartup): {
  key: string;
  label: string;
  className: string;
  showClock?: boolean;
} | null {
  if (s.foundedYear >= 2024 && s.momentum >= 70) {
    return { key: "new", label: "New this week", className: "bg-emerald-600 text-white" };
  }
  if (s.evsTotal >= 80 && s.momentum >= 80) {
    return {
      key: "funded",
      label: "Almost fully funded",
      className: "bg-rose-600 text-white",
      showClock: true,
    };
  }
  if (s.momentum >= 84) {
    return { key: "trend", label: "Trending this week", className: "bg-rose-600 text-white" };
  }
  if (s.evsTotal >= 72) {
    return { key: "vc", label: "VC backed", className: "bg-violet-600 text-white" };
  }
  return null;
}

function cardPills(s: DiscoveryStartup): string[] {
  const h = hashSlug(s.slug + s.id);
  const pills: string[] = [];
  if (s.evsTotal >= 75) pills.push("VC-BACKED");
  if (s.raising >= 5_000_000) pills.push("$5M+ ROUND");
  if (s.momentum >= 85) pills.push("TOP MOMENTUM");
  if (h % 5 === 1) pills.push("REPEAT FOUNDER");
  if (h % 7 === 2) pills.push("MINORITY FOUNDER");
  if (s.followers >= 400) pills.push("STRONG INTEREST");
  if (pills.length < 2 && s.businessModel === "SaaS") pills.push("B2B SAAS");
  return [...new Set(pills)].slice(0, 3);
}

function DiscoverCard({
  startup: s,
  watchlist,
}: {
  startup: DiscoveryStartup;
  watchlist: Set<string>;
}) {
  const status = cardStatus(s);
  const pills = cardPills(s);
  const committed = Math.round(s.raising * (0.25 + (hashSlug(s.slug) % 40) / 100));

  return (
    <article className="group relative w-[min(100%,340px)] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link to="/startup/$slug" params={{ slug: s.slug }} className="block">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <img
            src={`https://picsum.photos/seed/discovery-${s.imageSeed}/760/480`}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {status && (
            <div
              className={`absolute left-3 top-3 flex max-w-[85%] items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${status.className}`}
            >
              {status.showClock ? <Clock size={11} className="shrink-0" /> : null}
              {status.label}
              <Info size={11} className="ml-0.5 shrink-0 opacity-80" aria-hidden />
            </div>
          )}
          <button
            type="button"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleBookmarkSlug(s.slug);
            }}
            aria-label={watchlist.has(s.slug) ? "Remove from saved" : "Save deal"}
          >
            <Bookmark size={15} fill={watchlist.has(s.slug) ? "currentColor" : "none"} />
          </button>
          <div className="absolute bottom-2 right-3 shadow-md">
            {s.logo ? (
              <StartupLogoMark
                logo={s.logo}
                alt=""
                boxClass="h-10 w-10 rounded-full border-2 border-background"
                emojiClass="text-lg"
                identityKey={s.slug}
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted">
                <img
                  src={`https://picsum.photos/seed/founder-${s.slug}/80/80`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="space-y-2 p-4 pt-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.name}</p>
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground">{s.tagline}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {s.subline} · {formatMoney(committed)} committed · {s.followers.toLocaleString()}+ investors ·{" "}
          <span className="whitespace-nowrap">{s.region}</span>
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {pills.map((p) => (
            <span
              key={p}
              className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function CarouselRow({
  sectionId,
  title,
  items,
  watchlist,
  expanded,
  onToggleExpand,
}: {
  sectionId: string;
  title: string;
  items: DiscoveryStartup[];
  watchlist: Set<string>;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardW = 340;
    const delta = Math.min(el.clientWidth, cardW * 3 + 48);
    el.scrollBy({ left: dir === "right" ? delta : -delta, behavior: "smooth" });
  }, []);

  const visible = expanded ? items : items.slice(0, 12);
  const showSeeAll = items.length > 3;

  if (items.length === 0) return null;

  return (
    <section className="mb-12" aria-labelledby={`section-${sectionId}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id={`section-${sectionId}`} className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {showSeeAll && (
            <button
              type="button"
              onClick={() => onToggleExpand(sectionId)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {expanded ? "Show less" : `See all (${items.length})`}
            </button>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Scroll left"
            onClick={() => scroll("left")}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Scroll right"
            onClick={() => scroll("right")}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-5"
      >
        {visible.map((startup) => (
          <DiscoverCard key={startup.id} startup={startup} watchlist={watchlist} />
        ))}
      </div>
    </section>
  );
}

function Discover() {
  const navigate = useNavigate();
  const { q: urlQuery } = Route.useSearch();
  const [discoverUi, setDiscoverUi] = useState<DiscoverCategories>(discoverFallback as DiscoverCategories);
  const [startups, setStartups] = useState<ApiStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [sortBy, setSortBy] = useState("Trending");
  const [watchlist, setWatchlist] = useState<Set<string>>(() =>
    typeof window !== "undefined" ? loadWatchlistedSlugs() : new Set(),
  );
  const [layoutMode, setLayoutMode] = useState<"explore" | "grid">("explore");
  const [expandedSectionIds, setExpandedSectionIds] = useState<Record<string, boolean>>({});
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getDiscoverCategories()
      .then(setDiscoverUi)
      .catch((error) => {
        console.error("Failed to load discover categories", error);
        setDiscoverUi(discoverFallback as DiscoverCategories);
      });
  }, []);

  useEffect(() => {
    getStartups()
      .then(setStartups)
      .catch((error) => console.error("Failed to load startups", error))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    migrateLegacyWatchlistIfNeeded();
    setWatchlist(loadWatchlistedSlugs());
    const sync = () => setWatchlist(loadWatchlistedSlugs());
    window.addEventListener("ventureflow-watchlist-change", sync);
    return () => window.removeEventListener("ventureflow-watchlist-change", sync);
  }, []);

  useEffect(() => {
    if (urlQuery !== undefined) setSearchQuery(urlQuery);
  }, [urlQuery]);

  const categories = useMemo(
    () => discoverUi.categories.map((c) => c.label),
    [discoverUi.categories],
  );
  const categoryMeta = useMemo(() => buildCategoryMeta(discoverUi), [discoverUi]);
  const stages = discoverUi.stages;
  const regions = discoverUi.regions;
  const sortOptions = discoverUi.sortOptions;

  const catalog = useMemo(() => generateCatalog(startups, discoverUi), [startups, discoverUi]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const savedOnly = q === "saved";
    let queried = catalog
      .filter((s) => (savedOnly ? watchlist.has(s.slug) : true))
      .filter((s) =>
        !q || savedOnly
          ? true
          : `${s.name} ${s.tagline} ${s.sector} ${s.businessModel}`.toLowerCase().includes(q),
      )
      .filter((s) => (selectedCategory === "All" ? true : s.sector === selectedCategory))
      .filter((s) => (selectedStage === "All" ? true : s.stage === selectedStage))
      .filter((s) => (selectedRegion === "All" ? true : s.region === selectedRegion));

    if (savedOnly) {
      const seen = new Set<string>();
      queried = queried.filter((s) => {
        if (seen.has(s.slug)) return false;
        seen.add(s.slug);
        return true;
      });
    }

    return queried.sort((a, b) => {
      if (sortBy === "Most Raised") return b.raising - a.raising;
      if (sortBy === "Most Followed") return b.followers - a.followers;
      if (sortBy === "Newest") return b.foundedYear - a.foundedYear;
      return b.momentum - a.momentum;
    });
  }, [catalog, searchQuery, selectedCategory, selectedStage, selectedRegion, sortBy, watchlist]);

  const curatedSections = useMemo(() => buildCuratedSections(filtered), [filtered]);

  const byCategory = useMemo(
    () => categories.map((category) => ({ category, startups: filtered.filter((s) => s.sector === category) })),
    [categories, filtered],
  );

  const toggleSectionExpand = useCallback((id: string) => {
    setExpandedSectionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const scrollCategoryRail = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    const delta = Math.max(280, rail.clientWidth * 0.6);
    rail.scrollBy({
      left: direction === "right" ? delta : -delta,
      behavior: "smooth",
    });
  };

  const savedOnly = searchQuery.trim().toLowerCase() === "saved";

  return (
    <AppShell activeSection="deals">
      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("All");
            setSelectedStage("All");
            setSelectedRegion("All");
            setSortBy("Trending");
            setSearchQuery("");
            setLayoutMode("explore");
            navigate({ to: "/discover", search: {} });
          }}
          className="min-w-56 rounded-lg border border-primary px-4 py-3 text-left text-sm text-foreground shadow-sm transition hover:bg-primary/5"
        >
          <p className="font-semibold">Community rounds</p>
          <p className="text-xs text-muted-foreground">Explore curated rows · all stages</p>
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/top-investors" })}
          className="min-w-56 rounded-lg border border-border px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
        >
          <p className="font-semibold">Top investors</p>
          <p className="text-xs text-muted-foreground">Invest alongside notable angels</p>
        </button>
      </div>

      <section className="mb-8">
        <h1 className="text-[42px] font-bold leading-tight">
          {savedOnly ? "Saved & watchlist" : "Invest in founders building the future"}
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-muted-foreground">
          {savedOnly
            ? "Companies you bookmark here or subscribe to from a live round."
            : "Curated by traction, stage, sector, and investor interest — scroll each row or open a deal."}
        </p>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search companies, sectors, or themes…"
              className="h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center rounded-md border border-border text-sm">
            <button
              type="button"
              onClick={() => setLayoutMode("explore")}
              className={`flex items-center gap-2 px-4 py-2 ${layoutMode === "explore" ? "bg-foreground text-white" : "bg-background"}`}
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("grid")}
              className={`flex items-center gap-2 border-l border-border px-4 py-2 ${layoutMode === "grid" ? "bg-foreground text-white" : "bg-background"}`}
            >
              <Grid3x3 size={14} /> By sector
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollCategoryRail("left")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Scroll categories left"
          >
            <ArrowLeft size={14} />
          </button>
          <div
            ref={railRef}
            className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex min-w-max items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className={`flex h-[74px] w-[78px] shrink-0 flex-col items-center justify-center rounded-xl border px-2 text-center ${
                  selectedCategory === "All"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Sparkles size={20} />
                <span className="mt-1 text-[11px] font-medium leading-tight">All</span>
              </button>
              {categoryMeta.map((category) => (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => setSelectedCategory(category.label)}
                  className={`flex h-[74px] w-[94px] shrink-0 flex-col items-center justify-center rounded-xl border px-2 text-center ${
                    selectedCategory === category.label
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <category.icon size={20} />
                  <span className="mt-1 text-[11px] font-medium leading-tight">{category.label.split(" & ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollCategoryRail("right")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Scroll categories right"
          >
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm">
                <SlidersHorizontal size={14} />
                Filters
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Quick filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Stage</DropdownMenuLabel>
              {stages.map((stage) => (
                <DropdownMenuItem key={stage} onClick={() => setSelectedStage(stage)}>
                  {stage}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Region</DropdownMenuLabel>
              {regions.map((region) => (
                <DropdownMenuItem key={region} onClick={() => setSelectedRegion(region)}>
                  {region}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Sort by</DropdownMenuLabel>
              {sortOptions.map((option) => (
                <DropdownMenuItem key={option} onClick={() => setSortBy(option)}>
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm">
                Popular
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Jump to theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedCategory("AI & Machine Learning")}>AI</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("Climate & Energy")}>Climate</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("Fintech")}>Fintech</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedCategory("All");
                  setSelectedStage("All");
                  setSelectedRegion("All");
                  setSortBy("Trending");
                }}
              >
                Reset filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">Loading startups…</div>
      ) : startups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-base font-semibold text-foreground">Could not load startups</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start the API (<code className="rounded bg-muted px-1 py-0.5 text-xs">cd server && npm run dev</code>) and seed Mongo (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run seed</code>).
          </p>
        </div>
      ) : savedOnly && filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-base font-semibold text-foreground">Nothing saved yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Bookmark a card or subscribe on a company page.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-base font-semibold text-foreground">No deals match these filters</p>
          <p className="mt-2 text-sm text-muted-foreground">Clear the sector chip or reset filters.</p>
        </div>
      ) : layoutMode === "explore" && !savedOnly ? (
        <>
          <section className="mb-14 rounded-2xl bg-zinc-900 px-4 py-8 text-white md:px-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold md:text-xl">Founder highlights</h2>
              <span className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                <TrendingUp size={14} /> Short updates from teams you can back
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dedupeBySlug(filtered)
                .slice(0, 5)
                .map((s) => (
                  <div
                    key={s.id}
                    className="relative w-[140px] shrink-0 snap-start overflow-hidden rounded-xl md:w-[160px]"
                  >
                    <div className="aspect-[9/16] w-full bg-zinc-800">
                      <img
                        src={`https://picsum.photos/seed/highlight-${s.imageSeed}/400/720`}
                        alt=""
                        className="h-full w-full object-cover opacity-90"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-12">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-300">{s.name}</p>
                      <p className="text-xs font-medium leading-tight">
                        {s.tagline.length > 52 ? `${s.tagline.slice(0, 52)}…` : s.tagline}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {curatedSections.map((section) => (
            <CarouselRow
              key={section.id}
              sectionId={section.id}
              title={section.title}
              items={section.items}
              watchlist={watchlist}
              expanded={expandedSectionIds[section.id] ?? false}
              onToggleExpand={toggleSectionExpand}
            />
          ))}
        </>
      ) : (
        <>
          {savedOnly ? (
            <CarouselRow
              sectionId="saved"
              title="Saved & watchlist"
              items={filtered}
              watchlist={watchlist}
              expanded={expandedSectionIds.saved ?? false}
              onToggleExpand={toggleSectionExpand}
            />
          ) : (
            byCategory
              .filter((g) => g.startups.length > 0)
              .map((group) => (
                <CarouselRow
                  key={group.category}
                  sectionId={group.category}
                  title={group.category}
                  items={group.startups}
                  watchlist={watchlist}
                  expanded={expandedSectionIds[group.category] ?? false}
                  onToggleExpand={toggleSectionExpand}
                />
              ))
          )}
        </>
      )}
    </AppShell>
  );
}

function generateCatalog(seeds: ApiStartup[], cfg: DiscoverCategories): DiscoveryStartup[] {
  if (seeds.length === 0) return [];
  const categoryLabels = cfg.categories.map((c) => c.label);
  if (categoryLabels.length === 0) return [];
  const modelsLocal = cfg.businessModels.slice(1);
  const sizesLocal = cfg.sizes.slice(1);
  const regionsLocal = cfg.regions.slice(1);
  const stageLocal = cfg.stages.slice(1);
  const adjective = ["Nova", "Orbit", "Summit", "Pulse", "Vector", "Atlas", "Core", "Luma"];

  return Array.from({ length: 128 }, (_, index) => {
    const seed = seeds[index % seeds.length];
    const evsTotal = seed.evs?.total ?? 50 + (index % 20);
    const highlight =
      seed.highlights && seed.highlights.length > 0
        ? seed.highlights[index % seed.highlights.length]
        : `${seed.sector} · ${seed.stage} · credible execution signals`;
    const sectorPick = categoryLabels[index % categoryLabels.length];
    const stagePick = stageLocal.length ? stageLocal[index % stageLocal.length] : seed.stage;
    const modelPick = modelsLocal.length ? modelsLocal[index % modelsLocal.length] : seed.sector;
    const sizePick = sizesLocal.length ? sizesLocal[index % sizesLocal.length] : "Growth";
    const regionPick = regionsLocal.length ? regionsLocal[index % regionsLocal.length] : seed.location;

    return {
      id: `${seed.id}-discover-${index}`,
      slug: seed.slug,
      name: `${adjective[index % adjective.length]} ${seed.name}`,
      tagline: `${sectorPick} startup focused on scalable growth.`,
      sector: sectorPick,
      stage: stagePick,
      businessModel: modelPick,
      startupSize: sizePick,
      region: regionPick,
      foundedYear: 2018 + (index % 8),
      momentum: Math.min(95, 40 + ((index * 7) % 56)),
      followers: seed.followers + index * 9,
      raising: seed.raising + index * 12000,
      imageSeed: `${seed.slug}-${index}`,
      evsTotal,
      logo: seed.logo,
      subline: typeof highlight === "string" ? highlight : String(highlight),
    };
  });
}
