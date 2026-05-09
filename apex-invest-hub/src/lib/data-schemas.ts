import { z } from "zod";

export const StageSchema = z.enum(["Pre-seed", "Seed", "Series A", "Series B"]);

export const FounderSchema = z.object({
  name: z.string(),
  role: z.string(),
  bio: z.string(),
  linkedin: z.string().url().optional(),
  verified: z.boolean(),
});

export const UpdateSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: z.enum(["milestone", "product", "traction", "team", "fundraise"]),
  title: z.string(),
  body: z.string(),
});

export const TractionPointSchema = z.object({
  month: z.string(),
  revenue: z.number(),
  users: z.number(),
});

export const StartupSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  logo: z.string(),
  heroImage: z.string().optional(),
  pitchMarkdown: z.string().optional(),
  sector: z.string(),
  stage: StageSchema,
  location: z.string(),
  founded: z.string(),
  raising: z.number(),
  valuation: z.number(),
  raised: z.number(),
  credibility: z.number().min(0).max(100),
  momentum: z.number().min(0).max(100),
  followers: z.number().min(0),
  founders: z.array(FounderSchema).min(1),
  updates: z.array(UpdateSchema),
  traction: z.array(TractionPointSchema),
  highlights: z.array(z.string()),
});

export type Startup = z.infer<typeof StartupSchema>;
export const StartupsSchema = z.array(StartupSchema);

export const StartupProfileSchema = z.object({
  journeyEntries: z.array(
    z.object({
      title: z.string(),
      excerpt: z.string(),
      body: z.string(),
      readMins: z.number(),
      seed: z.string(),
      category: z.string(),
    }),
  ),
  kpis: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      tone: z.string(),
      iconKey: z.string(),
    }),
  ),
  timeline: z.array(
    z.object({ q: z.string(), title: z.string(), body: z.string() }),
  ),
  investorQuotes: z.array(
    z.object({ name: z.string(), role: z.string(), quote: z.string() }),
  ),
  announcementSamples: z.array(z.string()).min(1),
  qaInvestors: z.array(z.string()).min(1),
  qaQuestions: z.array(z.string()).min(1),
  qaReplies: z.array(z.string()).min(1),
  journeyGalleryCount: z.number().int().positive(),
  journeyGalleryCaption: z.string(),
});

export type StartupProfile = z.infer<typeof StartupProfileSchema>;

export const AiResearchCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  ticker: z.string(),
  sector: z.string(),
  image: z.string().url(),
  confidence: z.number().min(0).max(100),
  risk: z.enum(["Low", "Medium", "High"]),
  timing: z.string(),
  thesis: z.string(),
  trend: z.enum(["Uptrend", "Neutral", "Emerging"]),
});

export const AiResearchDeskStatsSchema = z.object({
  campaignsInIndex: z.number(),
  listingsInIndex: z.number(),
  linkedPairs: z.number(),
  totalRaisedUsd: z.number(),
  totalInvestorsReported: z.number(),
  avgQualityScore: z.number(),
});

export const AiResearchIndexSchema = z.object({
  companies: z.array(AiResearchCompanySchema).min(1),
  activityFeed: z.array(z.string()).min(1),
  reasoningTimeline: z.array(z.string()).min(1),
  deskStats: AiResearchDeskStatsSchema.optional(),
});

export type AiResearchCompany = z.infer<typeof AiResearchCompanySchema>;
export type AiResearchDeskStats = z.infer<typeof AiResearchDeskStatsSchema>;
export type AiResearchIndex = z.infer<typeof AiResearchIndexSchema>;

const MemoSchema = z.object({
  oneLiner: z.string(),
  snapshotLine: z.string(),
  sentiment: z.string(),
  overview: z.string(),
  thesis: z.string(),
  whyBullets: z.array(z.string()),
  supportingSignals: z.array(z.string()),
  marketOpportunity: z.string(),
  competitiveAdvantage: z.string(),
  risks: z.array(z.string()),
  reasoningNarrative: z.string(),
  investorSummary: z.array(z.string()),
  chartCaption: z.string(),
  chartValues: z.array(z.number()),
  secondaryInsight: z.object({ title: z.string(), body: z.string() }),
});

const IntelSchema = z.object({
  marketSentimentScore: z.string(),
  growthTrajectory: z.string(),
  riskProfile: z.string(),
  momentumTags: z.array(z.string()),
  primaryGrowthSignal: z.string(),
  whyNow: z.string(),
  structuralTailwind: z.string(),
  opportunityType: z.string(),
  evidenceSectionIntro: z.string(),
  chartConvictionProves: z.string(),
  chartConvictionInterpretation: z.string(),
  chartPositioningProves: z.string(),
  chartPositioningInterpretation: z.string(),
  chartSentimentProves: z.string(),
  chartSentimentInterpretation: z.string(),
  riskFraming: z.string(),
  aiReasoningTimeline: z.array(z.string()),
  metrics: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      delta: z.string().optional(),
      implication: z.string(),
    }),
  ),
  positioningPeers: z.array(z.object({ name: z.string(), score: z.number() })),
  sentimentSeries: z.array(z.object({ period: z.string(), net: z.number() })),
  evidence: z.array(
    z.object({
      headline: z.string(),
      supportingSignal: z.string(),
      confidence: z.enum(["high", "medium", "emerging"]),
      implication: z.string(),
      inference: z.string(),
    }),
  ),
  aiSignals: z.array(
    z.object({ text: z.string(), kind: z.enum(["up", "steady", "watch"]) }),
  ),
  aiDetected: z.array(z.string()),
  marketAnalysis: z.string(),
  competitorBreakdown: z.string(),
  sentimentDeepDive: z.string(),
  fundingHistory: z.string(),
  riskScenarios: z.string(),
});

export const DossierSchema = z.object({
  id: z.string(),
  memo: MemoSchema,
  intel: IntelSchema,
});

export const DossierDefaultSchema = z.object({
  memo: MemoSchema,
  intel: IntelSchema,
});

export type Dossier = z.infer<typeof DossierSchema>;

export const MessageThreadSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  preview: z.string(),
  time: z.string(),
  unread: z.number().int().min(0).optional(),
  avatarSeed: z.string(),
  pinned: z.boolean().optional(),
  mutedUntil: z.string().nullable().optional(),
  archived: z.boolean().optional(),
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  mine: z.boolean(),
  time: z.string(),
});

export const MessagesFixtureSchema = z.object({
  threads: z.array(MessageThreadSchema),
  messagesByThread: z.record(z.string(), z.array(ChatMessageSchema)),
});

export type MessagesFixture = z.infer<typeof MessagesFixtureSchema>;

export const CashTransactionSchema = z.object({
  id: z.string(),
  type: z.enum(["Deposit", "Withdrawal", "Internal transfer"]),
  account: z.string(),
  amount: z.number(),
  status: z.enum(["Pending", "Completed"]),
  date: z.string(),
  destination: z.string(),
  channel: z.enum(["Bank wire", "ACH", "Internal ledger"]),
  reference: z.string(),
});

export const CashTransactionsSchema = z.array(CashTransactionSchema);
export type CashTransaction = z.infer<typeof CashTransactionSchema>;

export const TopInvestorSchema = z.object({
  rank: z.number().int().positive(),
  name: z.string(),
  blurb: z.string(),
  site: z.string(),
  seed: z.string(),
});

export const TopInvestorsSchema = z.array(TopInvestorSchema);
export type TopInvestor = z.infer<typeof TopInvestorSchema>;

export const DiscoverCategoriesSchema = z.object({
  categories: z.array(z.object({ label: z.string(), iconKey: z.string() })),
  stages: z.array(z.string()),
  businessModels: z.array(z.string()),
  sizes: z.array(z.string()),
  regions: z.array(z.string()),
  sortOptions: z.array(z.string()),
});

export type DiscoverCategories = z.infer<typeof DiscoverCategoriesSchema>;

export const DemoUserSchema = z.object({
  name: z.string(),
  location: z.string(),
  bio: z.string(),
  focus: z.string(),
  avatar: z.string().url(),
});

export type DemoUser = z.infer<typeof DemoUserSchema>;
