/**
 * Pure logic for machine API-key scope (MCP agent surface).
 *
 * Kept free of tRPC / Prisma / better-auth imports so the security-critical
 * decisions (read-only floor, workspace match) are unit-testable as plain
 * truth tables. The tRPC middleware (`protectedProcedure`, `workspaceProcedure`)
 * and the api-keys router consume these helpers.
 */

/**
 * Scope carried by a machine API key. Stored in the key's better-auth
 * `metadata` at mint time. Null for human / cookie-session requests.
 */
export interface ApiKeyScope {
  workspaceId: string;
  mode: "read" | "explain";
  v: number;
}

/** tRPC procedure operation type (mirrors the middleware `opts.type`). */
type ProcedureOpType = "query" | "mutation" | "subscription";

/**
 * Narrow loosely-typed key metadata into an `ApiKeyScope`. Returns null when
 * the shape is unexpected so callers fail closed rather than trusting a
 * malformed scope.
 */
export function parseApiKeyScope(metadata: unknown): ApiKeyScope | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  if (typeof m.workspaceId !== "string" || m.workspaceId.length === 0) {
    return null;
  }
  if (m.mode !== "read" && m.mode !== "explain") return null;
  return {
    workspaceId: m.workspaceId,
    mode: m.mode,
    v: typeof m.v === "number" ? m.v : 1,
  };
}

/**
 * Read-only floor: a machine API key may only run queries at the tRPC layer —
 * NO key (read *or* explain) may run a mutation or subscription. Returns true
 * when the operation must be blocked. A cookie session (scope null) is never
 * blocked here.
 *
 * `explain` mode is not a write grant: it unlocks the LLM explain capability
 * at the MCP tool layer (gated there), not arbitrary tRPC mutations. So the
 * floor is independent of mode, and independent of the creator's live role by
 * construction — it only looks at whether the request is an API key + a
 * non-query op.
 */
export function apiKeyMutationBlocked(
  scope: ApiKeyScope | null | undefined,
  opType: ProcedureOpType
): boolean {
  // `!= null` (loose) treats both null and undefined as "no API key" — a
  // cookie session leaves the scope unset, and not every call site populates
  // it explicitly.
  return scope != null && opType !== "query";
}

/**
 * Workspace match: an API-key request may only touch the workspace its key is
 * bound to. Returns true when the requested workspace does not match (and must
 * be blocked). A cookie session (scope null) is never blocked here.
 */
export function apiKeyWorkspaceMismatch(
  scope: ApiKeyScope | null | undefined,
  workspaceId: string
): boolean {
  return scope != null && workspaceId !== scope.workspaceId;
}
