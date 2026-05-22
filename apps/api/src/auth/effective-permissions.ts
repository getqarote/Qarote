/**
 * Effective-permission resolver (RBAC Phase 3 PR-1).
 *
 * The resolver discriminates between built-in roles (resolved from
 * the in-code catalog at `permissions.ts`) and custom roles
 * (resolved from `RolePermission` rows). The discriminated-union
 * return surfaces both shapes to the caller; downstream code only
 * touches `.permissions` (a `ReadonlySet`) for permission checks
 * and reaches into `.role` / `.scopeRows` when scope evaluation is
 * needed (PR-3).
 *
 * Cache strategy (Architect §2.3):
 *   - Per-request DataLoader memoizes `loadByMemberId(memberId)`
 *     so a single request never reloads the same role.
 *   - Cross-request: cached on a module-level Map keyed by
 *     `(roleId, role.updatedAt)`. A version check (SELECT updatedAt)
 *     runs once per (role, request) — far cheaper than reloading
 *     the full RolePermission set on every cache hit.
 *
 * No dual-read: the consolidated PR-1 migration drops the legacy
 * `WorkspaceMember.role` enum in the same step that backfills
 * `roleId` and applies `NOT NULL` — per the "migrate everything at
 * once" rule. The resolver therefore reads `member.role.*` directly
 * from the FK relation with no fallback path.
 */

import DataLoader from "dataloader";

import { prisma } from "@/core/prisma";

import {
  hasPermission as builtinHasPermission,
  permissionsForRole,
  type WorkspacePermission,
} from "./permissions";

import type { Prisma } from "@/generated/prisma/client";
import { WorkspaceRole } from "@/generated/prisma/client";

/** Internal alias — the transaction client shape PR-2 mutation helpers
 *  pass around when they need to re-resolve permissions inside the same
 *  tx as a `FOR UPDATE` lock. */
type PrismaTx = Prisma.TransactionClient;

/**
 * Discriminated union — public types are accessed via
 * `EffectivePermissions` and narrowed with `kind`. The variant
 * interfaces stay internal; downstream code should not depend on
 * either branch directly. PR-2 / PR-3 access the variant fields via
 * narrowing on the union.
 */
interface BuiltinResolution {
  kind: "builtin";
  /** The built-in tier — drives last-OWNER guards, anti-escalation. */
  role: WorkspaceRole;
  /** Frozen set for O(1) membership checks. */
  permissions: ReadonlySet<WorkspacePermission>;
}

interface CustomResolution {
  kind: "custom";
  roleId: string;
  /** Frozen set of permission keys held under any scope. */
  permissions: ReadonlySet<WorkspacePermission>;
  /**
   * Raw scope rows for scope evaluation in PR-3
   * (`workspacePermissionProcedure(key, resourceCtxFn)`).
   * One row per (permissionKey, scope) — multiple rows for the
   * same key mean OR-across-rows.
   */
  scopeRows: ReadonlyArray<{
    permissionKey: WorkspacePermission;
    scopeJson: unknown | null;
    scopeFingerprint: string;
  }>;
}

export type EffectivePermissions = BuiltinResolution | CustomResolution;

interface CachedCustomRole {
  /** Source-of-truth version for invalidation. */
  updatedAt: Date;
  resolution: CustomResolution;
}

/** Module-level cache. Cleared via {@link invalidateRoleCache} when a
 *  role mutation lands; revalidation also kicks in via the per-request
 *  `SELECT updatedAt` check below. */
const customRoleCache = new Map<string, CachedCustomRole>();

/**
 * Clear the cached resolution for a single role. Call from mutation
 * handlers in PR-2 (`role.setPermissions`, `role.delete`, etc.) so
 * the next request picks up the change immediately on the same pod.
 *
 * Other pods catch up via the per-request `updatedAt` revalidation —
 * within the next request, they fetch `Role.updatedAt`, see it's
 * newer than the cached entry, and reload.
 */
export function invalidateRoleCache(roleId: string): void {
  customRoleCache.delete(roleId);
}

/** Test-only — full cache wipe between tests. */
export function _resetRoleCacheForTests(): void {
  customRoleCache.clear();
}

async function loadCustomRole(roleId: string): Promise<CustomResolution> {
  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: {
      permissionKey: true,
      scopeJson: true,
      scopeFingerprint: true,
    },
  });
  const permissions = new Set<WorkspacePermission>();
  for (const row of rows) {
    permissions.add(row.permissionKey as WorkspacePermission);
  }
  return {
    kind: "custom",
    roleId,
    permissions: permissions as ReadonlySet<WorkspacePermission>,
    scopeRows: rows.map((r) => ({
      permissionKey: r.permissionKey as WorkspacePermission,
      scopeJson: r.scopeJson,
      scopeFingerprint: r.scopeFingerprint,
    })),
  };
}

/**
 * Resolve effective permissions for a workspace member.
 *
 * Returns null when the member doesn't exist or has neither `roleId`
 * nor `role` enum set (shouldn't happen post-backfill, but the
 * resolver fails closed).
 */
export async function loadEffectivePermissions(
  memberId: string
): Promise<EffectivePermissions | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: {
      roleId: true,
      role: {
        select: {
          id: true,
          isSystem: true,
          builtinKey: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!member) return null;

  // `member.role` is the Role FK relation (always present —
  // `WorkspaceMember.roleId` is NOT NULL post-migration).
  if (member.role.isSystem && member.role.builtinKey) {
    return {
      kind: "builtin",
      role: member.role.builtinKey,
      permissions: new Set(
        permissionsForRole(member.role.builtinKey)
      ) as ReadonlySet<WorkspacePermission>,
    };
  }
  // Custom role — check version-aware cache first.
  const cached = customRoleCache.get(member.role.id);
  if (
    cached &&
    cached.updatedAt.getTime() === member.role.updatedAt.getTime()
  ) {
    return cached.resolution;
  }
  const resolution = await loadCustomRole(member.role.id);
  customRoleCache.set(member.role.id, {
    updatedAt: member.role.updatedAt,
    resolution,
  });
  return resolution;
}

/**
 * Transaction-bound resolver (RBAC Phase 3 PR-2).
 *
 * Used by `assertCanGrantCustomRole` and `assignRole` to re-resolve
 * the actor's effective permissions inside the SAME SERIALIZABLE
 * transaction that holds `FOR UPDATE` on the actor's `WorkspaceMember`
 * row — closes the TOCTOU window between authority lookup and
 * mutation commit.
 *
 * Unlike {@link loadEffectivePermissions}, this path **bypasses the
 * module-level cache**: the whole point of the in-tx re-resolution
 * is to read the freshest state under lock, not last request's
 * cached snapshot. Returns the same discriminated-union shape so
 * callers can branch on `kind === "builtin"` vs `"custom"`.
 *
 * Returns `null` when the member doesn't exist. Caller must treat
 * that as a fail-closed condition.
 */
export async function loadEffectivePermissionsInTx(
  tx: PrismaTx,
  memberId: string
): Promise<EffectivePermissions | null> {
  const member = await tx.workspaceMember.findUnique({
    where: { id: memberId },
    select: {
      role: {
        select: {
          id: true,
          isSystem: true,
          builtinKey: true,
        },
      },
    },
  });
  if (!member) return null;

  if (member.role.isSystem && member.role.builtinKey) {
    return {
      kind: "builtin",
      role: member.role.builtinKey,
      permissions: new Set(
        permissionsForRole(member.role.builtinKey)
      ) as ReadonlySet<WorkspacePermission>,
    };
  }
  // Custom role — read RolePermission rows inside the same tx so
  // they see the same MVCC snapshot the lock guarantees.
  const rows = await tx.rolePermission.findMany({
    where: { roleId: member.role.id },
    select: {
      permissionKey: true,
      scopeJson: true,
      scopeFingerprint: true,
    },
  });
  const permissions = new Set<WorkspacePermission>();
  for (const row of rows) {
    permissions.add(row.permissionKey as WorkspacePermission);
  }
  return {
    kind: "custom",
    roleId: member.role.id,
    permissions: permissions as ReadonlySet<WorkspacePermission>,
    scopeRows: rows.map((r) => ({
      permissionKey: r.permissionKey as WorkspacePermission,
      scopeJson: r.scopeJson,
      scopeFingerprint: r.scopeFingerprint,
    })),
  };
}

/**
 * Build a per-request DataLoader that memoizes `loadEffectivePermissions`.
 * Mounted on `ctx.effectivePermissionsLoader` in the tRPC context
 * builder (PR-2). One instance per request; the dataloader is
 * intentionally short-lived to avoid cross-request leakage of stale
 * data after a mutation.
 */
export function createEffectivePermissionsLoader(): DataLoader<
  string,
  EffectivePermissions | null
> {
  return new DataLoader<string, EffectivePermissions | null>(
    async (memberIds) =>
      Promise.all(memberIds.map((id) => loadEffectivePermissions(id))),
    { cache: true }
  );
}

/**
 * Convenience check for callers that want the historical
 * `hasPermission(role, key)` shape. Falls through to the built-in
 * checker for built-in roles; uses the Set for custom.
 */
export function effectiveHasPermission(
  resolution: EffectivePermissions,
  permission: WorkspacePermission
): boolean {
  if (resolution.kind === "builtin") {
    return builtinHasPermission(resolution.role, permission);
  }
  return resolution.permissions.has(permission);
}
