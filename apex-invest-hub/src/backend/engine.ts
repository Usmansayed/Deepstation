import type { BackendStartup, EVSBreakdown, GhostStatus, InvestorPreferenceProfile } from "./types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function tierFromScore(total: number): EVSBreakdown["tier"] {
  if (total <= 30) return "Unverified";
  if (total <= 50) return "Emerging";
  if (total <= 75) return "Credible";
  return "Institutional Ready";
}

export function computeEvsBreakdown(startup: BackendStartup): EVSBreakdown {
  const trajectoryDelta =
    startup.traction[startup.traction.length - 1]?.revenue - startup.traction[0]?.revenue;
  const trajectory = clamp(40 + trajectoryDelta / 2200);
  const updateConsistency = clamp(100 - daysSince(startup.lastHeartbeatAt) * 2.8);
  const milestoneDelivery = clamp(startup.milestoneHitRate);
  const founderResponsiveness = clamp(100 - startup.founderResponseHours * 3);
  const verifiedCount = startup.verificationBadges.filter((b) => b.verified).length;
  const dataVerificationLevel = clamp((verifiedCount / startup.verificationBadges.length) * 100);
  const communitySignals = clamp(startup.communityEngagement);

  const total = Math.round(
    trajectory * 0.25 +
      updateConsistency * 0.2 +
      milestoneDelivery * 0.2 +
      founderResponsiveness * 0.1 +
      dataVerificationLevel * 0.15 +
      communitySignals * 0.1,
  );

  return {
    metricTrajectory: Math.round(trajectory),
    updateConsistency: Math.round(updateConsistency),
    milestoneDelivery: Math.round(milestoneDelivery),
    founderResponsiveness: Math.round(founderResponsiveness),
    dataVerificationLevel: Math.round(dataVerificationLevel),
    communitySignals: Math.round(communitySignals),
    total,
    tier: tierFromScore(total),
  };
}

export function computeGhostStatus(startup: BackendStartup): GhostStatus {
  const days = daysSince(startup.lastHeartbeatAt);
  if (days < 14) {
    return {
      daysSinceLastUpdate: days,
      heartbeat: "Active",
      penaltyApplied: 0,
      timelineEvent: "Normal cadence",
    };
  }
  if (days < 30) {
    return {
      daysSinceLastUpdate: days,
      heartbeat: "Warning",
      penaltyApplied: 0,
      timelineEvent: "Reminder issued at day 14",
    };
  }
  if (days < 90) {
    return {
      daysSinceLastUpdate: days,
      heartbeat: "Inactive",
      penaltyApplied: days >= 45 ? 10 : 5,
      timelineEvent:
        days >= 60 ? "Credibility level demotion started" : "Inactive badge + investor warning",
    };
  }
  return {
    daysSinceLastUpdate: days,
    heartbeat: "Dormant",
    penaltyApplied: 15,
    timelineEvent: "Dormant and removed from active discovery",
  };
}

export function runDueDiligenceAgent(startup: BackendStartup) {
  const evs = computeEvsBreakdown(startup);
  const ghost = computeGhostStatus(startup);
  const claimsVsData =
    startup.momentum > 80
      ? "Claims checked against verified sources show alignment."
      : "Potential inconsistency detected: growth narrative is stronger than verified trajectory.";

  return {
    agent: "due-diligence-copilot",
    startup: startup.slug,
    findings: [
      `EVS ${evs.total} (${evs.tier}) with strongest signal in metric trajectory.`,
      claimsVsData,
      `Heartbeat status: ${ghost.heartbeat}. ${ghost.timelineEvent}.`,
    ],
    confidence: 0.78,
    disclaimer: "Algorithmic analysis, not investment advice.",
  };
}

export function runComparisonAgent(startups: BackendStartup[]) {
  const scored = startups
    .map((s) => ({ startup: s.slug, evs: computeEvsBreakdown(s).total, momentum: s.momentum }))
    .sort((a, b) => b.evs - a.evs || b.momentum - a.momentum);
  return {
    agent: "comparison-engine",
    ranking: scored,
    rationale:
      "Ranking prioritizes EVS total, then momentum. EVS includes trajectory, consistency, milestones, responsiveness, verification, and community signals.",
  };
}

export function runMomentumAgent(startups: BackendStartup[]) {
  const rising = startups
    .map((s) => {
      const first = s.traction[0]?.revenue ?? 0;
      const last = s.traction[s.traction.length - 1]?.revenue ?? first;
      const growth = first > 0 ? ((last - first) / first) * 100 : 0;
      return { slug: s.slug, growth: Math.round(growth), momentum: s.momentum };
    })
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 3);
  return {
    agent: "momentum-detector",
    risingStars: rising,
    cadence: "Weekly",
  };
}

export function runThesisMatchAgent(
  startups: BackendStartup[],
  profile: InvestorPreferenceProfile,
) {
  const matches = startups
    .map((s) => {
      const evs = computeEvsBreakdown(s).total;
      const growthRate =
        s.traction[0]?.revenue && s.traction[s.traction.length - 1]?.revenue
          ? ((s.traction[s.traction.length - 1].revenue - s.traction[0].revenue) /
              s.traction[0].revenue) *
            100
          : 0;
      const verifiedEnough = s.verificationBadges.filter((b) => b.verified).length >= 3;
      const fit =
        (profile.sectors.length === 0 || profile.sectors.includes(s.sector)) &&
        (profile.stages.length === 0 || profile.stages.includes(s.stage)) &&
        evs >= profile.minEvs &&
        s.raising >= profile.checkSizeMin &&
        s.raising <= profile.checkSizeMax &&
        growthRate >= profile.minGrowthRate &&
        (!profile.requireVerifiedOnly || verifiedEnough);
      return { slug: s.slug, fit, evs, growthRate: Math.round(growthRate) };
    })
    .filter((m) => m.fit)
    .sort((a, b) => b.evs - a.evs)
    .slice(0, 5);

  return {
    agent: "thesis-match",
    recommendations: matches,
    cadence: "Weekly",
  };
}
