import { StartupFollow, StartupComment, StartupVote, StartupProfile } from "../models/index.js";
import { computeEvsBreakdown, computeGhostStatus } from "../lib/engine.js";

/**
 * Convert a Startup mongoose doc into the BackendStartup shape used by the
 * scoring engine and the frontend ApiStartup contract.
 */
function toBackendStartup(doc, opts = {}) {
  const { includePitchMarkdown = false, includeWefunderCampaign = false } = opts;
  const obj = doc.toObject({ virtuals: false, versionKey: false });
  const base = {
    id: String(doc._id),
    slug: obj.slug,
    name: obj.name,
    sector: obj.sector,
    stage: obj.stage,
    tagline: obj.tagline,
    description: obj.description,
    location: obj.location,
    founded: obj.founded,
    founders: obj.founders,
    credibility: obj.credibility,
    momentum: obj.momentum,
    raising: obj.raising,
    valuation: obj.valuation,
    followers: obj.followers,
    logo: obj.logo ?? "📦",
    heroImage: obj.heroImage && String(obj.heroImage).trim() ? String(obj.heroImage).trim() : undefined,
    raised: obj.raised ?? 0,
    highlights: Array.isArray(obj.highlights) ? obj.highlights : [],
    traction: obj.traction,
    updates: obj.updates,
    verificationBadges: obj.verificationBadges,
    lastHeartbeatAt:
      obj.lastHeartbeatAt instanceof Date
        ? obj.lastHeartbeatAt.toISOString()
        : obj.lastHeartbeatAt,
    founderResponseHours: obj.founderResponseHours,
    milestoneHitRate: obj.milestoneHitRate,
    communityEngagement: obj.communityEngagement,
  };
  if (includePitchMarkdown) {
    const pm = obj.pitchMarkdown != null ? String(obj.pitchMarkdown).trim() : "";
    if (pm) base.pitchMarkdown = pm;
  }
  if (
    includeWefunderCampaign &&
    obj.wefunderCampaign != null &&
    typeof obj.wefunderCampaign === "object" &&
    !Array.isArray(obj.wefunderCampaign)
  ) {
    base.wefunderCampaign = obj.wefunderCampaign;
  }
  return base;
}

async function engagementForSlug(slug) {
  const [followerCount, voteCount] = await Promise.all([
    StartupFollow.countDocuments({ startupSlug: slug }),
    StartupVote.countDocuments({ startupSlug: slug }),
  ]);
  return { upvotes: voteCount, followers: followerCount };
}

export async function mapStartupListResponse(docs) {
  const slugs = docs.map((d) => d.slug);
  const [followCounts, voteCounts] = await Promise.all([
    StartupFollow.aggregate([
      { $match: { startupSlug: { $in: slugs } } },
      { $group: { _id: "$startupSlug", count: { $sum: 1 } } },
    ]),
    StartupVote.aggregate([
      { $match: { startupSlug: { $in: slugs } } },
      { $group: { _id: "$startupSlug", count: { $sum: 1 } } },
    ]),
  ]);
  const followBySlug = new Map(followCounts.map((r) => [r._id, r.count]));
  const voteBySlug = new Map(voteCounts.map((r) => [r._id, r.count]));

  return docs.map((doc) => {
    const startup = toBackendStartup(doc);
    return {
      ...startup,
      evs: computeEvsBreakdown(startup),
      ghostStatus: computeGhostStatus(startup),
      engagement: {
        upvotes: voteBySlug.get(startup.slug) ?? 0,
        followers: followBySlug.get(startup.slug) ?? 0,
      },
    };
  });
}

function leanProfilePayload(raw) {
  if (!raw) return null;
  const { _id, __v, createdAt, updatedAt, slug, ...rest } = raw;
  return { slug, ...rest };
}

export async function mapStartupDetailResponse(doc) {
  const startup = toBackendStartup(doc, {
    includePitchMarkdown: true,
    includeWefunderCampaign: true,
  });
  const [engagement, comments, profileDoc] = await Promise.all([
    engagementForSlug(startup.slug),
    StartupComment.find({ startupSlug: startup.slug }).sort({ createdAt: -1 }).lean(),
    StartupProfile.findOne({ slug: startup.slug }).lean(),
  ]);

  return {
    ...startup,
    evs: computeEvsBreakdown(startup),
    ghostStatus: computeGhostStatus(startup),
    engagement,
    comments: comments.map((c) => ({
      id: String(c._id),
      startupSlug: c.startupSlug,
      author: c.author,
      body: c.body,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    })),
    profile: leanProfilePayload(profileDoc),
  };
}

export { toBackendStartup };
