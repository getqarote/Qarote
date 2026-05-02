/**
 * Error transport for blocked feature gates.
 *
 * `throwGateError(gate)` packs a structured payload onto a `TRPCError` so the
 * frontend can render `<FeatureGateCard>` without parsing the human-readable
 * `message` string. The root tRPC `errorFormatter` lifts the payload into
 * `shape.data.gate` (see `apps/api/src/trpc/trpc.ts`).
 *
 * The bag travels in-process on `TRPCError.cause`; the `errorFormatter` is
 * the only transport that exposes it on the wire. Default tRPC formatters
 * never serialise `cause`, so without the formatter the bag is invisible
 * to the client.
 */

import { TRPCError } from "@trpc/server";

import type { FeatureGateResult } from "./types";

/** Sentinel attached to the TRPCError so the formatter recognises gate errors. */
export const FEATURE_GATE_ERROR_SENTINEL = "feature_gate_blocked";

export type BlockedGate = Extract<FeatureGateResult, { kind: "blocked" }>;

/**
 * The wire shape that the errorFormatter emits onto `shape.data.gate`.
 * Keep this stable — the frontend `readGateError` reads exactly this shape.
 */
export interface GateErrorPayload {
  blockedBy: BlockedGate["blockedBy"];
  feature: BlockedGate["feature"];
  reasonKey: BlockedGate["reasonKey"];
  reasonParams?: BlockedGate["reasonParams"];
  remediation?: BlockedGate["remediation"];
  upgrade?: BlockedGate["upgrade"];
  fallback?: BlockedGate["fallback"];
}

interface GateErrorBag {
  __sentinel: typeof FEATURE_GATE_ERROR_SENTINEL;
  payload: GateErrorPayload;
}

/**
 * Throw a typed tRPC error from a blocked gate result.
 *
 * Code mapping:
 *  - capability → PRECONDITION_FAILED  (user can self-remediate)
 *  - license/plan → FORBIDDEN          (user must upgrade / contact billing)
 *
 * The human-readable `message` is intentionally generic ("feature_gate_blocked")
 * — the frontend renders the localised string from `reasonKey`. This avoids
 * the backend needing to know the user's locale at error time.
 */
export function throwGateError(gate: BlockedGate): never {
  const code: TRPCError["code"] =
    gate.blockedBy === "capability" ? "PRECONDITION_FAILED" : "FORBIDDEN";

  const bag: GateErrorBag = {
    __sentinel: FEATURE_GATE_ERROR_SENTINEL,
    payload: {
      blockedBy: gate.blockedBy,
      feature: gate.feature,
      reasonKey: gate.reasonKey,
      reasonParams: gate.reasonParams,
      remediation: gate.remediation,
      upgrade: gate.upgrade,
      fallback: gate.fallback,
    },
  };

  throw new TRPCError({
    code,
    message: FEATURE_GATE_ERROR_SENTINEL,
    cause: bag as unknown as Error,
  });
}

/**
 * Walk an error chain looking for a `GateErrorBag`. Returns the payload if
 * found, undefined otherwise.
 *
 * The walk is recursive on `cause`: a middleware that catches a gate error
 * and re-throws as `new TRPCError({ ..., cause: originalError })` still
 * surfaces the bag. Without recursion we would silently drop gate payloads
 * under composition with code like `planValidationProcedure` (`trpc.ts`)
 * that wraps and rethrows.
 *
 * `MAX_CAUSE_DEPTH` defends against pathological cycles or excessive
 * nesting — synthetic in practice but cheap insurance against
 * stack-overflow on a malformed chain.
 */
const MAX_CAUSE_DEPTH = 8;

function isGateBag(value: unknown): value is GateErrorBag {
  return (
    !!value &&
    typeof value === "object" &&
    (value as GateErrorBag).__sentinel === FEATURE_GATE_ERROR_SENTINEL
  );
}

export function extractGatePayload(err: unknown): GateErrorPayload | undefined {
  let current: unknown = err;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (!current || typeof current !== "object") return undefined;
    if (seen.has(current)) return undefined;
    seen.add(current);

    if (isGateBag(current)) return current.payload;

    const cause = (current as { cause?: unknown }).cause;
    if (isGateBag(cause)) return cause.payload;

    current = cause;
  }
  return undefined;
}
