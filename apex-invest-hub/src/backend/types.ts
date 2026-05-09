export type VerificationSource =
  | "stripe"
  | "github"
  | "google-analytics"
  | "mixpanel"
  | "posthog"
  | "razorpay"
  | "linkedin";

export type VerificationBadge = {
  label: string;
  source: VerificationSource;
  verified: boolean;
};

export type EVSBreakdown = {
  metricTrajectory: number;
  updateConsistency: number;
  milestoneDelivery: number;
  founderResponsiveness: number;
  dataVerificationLevel: number;
  communitySignals: number;
  total: number;
  tier: "Unverified" | "Emerging" | "Credible" | "Institutional Ready";
};

export type GhostStatus = {
  daysSinceLastUpdate: number;
  heartbeat: "Active" | "Warning" | "Inactive" | "Dormant";
  penaltyApplied: number;
  timelineEvent: string;
};

export type BackendStartup = {
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
  logo?: string;
  heroImage?: string;
  raised?: number;
  highlights?: string[];
  traction: Array<{ month: string; revenue: number; users: number }>;
  updates: Array<{ id: string; date: string; title: string; type: string; body: string }>;
  verificationBadges: VerificationBadge[];
  lastHeartbeatAt: string;
  founderResponseHours: number;
  milestoneHitRate: number;
  communityEngagement: number;
};

export type InvestorPreferenceProfile = {
  sectors: string[];
  stages: string[];
  minEvs: number;
  checkSizeMin: number;
  checkSizeMax: number;
  minGrowthRate: number;
  requireVerifiedOnly: boolean;
};

export type FeedComment = {
  id: string;
  startupSlug: string;
  author: string;
  body: string;
  createdAt: string;
};

export type FeedVote = {
  startupSlug: string;
  voterId: string;
  createdAt: string;
};

export type FundingIntent = {
  id: string;
  startupSlug: string;
  investorId: string;
  amount: number;
  instrument: "SAFE" | "Equity";
  valuationCap?: number;
  status: "initiated" | "signed" | "recorded";
  createdAt: string;
};

export type KycRecord = {
  userId: string;
  status: "pending" | "verified" | "rejected";
  provider: "digilocker-mock";
  reviewedAt?: string;
};
