"use client";

import { useEffect, useState } from "react";
import { imageReferrerPolicy, proxiedImageSrc } from "@/lib/proxied-image-url";
import { picsumSeedUrl } from "@/lib/image-placeholders";

type Phase = "cdn" | "picsum" | "gone";

type PitchMarkdownImageProps = {
  src?: string | null;
  alt?: string | null;
  className?: string;
};

export function PitchMarkdownImage({ src: rawSrc, alt, className }: PitchMarkdownImageProps) {
  const raw = typeof rawSrc === "string" ? rawSrc : "";
  const [phase, setPhase] = useState<Phase>("cdn");

  useEffect(() => {
    setPhase("cdn");
  }, [raw]);

  if (!raw) return null;

  const cdnSrc = proxiedImageSrc(raw) ?? raw;
  const fallbackSrc = proxiedImageSrc(picsumSeedUrl(raw.slice(-48) || "md", 800, 450)) ?? picsumSeedUrl(raw.slice(-48) || "md", 800, 450);

  if (phase === "gone") {
    return (
      <div
        className={`my-4 flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 text-center text-xs text-muted-foreground ${className ?? ""}`}
      >
        Illustration unavailable (opens in listing may still work).
      </div>
    );
  }

  const displaySrc = phase === "cdn" ? cdnSrc : fallbackSrc;

  return (
    <img
      src={displaySrc}
      alt={alt ?? ""}
      className={className}
      loading="lazy"
      referrerPolicy={phase === "cdn" ? imageReferrerPolicy(raw) : undefined}
      onError={() => setPhase((p) => (p === "cdn" ? "picsum" : "gone"))}
    />
  );
}
