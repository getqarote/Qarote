/**
 * Feature gate composition — public entry points.
 *
 * See ADR-002 (`docs/adr/002-feature-gate-composition.md`).
 *
 * Procedures:
 *   const gate = await resolveFeatureGate("alerting", { organizationId });
 *   if (gate.kind === "blocked") throwGateError(gate);
 *   if (gate.kind === "preview") return { ..., _preview: gate };
 */

export type { BlockedGate, GateErrorPayload } from "./error";
export {
  extractGatePayload,
  FEATURE_GATE_ERROR_SENTINEL,
  throwGateError,
} from "./error";
export type {
  BadgeReadiness,
  FeatureGateConfig,
  FreePlanBehaviour,
} from "./gate.config";
export {
  FEATURE_GATE_CONFIG,
  FREE_PREVIEW_COUNTS,
  getBadgeTrackedFeatures,
  getFeatureGateConfig,
  isFeatureReadyOnSnapshot,
  isPaidPlan,
  PLAN_RANK,
} from "./gate.config";
export {
  areFeaturesEnabled,
  getLicensePayload,
  invalidateLicenseCache,
  isFeatureEnabled,
} from "./license";
export { requirePremiumFeature } from "./middleware";
export { resolveFeatureGate } from "./resolver";
export type {
  BlockedBy,
  FeatureGateResult,
  FeatureKey,
  GateContext,
  GateFallback,
  Remediation,
  UpgradeInfo,
} from "./types";
export { isBlocked, isDegraded, isPreview } from "./types";
