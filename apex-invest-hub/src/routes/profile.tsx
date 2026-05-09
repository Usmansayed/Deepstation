import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  Compass,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessageSquareQuote,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney, getDemoUser, getStartups, type ApiStartup } from "@/lib/api";
import type { DemoUser } from "@/lib/data-schemas";
import { formatRelativeTime, loadInvestorActivity, type ActivityEntry } from "@/lib/investor-activity";
import { loadWatchlistedSlugs } from "@/lib/watchlist";
import demoUserFallback from "../../../data/platform/demo_user.json";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function parseFocusTags(raw: string) {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ProfilePage() {
  const demoFallback = demoUserFallback as DemoUser;
  const [avatarUrl, setAvatarUrl] = useState(demoFallback.avatar);
  const [name, setName] = useState(demoFallback.name);
  const [location, setLocation] = useState(demoFallback.location);
  const [bio, setBio] = useState(demoFallback.bio);
  const [focusRaw, setFocusRaw] = useState(demoFallback.focus);
  const [draftName, setDraftName] = useState(name);
  const [draftLocation, setDraftLocation] = useState(location);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftFocusRaw, setDraftFocusRaw] = useState(focusRaw);
  const [startups, setStartups] = useState<ApiStartup[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);

  useEffect(() => {
    getDemoUser()
      .then((u) => {
        setAvatarUrl(u.avatar);
        setName(u.name);
        setLocation(u.location);
        setBio(u.bio);
        setFocusRaw(u.focus);
        setDraftName(u.name);
        setDraftLocation(u.location);
        setDraftBio(u.bio);
        setDraftFocusRaw(u.focus);
      })
      .catch((err) => {
        console.error("Failed to load demo user", err);
        setAvatarUrl(demoFallback.avatar);
        setName(demoFallback.name);
        setLocation(demoFallback.location);
        setBio(demoFallback.bio);
        setFocusRaw(demoFallback.focus);
      });
  }, []);

  useEffect(() => {
    getStartups()
      .then(setStartups)
      .catch((err) => console.error("Failed to load startups for profile", err));
  }, []);

  useEffect(() => {
    const sync = () => {
      setActivity(loadInvestorActivity());
      setWatchlistCount(loadWatchlistedSlugs().size);
    };
    sync();
    window.addEventListener("ventureflow-activity-change", sync);
    window.addEventListener("ventureflow-watchlist-change", sync);
    return () => {
      window.removeEventListener("ventureflow-activity-change", sync);
      window.removeEventListener("ventureflow-watchlist-change", sync);
    };
  }, []);

  const focusTags = useMemo(() => parseFocusTags(focusRaw), [focusRaw]);
  const positionCount = startups.length;
  const activitySummary = useMemo(() => {
    const invests = activity.filter((a) => a.kind === "invest").length;
    const posts = activity.filter((a) => a.kind === "question" || a.kind === "comment").length;
    return { invests, posts };
  }, [activity]);

  function activityIcon(kind: ActivityEntry["kind"]) {
    switch (kind) {
      case "invest":
        return <BadgeDollarSign size={16} className="text-emerald-600 dark:text-emerald-400" aria-hidden />;
      case "question":
        return <MessageSquareQuote size={16} className="text-primary" aria-hidden />;
      default:
        return <MessageCircle size={16} className="text-sky-600 dark:text-sky-400" aria-hidden />;
    }
  }

  return (
    <AppShell activeSection="profile">
      <div className="rounded-2xl border border-border bg-card/40 p-6 shadow-sm sm:p-8 md:p-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-5">
            <img src={avatarUrl} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-1 ring-border" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Verified
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Individual investor</p>
              <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 opacity-70" aria-hidden />
                  {location}
                </span>
                <span className="flex items-center gap-2">
                  <CalendarDays size={14} className="shrink-0 opacity-70" aria-hidden />
                  Joined November 2025
                </span>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/90">{bio}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold shadow-sm hover:bg-muted/50"
                >
                  Edit profile
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Public profile</h3>
                  <label className="block text-xs text-muted-foreground">
                    Name
                    <input
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    Location
                    <input
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={draftLocation}
                      onChange={(e) => setDraftLocation(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    Bio
                    <textarea
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      rows={3}
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    Focus (comma-separated)
                    <input
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={draftFocusRaw}
                      onChange={(e) => setDraftFocusRaw(e.target.value)}
                      placeholder="e.g. AI, Healthcare, Consumer"
                    />
                  </label>
                  <button
                    type="button"
                    className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground"
                    onClick={() => {
                      setName(draftName.trim() || name);
                      setLocation(draftLocation.trim() || location);
                      setBio(draftBio.trim() || bio);
                      setFocusRaw(draftFocusRaw.trim() || focusRaw);
                    }}
                  >
                    Save
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <Link
              to="/messages"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <MessageSquare size={14} aria-hidden />
              Inbox
            </Link>
          </div>
        </div>

        {focusTags.length > 0 && (
          <div className="mt-8 border-t border-border pt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investment focus</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {focusTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            to="/portfolio"
            className="group flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BriefcaseBusiness size={18} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">Portfolio</p>
                <p className="text-xs text-muted-foreground">
                  {positionCount > 0 ? `${positionCount} positions` : "View holdings"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          <Link
            to="/cash"
            className="group flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 size={18} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">Cash &amp; transfers</p>
                <p className="text-xs text-muted-foreground">Funding account</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          <Link
            to="/discover"
            search={{ q: "saved" }}
            className="group flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Compass size={18} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">Saved deals</p>
                <p className="text-xs text-muted-foreground">
                  {watchlistCount > 0 ? `${watchlistCount} ${watchlistCount === 1 ? "company" : "companies"}` : "Watchlist"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</h2>
          {(activitySummary.invests > 0 || activitySummary.posts > 0) && (
            <p className="text-xs text-muted-foreground">
              {activitySummary.invests > 0 && (
                <span>
                  {activitySummary.invests} {activitySummary.invests === 1 ? "commitment" : "commitments"}
                </span>
              )}
              {activitySummary.invests > 0 && activitySummary.posts > 0 && <span className="mx-1.5">·</span>}
              {activitySummary.posts > 0 && (
                <span>
                  {activitySummary.posts} discussion {activitySummary.posts === 1 ? "post" : "posts"}
                </span>
              )}
            </p>
          )}
        </div>
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card/30">
          {activity.length > 0 ? (
            activity.slice(0, 14).map((entry) => (
              <li key={entry.id} className="flex gap-3 px-4 py-3.5 text-sm">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/80">
                  {activityIcon(entry.kind)}
                </span>
                <div className="min-w-0 flex-1">
                  {entry.kind === "invest" && (
                    <>
                      <p className="font-medium text-foreground">
                        Invested {formatMoney(entry.amount)} in{" "}
                        <Link to="/startup/$slug" params={{ slug: entry.slug }} className="text-primary hover:underline">
                          {entry.companyName}
                        </Link>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Reservation / intent logged on this device · {formatRelativeTime(entry.at)}</p>
                    </>
                  )}
                  {entry.kind === "question" && (
                    <>
                      <p className="font-medium text-foreground">
                        Question on{" "}
                        <Link to="/startup/$slug" params={{ slug: entry.slug }} className="text-primary hover:underline">
                          {entry.companyName}
                        </Link>
                      </p>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">&ldquo;{entry.excerpt}&rdquo;</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(entry.at)}</p>
                    </>
                  )}
                  {entry.kind === "comment" && (
                    <>
                      <p className="font-medium text-foreground">
                        Comment on{" "}
                        <Link to="/startup/$slug" params={{ slug: entry.slug }} className="text-primary hover:underline">
                          {entry.companyName}
                        </Link>
                      </p>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{entry.excerpt}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(entry.at)}</p>
                    </>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              <p>
                Invest on a live round or post in a company&apos;s Discussion tab — it will show up here.{" "}
                <Link to="/discover" className="font-medium text-primary hover:underline">
                  Browse deals
                </Link>
              </p>
            </li>
          )}
        </ul>
      </section>

      <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
        Private investments are risky and illiquid. Only invest what you can afford to lose, and diversify across
        companies and sectors.
      </p>
    </AppShell>
  );
}
