/**
 * Resource-scope evaluator (RBAC Phase 3 PR-1 skeleton).
 *
 * Evaluates whether a set of `RolePermission` scope rows admits a
 * given resource context. Multiple rows for the same permission key
 * are OR-combined — the role holds the permission iff **any** row's
 * scope admits the resource.
 *
 * v1 scope kinds (plan §3.1):
 *
 *   - `null` / no scope row → permission held under any resource
 *     (the catalog-style "this is unbounded for this role").
 *   - `{ kind: "server.id", ids: string[] }` → admits when
 *     `ctx.serverId` is in the list.
 *   - `{ kind: "server.environment", values: string[] }` → admits
 *     when `ctx.serverEnvironment` matches (case-sensitive after
 *     normalization at write time per plan).
 *
 * **Fail-closed** on any unknown shape (DB-side tamper, future
 * scope kind a stale pod doesn't recognize). The exhaustive
 * `switch` produces an explicit `never` branch that logs and
 * returns `false`.
 *
 * Tenancy is verified by the caller before this evaluator runs:
 * the resource context (`ctx.serverId`, `ctx.serverEnvironment`) is
 * supplied by `workspacePermissionProcedure(key, resourceCtxFn)`
 * after `resourceCtxFn` has filtered by `workspaceId` (plan §3.3).
 * This evaluator trusts its inputs — security depends on the
 * caller filtering by tenant first.
 */

import { logger } from "@/core/logger";

/** Resource context surfaced by `resourceCtxFn` in PR-3 wiring. */
export interface ResourceCtx {
  serverId?: string;
  serverEnvironment?: string;
}

/** Discriminated union of accepted scope shapes (Zod-validated at write time). */
export type ScopeJson =
  | { kind: "server.id"; ids: string[] }
  | { kind: "server.environment"; values: string[] };

/** A row from the resolver's `CustomResolution.scopeRows`. */
export interface ScopeRow {
  scopeJson: unknown | null;
  scopeFingerprint: string;
}

/**
 * Returns true when ANY of the supplied scope rows for the
 * permission admits the resource context. `null` scopeJson means
 * "unscoped" — admits everything for this row.
 *
 * Built-in roles never call this (their resolution is `kind:
 * "builtin"` with no scope rows); they pass through as "permission
 * held, no scope check".
 */
export function evaluateScope(
  rows: ReadonlyArray<ScopeRow>,
  ctx: ResourceCtx
): boolean {
  if (rows.length === 0) return false; // no row → no grant
  for (const row of rows) {
    if (rowAdmits(row.scopeJson, ctx)) return true;
  }
  return false;
}

function rowAdmits(scopeJson: unknown, ctx: ResourceCtx): boolean {
  // Unscoped row admits everything (caller already verified the
  // permission key is present).
  if (scopeJson === null || scopeJson === undefined) return true;

  // Discriminate without trusting the unknown — fail closed on any
  // shape we don't recognize.
  if (
    typeof scopeJson !== "object" ||
    !("kind" in scopeJson) ||
    typeof (scopeJson as { kind: unknown }).kind !== "string"
  ) {
    logger.warn(
      { scopeJson },
      "scope-evaluator: malformed scopeJson (missing kind) — failing closed"
    );
    return false;
  }

  const scope = scopeJson as ScopeJson;
  switch (scope.kind) {
    case "server.id":
      if (!Array.isArray(scope.ids) || scope.ids.length === 0) {
        logger.warn(
          { scope },
          "scope-evaluator: server.id with empty / non-array ids — failing closed"
        );
        return false;
      }
      if (!ctx.serverId) return false;
      return scope.ids.includes(ctx.serverId);

    case "server.environment":
      if (!Array.isArray(scope.values) || scope.values.length === 0) {
        logger.warn(
          { scope },
          "scope-evaluator: server.environment with empty / non-array values — failing closed"
        );
        return false;
      }
      if (!ctx.serverEnvironment) return false;
      return scope.values.includes(ctx.serverEnvironment);

    default: {
      // Exhaustive — produces a compile-time error when a new kind
      // is added without updating this switch. Runtime: log + fail.
      const _exhaustive: never = scope;
      logger.warn(
        { scope: _exhaustive },
        "scope-evaluator: unknown scope kind — failing closed"
      );
      return false;
    }
  }
}
