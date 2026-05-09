import "dotenv/config";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import mongoose from "mongoose";
import { connectDb } from "../src/db.js";
import {
  Startup,
  StartupProfile,
  AiResearchCompany,
  AiResearchDossier,
  MessageThread,
  CashTransaction,
  TopInvestor,
  AppConfig,
} from "../src/models/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(__dirname, "..", "..", "data");

function readJson(rel) {
  return JSON.parse(readFileSync(join(dataRoot, rel), "utf8"));
}

function inferBadges(score) {
  return [
    { label: "Revenue Verified", source: "stripe", verified: score > 55 },
    { label: "Users Verified", source: "google-analytics", verified: score > 52 },
    { label: "Engineering Verified", source: "github", verified: score > 45 },
    { label: "Team Verified", source: "linkedin", verified: score > 40 },
  ];
}

function isoDaysAgo(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt.toISOString();
}

/** Match `wefunder_media.normalize_slug` for joining raw campaigns. */
function normalizeSlugFromRaw(r, fallback = "") {
  let s = String(r.url ?? r.slug ?? fallback).trim().toLowerCase();
  if (s.includes("/")) s = s.split("/").pop() ?? s;
  let out = "";
  for (const c of s) {
    if (/[a-z0-9-]/.test(c)) out += c;
    else out += "-";
  }
  while (out.includes("--")) out = out.replace("--", "-");
  out = out.replace(/^-+|-+$/g, "");
  const sliced = out.slice(0, 72);
  return sliced || fallback;
}

function loadCampaignIndexes() {
  const path = join(dataRoot, "wefunder", "raw", "campaigns.json");
  if (!existsSync(path)) {
    return { byId: new Map(), bySlug: new Map() };
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(raw)) {
    return { byId: new Map(), bySlug: new Map() };
  }
  const byId = new Map();
  const bySlug = new Map();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const id = r.id != null ? String(r.id) : r.objectID != null ? String(r.objectID) : null;
    if (id) byId.set(id, r);
    const slug = normalizeSlugFromRaw(r, "").trim().toLowerCase();
    if (slug) bySlug.set(slug, r);
  }
  return { byId, bySlug };
}

function buildStartupSeed(s, i, campaignById, campaignBySlug) {
  const raw =
    campaignById.get(String(s.id)) ?? campaignBySlug.get(String(s.slug).trim().toLowerCase());
  return {
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
    heroImage: s.heroImage ?? "",
    pitchMarkdown: s.pitchMarkdown ?? "",
    ...(raw ? { wefunderCampaign: raw } : {}),
    raised: s.raised,
    highlights: [...s.highlights],
    traction: s.traction,
    updates: s.updates,
    verificationBadges: inferBadges(s.credibility),
    lastHeartbeatAt: isoDaysAgo((i + 1) * 4),
    founderResponseHours: 4 + i * 2,
    milestoneHitRate: Math.max(45, Math.min(96, s.credibility - 4)),
    communityEngagement: Math.max(30, Math.min(95, Math.round((s.followers / 700) * 100))),
  };
}

async function reseed(model, label, docs) {
  const before = await model.countDocuments();
  await model.deleteMany({});
  const inserted = await model.insertMany(docs);
  console.log(`Replaced ${before} ${label} with ${inserted.length} seeded records.`);
}

async function upsertAppConfig(key, payload) {
  await AppConfig.replaceOne({ key }, { key, payload }, { upsert: true });
  console.log(`Upserted app config: ${key}`);
}

async function main() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) {
    console.error("MONGODB_URI is not set. Aborting seed.");
    process.exit(1);
  }

  await connectDb(uri);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  const startups = readJson("startups.json");
  const { byId: campaignById, bySlug: campaignBySlug } = loadCampaignIndexes();
  await reseed(
    Startup,
    "startups",
    startups.map((s, i) => buildStartupSeed(s, i, campaignById, campaignBySlug)),
  );

  const startupProfile = readJson("startup_profiles/_default.json");
  await reseed(
    StartupProfile,
    "startup profiles",
    startups.map((s) => ({ slug: s.slug, ...startupProfile })),
  );

  const aiResearch = readJson("ai_research/companies.json");
  await reseed(
    AiResearchCompany,
    "AI research companies",
    aiResearch.companies.map((c) => ({
      ...c,
      activityFeed: aiResearch.activityFeed,
      reasoningTimeline: aiResearch.reasoningTimeline,
    })),
  );

  const dossierDir = join(dataRoot, "ai_research", "dossiers");
  const dossierDocs = existsSync(dossierDir)
    ? readdirSync(dossierDir)
        .filter((n) => n.endsWith(".json"))
        .map((n) => readJson(`ai_research/dossiers/${n}`))
    : [];
  const dossierDefault = readJson("ai_research/dossier_default.json");
  const dossierWithDefault = [
    { id: "__default__", memo: dossierDefault.memo, intel: dossierDefault.intel },
    ...dossierDocs,
  ];
  await reseed(AiResearchDossier, "AI research dossiers", dossierWithDefault);

  await upsertAppConfig("discover_categories", readJson("ui/discover_categories.json"));
  await upsertAppConfig("demo_user", readJson("platform/demo_user.json"));

  const messages = readJson("platform/messages.json");
  await reseed(
    MessageThread,
    "message threads",
    messages.threads.map((t) => ({
      ...t,
      messages: messages.messagesByThread[t.id] ?? [],
    })),
  );

  const cash = readJson("platform/cash_transactions.json");
  await reseed(CashTransaction, "cash transactions", cash);

  const investors = readJson("platform/top_investors.json");
  await reseed(TopInvestor, "top investors", investors);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
