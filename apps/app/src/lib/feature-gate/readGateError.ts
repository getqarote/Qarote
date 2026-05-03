/**
 * Extract a structured gate payload from a thrown tRPC error.
 *
 * The API errorFormatter (see apps/api/src/trpc/trpc.ts) lifts the gate
 * payload onto `shape.data.gate` whenever a procedure called
 * `throwGateError`. This helper reads exactly that field and narrows the
 * result so pages can do:
 *
 *   const gate = readGateError(error);
 *   if (gate) return <FeatureGateCard payload={gate} />;
 */

import type { BlockedGate, GateErrorPayload } from "./types";

interface ErrorWithData {
  data?: {
    gate?: GateErrorPayload;
  } | null;
}

const BLOCKED_BY_VALUES: ReadonlySet<string> = new Set([
  "license",
  "plan",
  "capability",
]);

/**
 * `unknown` because TanStack Query and tRPC client surface errors as
 * `unknown`/`Error` depending on the API. We accept anything and narrow.
 */
export function readGateError(error: unknown): GateErrorPayload | null {
  if (!error || typeof error !== "object") return null;
  const data = (error as ErrorWithData).data;
  if (!data || typeof data !== "object") return null;
  const gate = data.gate;
  if (!gate || typeof gate !== "object") return null;
  // Spot-check required fields to defend against malformed payloads.
  // `blockedBy` is the discriminant `<FeatureGateCard>` indexes into
  // for the icon/title — a stray value would render undefined and
  // crash the card.
  if (
    typeof gate.blockedBy !== "string" ||
    !BLOCKED_BY_VALUES.has(gate.blockedBy) ||
    typeof gate.feature !== "string" ||
    typeof gate.reasonKey !== "string"
  ) {
    return null;
  }
  return gate;
}

/**
 * Convert a `GateErrorPayload` (wire) into a `BlockedGate` (the same shape
 * `<FeatureGateCard>` accepts when used proactively from `useFeatureGate`).
 */
export function toBlockedGate(payload: GateErrorPayload): BlockedGate {
  return { kind: "blocked", ...payload };
}
