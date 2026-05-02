/**
 * Plan axis of the feature gate.
 *
 * Reads the organisation's subscription tier (`getOrgPlan`) and applies the
 * per-feature `FreePlanBehaviour` from the gate config. Paid tiers always
 * pass; FREE either passes, returns a soft preview, or returns a hard block
 * depending on the feature.
 *
 * The composer combines this with the license and capability axes — see
 * `resolver.ts`.
 */

import { getOrgPlan } from "@/services/plan/plan.service";

import { getFeatureGateConfig, isPaidPlan } from "./gate.config";
import type { FeatureGateResult, FeatureKey, UpgradeInfo } from "./types";

import { UserPlan } from "@/generated/prisma/client";

function planUpgradeInfo(currentPlan: UserPlan): UpgradeInfo {
  // Free → Developer is the natural upgrade path; Developer → Enterprise is
  // surfaced via separate billing pages, not via this gate.
  return {
    ctaKey: "plan.cta.upgrade",
    ctaUrl: "/plans",
    targetPlan:
      currentPlan === UserPlan.FREE ? UserPlan.DEVELOPER : UserPlan.ENTERPRISE,
  };
}

/**
 * Resolve the plan axis for `feature` against `organizationId`.
 *
 * When `organizationId` is undefined, the resolver assumes FREE — callers
 * outside an organization context (e.g. unauthenticated SSO probes) should
 * be blocked from anything plan-gated.
 */
export async function resolvePlanAxis(
  feature: FeatureKey,
  organizationId?: string
): Promise<FeatureGateResult> {
  const config = getFeatureGateConfig(feature);

  // Feature has no plan restriction — pass through.
  if (config.freeBehaviour.mode === "none") {
    return { kind: "ok" };
  }

  const plan = organizationId
    ? await getOrgPlan(organizationId)
    : UserPlan.FREE;

  // Paid plans bypass FREE-tier behaviour for any feature in this config.
  if (isPaidPlan(plan)) return { kind: "ok" };

  // FREE: behaviour determined per-feature.
  switch (config.freeBehaviour.mode) {
    case "preview":
      return {
        kind: "preview",
        previewCount: config.freeBehaviour.previewCount,
        blockedBy: "plan",
        upgrade: planUpgradeInfo(plan),
      };

    case "block":
      return {
        kind: "blocked",
        blockedBy: "plan",
        feature,
        reasonKey: "plan.featureRequiresUpgrade",
        reasonParams: { feature, currentPlan: plan },
        upgrade: planUpgradeInfo(plan),
      };
  }
}
