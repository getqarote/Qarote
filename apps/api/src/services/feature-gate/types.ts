/**
 * Feature gate composition — type contract.
 *
 * See docs/adr/002-feature-gate-composition.md.
 *
 * Three independent axes (capability, license, plan) compose into one
 * discriminated result consumed by every premium tRPC procedure and every
 * gated UI surface. Resolution order is fixed: capability → license → plan.
 */

import type { PremiumFeature } from "@/config/features";

import type { UserPlan } from "@/generated/prisma/client";

/**
 * Logical product features that can be gated. Aliased to the existing
 * `PremiumFeature` set so the gate system covers the same surface as the
 * legacy `isFeatureEnabled` / `requirePremiumFeature` helpers.
 *
 * Capability-only features (without a license-tier requirement) still use
 * this enum — their per-feature config simply marks `licenseRequired: false`.
 */
export type FeatureKey = PremiumFeature;

/**
 * Per-broker-object subject the gate is being evaluated against.
 *
 * Discriminated union so adding a new dimension (vhost, exchange, …) is
 * a new union arm rather than a new flat optional field on
 * `GateContext`. Today only `queue` exists. The `kind` literal is
 * required so adding `{ kind: "vhost"; name: string }` later does not
 * loosen existing call-site narrowing.
 *
 * **Scope**: this is for AMQP topology objects only (queue / vhost /
 * exchange / binding / connection). Non-broker dimensions (org-scoped
 * quotas, region-scoped features) belong on a sibling field of
 * `GateContext`, not as a `subject` arm — `subject` here means
 * "what AMQP object," not "what concept."
 *
 * **Mirror**: `apps/app/src/lib/feature-gate/useFeatureGate.ts` declares
 * the same union for the frontend hook input. Both sides must ship a
 * new arm together (Zod schema in `feature-gate.ts` is the runtime
 * contract that catches drift, but only at request time).
 */
export type GateSubject = {
  kind: "queue";
  queueType: "classic" | "quorum" | "stream";
};

/** Optional context the resolver uses to make a per-call decision. */
export interface GateContext {
  /**
   * Organization owning the request. Required for plan-axis evaluation.
   * Resolved upstream — `workspaceProcedure` derives it from the workspace,
   * `orgScopedProcedure` from `ctx.resolveOrg()`. The gate axes never
   * resolve org themselves — this is a pre-condition, not a fallback.
   */
  organizationId?: string;
  /** Locale for any *fallback* server-rendered string (none today). */
  locale?: string;
  /** RabbitMQ server the action targets — needed by capability axis. */
  serverId?: string;
  /**
   * The object the action targets (queue, future: vhost/exchange/…).
   * Capability axis applies per-object rules from here — e.g. `message_spy`
   * blocks streams. When omitted, per-object rules pass through.
   */
  subject?: GateSubject;
}

/** Information the UI needs to render an upgrade CTA. */
export interface UpgradeInfo {
  ctaKey: string;
  ctaUrl: string;
  /** Plan we are inviting the user to upgrade to (null when license-blocked). */
  targetPlan?: UserPlan;
}

/** Step-by-step instructions the user can follow themselves. */
export interface Remediation {
  docsUrl: string;
  ctaKey: string;
  /**
   * Shell commands shown verbatim. English-only, displayed as-is in a
   * monospaced block — these reference RabbitMQ commands and must not be
   * translated.
   */
  commands?: string[];
}

/**
 * When the *primary* feature is blocked but a degraded alternative is
 * available. Example: Recording blocked because `rabbitmq_tracing` is not
 * enabled → fallback to Live tap.
 *
 * The UI renders the fallback CTA using `feature` to look up the
 * feature label in i18n (`features.<feature>`) and a static
 * `fallback.tryAlternative` template — no per-fallback reason copy is
 * needed, so we don't synthesize one.
 */
export interface GateFallback {
  feature: FeatureKey;
}

export type BlockedBy = "license" | "plan" | "capability";

/**
 * Discriminated result of resolving a feature gate.
 *
 * - `ok`: caller proceeds normally.
 * - `degraded`: caller proceeds; surface a non-blocking advisory banner
 *   (e.g. "diagnosis warming up — results may be incomplete"). Returned
 *   only by the capability axis today; the resolver lets `degraded`
 *   propagate when no later axis intervenes.
 * - `preview`: caller proceeds but trims output to the preview limit.
 * - `blocked`: caller aborts via `throwGateError(gate)`.
 */
export type FeatureGateResult =
  | { kind: "ok" }
  | {
      kind: "degraded";
      feature: FeatureKey;
      /**
       * i18n key — same `gate` namespace as `reasonKey` on `blocked`.
       * The UI renders an inline advisory banner above the feature
       * surface; the feature still operates normally.
       */
      reasonKey: string;
      /** Interpolation params for `reasonKey`. */
      reasonParams?: Record<string, string | number>;
    }
  | {
      kind: "preview";
      /** Number of items the caller should slice to before returning. */
      previewCount: number;
      /** Hint for the UI banner; the caller fills `hiddenCount` from real data. */
      blockedBy: "plan";
      upgrade: UpgradeInfo;
    }
  | {
      kind: "blocked";
      blockedBy: BlockedBy;
      feature: FeatureKey;
      /**
       * i18n key — backends never localise. The frontend looks this up in
       * the shared `gate` namespace under the user's current locale.
       */
      reasonKey: string;
      /** Interpolation params for `reasonKey`. */
      reasonParams?: Record<string, string | number>;
      /** When the user can self-remediate (typically capability axis). */
      remediation?: Remediation;
      /** When license/plan blocks, surface the upgrade path. */
      upgrade?: UpgradeInfo;
      /** Suggest a degraded alternative (capability axis primary use). */
      fallback?: GateFallback;
    };

/** Convenience narrowing helpers. */
export function isBlocked(
  r: FeatureGateResult
): r is Extract<FeatureGateResult, { kind: "blocked" }> {
  return r.kind === "blocked";
}

export function isPreview(
  r: FeatureGateResult
): r is Extract<FeatureGateResult, { kind: "preview" }> {
  return r.kind === "preview";
}

export function isDegraded(
  r: FeatureGateResult
): r is Extract<FeatureGateResult, { kind: "degraded" }> {
  return r.kind === "degraded";
}
