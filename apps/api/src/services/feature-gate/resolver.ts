/**
 * Composite feature gate resolver — see ADR-002.
 *
 * Walks the three axes in fixed order:
 *   1. capability   (technical impossibility — broker can't run the feature)
 *   2. license      (self-hosted JWT — feature not licensed for this instance)
 *   3. plan         (subscription tier — feature requires upgrade)
 *
 * The first non-OK answer wins. A `kind: "preview"` from the plan axis is
 * returned as-is (plan is the only axis that produces previews).
 *
 * This resolver is the single composition point — pages and procedures call
 * `resolveFeatureGate(...)` and never compose axes themselves.
 */

import { logger } from "@/core/logger";

import { posthog } from "@/services/posthog";

import { resolveCapabilityAxis } from "./capability-axis";
import { getFeatureGateConfig } from "./gate.config";
import { resolveLicenseAxis } from "./license";
import { resolvePlanAxis } from "./plan-axis";
import type {
  FeatureGateResult,
  FeatureKey,
  GateContext,
  GateFallback,
} from "./types";

/**
 * Resolve the gate for `feature`. Pass `context.organizationId` whenever
 * available — without it, the plan axis assumes FREE.
 */
export async function resolveFeatureGate(
  feature: FeatureKey,
  context?: GateContext
): Promise<FeatureGateResult> {
  const result = await resolveAxes(feature, context);
  const blockedBy =
    result.kind === "blocked" || result.kind === "preview"
      ? result.blockedBy
      : null;

  // Structured log at debug level — cheap in prod, queryable for ops
  // drill-down without affecting cardinality.
  logger.debug(
    {
      feature,
      kind: result.kind,
      blockedBy,
      organizationId: context?.organizationId,
      serverId: context?.serverId,
    },
    "feature-gate evaluated"
  );

  // PostHog event for product analytics. Skipped on `kind: "ok"` to
  // keep volume bounded (every gated page mount fires evaluate; only
  // non-OK outcomes are interesting). Also skipped when the resolver
  // runs without an org (cron / unauthenticated path) — there's no
  // `distinctId` to attribute the event to.
  if (blockedBy && context?.organizationId) {
    try {
      posthog?.capture({
        distinctId: context.organizationId,
        event: "gate_evaluated",
        properties: {
          feature,
          kind: result.kind,
          blocked_by: blockedBy,
          server_id: context.serverId,
        },
      });
    } catch (analyticsErr) {
      logger.warn(
        { error: analyticsErr },
        "gate_evaluated: posthog capture failed"
      );
    }
  }

  return result;
}

async function resolveAxes(
  feature: FeatureKey,
  context: GateContext | undefined
): Promise<FeatureGateResult> {
  // Capability axis runs first. If it blocks and a fallback feature is
  // configured, attach the fallback to the result — the UI then offers it
  // as a one-click alternative.
  const capability = await resolveCapabilityAxis(feature, context);
  if (capability.kind === "blocked") {
    return attachFallbackIfAvailable(capability, feature, context);
  }

  // License axis. Self-hosted only — cloud always returns "ok" here.
  const license = await resolveLicenseAxis(feature);
  if (license.kind === "blocked") return license;

  // Plan axis. May return "preview" or "blocked".
  const plan = await resolvePlanAxis(feature, context?.organizationId);
  if (plan.kind !== "ok") return plan;

  // All later axes passed cleanly — propagate the capability axis's
  // advisory if it produced one (e.g. diagnosis warmup). Plan-axis
  // `preview` already short-circuited above; a degraded + preview
  // composite is intentionally not modelled — preview is the louder
  // signal and would dominate the banner anyway.
  if (capability.kind === "degraded") return capability;

  return { kind: "ok" };
}

/**
 * When the capability axis blocks `feature` and `gate.config` declares a
 * `capabilityFallback`, populate the result's `fallback` field unless the
 * fallback feature is itself blocked.
 *
 * The check is shallow: we only look at the fallback's capability axis.
 * License/plan blocks on the fallback are not surfaced — by construction,
 * the fallback should be a strictly cheaper alternative that does not
 * require additional entitlements.
 */
async function attachFallbackIfAvailable(
  result: Extract<FeatureGateResult, { kind: "blocked" }>,
  feature: FeatureKey,
  context: GateContext | undefined
): Promise<FeatureGateResult> {
  const config = getFeatureGateConfig(feature);
  const fallbackFeature = config.capabilityFallback;
  if (!fallbackFeature) return result;

  const fallbackCapability = await resolveCapabilityAxis(
    fallbackFeature,
    context
  );
  if (fallbackCapability.kind !== "ok") return result;

  const fallback: GateFallback = { feature: fallbackFeature };
  return { ...result, fallback };
}
