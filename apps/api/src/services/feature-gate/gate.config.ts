/**
 * Per-feature gate configuration.
 *
 * Declares which axes apply to each `FeatureKey` and the data each axis
 * needs (preview counts for plan, fallback for capability, etc.).
 *
 * Adding a new gated feature: add an entry here, then any caller of
 * `resolveFeatureGate(feature)` picks up the new behaviour automatically.
 *
 * ## Renaming a feature
 *
 * Renaming a feature key means re-issuing every JWT license currently in
 * circulation that lists the old key. We don't maintain an in-codebase
 * alias map — that would be a permanent surface for a one-off migration.
 * When a rename is actually planned (e.g. the `messages-unified-ux` plan
 * renames `message_spy → message_tap`), the rename PR is responsible for:
 *
 *   1. Issuing replacement licenses to existing self-hosted customers
 *      (or accepting that they re-up at next renewal).
 *   2. Deploying the rename in a single coordinated change.
 *
 * If staged migration becomes a hard requirement later, the alias system
 * is straightforward to add back — but only when there's a concrete
 * rename pending. Empty alias maps with no consumers are over-engineering.
 */

import { CAPABILITY_FEATURES, FEATURES } from "@/config/features";

import type { CapabilitySnapshot } from "./capability-snapshot";
import type { FeatureKey } from "./types";

import { UserPlan } from "@/generated/prisma/client";

/**
 * Plan-axis behaviour for a feature on the FREE tier.
 *
 * - `block`: hard block — `kind: "blocked", blockedBy: "plan"`.
 * - `preview`: soft preview — `kind: "preview"` with the given item count.
 * - `none`: feature is available on FREE.
 */
export type FreePlanBehaviour =
  | { mode: "block" }
  | { mode: "preview"; previewCount: number }
  | { mode: "none" };

/**
 * Behaviour on the DEVELOPER plan. Optional — when omitted, Developer
 * passes the plan axis (the historical default). Set to `{ mode:
 * "block" }` for features that are exclusively Enterprise.
 */
export type DeveloperPlanBehaviour = { mode: "block" };

/**
 * How `<ServerCapabilityBadge>` decides whether a feature is "ready"
 * for a given broker snapshot. Discriminated string so the badge stays
 * data-driven — adding a new capability-gated feature only requires
 * declaring its readiness in `gate.config.ts`, not editing the badge.
 *
 * - `snapshot-present`: ready as soon as the broker has any snapshot
 *   (i.e. the feature has no plugin/version requirement; capability
 *   axis only ever blocks per-call, e.g. spy-on-stream).
 * - `firehose-plugin`: ready when `caps.hasFirehoseExchange === true`.
 *
 * The dispatch logic lives in `isFeatureReadyOnSnapshot` (this file)
 * so the badge consumes one helper instead of a switch.
 */
export type BadgeReadiness = "snapshot-present" | "firehose-plugin";

export interface FeatureGateConfig {
  /**
   * License gate: in self-hosted mode, the feature requires a JWT license
   * that lists this feature. Cloud mode bypasses this axis.
   */
  licenseRequired: boolean;

  /**
   * Plan gate: behaviour on the FREE plan. ENTERPRISE always passes;
   * DEVELOPER passes by default unless `developerBehaviour` overrides.
   *
   * `freeBehaviour: { mode: "none" }` means "no plan restriction".
   */
  freeBehaviour: FreePlanBehaviour;

  /**
   * Optional override for DEVELOPER plan. Use for Enterprise-only
   * features (audit log, advanced governance) so the gate blocks
   * Cloud Developer in addition to FREE.
   */
  developerBehaviour?: DeveloperPlanBehaviour;

  /**
   * Capability axis is implemented in the version-and-capability-gating plan.
   * For now, only `false` is honoured (no capability check).
   * Marked here so the migration target is visible in code.
   */
  capabilityRequired?: boolean;

  /**
   * When the capability axis blocks this feature, suggest this alternative
   * (rendered in the `<FeatureGateCard>` as a "Try X instead" CTA).
   *
   * Currently inert — capability axis returns `ok` for everything until
   * the capability plan ships.
   */
  capabilityFallback?: FeatureKey;

  /**
   * Readiness rule for `<ServerCapabilityBadge>`. When omitted, the
   * feature is excluded from the badge's "N/M ready" count — typical
   * for features whose capability rule is per-call rather than
   * per-broker (e.g. `incident_diagnosis` warm-up window can't be
   * summarised with a single boolean).
   */
  badgeReadiness?: BadgeReadiness;
}

/**
 * The free preview counts that the existing premium-preview-and-retention
 * pattern uses. Mirrored here so the gate is the single source of truth.
 */
export const FREE_PREVIEW_COUNTS = {
  ALERT: 2,
  TRACE: 10,
  SPY: 5,
} as const;

export const FEATURE_GATE_CONFIG: Record<FeatureKey, FeatureGateConfig> = {
  [FEATURES.WORKSPACE_MANAGEMENT]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [FEATURES.ALERTING]: {
    licenseRequired: true,
    freeBehaviour: { mode: "preview", previewCount: FREE_PREVIEW_COUNTS.ALERT },
  },
  [FEATURES.SLACK_INTEGRATION]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [FEATURES.WEBHOOK_INTEGRATION]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [FEATURES.DATA_EXPORT]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [FEATURES.ADVANCED_ALERT_RULES]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [FEATURES.TOPOLOGY_VISUALIZATION]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [FEATURES.SSO]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [FEATURES.DIGEST_CUSTOMIZATION]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [CAPABILITY_FEATURES.INCIDENT_DIAGNOSIS]: {
    // CE/EE split (T21): the rules-based detection engine is free everywhere —
    // no license, no plan restriction. Only the AI Explain layer is premium.
    licenseRequired: false,
    freeBehaviour: { mode: "none" },
    // Diagnosis warmup is a UX hint surfaced via a separate channel,
    // not a hard block — but the axis still needs to be evaluated when
    // the snapshot is missing so we can return "unknown" rather than
    // ok-by-default. Mark required so capability-axis runs.
    capabilityRequired: true,
  },
  [FEATURES.MESSAGE_TRACING]: {
    licenseRequired: true,
    freeBehaviour: { mode: "preview", previewCount: FREE_PREVIEW_COUNTS.TRACE },
    // Tracing requires the firehose plugin — the axis blocks when
    // hasFirehoseExchange is false and points the user at Live tap as
    // the cheaper alternative.
    capabilityRequired: true,
    capabilityFallback: FEATURES.MESSAGE_SPY,
    badgeReadiness: "firehose-plugin",
  },
  [FEATURES.MESSAGE_SPY]: {
    // Plan-gated only, not license-gated — see comment in config/features.ts.
    licenseRequired: false,
    freeBehaviour: { mode: "preview", previewCount: FREE_PREVIEW_COUNTS.SPY },
    // Spy mirrors bindings onto a temporary classic queue — incompatible
    // with stream queues. Capability-axis blocks per-call when the
    // targeted queue is a stream.
    capabilityRequired: true,
    badgeReadiness: "snapshot-present",
  },
  // BYOK providers (Ollama, Anthropic, OpenAI) available on Developer+.
  // Managed provider (Qarote-hosted inference) is Enterprise cloud only —
  // enforced at the service layer, not the gate (gate only sees plan tier).
  [FEATURES.AI_EXPLAIN_INLINE]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  [FEATURES.AI_EXPLAIN_DIGEST]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
  },
  // Audit log: Enterprise-only — both Free AND Developer are blocked
  // at the gate. License axis covers self-hosted (license must list
  // audit_log); plan axis blocks Cloud Developer where the license
  // axis is bypassed.
  [FEATURES.AUDIT_LOG]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
    developerBehaviour: { mode: "block" },
  },
  // Custom roles + resource scopes (RBAC Phase 3) — Enterprise-only
  // at both license axis (self-hosted: license must list
  // rbac_advanced) and plan axis (Cloud Developer blocked too).
  [FEATURES.RBAC_ADVANCED]: {
    licenseRequired: true,
    freeBehaviour: { mode: "block" },
    developerBehaviour: { mode: "block" },
  },
};

/** Lookup helper that throws on unknown features (defensive — no untyped paths). */
export function getFeatureGateConfig(feature: FeatureKey): FeatureGateConfig {
  const cfg = FEATURE_GATE_CONFIG[feature];
  if (!cfg) {
    throw new Error(
      `No gate configuration for feature "${feature}" — add an entry to FEATURE_GATE_CONFIG.`
    );
  }
  return cfg;
}

/** Plan tier comparison: FREE < DEVELOPER < ENTERPRISE. */
export const PLAN_RANK: Record<UserPlan, number> = {
  [UserPlan.FREE]: 0,
  [UserPlan.DEVELOPER]: 1,
  [UserPlan.ENTERPRISE]: 2,
};

export function isPaidPlan(plan: UserPlan): boolean {
  return PLAN_RANK[plan] > PLAN_RANK[UserPlan.FREE];
}

/**
 * Subset of the snapshot the badge predicates consult. Imported as a
 * narrowed `Pick` so adding a new field to `CapabilitySnapshot` doesn't
 * silently widen this surface.
 */
type BadgeSnapshotView = Pick<CapabilitySnapshot, "hasFirehoseExchange">;

/**
 * Evaluate a feature's badge readiness against a broker snapshot.
 *
 * Precondition: `feature` must be tracked by the badge (i.e. its config
 * declares `badgeReadiness`). Callers acquire the tracked set via
 * `getBadgeTrackedFeatures()` so this branch is unreachable in correct
 * usage; we throw on misuse rather than return a tri-state to keep the
 * call-site signature `boolean`.
 */
export function isFeatureReadyOnSnapshot(
  feature: FeatureKey,
  snapshot: BadgeSnapshotView | null
): boolean {
  const config = getFeatureGateConfig(feature);
  const readiness = config.badgeReadiness;
  if (!readiness) {
    throw new Error(
      `isFeatureReadyOnSnapshot called for "${feature}" which has no badgeReadiness — caller should iterate getBadgeTrackedFeatures().`
    );
  }
  if (!snapshot) return false;
  switch (readiness) {
    case "snapshot-present":
      return true;
    case "firehose-plugin":
      return snapshot.hasFirehoseExchange === true;
  }
}

/**
 * Features the badge enumerates, in `FEATURES` declaration order so the
 * popover list reads predictably across deploys regardless of how
 * `FEATURE_GATE_CONFIG` is keyed.
 */
export function getBadgeTrackedFeatures(): FeatureKey[] {
  return (Object.values(FEATURES) as FeatureKey[]).filter(
    (k) => FEATURE_GATE_CONFIG[k].badgeReadiness !== undefined
  );
}
