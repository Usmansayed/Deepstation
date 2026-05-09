import type {
  AiResearchIndex,
  CashTransaction,
  DemoUser,
  DiscoverCategories,
  MessagesFixture,
  StartupProfile,
  TopInvestor,
} from "./data-schemas";

export type ApiStartup = {
  id: string;
  slug: string;
  name: string;
  sector: string;
  stage: string;
  tagline: string;
  description: string;
  location: string;
  founded: string;
  founders: Array<{ name: string; role: string; bio: string; verified: boolean }>;
  credibility: number;
  momentum: number;
  raising: number;
  valuation: number;
  followers: number;
  /** Pitch deck / list UI (emoji in mock) */
  logo?: string;
  /** Wide hero image (Reg CF listing art, video still, etc.) */
  heroImage?: string;
  /** Pitch tab body (Markdown). Present on GET /api/startups/:slug when generated. */
  pitchMarkdown?: string;
  /** Full Wefunder listing payload when seeded/synced from `campaigns.json` (detail only). */
  wefunderCampaign?: Record<string, unknown>;
  /** Capital committed to date (USD) */
  raised?: number;
  highlights?: string[];
  traction: Array<{ month: string; revenue: number; users: number }>;
  updates: Array<{ id: string; date: string; title: string; type: string; body: string }>;
  verificationBadges: Array<{ label: string; source: string; verified: boolean }>;
  /** Rich tab content from Mongo (`StartupProfile`) — present on detail responses when seeded. */
  profile?: (StartupProfile & { slug?: string }) | null;
  evs: {
    metricTrajectory: number;
    updateConsistency: number;
    milestoneDelivery: number;
    founderResponsiveness: number;
    dataVerificationLevel: number;
    communitySignals: number;
    total: number;
    tier: "Unverified" | "Emerging" | "Credible" | "Institutional Ready";
  };
  ghostStatus: {
    daysSinceLastUpdate: number;
    heartbeat: "Active" | "Warning" | "Inactive" | "Dormant";
    penaltyApplied: number;
    timelineEvent: string;
  };
  engagement?: { upvotes: number; followers: number };
  comments?: Array<{
    id: string;
    startupSlug: string;
    author: string;
    body: string;
    createdAt: string;
  }>;
};

export type DueDiligenceReport = {
  agent: string;
  startup: string;
  findings: string[];
  confidence: number;
  disclaimer: string;
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function getStartups() {
  return requestJson<ApiStartup[]>("/api/startups");
}

export function getStartup(slug: string) {
  return requestJson<ApiStartup>(`/api/startups/${slug}`);
}

export function getDiscoverCategories() {
  return requestJson<DiscoverCategories>("/api/fixtures/discover-categories");
}

export function getDemoUser() {
  return requestJson<DemoUser>("/api/fixtures/demo-user");
}

export function getMessagesFixture() {
  return requestJson<MessagesFixture>("/api/fixtures/messages");
}

export function getCashTransactions() {
  return requestJson<CashTransaction[]>("/api/fixtures/cash-transactions");
}

export function getTopInvestors() {
  return requestJson<TopInvestor[]>("/api/fixtures/top-investors");
}

export function getAiResearchIndex() {
  return requestJson<AiResearchIndex>("/api/ai-research");
}

export type WefunderSnapshotPayload = {
  campaignId: number;
  slug: string;
  fact: string;
  label: string;
  percentFunded: number;
  securityType: string;
  annualRevenue: number | null;
  cashInBank: number | null;
  investorCount: number | null;
  totalInvestorsThisCampaign: number | null;
  fundingPastWeek: number | null;
  fundingPastMonth: number | null;
  qualityScore: number;
  pastFunding: number | null;
  termsHeadline: string;
  founderName: string | null;
  founderTitle: string | null;
  tagLabels: string[];
  verticalTags: string[];
};

export type AiResearchDossierPayload = {
  id: string;
  memo: Record<string, unknown>;
  intel: Record<string, unknown>;
  wefunder: WefunderSnapshotPayload | null;
};

export function getAiResearchDossierPayload(companyId: string) {
  return requestJson<AiResearchDossierPayload>(
    `/api/ai-research/dossiers/${encodeURIComponent(companyId)}`,
  );
}

export type AiResearchChatMessage = { role: "user" | "assistant"; text: string };

export type AiResearchChatResponse = {
  reply: string;
  sources?: { uri: string; title?: string }[];
};

export async function postAiResearchChat(body: {
  messages: AiResearchChatMessage[];
  companyId?: string;
}): Promise<AiResearchChatResponse> {
  const response = await fetch("/api/ai-research/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `API request failed (${response.status})`;
    throw new Error(err);
  }
  return payload as AiResearchChatResponse;
}

export function followStartup(slug: string, userId: string) {
  return requestJson<{ startup: string; followers: number }>(`/api/startups/${slug}/follow`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

export function runDueDiligence(slug: string) {
  return requestJson<DueDiligenceReport>("/api/agents/due-diligence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug }),
  });
}

export function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
