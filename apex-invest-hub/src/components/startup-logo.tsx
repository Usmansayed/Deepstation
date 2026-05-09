"use client";

import { useEffect, useState } from "react";
import { picsumSeedUrl } from "@/lib/image-placeholders";
import { imageReferrerPolicy, proxiedImageSrc } from "@/lib/proxied-image-url";

/**
 * Startup `logo` in data may be an emoji (legacy mock) or an absolute image URL (e.g. Wefunder CDN).
 */
export function isRemoteStartupLogo(logo: string | undefined | null): logo is string {
  const t = (logo ?? "").trim();
  return /^https?:\/\//i.test(t) || t.startsWith("//");
}

function logoSrc(logo: string) {
  const t = logo.trim();
  return t.startsWith("//") ? `https:${t}` : t;
}

type Phase = "cdn" | "picsum" | "emoji";

type StartupLogoMarkProps = {
  logo?: string | null;
  /** Fallback when logo is empty */
  fallback?: string;
  alt?: string;
  className?: string;
  /** Tailwind size for the box, e.g. h-12 w-12 */
  boxClass?: string;
  /** Text size when showing emoji */
  emojiClass?: string;
  /** Stable seed for picsum when CDN logo fails (e.g. startup slug). */
  identityKey?: string;
};

export function StartupLogoMark({
  logo,
  fallback = "📦",
  alt = "",
  className = "",
  boxClass = "h-12 w-12",
  emojiClass = "text-2xl",
  identityKey,
}: StartupLogoMarkProps) {
  const base = `flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted ${boxClass} ${className}`;
  const [phase, setPhase] = useState<Phase>("cdn");

  useEffect(() => {
    setPhase("cdn");
  }, [logo]);

  if (!isRemoteStartupLogo(logo)) {
    return (
      <span className={`${base} ${emojiClass}`} aria-hidden>
        {logo?.trim() ? logo : fallback}
      </span>
    );
  }

  const absolute = logoSrc(logo);
  const seed = (identityKey ?? logo).trim() || "logo";
  const picsum = picsumSeedUrl(seed, 96, 96);

  if (phase === "emoji") {
    return (
      <span className={`${base} ${emojiClass}`} aria-hidden>
        {fallback}
      </span>
    );
  }

  const src = phase === "cdn" ? (proxiedImageSrc(absolute) ?? absolute) : (proxiedImageSrc(picsum) ?? picsum);

  return (
    <span className={base}>
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        referrerPolicy={phase === "cdn" ? imageReferrerPolicy(absolute) : undefined}
        onError={() => setPhase((p) => (p === "cdn" ? "picsum" : "emoji"))}
      />
    </span>
  );
}
