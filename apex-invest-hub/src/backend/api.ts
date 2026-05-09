import { z } from "zod";
import defaultStartupProfile from "../../../data/startup_profiles/_default.json";
import discoverCategories from "../../../data/ui/discover_categories.json";
import demoUser from "../../../data/platform/demo_user.json";
import messagesFixture from "../../../data/platform/messages.json";
import cashTransactions from "../../../data/platform/cash_transactions.json";
import topInvestors from "../../../data/platform/top_investors.json";
import campaignsRaw from "../../../data/wefunder/raw/campaigns.json";
import {
  buildAiResearchIndex,
  buildCampaignBySlug,
  buildDossierPayload,
  resolveResearchSubject,
  type WefunderCampaign,
} from "./ai-research-from-startups";
import { buildAiResearchPlatformContext } from "./ai-research-chat-context";
import { runGeminiResearchChat } from "./gemini-research-chat";

const WEFUNDER_CAMPAIGNS = campaignsRaw as WefunderCampaign[];
const CAMPAIGN_BY_SLUG = buildCampaignBySlug(WEFUNDER_CAMPAIGNS);
import { backendStore } from "./store";
import {
  computeEvsBreakdown,
  computeGhostStatus,
  runComparisonAgent,
  runDueDiligenceAgent,
  runMomentumAgent,
  runThesisMatchAgent,
} from "./engine";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function notFound(message = "Not found"): Response {
  return json({ error: message }, 404);
}

function unauthorized(message = "Unauthorized"): Response {
  return json({ error: message }, 401);
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getRole(request: Request): string {
  return request.headers.get("x-role") ?? "public";
}

export async function handleBackendApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      service: "founderproof-backend",
      features: [
        "startup profiles",
        "evs scoring",
        "ghost detection",
        "ai copilot agents",
        "notification feeds",
      ],
    });
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const schema = z.object({
      userId: z.string().min(1),
      role: z.enum(["founder", "investor"]),
    });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    return json(backendStore.createSession(parsed.data.userId, parsed.data.role));
  }

  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    if (!token) return unauthorized("Missing bearer token");
    const session = backendStore.getSession(token);
    if (!session) return unauthorized("Invalid token");
    return json(session);
  }

  if (url.pathname === "/api/startups" && request.method === "GET") {
    const data = backendStore.listStartups().map((s) => ({
      ...s,
      evs: computeEvsBreakdown(s),
      ghostStatus: computeGhostStatus(s),
      engagement: {
        upvotes: backendStore.countVotes(s.slug),
        followers: backendStore.listFollowers(s.slug).length,
      },
    }));
    return json(data);
  }

  const startupMatch = url.pathname.match(/^\/api\/startups\/([^/]+)$/);
  if (startupMatch && request.method === "GET") {
    const startup = backendStore.getStartup(startupMatch[1]);
    if (!startup) return notFound("Startup not found");
    const profile = { slug: startup.slug, ...(defaultStartupProfile as Record<string, unknown>) };
    return json({
      ...startup,
      evs: computeEvsBreakdown(startup),
      ghostStatus: computeGhostStatus(startup),
      engagement: {
        upvotes: backendStore.countVotes(startup.slug),
        followers: backendStore.listFollowers(startup.slug).length,
      },
      comments: backendStore.listComments(startup.slug),
      profile,
    });
  }

  const startupFollowMatch = url.pathname.match(/^\/api\/startups\/([^/]+)\/follow$/);
  if (startupFollowMatch && request.method === "POST") {
    const schema = z.object({ userId: z.string().min(1) });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    if (!backendStore.getStartup(startupFollowMatch[1])) return notFound("Startup not found");
    const followers = backendStore.followStartup(startupFollowMatch[1], parsed.data.userId);
    return json({ startup: startupFollowMatch[1], followers });
  }

  const startupVoteMatch = url.pathname.match(/^\/api\/startups\/([^/]+)\/upvote$/);
  if (startupVoteMatch && request.method === "POST") {
    const schema = z.object({ voterId: z.string().min(1) });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    if (!backendStore.getStartup(startupVoteMatch[1])) return notFound("Startup not found");
    const upvotes = backendStore.addVote(startupVoteMatch[1], parsed.data.voterId);
    return json({ startup: startupVoteMatch[1], upvotes });
  }

  const startupCommentsMatch = url.pathname.match(/^\/api\/startups\/([^/]+)\/comments$/);
  if (startupCommentsMatch && request.method === "GET") {
    if (!backendStore.getStartup(startupCommentsMatch[1])) return notFound("Startup not found");
    return json(backendStore.listComments(startupCommentsMatch[1]));
  }
  if (startupCommentsMatch && request.method === "POST") {
    const schema = z.object({ author: z.string().min(1), body: z.string().min(1) });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    if (!backendStore.getStartup(startupCommentsMatch[1])) return notFound("Startup not found");
    return json(
      backendStore.addComment(startupCommentsMatch[1], parsed.data.author, parsed.data.body),
      201,
    );
  }

  const startupHeartbeatMatch = url.pathname.match(/^\/api\/startups\/([^/]+)\/heartbeat$/);
  if (startupHeartbeatMatch && request.method === "POST") {
    const updated = backendStore.updateHeartbeat(startupHeartbeatMatch[1]);
    if (!updated) return notFound("Startup not found");
    return json({
      startup: updated.slug,
      heartbeatAt: updated.lastHeartbeatAt,
      ghostStatus: computeGhostStatus(updated),
    });
  }

  const startupEvsMatch = url.pathname.match(/^\/api\/startups\/([^/]+)\/evs-breakdown$/);
  if (startupEvsMatch && request.method === "GET") {
    const startup = backendStore.getStartup(startupEvsMatch[1]);
    if (!startup) return notFound("Startup not found");
    return json(computeEvsBreakdown(startup));
  }

  const startupGhostMatch = url.pathname.match(/^\/api\/startups\/([^/]+)\/ghost-status$/);
  if (startupGhostMatch && request.method === "GET") {
    const startup = backendStore.getStartup(startupGhostMatch[1]);
    if (!startup) return notFound("Startup not found");
    return json(computeGhostStatus(startup));
  }

  const startupStakeholderMatch = url.pathname.match(
    /^\/api\/startups\/([^/]+)\/stakeholder-view$/,
  );
  if (startupStakeholderMatch && request.method === "GET") {
    if (getRole(request) !== "investor") {
      return unauthorized("Stakeholder view requires x-role: investor");
    }
    const startup = backendStore.getStartup(startupStakeholderMatch[1]);
    if (!startup) return notFound("Startup not found");
    return json({
      slug: startup.slug,
      burnRate: Math.round(startup.raising * 0.035),
      runwayMonths: Math.max(6, Math.round(24 - startup.momentum / 5)),
      committedCapital: Math.round(startup.raising * 0.42),
      capTableVisibility: "stakeholder-only",
      runwaySensitivity: "simulated",
    });
  }

  if (url.pathname === "/api/matching/investor-recommendations" && request.method === "POST") {
    const bodySchema = z.object({
      sectors: z.array(z.string()).default([]),
      stages: z.array(z.string()).default([]),
      minEvs: z.number().min(0).max(100),
      checkSizeMin: z.number().min(0),
      checkSizeMax: z.number().min(0),
      minGrowthRate: z.number().min(0),
      requireVerifiedOnly: z.boolean().default(false),
    });
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    return json({
      generatedAt: new Date().toISOString(),
      recommendationType: "weekly-personalized",
      ...runThesisMatchAgent(backendStore.listStartups(), parsed.data),
    });
  }

  if (url.pathname === "/api/agents/due-diligence" && request.method === "POST") {
    const bodySchema = z.object({ slug: z.string().min(1) });
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    const startup = backendStore.getStartup(parsed.data.slug);
    if (!startup) return notFound("Startup not found");
    return json(runDueDiligenceAgent(startup));
  }

  if (url.pathname === "/api/agents/comparison" && request.method === "POST") {
    const bodySchema = z.object({ slugs: z.array(z.string()).min(2) });
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    const pool = parsed.data.slugs
      .map((slug) => backendStore.getStartup(slug))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    if (pool.length < 2)
      return json({ error: "At least two valid startup slugs are required" }, 400);
    return json(runComparisonAgent(pool));
  }

  if (url.pathname === "/api/agents/momentum" && request.method === "GET") {
    return json(runMomentumAgent(backendStore.listStartups()));
  }

  if (url.pathname === "/api/agents/thesis-match" && request.method === "POST") {
    const bodySchema = z.object({
      sectors: z.array(z.string()).default([]),
      stages: z.array(z.string()).default([]),
      minEvs: z.number().min(0).max(100),
      checkSizeMin: z.number().min(0),
      checkSizeMax: z.number().min(0),
      minGrowthRate: z.number().min(0),
      requireVerifiedOnly: z.boolean().default(false),
    });
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    return json(runThesisMatchAgent(backendStore.listStartups(), parsed.data));
  }

  const digestMatch = url.pathname.match(/^\/api\/notifications\/founder-digest\/([^/]+)$/);
  if (digestMatch && request.method === "GET") {
    const startup = backendStore.getStartup(digestMatch[1]);
    if (!startup) return notFound("Startup not found");
    const evs = computeEvsBreakdown(startup);
    return json({
      schedule: "Monday",
      subject: `${startup.name} weekly founder digest`,
      summary: {
        evs: evs.total,
        momentum: startup.momentum,
        updateCount: startup.updates.length,
      },
      upcomingFocus: "Hit next milestone and maintain 14-day heartbeat.",
    });
  }

  if (url.pathname === "/api/notifications/transparency-alerts" && request.method === "GET") {
    const alerts = backendStore
      .listStartups()
      .map((s) => ({ slug: s.slug, status: computeGhostStatus(s) }))
      .filter((x) => x.status.heartbeat !== "Active")
      .map((x) => ({
        slug: x.slug,
        heartbeat: x.status.heartbeat,
        daysSinceLastUpdate: x.status.daysSinceLastUpdate,
        event: x.status.timelineEvent,
      }));
    return json(alerts);
  }

  if (url.pathname === "/api/notifications/portfolio-digest" && request.method === "POST") {
    const schema = z.object({
      investorId: z.string().min(1),
      watchlist: z.array(z.string()).min(1),
    });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    const startups = parsed.data.watchlist
      .map((slug) => backendStore.getStartup(slug))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    return json({
      investorId: parsed.data.investorId,
      schedule: "Weekly",
      summary: startups.map((s) => ({
        slug: s.slug,
        evs: computeEvsBreakdown(s).total,
        heartbeat: computeGhostStatus(s).heartbeat,
        momentum: s.momentum,
      })),
    });
  }

  if (url.pathname === "/api/research/sector-report" && request.method === "GET") {
    const sector = url.searchParams.get("sector");
    const list = backendStore.listStartups().filter((s) => !sector || s.sector === sector);
    return json({
      sector: sector ?? "all",
      startups: list.length,
      avgEvs: Math.round(
        list.reduce((acc, item) => acc + computeEvsBreakdown(item).total, 0) /
          Math.max(1, list.length),
      ),
      topStartups: list
        .map((s) => ({ slug: s.slug, evs: computeEvsBreakdown(s).total }))
        .sort((a, b) => b.evs - a.evs)
        .slice(0, 5),
    });
  }

  if (url.pathname === "/api/integrations/metrics-sync" && request.method === "POST") {
    const schema = z.object({
      slug: z.string().min(1),
      source: z.enum([
        "stripe",
        "github",
        "google-analytics",
        "mixpanel",
        "posthog",
        "razorpay",
        "linkedin",
      ]),
      metric: z.string().min(1),
      value: z.number(),
    });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    const startup = backendStore.updateHeartbeat(parsed.data.slug);
    if (!startup) return notFound("Startup not found");
    return json({
      syncedAt: startup.lastHeartbeatAt,
      startup: startup.slug,
      source: parsed.data.source,
      metric: parsed.data.metric,
      value: parsed.data.value,
      heartbeat: computeGhostStatus(startup).heartbeat,
    });
  }

  if (url.pathname === "/api/compliance/kyc" && request.method === "POST") {
    const schema = z.object({
      userId: z.string().min(1),
      status: z.enum(["pending", "verified", "rejected"]),
    });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    return json(backendStore.setKyc(parsed.data.userId, parsed.data.status));
  }

  const kycMatch = url.pathname.match(/^\/api\/compliance\/kyc\/([^/]+)$/);
  if (kycMatch && request.method === "GET") {
    const rec = backendStore.getKyc(kycMatch[1]);
    if (!rec) return notFound("KYC record not found");
    return json(rec);
  }

  if (url.pathname === "/api/funding/intents" && request.method === "POST") {
    const schema = z.object({
      startupSlug: z.string().min(1),
      investorId: z.string().min(1),
      amount: z.number().positive(),
      instrument: z.enum(["SAFE", "Equity"]),
      valuationCap: z.number().positive().optional(),
    });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    if (!backendStore.getStartup(parsed.data.startupSlug)) return notFound("Startup not found");
    return json(backendStore.createFundingIntent(parsed.data), 201);
  }

  const fundingMatch = url.pathname.match(/^\/api\/funding\/intents\/([^/]+)$/);
  if (fundingMatch && request.method === "GET") {
    const intent = backendStore.getFundingIntent(fundingMatch[1]);
    if (!intent) return notFound("Funding intent not found");
    return json(intent);
  }

  const fundingSignMatch = url.pathname.match(/^\/api\/funding\/intents\/([^/]+)\/sign-safe$/);
  if (fundingSignMatch && request.method === "POST") {
    const intent = backendStore.signFundingIntent(fundingSignMatch[1]);
    if (!intent) return notFound("Funding intent not found");
    return json({
      ...intent,
      safePreview: `SAFE agreement for ${intent.startupSlug} with valuation cap ${intent.valuationCap ?? "N/A"}`,
      signedAt: new Date().toISOString(),
    });
  }

  const fundingRecordMatch = url.pathname.match(/^\/api\/funding\/intents\/([^/]+)\/record$/);
  if (fundingRecordMatch && request.method === "POST") {
    const intent = backendStore.recordFundingIntent(fundingRecordMatch[1]);
    if (!intent) return notFound("Funding intent not found");
    return json({
      ...intent,
      transactionRail: "mock-razorpay/stripe",
      ledgerRecorded: true,
    });
  }

  if (url.pathname === "/api/fixtures/discover-categories" && request.method === "GET") {
    return json(discoverCategories);
  }
  if (url.pathname === "/api/fixtures/demo-user" && request.method === "GET") {
    return json(demoUser);
  }
  if (url.pathname === "/api/fixtures/messages" && request.method === "GET") {
    return json(messagesFixture);
  }
  if (url.pathname === "/api/fixtures/cash-transactions" && request.method === "GET") {
    return json(cashTransactions);
  }
  if (url.pathname === "/api/fixtures/top-investors" && request.method === "GET") {
    return json(topInvestors);
  }
  if (url.pathname === "/api/ai-research" && request.method === "GET") {
    return json(buildAiResearchIndex(backendStore.listStartups(), CAMPAIGN_BY_SLUG));
  }

  if (url.pathname === "/api/ai-research/chat" && request.method === "POST") {
    const chatSchema = z.object({
      messages: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            text: z.string().min(1).max(24_000),
          }),
        )
        .min(1)
        .max(40),
      companyId: z.string().max(200).optional(),
    });
    const parsedChat = chatSchema.safeParse(await readJson(request));
    if (!parsedChat.success)
      return json({ error: "Invalid payload", details: parsedChat.error.flatten() }, 400);

    const index = buildAiResearchIndex(backendStore.listStartups(), CAMPAIGN_BY_SLUG);
    let dossierPayload: ReturnType<typeof buildDossierPayload> | null = null;
    const cid = parsedChat.data.companyId?.trim();
    if (cid) {
      const resolved = resolveResearchSubject(
        cid,
        (s) => backendStore.getStartup(s),
        CAMPAIGN_BY_SLUG,
      );
      if (resolved) {
        dossierPayload = buildDossierPayload(
          resolved.startup,
          backendStore.listStartups(),
          resolved.campaign,
          WEFUNDER_CAMPAIGNS,
        );
      }
    }
    const platformContext = buildAiResearchPlatformContext(index, dossierPayload);
    try {
      const out = await runGeminiResearchChat(platformContext, parsedChat.data.messages);
      return json({ reply: out.reply, sources: out.sources });
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Gemini request failed";
      const status = /No Gemini authentication|credentials|API key/i.test(msg) ? 503 : 502;
      return json({ error: msg }, status);
    }
  }

  const dossierMatch = url.pathname.match(/^\/api\/ai-research\/dossiers\/([^/]+)$/);
  if (dossierMatch && request.method === "GET") {
    const slug = dossierMatch[1];
    const resolved = resolveResearchSubject(
      slug,
      (s) => backendStore.getStartup(s),
      CAMPAIGN_BY_SLUG,
    );
    if (!resolved) return notFound("Company not found");
    return json(
      buildDossierPayload(
        resolved.startup,
        backendStore.listStartups(),
        resolved.campaign,
        WEFUNDER_CAMPAIGNS,
      ),
    );
  }

  return notFound("API endpoint not found");
}
