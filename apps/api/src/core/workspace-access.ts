import { prisma } from "@/core/prisma";

import {
  type EffectivePermissions,
  loadEffectivePermissions,
} from "@/auth/effective-permissions";
import { Prisma, WorkspaceRole } from "@/generated/prisma/client";

/**
 * Get user's built-in role in a workspace.
 *
 * Returns the `WorkspaceRole` enum (OWNER/ADMIN/MEMBER/READONLY)
 * when the user holds a built-in role, `null` when not a member or
 * when assigned a custom role (post-PR-2 — custom roles don't have a
 * builtinKey).
 *
 * Used by last-OWNER guard, `assertCanGrantRole`, and other code
 * that operates on the built-in tier hierarchy. For permission
 * checks, prefer `getUserEffectivePermissions` which handles custom
 * roles too.
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string,
  db?: Omit<
    Prisma.TransactionClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >
): Promise<WorkspaceRole | null> {
  const client = db ?? prisma;
  const member = await client.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: { role: { select: { builtinKey: true } } },
  });

  return member?.role.builtinKey ?? null;
}

/**
 * Resolve a user's effective permissions for a specific workspace
 * (RBAC Phase 3 PR-1). Looks up the WorkspaceMember by (userId,
 * workspaceId), then delegates to the resolver — which handles both
 * built-in tiers (in-code catalog) and custom roles (RolePermission
 * rows), with the version-aware cache.
 *
 * Returns `null` when the user isn't a member of the workspace.
 * Call sites should use `effectiveHasPermission(result, key)` for
 * permission checks rather than reaching into the union directly.
 *
 * Used by ad-hoc cross-workspace permission checks in routers that
 * iterate over multiple workspaces in a single request (e.g.
 * `organization/members.ts` workspace assignment) where the standard
 * `workspaceProcedure` resolution doesn't fit.
 */
export async function getUserEffectivePermissions(
  userId: string,
  workspaceId: string
): Promise<EffectivePermissions | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
    select: { id: true },
  });
  if (!member) return null;
  return loadEffectivePermissions(member.id);
}

/**
 * Ensure a user is a member of a workspace (idempotent - won't create duplicate)
 * @param tx Optional transaction client. If provided, uses the transaction; otherwise uses prisma directly.
 */
export async function ensureWorkspaceMember(
  userId: string,
  workspaceId: string,
  role: WorkspaceRole,
  tx?: Omit<
    Prisma.TransactionClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >
): Promise<void> {
  const client = tx || prisma;
  // RBAC Phase 3: `WorkspaceMember` no longer has a `role` enum
  // column; it points at a `Role` row via `roleId`. Resolve the
  // built-in Role row for the requested tier.
  const builtinRole = await client.role.findUnique({
    where: { builtinKey: role },
    select: { id: true },
  });
  if (!builtinRole) {
    throw new Error(
      `Built-in role for ${role} not found — migration ` +
        `20260511100000_rbac_phase3_foundation must run first.`
    );
  }
  await client.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    update: { roleId: builtinRole.id },
    create: {
      userId,
      workspaceId,
      roleId: builtinRole.id,
    },
  });
}
