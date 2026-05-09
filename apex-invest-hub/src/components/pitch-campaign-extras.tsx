"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Video } from "lucide-react";
import { formatMoney } from "@/lib/api";
import { imageReferrerPolicy, proxiedImageSrc } from "@/lib/proxied-image-url";
import { wefunderAssetUrl } from "@/lib/wefunder-urls";

export type WefunderCampaignSnapshot = Record<string, unknown>;

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const t = String(v).trim();
  return t || undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function PitchVideoRow({ videoUrl, coverUrl }: { videoUrl: string; coverUrl?: string }) {
  const [thumbVisible, setThumbVisible] = useState(Boolean(coverUrl));

  useEffect(() => {
    setThumbVisible(Boolean(coverUrl));
  }, [coverUrl]);

  const coverSrc = coverUrl ? (proxiedImageSrc(coverUrl) ?? coverUrl) : undefined;

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex max-w-lg items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground shadow-sm transition-colors hover:bg-muted/60"
    >
      {coverSrc && thumbVisible ? (
        <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          <img
            src={coverSrc}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy={imageReferrerPolicy(coverUrl)}
            onError={() => setThumbVisible(false)}
          />
        </span>
      ) : (
        <span className="flex h-14 w-24 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-muted px-1 text-center">
          <Video className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Preview</span>
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          Open pitch video
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">Opens in a new tab (Wefunder)</span>
      </span>
    </a>
  );
}

export function PitchCampaignExtras({ campaign }: { campaign: WefunderCampaignSnapshot }) {
  const fact = str(campaign.fact);
  const videoUrl = wefunderAssetUrl(campaign.video_url);
  const videoCover = wefunderAssetUrl(campaign.video_cover_photo_url);
  const terms = campaign.terms as Record<string, unknown> | undefined;
  const nb = terms ? str(terms.nb) : undefined;
  const eb = terms ? str(terms.eb) : undefined;
  const termTxt = terms ? str(terms.txt) : undefined;
  const founder = campaign.founder_info as Record<string, unknown> | undefined;
  const founderName = founder ? str(founder.name) : undefined;
  const founderTitle = founder ? str(founder.title) : undefined;
  const founderBio = founder ? str(founder.bio) : undefined;
  const tags = Array.isArray(campaign.admin_tag_mappings)
    ? (campaign.admin_tag_mappings as Array<{ humanizedName?: string }>)
        .map((t) => str(t.humanizedName))
        .filter((x): x is string => Boolean(x))
    : [];
  const raised = num(campaign.total_raised_this_campaign);
  const investors = num(campaign.total_investors_this_campaign ?? campaign.investor_count);
  const region = str(campaign.region);
  const city = str(campaign.city);
  const state = str(campaign.state);
  const country = Array.isArray(campaign.country) ? str(campaign.country[0]) : str(campaign.country);
  const legal = str(campaign.legal_name);
  const label = str(campaign.label);

  const hasAny =
    fact ||
    videoUrl ||
    nb ||
    founderName ||
    tags.length > 0 ||
    raised != null ||
    investors != null ||
    region ||
    city;

  if (!hasAny) return null;

  return (
    <section className="mb-10 rounded-2xl border border-border bg-muted/20 px-4 py-6 md:px-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Reg CF listing snapshot
      </p>
      {label ? (
        <span className="mb-3 inline-block rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label.replace(/_/g, " ")}
        </span>
      ) : null}
      {fact ? (
        <blockquote className="mb-4 border-l-2 border-muted-foreground/40 pl-4 text-sm leading-relaxed text-foreground">
          {fact}
        </blockquote>
      ) : null}
      {(nb || eb || termTxt) && (
        <div className="mb-4 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">
            {[nb, eb].filter(Boolean).join(" · ")}
            {termTxt ? <span className="text-muted-foreground"> — {termTxt}</span> : null}
          </p>
        </div>
      )}
      {(raised != null || investors != null) && (
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          {raised != null ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Committed</p>
              <p className="font-semibold text-foreground">{formatMoney(raised)}</p>
            </div>
          ) : null}
          {investors != null ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Investors</p>
              <p className="font-semibold text-foreground">{investors.toLocaleString()}</p>
            </div>
          ) : null}
        </div>
      )}
      {(founderName || founderBio) && (
        <div className="mb-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Founder</p>
          <p className="font-semibold text-foreground">
            {founderName}
            {founderTitle ? <span className="font-normal text-muted-foreground"> — {founderTitle}</span> : null}
          </p>
          {founderBio ? <p className="mt-1 leading-relaxed text-muted-foreground">{founderBio}</p> : null}
        </div>
      )}
      {(city || state || region || country || legal) && (
        <p className="mb-4 text-xs text-muted-foreground">
          {[legal, [city, state].filter(Boolean).join(", "), region, country].filter(Boolean).join(" · ")}
        </p>
      )}
      {tags.length > 0 ? (
        <ul className="mb-4 flex flex-wrap gap-2">
          {tags.map((t) => (
            <li
              key={t}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
            >
              {t}
            </li>
          ))}
        </ul>
      ) : null}
      {videoUrl ? <PitchVideoRow videoUrl={videoUrl} coverUrl={videoCover} /> : null}
    </section>
  );
}
