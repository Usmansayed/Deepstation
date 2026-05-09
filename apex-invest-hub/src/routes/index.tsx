import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Send, Zap } from "lucide-react";
import { StartupLogoMark } from "@/components/startup-logo";
import { imageReferrerPolicy, proxiedImageSrc } from "@/lib/proxied-image-url";
import { formatMoney, getStartups, type ApiStartup } from "@/lib/api";
import { showAppWidget } from "@/lib/feature-widget";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [startups, setStartups] = useState<ApiStartup[]>([]);
  const [subscribeEmail, setSubscribeEmail] = useState("");

  useEffect(() => {
    getStartups()
      .then(setStartups)
      .catch((error) => {
        console.error("Failed to load startups", error);
      });
  }, []);

  const sorted = useMemo(() => [...startups].sort((a, b) => b.followers - a.followers), [startups]);
  const highlighted = sorted[0];
  const trending = sorted.slice(0, 3);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2" aria-label="VentureFlow home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap size={18} />
              </span>
              <span className="font-heading text-xl font-extrabold tracking-tight">VentureFlow</span>
            </Link>
            <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
              <Link to="/" className="transition-colors hover:text-primary">
                Explore
              </Link>
              <a href="#how-it-works" className="transition-colors hover:text-primary">
                How it works
              </a>
              <Link to="/founder" className="transition-colors hover:text-primary">
                Raise Capital
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/profile" className="text-sm font-medium hover:text-primary">
              Log In
            </Link>
            <Link
              to="/discover"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Invest Now
            </Link>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden px-6 py-20">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="z-10">
            <h1 className="mb-6 text-5xl font-extrabold leading-tight md:text-6xl">
              Invest in the <span className="text-primary">next big thing</span>
            </h1>
            <p className="mb-8 max-w-xl text-xl text-muted-foreground">
              Join thousands of investors backing early-stage startups. Start with as little as $100
              and help build the future.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/discover"
                className="rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-[0_20px_45px_-25px_rgba(0,82,255,0.65)] transition-transform hover:scale-105"
              >
                Browse Startups
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-border bg-secondary px-8 py-4 text-lg font-bold text-secondary-foreground transition-colors hover:bg-muted"
              >
                Learn More
              </a>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["AB", "CD", "EF"].map((seed) => (
                  <span
                    key={seed}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/15 text-[10px] font-bold text-primary"
                  >
                    {seed}
                  </span>
                ))}
              </div>
              <span>Backing 1,200+ founders worldwide</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
            <article className="relative overflow-hidden rounded-2xl shadow-2xl">
              <img
                src={
                  proxiedImageSrc(
                    highlighted?.heroImage?.trim()
                      ? highlighted.heroImage.trim()
                      : "https://uxmagic.blob.core.windows.net/public/agent-images/hero-startup-1778246004461-wt82socfqij.png",
                  ) ?? ""
                }
                alt="Startup team presenting roadmap"
                className="h-[420px] w-full object-cover"
                referrerPolicy={imageReferrerPolicy(
                  highlighted?.heroImage?.trim()
                    ? highlighted.heroImage.trim()
                    : "https://uxmagic.blob.core.windows.net/public/agent-images/hero-startup-1778246004461-wt82socfqij.png",
                )}
              />
              {highlighted && (
                <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-border bg-background/90 p-4 shadow-lg backdrop-blur-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Trending Now
                    </span>
                    <span className="text-xs text-muted-foreground">2 days left</span>
                  </div>
                  <h2 className="text-lg font-bold">{highlighted.name}</h2>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted">
                    <div className="h-2 w-3/4 rounded-full bg-tertiary" />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="font-semibold">
                      {formatMoney(highlighted.raised ?? 0)} raised
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {formatMoney(highlighted.raising)} goal
                      </span>
                    </span>
                    <span className="text-muted-foreground">{highlighted.followers} investors</span>
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>
      </header>

      <section className="bg-muted/30 px-6 py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold">Leading Startups</h2>
              <p className="text-muted-foreground">Most popular campaigns this week</p>
            </div>
            <Link to="/discover" className="flex items-center gap-2 font-semibold text-primary hover:underline">
              More <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {trending.map((startup) => (
              <article
                key={startup.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-xl"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={
                      proxiedImageSrc(
                        startup.heroImage?.trim()
                          ? startup.heroImage.trim()
                          : `https://picsum.photos/seed/${startup.slug}/900/600`,
                      ) ?? ""
                    }
                    alt={startup.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy={imageReferrerPolicy(
                      startup.heroImage?.trim()
                        ? startup.heroImage.trim()
                        : `https://picsum.photos/seed/${startup.slug}/900/600`,
                    )}
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-bold shadow-sm backdrop-blur">
                    {startup.sector}
                  </span>
                </div>
                <div className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    {startup.logo ? (
                      <StartupLogoMark
                        logo={startup.logo}
                        alt=""
                        boxClass="h-9 w-9 rounded-lg"
                        emojiClass="text-lg"
                        identityKey={startup.slug}
                      />
                    ) : null}
                    <h3 className="text-xl font-bold">{startup.name}</h3>
                  </div>
                  <p className="mb-6 line-clamp-2 text-sm text-muted-foreground">{startup.tagline}</p>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-bold text-tertiary">{formatMoney(startup.raising)}</span>
                        <span className="text-muted-foreground">{Math.max(startup.evs.total, 42)}% of goal</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-tertiary"
                          style={{ width: `${Math.max(35, Math.min(100, startup.evs.total))}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <div className="text-xs">
                        <p className="uppercase tracking-wider text-muted-foreground">Investors</p>
                        <p className="font-bold">{startup.followers}</p>
                      </div>
                      <Link
                        to="/startup/$slug"
                        params={{ slug: startup.slug }}
                        className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white"
                      >
                        Invest
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border px-6 py-16">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[
            ["$500M+", "Invested"],
            ["1,200+", "Startups"],
            ["450k+", "Investors"],
            ["24%", "Avg. Growth"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="mb-1 text-4xl font-extrabold text-primary">{value}</p>
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-secondary px-6 py-20 text-secondary-foreground">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-6 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap size={18} />
              </span>
              <span className="text-xl font-bold tracking-tight">VentureFlow</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Back the founders building the future. VentureFlow is the leading equity crowdfunding
              platform.
            </p>
          </div>
          <div>
            <h3 className="mb-6 font-bold">For Investors</h3>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <a href="#how-it-works" className="transition-colors hover:text-primary">
                  How it works
                </a>
              </li>
              <li>
                <Link to="/discover" className="transition-colors hover:text-primary">
                  Investment risks
                </Link>
              </li>
              <li>
                <Link to="/discover" className="transition-colors hover:text-primary">
                  Browse startups
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="transition-colors hover:text-primary">
                  Portfolio
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-6 font-bold">For Founders</h3>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <Link to="/founder" className="transition-colors hover:text-primary">
                  Raise capital
                </Link>
              </li>
              <li>
                <Link to="/founder" className="transition-colors hover:text-primary">
                  Founder FAQ
                </Link>
              </li>
              <li>
                <Link to="/messages" className="transition-colors hover:text-primary">
                  Refer a startup
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-6 font-bold">Subscribe</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Get the latest investment opportunities in your inbox.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const email = subscribeEmail.trim();
                if (!email) {
                  showAppWidget("Add your email", "Enter an address to subscribe to the deal digest.");
                  return;
                }
                showAppWidget("You are on the list", `We will send opportunities to ${email}.`);
                setSubscribeEmail("");
              }}
            >
              <input
                type="email"
                placeholder="Email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Email address"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary p-2 text-primary-foreground"
                aria-label="Subscribe"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto mt-20 w-full max-w-7xl border-t border-border/50 pt-8 text-center text-xs text-muted-foreground">
          <p>© 2024 VentureFlow Inc. All rights reserved. Investment in startups involves high risk.</p>
        </div>
      </footer>
    </div>
  );
}
