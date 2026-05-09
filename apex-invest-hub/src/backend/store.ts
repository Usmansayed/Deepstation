import { startups } from "@/lib/mock-data";
import type { BackendStartup, FeedComment, FeedVote, FundingIntent, KycRecord } from "./types";

function isoDaysAgo(days: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt.toISOString();
}

function inferBadges(score: number) {
  return [
    { label: "Revenue Verified", source: "stripe", verified: score > 55 },
    { label: "Users Verified", source: "google-analytics", verified: score > 52 },
    { label: "Engineering Verified", source: "github", verified: score > 45 },
    { label: "Team Verified", source: "linkedin", verified: score > 40 },
  ] as const;
}

const seed: BackendStartup[] = startups.map((s, i) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  sector: s.sector,
  stage: s.stage,
  tagline: s.tagline,
  description: s.description,
  location: s.location,
  founded: s.founded,
  founders: s.founders.map((f) => ({ ...f })),
  credibility: s.credibility,
  momentum: s.momentum,
  raising: s.raising,
  valuation: s.valuation,
  followers: s.followers,
  logo: s.logo,
  heroImage: s.heroImage,
  raised: s.raised,
  highlights: s.highlights ? [...s.highlights] : [],
  traction: s.traction,
  updates: s.updates,
  verificationBadges: inferBadges(s.credibility).map((b) => ({ ...b })),
  lastHeartbeatAt: isoDaysAgo((i + 1) * 4),
  founderResponseHours: 4 + i * 2,
  milestoneHitRate: Math.max(45, Math.min(96, s.credibility - 4)),
  communityEngagement: Math.max(30, Math.min(95, Math.round((s.followers / 700) * 100))),
}));

class InMemoryStore {
  private readonly startupsBySlug = new Map<string, BackendStartup>(seed.map((s) => [s.slug, s]));
  private readonly follows = new Map<string, Set<string>>();
  private readonly commentsByStartup = new Map<string, FeedComment[]>();
  private readonly votesByStartup = new Map<string, FeedVote[]>();
  private readonly fundingIntents = new Map<string, FundingIntent>();
  private readonly kycByUser = new Map<string, KycRecord>();
  private readonly sessions = new Map<string, { userId: string; role: "founder" | "investor" }>();

  listStartups(): BackendStartup[] {
    return [...this.startupsBySlug.values()];
  }

  getStartup(slug: string): BackendStartup | undefined {
    return this.startupsBySlug.get(slug);
  }

  updateHeartbeat(slug: string): BackendStartup | undefined {
    const item = this.startupsBySlug.get(slug);
    if (!item) return undefined;
    item.lastHeartbeatAt = new Date().toISOString();
    return item;
  }

  followStartup(slug: string, userId: string): number {
    const existing = this.follows.get(slug) ?? new Set<string>();
    existing.add(userId);
    this.follows.set(slug, existing);
    return existing.size;
  }

  listFollowers(slug: string): string[] {
    return [...(this.follows.get(slug) ?? new Set<string>())];
  }

  addComment(slug: string, author: string, body: string): FeedComment {
    const comment: FeedComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      startupSlug: slug,
      author,
      body,
      createdAt: new Date().toISOString(),
    };
    const arr = this.commentsByStartup.get(slug) ?? [];
    arr.unshift(comment);
    this.commentsByStartup.set(slug, arr);
    return comment;
  }

  listComments(slug: string): FeedComment[] {
    return this.commentsByStartup.get(slug) ?? [];
  }

  addVote(slug: string, voterId: string): number {
    const votes = this.votesByStartup.get(slug) ?? [];
    if (!votes.some((v) => v.voterId === voterId)) {
      votes.push({ startupSlug: slug, voterId, createdAt: new Date().toISOString() });
      this.votesByStartup.set(slug, votes);
    }
    return votes.length;
  }

  countVotes(slug: string): number {
    return (this.votesByStartup.get(slug) ?? []).length;
  }

  createFundingIntent(payload: Omit<FundingIntent, "id" | "status" | "createdAt">): FundingIntent {
    const intent: FundingIntent = {
      ...payload,
      id: `fi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: "initiated",
      createdAt: new Date().toISOString(),
    };
    this.fundingIntents.set(intent.id, intent);
    return intent;
  }

  signFundingIntent(id: string): FundingIntent | undefined {
    const intent = this.fundingIntents.get(id);
    if (!intent) return undefined;
    intent.status = "signed";
    return intent;
  }

  recordFundingIntent(id: string): FundingIntent | undefined {
    const intent = this.fundingIntents.get(id);
    if (!intent) return undefined;
    intent.status = "recorded";
    return intent;
  }

  getFundingIntent(id: string): FundingIntent | undefined {
    return this.fundingIntents.get(id);
  }

  setKyc(userId: string, status: KycRecord["status"]): KycRecord {
    const rec: KycRecord = {
      userId,
      status,
      provider: "digilocker-mock",
      reviewedAt: status !== "pending" ? new Date().toISOString() : undefined,
    };
    this.kycByUser.set(userId, rec);
    return rec;
  }

  getKyc(userId: string): KycRecord | undefined {
    return this.kycByUser.get(userId);
  }

  createSession(userId: string, role: "founder" | "investor"): { token: string } {
    const token = `fp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    this.sessions.set(token, { userId, role });
    return { token };
  }

  getSession(token: string): { userId: string; role: "founder" | "investor" } | undefined {
    return this.sessions.get(token);
  }
}

export const backendStore = new InMemoryStore();
