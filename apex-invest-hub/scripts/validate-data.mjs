// Validates every JSON file under repo-root /data using Zod schemas.
// Run via: npm run validate-data (from apex-invest-hub/).
//
// Schemas are duplicated in plain JS here (instead of importing the .ts module)
// to avoid pulling tsx into the toolchain. Keep this file in sync with
// src/lib/data-schemas.ts when adding new fixtures.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(__dirname, "..", "..", "data");

const StageSchema = z.enum(["Pre-seed", "Seed", "Series A", "Series B"]);

const FounderSchema = z.object({
  name: z.string(),
  role: z.string(),
  bio: z.string(),
  linkedin: z.string().url().optional(),
  verified: z.boolean(),
});

const UpdateSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: z.enum(["milestone", "product", "traction", "team", "fundraise"]),
  title: z.string(),
  body: z.string(),
});

const TractionPointSchema = z.object({
  month: z.string(),
  revenue: z.number(),
  users: z.number(),
});

const StartupSchema = z.object({
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

const StartupsSchema = z.array(StartupSchema);

const StartupProfileSchema = z.object({
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
    z.object({ label: z.string(), value: z.string(), tone: z.string(), iconKey: z.string() }),
  ),
  timeline: z.array(z.object({ q: z.string(), title: z.string(), body: z.string() })),
  investorQuotes: z.array(z.object({ name: z.string(), role: z.string(), quote: z.string() })),
  announcementSamples: z.array(z.string()).min(1),
  qaInvestors: z.array(z.string()).min(1),
  qaQuestions: z.array(z.string()).min(1),
  qaReplies: z.array(z.string()).min(1),
  journeyGalleryCount: z.number().int().positive(),
  journeyGalleryCaption: z.string(),
});

const AiResearchCompanySchema = z.object({
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

const AiResearchDeskStatsSchema = z.object({
  campaignsInIndex: z.number(),
  listingsInIndex: z.number(),
  linkedPairs: z.number(),
  totalRaisedUsd: z.number(),
  totalInvestorsReported: z.number(),
  avgQualityScore: z.number(),
});

const AiResearchIndexSchema = z.object({
  companies: z.array(AiResearchCompanySchema).min(1),
  activityFeed: z.array(z.string()).min(1),
  reasoningTimeline: z.array(z.string()).min(1),
  deskStats: AiResearchDeskStatsSchema.optional(),
});

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
  aiSignals: z.array(z.object({ text: z.string(), kind: z.enum(["up", "steady", "watch"]) })),
  aiDetected: z.array(z.string()),
  marketAnalysis: z.string(),
  competitorBreakdown: z.string(),
  sentimentDeepDive: z.string(),
  fundingHistory: z.string(),
  riskScenarios: z.string(),
});

const DossierSchema = z.object({
  id: z.string(),
  memo: MemoSchema,
  intel: IntelSchema,
});

const DossierDefaultSchema = z.object({
  memo: MemoSchema,
  intel: IntelSchema,
});

const MessageThreadSchema = z.object({
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

const ChatMessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  mine: z.boolean(),
  time: z.string(),
});

const MessagesFixtureSchema = z.object({
  threads: z.array(MessageThreadSchema),
  messagesByThread: z.record(z.string(), z.array(ChatMessageSchema)),
});

const CashTransactionsSchema = z.array(
  z.object({
    id: z.string(),
    type: z.enum(["Deposit", "Withdrawal", "Internal transfer"]),
    account: z.string(),
    amount: z.number(),
    status: z.enum(["Pending", "Completed"]),
    date: z.string(),
    destination: z.string(),
    channel: z.enum(["Bank wire", "ACH", "Internal ledger"]),
    reference: z.string(),
  }),
);

const TopInvestorsSchema = z.array(
  z.object({
    rank: z.number().int().positive(),
    name: z.string(),
    blurb: z.string(),
    site: z.string(),
    seed: z.string(),
  }),
);

const DiscoverCategoriesSchema = z.object({
  categories: z.array(z.object({ label: z.string(), iconKey: z.string() })),
  stages: z.array(z.string()),
  businessModels: z.array(z.string()),
  sizes: z.array(z.string()),
  regions: z.array(z.string()),
  sortOptions: z.array(z.string()),
});

const DemoUserSchema = z.object({
  name: z.string(),
  location: z.string(),
  bio: z.string(),
  focus: z.string(),
  avatar: z.string().url(),
});

const checks = [
  { file: "startups.json", schema: StartupsSchema },
  { file: "startup_profiles/_default.json", schema: StartupProfileSchema },
  { file: "ai_research/companies.json", schema: AiResearchIndexSchema },
  { file: "ai_research/dossier_default.json", schema: DossierDefaultSchema },
  { file: "platform/messages.json", schema: MessagesFixtureSchema },
  { file: "platform/cash_transactions.json", schema: CashTransactionsSchema },
  { file: "platform/top_investors.json", schema: TopInvestorsSchema },
  { file: "platform/demo_user.json", schema: DemoUserSchema },
  { file: "ui/discover_categories.json", schema: DiscoverCategoriesSchema },
];

let failures = 0;

function readJson(rel) {
  const path = join(dataRoot, rel);
  return JSON.parse(readFileSync(path, "utf8"));
}

function report(rel, result) {
  if (result.success) {
    console.log(`  ok    ${rel}`);
  } else {
    failures++;
    console.error(`  FAIL  ${rel}`);
    for (const issue of result.error.issues) {
      console.error(`        ${issue.path.join(".") || "<root>"}: ${issue.message}`);
    }
  }
}

console.log(`Validating data layer in ${dataRoot}\n`);

for (const { file, schema } of checks) {
  const path = join(dataRoot, file);
  if (!existsSync(path)) {
    failures++;
    console.error(`  MISSING ${file}`);
    continue;
  }
  report(file, schema.safeParse(readJson(file)));
}

const dossierDir = join(dataRoot, "ai_research", "dossiers");
if (existsSync(dossierDir)) {
  for (const name of readdirSync(dossierDir)) {
    if (!name.endsWith(".json")) continue;
    const rel = `ai_research/dossiers/${name}`;
    report(rel, DossierSchema.safeParse(readJson(rel)));
  }
} else {
  failures++;
  console.error(`  MISSING dir ai_research/dossiers`);
}

if (failures > 0) {
  console.error(`\n${failures} file(s) failed validation.`);
  process.exit(1);
}
console.log(`\nAll data files passed validation.`);
