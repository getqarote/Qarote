/**
 * Convert thrown plan validation errors into the unified BlockedGate
 * wire shape (ADR-002).
 *
 * The `planValidationProcedure` and `adminPlanValidationProcedure`
 * middlewares in `trpc.ts` are the only production callers. Extracting
 * the conversion lets us unit-test the mapping without standing up
 * the entire tRPC chain.
 *
 * **Contract for callers:** when this returns `null`, the original
 * error is not a plan error and MUST be re-thrown. Silently swallowing
 * a non-plan error here would mask DB / network / programmer faults.
 */

import type { BlockedGate } from "@/services/feature-gate/error";
import type { FeatureKey } from "@/services/feature-gate/types";

import { PlanLimitExceededError, PlanValidationError } from "./plan.service";

/**
 * Default `FeatureKey` for plan-quota errors. Every existing call
 * site (workspace creation, server creation, user invitation,
 * RabbitMQ version) is workspace-scoped, so this is a safe baseline.
 *
 * The descriptive `feature` from the error class travels in
 * `reasonParams.feature` for the i18n message; the gate's
 * `FeatureKey` (this value) is what the upgrade-CTA routing reads.
 *
 * Pass `featureKeyOverride` to `planErrorToBlockedGate` from a call
 * site whose plan error doesn't fit the workspace bucket — e.g. a
 * future per-recording or per-diagnosis plan check should pass
 * `"message_tracing"` or `"incident_diagnosis"` so the upgrade CTA
 * routes correctly.
 */
const DEFAULT_PLAN_QUOTA_FEATURE: FeatureKey = "workspace_management";

export function planErrorToBlockedGate(
  error: unknown,
  featureKeyOverride?: FeatureKey
): BlockedGate | null {
  const feature = featureKeyOverride ?? DEFAULT_PLAN_QUOTA_FEATURE;
  if (error instanceof PlanValidationError) {
    return {
      kind: "blocked",
      blockedBy: "plan",
      feature,
      reasonKey: "plan.featureRequiresUpgrade",
      reasonParams: {
        feature: error.feature,
        currentPlan: error.currentPlan,
      },
    };
  }
  if (error instanceof PlanLimitExceededError) {
    return {
      kind: "blocked",
      blockedBy: "plan",
      feature,
      reasonKey: "plan.limitExceeded",
      reasonParams: {
        feature: error.feature,
        current: error.currentCount,
        max: error.limit,
        currentPlan: error.currentPlan,
      },
    };
  }
  return null;
}
