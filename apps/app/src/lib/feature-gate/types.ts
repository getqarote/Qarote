/**
 * Feature gate wire types — see ADR-002.
 *
 * `FeatureKey` is sourced from the backend's `PremiumFeature` union via
 * tRPC type inference. Importing it through `@api/...` rather than
 * re-declaring the union prevents drift the moment a feature is added or
 * renamed: the frontend type-check fails on stale references.
 *
 * The other types (UpgradeInfo, Remediation, etc.) are small and stable
 * enough that hand-mirroring them here is the right cost/benefit — sharing
 * them via a workspace package would force the frontend bundle through
 * the backend's Prisma client surface.
 */

import type { PremiumFeature } from "@api/config/features";

/** Aliased to the backend's source-of-truth feature enum. */
export type FeatureKey = PremiumFeature;

export type BlockedBy = "license" | "plan" | "capability";

export interface UpgradeInfo {
  ctaKey: string;
  ctaUrl: string;
  targetPlan?: "FREE" | "DEVELOPER" | "ENTERPRISE";
}

export interface Remediation {
  docsUrl: string;
  ctaKey: string;
  commands?: string[];
}

export interface GateFallback {
  feature: FeatureKey;
}

export type FeatureGateResult =
  | { kind: "ok" }
  | {
      kind: "degraded";
      feature: FeatureKey;
      reasonKey: string;
      reasonParams?: Record<string, string | number>;
    }
  | {
      kind: "preview";
      previewCount: number;
      blockedBy: "plan";
      upgrade: UpgradeInfo;
    }
  | {
      kind: "blocked";
      blockedBy: BlockedBy;
      feature: FeatureKey;
      reasonKey: string;
      reasonParams?: Record<string, string | number>;
      remediation?: Remediation;
      upgrade?: UpgradeInfo;
      fallback?: GateFallback;
    };

/** Wire shape of `shape.data.gate` set by the API errorFormatter. */
export interface GateErrorPayload {
  blockedBy: BlockedBy;
  feature: FeatureKey;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  remediation?: Remediation;
  upgrade?: UpgradeInfo;
  fallback?: GateFallback;
}

export type BlockedGate = Extract<FeatureGateResult, { kind: "blocked" }>;

/**
 * Per-broker-object subject the gate is evaluated against.
 *
 * **Mirrors** `apps/api/src/services/feature-gate/types.ts:GateSubject`.
 * Both sides must ship a new arm in lockstep — the Zod schema in the
 * backend `feature-gate.ts` is the runtime contract that surfaces
 * drift, but only at request time. The frontend type guards prop
 * sites *before* the request, so a stale local mirror means a vhost
 * page won't compile.
 */
export type GateSubject = {
  kind: "queue";
  queueType: "classic" | "quorum" | "stream";
};

/**
 * Build a `GateSubject` from a queue type. Returns `undefined` when
 * the queue type isn't known yet (e.g. queue arguments still loading)
 * so callers can pass it directly to `<FeatureGate subject={…}>`.
 *
 * Living next to `GateSubject` so future `vhostSubject(name)` /
 * `exchangeSubject(name, type)` slot in symmetrically without
 * scattering subject construction across the component tree.
 */
export function queueSubject(
  queueType?: "classic" | "quorum" | "stream"
): GateSubject | undefined {
  return queueType ? { kind: "queue", queueType } : undefined;
}
