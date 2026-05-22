/**
 * Extract a structured RBAC cause payload from a thrown tRPC error.
 *
 * The API errorFormatter (apps/api/src/trpc/trpc.ts) lifts the RBAC cause
 * onto `shape.data.cause` whenever a procedure throws with one of the three
 * PROPAGATED_CAUSE_CODES. This helper reads that field so pages can do:
 *
 *   const cause = readRbacError(error);
 *   if (cause) return <WorkspaceForbidden cause={cause} />;
 */

const RBAC_CAUSE_CODES = [
  "WORKSPACE_PERMISSION",
  "LAST_OWNER_BLOCKED",
  "INVITER_ROLE_INSUFFICIENT",
] as const;

export type RbacCauseCode = (typeof RBAC_CAUSE_CODES)[number];

export interface RbacErrorCause {
  code: RbacCauseCode;
}

interface ErrorWithData {
  data?: {
    cause?: { code?: unknown } | null;
  } | null;
}

const RBAC_CAUSE_CODES_SET: ReadonlySet<string> = new Set(RBAC_CAUSE_CODES);

export function readRbacError(error: unknown): RbacErrorCause | null {
  if (!error || typeof error !== "object") return null;
  const data = (error as ErrorWithData).data;
  if (!data || typeof data !== "object") return null;
  const cause = data.cause;
  if (!cause || typeof cause !== "object") return null;
  if (typeof cause.code !== "string" || !RBAC_CAUSE_CODES_SET.has(cause.code))
    return null;
  return { code: cause.code as RbacCauseCode };
}
