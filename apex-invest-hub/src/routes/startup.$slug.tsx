import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Heart,
  MessageSquareQuote,
  Play,
  Repeat2,
  Rocket,
  Share2,
  Target,
  ThumbsUp,
  Trophy,
  Users,
  MessageCircle,
  Reply,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PitchCampaignExtras } from "@/components/pitch-campaign-extras";
import { PitchMarkdown } from "@/components/pitch-markdown";
import { StartupLogoMark } from "@/components/startup-logo";
import { followStartup, formatMoney, getStartup, type ApiStartup } from "@/lib/api";
import { showAppWidget } from "@/lib/feature-widget";
import { appendInvestorActivity } from "@/lib/investor-activity";
import { picsumSeedUrl } from "@/lib/image-placeholders";
import { profileForStartupPage } from "@/lib/startup-profile";
import { imageReferrerPolicy, proxiedImageSrc } from "@/lib/proxied-image-url";
import { wefunderAssetUrl, wefunderListingUrl } from "@/lib/wefunder-urls";
import { addSubscribedSlug } from "@/lib/watchlist";

const DEFAULT_HERO_STILL =
  "https://uxmagic.blob.core.windows.net/public/agent-images/startup-product-1778246034772-6krnmkcrl66.png";

const KPI_ICONS: Record<string, LucideIcon> = {
  Target,
  Rocket,
  Users,
  BadgeDollarSign,
};

export const Route = createFileRoute("/startup/$slug")({
  head: () => ({
    meta: [
      { title: "Startup Profile — FounderProof" },
      {
        name: "description",
        content: "Evidence-driven startup profile with EVS and verified metrics.",
      },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { slug } = Route.useParams();
  const [s, setStartup] = useState<ApiStartup | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [subscribeFx, setSubscribeFx] = useState(false);
  const [investAmount, setInvestAmount] = useState(100);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const investCardRef = useRef<HTMLElement | null>(null);
  const [engageDeltas, setEngageDeltas] = useState<
    Record<string, Partial<{ likes: number; comments: number; reposts: number }>>
  >({});
  const [activeTab, setActiveTab] = useState<"Pitch" | "Updates" | "Discussion" | "Journey">("Pitch");
  const [discussionDraft, setDiscussionDraft] = useState("");
  const [heroPhase, setHeroPhase] = useState<"primary" | "picsum">("primary");

  useEffect(() => {
    setLoading(true);
    getStartup(slug)
      .then(setStartup)
      .catch((error) => {
        console.error("Failed to load startup", error);
        setStartup(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const pitchVideoHref = useMemo(() => {
    if (!s) return wefunderListingUrl(slug);
    const wc = s.wefunderCampaign as Record<string, unknown> | undefined;
    return wefunderAssetUrl(wc?.video_url) ?? wefunderListingUrl(s.slug);
  }, [s, slug]);

  const heroPrimaryUrl = useMemo(() => {
    if (!s?.heroImage?.trim()) return DEFAULT_HERO_STILL;
    return s.heroImage.trim();
  }, [s]);

  const heroPicsumUrl = useMemo(() => picsumSeedUrl(s?.slug ?? slug, 1200, 675), [s?.slug, slug]);

  useEffect(() => {
    setHeroPhase("primary");
  }, [heroPrimaryUrl, s?.slug]);

  const heroSrcRaw = heroPhase === "primary" ? heroPrimaryUrl : heroPicsumUrl;
  const heroImgSrc = proxiedImageSrc(heroSrcRaw) ?? heroSrcRaw;
  const heroImgReferrer = heroPhase === "primary" ? imageReferrerPolicy(heroPrimaryUrl) : undefined;

  const handleFollow = async () => {
    if (!s) return;
    try {
      await followStartup(s.slug, "demo-investor");
      addSubscribedSlug(s.slug);
      setFollowing(true);
      setSubscribeFx(true);
      window.setTimeout(() => setSubscribeFx(false), 650);
    } catch (error) {
      console.error("Follow failed", error);
    }
  };

  const handleTabChange = (
    tab: "Pitch" | "Updates" | "Discussion" | "Journey",
  ) => {
    setActiveTab(tab);
    const tabsEl = tabsRef.current;
    if (!tabsEl) return;
    const top = window.scrollY + tabsEl.getBoundingClientRect().top - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  const evsTier = useMemo(() => s?.evs.tier ?? "Unverified", [s]);
  const heartbeat = useMemo(() => s?.ghostStatus.heartbeat ?? "Inactive", [s]);
  const pricePerShare = 1.05;
  const estimatedShares = useMemo(() => Math.max(0, investAmount / pricePerShare), [investAmount]);
  const profile = useMemo(() => profileForStartupPage(s), [s]);
  const journeyPosts = useMemo(
    () =>
      profile.journeyEntries.map((entry, index) => ({
        id: `journey-${index + 1}`,
        ...entry,
        date: `${(index + 1) * 4} days ago`,
      })),
    [profile],
  );
  const kpis = useMemo(
    () =>
      profile.kpis.map((kpi) => ({
        ...kpi,
        icon: KPI_ICONS[kpi.iconKey] ?? Target,
      })),
    [profile],
  );
  const timeline = profile.timeline;
  const investorQuotes = profile.investorQuotes;
  const bumpEngagement = (id: string, key: "likes" | "comments" | "reposts") => {
    setEngageDeltas((current) => ({
      ...current,
      [id]: { ...current[id], [key]: (current[id]?.[key] ?? 0) + 1 },
    }));
    showAppWidget("Thanks for the signal", "We logged your engagement on this update (demo).");
  };

  const quickAnnouncements = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        id: `announce-${index + 1}`,
        author: index % 3 === 0 ? "Mira Chen" : index % 3 === 1 ? "Devon Reyes" : "Founder Team",
        handle: "@founder_update",
        time: `${index + 1}h`,
        text: profile.announcementSamples[index % profile.announcementSamples.length],
        likes: 24 + index * 2,
        comments: 5 + (index % 6),
        reposts: 1 + (index % 5),
      })),
    [profile],
  );
  const qaThreads = useMemo(
    () =>
      Array.from({ length: profile.qaInvestors.length }, (_, index) => ({
        id: `qa-${index + 1}`,
        investor: profile.qaInvestors[index % profile.qaInvestors.length],
        role: index % 3 === 0 ? "Angel Investor" : index % 3 === 1 ? "Family Office" : "Operator-Investor",
        askedAt: `${index + 1}d ago`,
        repliedAt: `${index}d ago`,
        question: profile.qaQuestions[index % profile.qaQuestions.length],
        founderReply: profile.qaReplies[index % profile.qaReplies.length],
        replies: 1 + (index % 4),
        upvotes: 6 + index * 2,
      })),
    [profile],
  );
  const journeyGallery = useMemo(
    () =>
      Array.from({ length: profile.journeyGalleryCount }, (_, index) => ({
        id: `journey-media-${index + 1}`,
        title: `Milestone Snapshot ${index + 1}`,
        caption: profile.journeyGalleryCaption,
        image: `https://picsum.photos/seed/journey-${index + 1}/1000/560`,
      })),
    [profile],
  );

  const withEngagement = (item: (typeof quickAnnouncements)[number]) => ({
    ...item,
    likes: item.likes + (engageDeltas[item.id]?.likes ?? 0),
    comments: item.comments + (engageDeltas[item.id]?.comments ?? 0),
    reposts: item.reposts + (engageDeltas[item.id]?.reposts ?? 0),
  });

  const scrollToInvest = () => {
    investCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return (
      <AppShell activeSection="deals" contentClassName="mx-auto w-full min-w-0 max-w-6xl">
        <div className="py-20 text-muted-foreground">Loading startup profile…</div>
      </AppShell>
    );
  }

  if (!s) {
    return (
      <AppShell activeSection="deals" contentClassName="mx-auto w-full min-w-0 max-w-6xl">
        <div className="py-20">
          <p className="text-muted-foreground">Startup not found.</p>
          <Link to="/discover" className="text-primary mt-3 inline-flex font-medium">
            ← Back to discover
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeSection="deals"
      mainClassName="flex-1 min-w-0 px-4 py-4 lg:px-5"
      contentClassName="mx-auto w-full min-w-0 max-w-6xl"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 font-heading text-sm font-semibold text-foreground/85 transition-colors hover:text-primary"
        >
          <ArrowLeft size={18} strokeWidth={2.25} />
          Back to deals
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="font-heading text-sm font-semibold text-foreground/80 hover:text-foreground"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href).then(() => {
                showAppWidget("Link copied", "Send this round to your syndicate or save it for later.");
              });
            }}
          >
            Share
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 font-heading text-sm font-semibold text-primary-foreground"
            onClick={scrollToInvest}
          >
            Invest
          </button>
        </div>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,312px)] lg:gap-10">
          <section className="min-w-0">
            <div className="mb-6 flex items-center gap-4">
              <StartupLogoMark
                logo={s.logo}
                alt=""
                boxClass="h-14 w-14"
                emojiClass="text-2xl"
                identityKey={s.slug}
              />
              <div>
                <h1 className="mb-1 text-2xl font-bold">{s.name}</h1>
                <p className="text-base text-muted-foreground">{s.tagline}</p>
              </div>
            </div>

            <article className="group relative mb-8 aspect-video overflow-hidden rounded-2xl bg-zinc-900 shadow-xl">
              <img
                src={heroImgSrc}
                alt={`${s.name} product`}
                className="h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-75"
                referrerPolicy={heroImgReferrer}
                onError={() => setHeroPhase((p) => (p === "primary" ? "picsum" : p))}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <a
                  href={pitchVideoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open pitch video in a new tab"
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-white/80 bg-zinc-950/60 text-white shadow-xl backdrop-blur-sm transition-transform hover:scale-105"
                >
                  <Play size={32} className="ml-0.5" fill="currentColor" />
                </a>
              </div>
              <a
                href={pitchVideoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 left-4 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-black/70"
              >
                Open pitch video · new tab
              </a>
            </article>

            <div
              ref={tabsRef}
              className="sticky top-0 z-30 mb-8 border-b border-border bg-background/95 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            >
              <div className="flex items-center gap-8 overflow-x-auto pb-2">
                {(["Pitch", "Updates", "Discussion", "Journey"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`whitespace-nowrap pb-4 font-medium transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary font-bold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {tab === "Updates" ? ` (${s.updates.length})` : ""}
                </button>
                ))}
              </div>
            </div>
            <article className="max-w-none leading-relaxed text-muted-foreground">
              {activeTab === "Pitch" && (
                <div className="mx-auto w-full lg:w-[80%]">
                  {(() => {
                    const pitchMd = s.pitchMarkdown?.trim();
                    const wc =
                      s.wefunderCampaign && typeof s.wefunderCampaign === "object" && !Array.isArray(s.wefunderCampaign)
                        ? s.wefunderCampaign
                        : null;
                    const hasListing = Boolean(wc);
                    return (
                      <>
                        {pitchMd ? (
                          <section className="mb-10 px-2 md:px-4">
                            <PitchMarkdown markdown={pitchMd} />
                          </section>
                        ) : null}
                        {wc ? <PitchCampaignExtras campaign={wc} /> : null}
                        {!pitchMd ? (
                          <>
                            <section className="mb-10 px-2 md:px-4">
                              <h2 className="mb-4 text-4xl font-bold text-foreground">Reasons to Invest</h2>
                              <p className="mb-4 text-base text-muted-foreground">{s.description}</p>
                              {s.highlights && s.highlights.length > 0 && (
                                <ul className="mb-6 flex flex-wrap gap-2">
                                  {s.highlights.map((h) => (
                                    <li
                                      key={h}
                                      className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground"
                                    >
                                      {h}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <ul className="space-y-3 text-sm text-muted-foreground">
                                {s.verificationBadges.slice(0, 5).map((badge) => (
                                  <li key={badge.label} className="flex items-start gap-2">
                                    <CheckCircle2 size={16} className="mt-0.5 text-primary" />
                                    <span>{badge.label} — verified operating signal with clear investor relevance.</span>
                                  </li>
                                ))}
                              </ul>
                            </section>

                            {!hasListing ? (
                              <section className="mb-10 px-2 md:px-4">
                                <div className="mb-4 mx-auto max-w-[680px] overflow-hidden rounded-md md:mx-0">
                                  <img
                                    src={
                                      proxiedImageSrc("https://picsum.photos/seed/pitch-hero-a/1200/760") ?? ""
                                    }
                                    alt="Platform overview visual"
                                    className="h-[320px] w-full object-cover"
                                  />
                                </div>
                                <h3 className="mb-2 text-2xl font-bold text-foreground">How the platform works</h3>
                                <p className="mb-3 text-sm text-muted-foreground">
                                  We analyze property-level demand, rent momentum, and risk factors, then continuously
                                  optimize allocation strategies for durable, long-term cash performance.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Investors get transparent milestones, execution logs, and reporting cadence that
                                  prioritizes operational reality over presentation polish.
                                </p>
                              </section>
                            ) : null}
                          </>
                        ) : null}

                        <section className="mb-10 px-2 md:px-4">
                          <h3 className="mb-3 text-2xl font-bold text-foreground">Execution timeline</h3>
                          {timeline.map((item) => (
                            <div key={item.q} className="mb-3 border-l-2 border-border pl-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {item.q}
                              </p>
                              <p className="text-base font-semibold text-foreground">{item.title}</p>
                              <p className="text-sm text-muted-foreground">{item.body}</p>
                            </div>
                          ))}
                        </section>

                        {!pitchMd && !hasListing ? (
                          <section className="mb-10 px-2 md:px-4">
                            <div className="mb-4 mx-auto max-w-[680px] overflow-hidden rounded-md md:mx-0">
                              <img
                                src={proxiedImageSrc("https://picsum.photos/seed/pitch-hero-b/1200/760") ?? ""}
                                alt="Operational report visual"
                                className="h-[320px] w-full object-cover"
                              />
                            </div>
                            <h3 className="mb-2 text-2xl font-bold text-foreground">What makes this resilient</h3>
                            <p className="mb-3 text-sm text-muted-foreground">
                              Instead of single-point speculation, this model focuses on diversified exposure and
                              repeatable execution systems. Reporting reflects what changed week-by-week.
                            </p>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground">
                              <li>Data-backed underwriting at the unit and market level</li>
                              <li>Clear capital deployment logic tied to milestone ROI</li>
                              <li>Frequent founder updates with measurable outcomes</li>
                            </ul>
                          </section>
                        ) : null}

                        <section className="mb-8 px-2 md:px-4">
                          <h3 className="mb-3 text-2xl font-bold text-foreground">Investor perspective</h3>
                          {investorQuotes.map((quote) => (
                            <div key={quote.name} className="mb-4 border-l-2 border-border pl-4">
                              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                <MessageSquareQuote size={12} />
                                {quote.role}
                              </p>
                              <p className="mt-1 text-sm text-foreground">"{quote.quote}"</p>
                              <p className="mt-1 text-xs font-semibold text-muted-foreground">{quote.name}</p>
                            </div>
                          ))}
                        </section>
                      </>
                    );
                  })()}
                </div>
              )}
              {activeTab === "Updates" && (
                <div className="mx-auto w-full lg:w-[80%] space-y-2">
                  {quickAnnouncements.map((raw) => {
                    const item = withEngagement(raw);
                    const initials = item.author
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2);
                    return (
                      <article
                        key={item.id}
                        className="flex gap-3 rounded-xl border border-border bg-card p-4 transition hover:bg-muted/30"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p className="text-sm font-semibold text-foreground">{item.author}</p>
                            <p className="text-xs text-muted-foreground">{item.handle}</p>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{item.time}</span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-foreground">{item.text}</p>
                          <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 transition hover:text-primary"
                              onClick={() => bumpEngagement(raw.id, "comments")}
                            >
                              <MessageCircle size={14} />
                              {item.comments}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 transition hover:text-emerald-600"
                              onClick={() => bumpEngagement(raw.id, "reposts")}
                            >
                              <Repeat2 size={14} />
                              {item.reposts}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 transition hover:text-rose-500"
                              onClick={() => bumpEngagement(raw.id, "likes")}
                            >
                              <Heart size={14} />
                              {item.likes}
                            </button>
                            <button
                              type="button"
                              className="ml-auto inline-flex items-center gap-1.5 transition hover:text-foreground"
                              onClick={() => {
                                void navigator.clipboard.writeText(`${window.location.href}#update-${raw.id}`);
                                showAppWidget("Update link copied", "Share this specific post with your network.");
                              }}
                            >
                              <Share2 size={14} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              {activeTab === "Discussion" && (
                <div className="mx-auto w-full lg:w-[80%] space-y-5">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your discussion</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Posts here appear on your profile activity. Founders and other investors can see them on this page.
                    </p>
                    <textarea
                      value={discussionDraft}
                      onChange={(e) => setDiscussionDraft(e.target.value)}
                      rows={3}
                      placeholder="Ask a question or leave a short comment for the founder…"
                      className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        disabled={!discussionDraft.trim() || !s}
                        onClick={() => {
                          if (!s) return;
                          const text = discussionDraft.trim();
                          appendInvestorActivity({
                            kind: "question",
                            slug: s.slug,
                            companyName: s.name,
                            excerpt: text.length > 180 ? `${text.slice(0, 177)}…` : text,
                          });
                          setDiscussionDraft("");
                          showAppWidget("Question posted", "It’s on your profile activity and visible in this thread.");
                        }}
                      >
                        Post as question
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        disabled={!discussionDraft.trim() || !s}
                        onClick={() => {
                          if (!s) return;
                          const text = discussionDraft.trim();
                          appendInvestorActivity({
                            kind: "comment",
                            slug: s.slug,
                            companyName: s.name,
                            excerpt: text.length > 180 ? `${text.slice(0, 177)}…` : text,
                          });
                          setDiscussionDraft("");
                          showAppWidget("Comment added", "Shown on your profile and in this company’s discussion.");
                        }}
                      >
                        Post as comment
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {qaThreads.length} questions answered by the founder
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      Investors ask, founders reply directly. Every answer is timestamped and visible to all backers.
                    </p>
                  </div>
                  {qaThreads.map((thread) => {
                    const initials = thread.investor
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2);
                    return (
                      <article
                        key={thread.id}
                        className="rounded-xl border border-border bg-card p-5"
                      >
                        <header className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <p className="text-sm font-semibold text-foreground">{thread.investor}</p>
                              <span className="text-xs text-muted-foreground">·</span>
                              <p className="text-xs text-muted-foreground">{thread.role}</p>
                              <span className="text-xs text-muted-foreground">·</span>
                              <p className="text-xs text-muted-foreground">asked {thread.askedAt}</p>
                            </div>
                            <p className="mt-2 text-base leading-relaxed text-foreground">
                              {thread.question}
                            </p>
                          </div>
                        </header>

                        <div className="mt-4 ml-12 rounded-lg border-l-2 border-primary bg-primary/5 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold uppercase text-primary-foreground">
                              FT
                            </span>
                            <p className="text-sm font-semibold text-foreground">Founder Team</p>
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Verified founder
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">replied {thread.repliedAt}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground">{thread.founderReply}</p>
                        </div>

                        <footer className="mt-3 flex items-center gap-5 pl-12 text-xs text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 transition hover:text-primary"
                          >
                            <ThumbsUp size={13} />
                            {thread.upvotes}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 transition hover:text-primary"
                          >
                            <Reply size={13} />
                            {thread.replies} {thread.replies === 1 ? "reply" : "replies"}
                          </button>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              )}
              {activeTab === "Journey" && (
                <div className="mx-auto w-full lg:w-[80%] space-y-10">
                  <header className="border-b border-border pb-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Founder Journey</p>
                    <h2 className="mt-2 text-3xl font-bold text-foreground">Long-form notes from the team building this</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Detailed essays, retrospectives, and field notes from the operators. Updated regularly so investors
                      can follow the real arc of the company — not just the highlight reel.
                    </p>
                  </header>

                  {journeyPosts.map((post) => (
                    <article
                      key={post.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <div className="relative">
                        <img
                          src={`https://picsum.photos/seed/${post.seed}/1400/780`}
                          alt={post.title}
                          className="h-80 w-full object-cover md:h-[420px]"
                        />
                        <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
                          {post.category}
                        </span>
                      </div>
                      <div className="p-6 md:p-8">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={13} />
                            {post.date}
                          </span>
                          <span>·</span>
                          <span>{post.readMins} min read</span>
                        </div>
                        <h3 className="mt-3 text-2xl font-bold leading-snug text-foreground md:text-3xl">
                          {post.title}
                        </h3>
                        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                          {post.excerpt}
                        </p>
                        <div className="mt-5 space-y-4 text-base leading-relaxed text-foreground">
                          {post.body.split("\n\n").map((paragraph, paragraphIndex) => (
                            <p key={paragraphIndex}>{paragraph}</p>
                          ))}
                        </div>
                        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                              FT
                            </span>
                            Founder Team
                          </span>
                          <div className="flex items-center gap-4">
                            <button type="button" className="inline-flex items-center gap-1.5 transition hover:text-rose-500">
                              <Heart size={13} />
                              {42 + post.readMins * 3}
                            </button>
                            <button type="button" className="inline-flex items-center gap-1.5 transition hover:text-primary">
                              <MessageCircle size={13} />
                              {8 + post.readMins}
                            </button>
                            <button type="button" className="inline-flex items-center gap-1.5 transition hover:text-foreground">
                              <Share2 size={13} />
                              Share
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}

                  <section>
                    <h3 className="mb-4 text-lg font-bold text-foreground">Field gallery</h3>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {journeyGallery.slice(0, 6).map((item) => (
                        <article
                          key={item.id}
                          className="overflow-hidden rounded-xl border border-border bg-card"
                        >
                          <img src={item.image} alt={item.title} className="h-60 w-full object-cover" />
                          <div className="p-4">
                            <p className="text-base font-semibold text-foreground">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.caption}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </article>
          </section>

          <aside className="min-w-0 w-full">
            <div className="w-full lg:sticky lg:top-24 lg:self-start">
              <article
                ref={investCardRef}
                className="relative w-full max-w-full overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="h-1.5 w-full bg-[linear-gradient(90deg,rgba(16,185,129,0.85),rgba(59,130,246,0.75),rgba(99,102,241,0.8))]" />
                <div className="px-6 py-5">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Live Round
                  </div>
                  <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#09b474]">
                    <Trophy size={14} />
                    FIRST GOAL HIT (You can still invest)
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-[#24c07b]/20">
                    <div className="h-full w-[84%] rounded-full bg-[#24c07b]" />
                  </div>

                  <p className="mt-4 text-[2rem] font-light leading-none text-foreground">
                    {formatMoney(s.raising)}
                  </p>
                  <p className="mt-1 text-[0.82rem] leading-snug text-muted-foreground">
                    raised from {s.followers} investors
                  </p>

                  <div className="mt-6 grid grid-cols-[1fr_126px] items-end gap-3">
                    <div>
                      <p className="text-[1.35rem] font-semibold leading-none tracking-wide text-foreground">INVEST</p>
                      <p className="mt-1 text-[0.82rem] leading-none text-muted-foreground">min $100</p>
                    </div>
                    <label className="flex h-[58px] items-center rounded-md border border-[#d5dfeb] px-2.5 text-[1.15rem] text-muted-foreground">
                      <span className="mr-2">$</span>
                      <input
                        type="number"
                        min={100}
                        step={50}
                        value={investAmount}
                        onChange={(event) => setInvestAmount(Math.max(100, Number(event.target.value) || 100))}
                        className="w-full min-w-0 bg-transparent text-right text-[1.5rem] font-semibold leading-none text-foreground outline-none"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full rounded-[4px] bg-[#0f1013] py-3 text-[1.1rem] font-semibold uppercase tracking-wide text-white"
                    onClick={() => {
                      appendInvestorActivity({
                        kind: "invest",
                        slug: s.slug,
                        companyName: s.name,
                        amount: investAmount,
                      });
                      showAppWidget(
                        "Commitment recorded",
                        `We logged a $${investAmount.toLocaleString()} investment intent in ${s.name} (demo).`,
                      );
                    }}
                  >
                    Invest
                  </button>
                  <button
                    type="button"
                    onClick={handleFollow}
                    className={`relative mt-2.5 w-full rounded-[4px] border py-3 text-center text-[0.92rem] font-semibold uppercase tracking-wide transition ${
                      following
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-white text-[#0f1013] hover:bg-muted"
                    } ${subscribeFx ? "scale-[1.02]" : ""}`}
                  >
                    <Bookmark
                      size={14}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 ${subscribeFx ? "animate-pulse" : ""}`}
                      fill={following ? "currentColor" : "none"}
                    />
                    <span>{following ? "Subscribed" : "Subscribe"}</span>
                  </button>

                  <p className="mt-3.5 text-center text-[10px] text-muted-foreground">
                    {estimatedShares.toFixed(2)} estimated shares at ${pricePerShare.toFixed(2)}/share
                  </p>
                </div>

                <div className="border-t border-border px-6 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Investment Terms
                    </p>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-[12px] font-semibold text-foreground">Common Stock</p>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    {formatMoney(s.valuation)} pre-money valuation · ${pricePerShare.toFixed(2)} per share
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">Security type: {evsTier}</p>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">Heartbeat: {heartbeat}</p>
                </div>
              </article>
            </div>
          </aside>
        </div>
    </AppShell>
  );
}
