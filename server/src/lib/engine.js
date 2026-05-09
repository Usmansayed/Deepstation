/** Ported from apex-invest-hub/src/backend/engine.ts — keep logic identical. */

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function daysSince(isoDate) {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function tierFromScore(total) {
  if (total <= 30) return "Unverified";
  if (total <= 50) return "Emerging";
  if (total <= 75) return "Credible";
  return "Institutional Ready";
}

export function computeEvsBreakdown(startup) {
  const last = startup.traction[startup.traction.length - 1];
  const first = startup.traction[0];
  const trajectoryDelta = (last?.revenue ?? 0) - (first?.revenue ?? 0);
  const trajectory = clamp(40 + trajectoryDelta / 2200);
  const updateConsistency = clamp(100 - daysSince(startup.lastHeartbeatAt) * 2.8);
  const milestoneDelivery = clamp(startup.milestoneHitRate);
  const founderResponsiveness = clamp(100 - startup.founderResponseHours * 3);
  const verifiedCount = startup.verificationBadges.filter((b) => b.verified).length;
  const totalBadges = startup.verificationBadges.length || 1;
  const dataVerificationLevel = clamp((verifiedCount / totalBadges) * 100);
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

export function computeGhostStatus(startup) {
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

export function runDueDiligenceAgent(startup) {
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
