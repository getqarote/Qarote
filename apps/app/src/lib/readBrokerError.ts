/**
 * Extract the broker-connection failure kind from a thrown tRPC error.
 *
 * The API errorFormatter (apps/api/src/trpc/trpc.ts) lifts a
 * `{ code: "BROKER_CONNECTION", kind }` cause onto `shape.data.cause` when a
 * broker-read procedure (e.g. overview) fails. The cockpit ConnectionBar
 * branches on the kind instead of parsing the localized message:
 *
 *   const kind = readBrokerErrorKind(overviewError);  // "auth" | … | null
 */

type BrokerErrorKind = "auth" | "unreachable" | "error";

const BROKER_ERROR_KINDS: ReadonlySet<string> = new Set<BrokerErrorKind>([
  "auth",
  "unreachable",
  "error",
]);

interface ErrorWithData {
  data?: {
    cause?: { code?: unknown; kind?: unknown } | null;
  } | null;
}

export function readBrokerErrorKind(error: unknown): BrokerErrorKind | null {
  if (!error || typeof error !== "object") return null;
  const data = (error as ErrorWithData).data;
  if (!data || typeof data !== "object") return null;
  const cause = data.cause;
  if (!cause || typeof cause !== "object") return null;
  if (cause.code !== "BROKER_CONNECTION") return null;
  if (typeof cause.kind !== "string" || !BROKER_ERROR_KINDS.has(cause.kind)) {
    // Cause present but kind missing/unknown — still a broker failure.
    return "error";
  }
  return cause.kind as BrokerErrorKind;
}
