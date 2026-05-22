import { TRPCError } from "@trpc/server";

import { loadEffectivePermissionsInTx } from "@/auth/effective-permissions";
import type { WorkspacePermission } from "@/auth/permissions";
import { type ScopeJson } from "@/auth/scope-canonical";
import type { Invitation, Prisma } from "@/generated/prisma/client";
import { InvitationStatus, WorkspaceRole } from "@/generated/prisma/client";

/**
 * Workspace-scoped role helpers — RBAC §3.2 / §3.3.
 *
 * The lattice is OWNER > ADMIN > MEMBER > READONLY. All grant and
 * mutation rules derive from that strict ordering.
 */

/**
 * Numeric rank — higher = more privilege. Used for permission lookups
 * and grant-comparisons. Mirrors the frontend WORKSPACE_ROLE_RANK.
 */
export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  [WorkspaceRole.OWNER]: 3,
  [WorkspaceRole.ADMIN]: 2,
  [WorkspaceRole.MEMBER]: 1,
  [WorkspaceRole.READONLY]: 0,
};

/**
 * Anti-escalation rule (R-AUTHZ-3, rbac.md §3.2):
 *
 * - OWNER may grant any role (OWNER / ADMIN / MEMBER / READONLY).
 * - ADMIN may grant ADMIN, MEMBER, READONLY. Cannot grant OWNER.
 * - MEMBER and READONLY may not grant any role.
 *
 * Pass `current` when changing an existing member's role so that non-OWNERs
 * cannot demote or reassign an existing OWNER.
 */
export function assertCanGrantRole(
  grantor: WorkspaceRole,
  target: WorkspaceRole,
  current?: WorkspaceRole
): void {
  // Non-OWNERs cannot touch an existing OWNER's role.
  if (current === WorkspaceRole.OWNER && grantor !== WorkspaceRole.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "auth.cannotGrantHigherRole",
      cause: { code: "WORKSPACE_PERMISSION", grantor, target },
    });
  }
  if (grantor === WorkspaceRole.OWNER) return;
  if (grantor === WorkspaceRole.ADMIN && target !== WorkspaceRole.OWNER) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "auth.cannotGrantHigherRole",
    cause: { code: "WORKSPACE_PERMISSION", grantor, target },
  });
}

/**
 * Anti-escalation rule for removing members (rbac.md §3.2):
 *
 * - OWNER may remove any member, including other OWNERs (last-OWNER guard
 *   still applies on top, see assertWorkspaceWillKeepOwner).
 * - ADMIN may remove MEMBER and READONLY only — cannot remove peers
 *   (other ADMINs) or superiors (OWNERs).
 *
 * MEMBER / READONLY callers never reach this function: the upstream
 * `member:remove` permission gate (ADMIN-tier) rejects them at the
 * procedure boundary before this assertion runs. Callers here are
 * always ADMIN or OWNER.
 */
export function assertCanRemoveMember(
  remover: WorkspaceRole,
  target: WorkspaceRole
): void {
  if (remover === WorkspaceRole.OWNER) return;
  // Non-OWNER attempting to remove a peer or superior.
  if (WORKSPACE_ROLE_RANK[target] >= WORKSPACE_ROLE_RANK[WorkspaceRole.ADMIN]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "user.onlyOwnerCanRemoveAdmin",
      // Canonical WORKSPACE_PERMISSION shape — same fields as the cause
      // emitted by workspacePermissionProcedure so the frontend can use
      // a single branch in readRbacError.
      cause: {
        code: "WORKSPACE_PERMISSION",
        required: WorkspaceRole.OWNER,
        actual: remover,
        permission: "member:remove",
      },
    });
  }
}

/**
 * Last-OWNER invariant (R-AUTHZ-4 / §3.3).
 *
 * MUST be called inside the same transaction as the mutation that
 * demotes or removes a member. Locks the parent `Workspace` row so
 * every OWNER mutation on that workspace serializes — locking only
 * the OWNER member rows is insufficient because two concurrent
 * demotions targeting two distinct OWNERs lock disjoint rows and
 * both pass the count check, leaving zero OWNERs.
 */
export async function assertWorkspaceWillKeepOwner(
  tx: Prisma.TransactionClient,
  params: {
    workspaceId: string;
    /**
     * Member(s) being demoted or removed in this transaction. Pass the
     * full set when a bulk operation demotes more than one OWNER —
     * single-member callers can pass `affectedMemberId` and the helper
     * builds the singleton list internally.
     */
    affectedMemberId?: string;
    affectedMemberIds?: ReadonlyArray<string>;
  }
): Promise<void> {
  const excludedIds: ReadonlyArray<string> =
    params.affectedMemberIds ??
    (params.affectedMemberId ? [params.affectedMemberId] : []);
  if (excludedIds.length === 0) {
    throw new Error(
      "assertWorkspaceWillKeepOwner requires affectedMemberId or affectedMemberIds"
    );
  }

  // Workspace-row lock: any concurrent OWNER mutation on this workspace
  // (regardless of which member is affected) blocks until our txn ends.
  await tx.$queryRaw`
    SELECT id FROM "Workspace"
    WHERE id = ${params.workspaceId}
    FOR UPDATE
  `;

  const remainingOwners = await tx.workspaceMember.count({
    where: {
      workspaceId: params.workspaceId,
      role: { isSystem: true, builtinKey: WorkspaceRole.OWNER },
      NOT: { id: { in: [...excludedIds] } },
    },
  });

  if (remainingOwners < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "workspace.lastOwnerBlocked",
      cause: { code: "LAST_OWNER_BLOCKED", workspaceId: params.workspaceId },
    });
  }
}

/**
 * R-INV-3 (rbac.md §2.5): re-validate at accept time that the inviter's
 * current workspace role is still high enough to grant the invited role.
 * If they were demoted or removed since the invitation was created,
 * auto-revoke the invitation atomically and throw.
 *
 * MUST be called inside the same transaction as the `Invitation` flip
 * to ACCEPTED — otherwise a TOCTOU window lets a demoted inviter's
 * invitation still go through. The auto-revoke is a conditional
 * `updateMany(status: PENDING)` so a parallel accept that already won
 * the race won't be clobbered.
 */
export async function assertInviterStillGrantable(
  tx: Prisma.TransactionClient,
  invitation: Pick<Invitation, "id" | "invitedById" | "workspaceId" | "role">
): Promise<void> {
  const inviterMember = await tx.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: invitation.invitedById,
        workspaceId: invitation.workspaceId,
      },
    },
    select: { role: { select: { builtinKey: true } } },
  });

  let stillGrantable = false;
  // Custom-role inviters (no builtinKey) cannot use the built-in
  // tier-rank `assertCanGrantRole`. PR-2's `assertCanGrantCustomRole`
  // covers them; here we fail closed.
  const inviterBuiltinKey = inviterMember?.role.builtinKey ?? null;
  if (inviterBuiltinKey) {
    try {
      assertCanGrantRole(inviterBuiltinKey, invitation.role);
      stillGrantable = true;
    } catch {
      stillGrantable = false;
    }
  }
  if (stillGrantable) return;

  // Auto-revoke without clobbering an already-accepted row.
  await tx.invitation.updateMany({
    where: { id: invitation.id, status: InvitationStatus.PENDING },
    data: {
      status: InvitationStatus.REVOKED,
      revokedAt: new Date(),
    },
  });

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "auth.invitationAlreadyUsedOrExpired",
    cause: {
      code: "INVITER_ROLE_INSUFFICIENT",
      invitationId: invitation.id,
      currentInviterRole: inviterMember?.role ?? null,
      invitedRole: invitation.role,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Custom-role anti-escalation (RBAC Phase 3 PR-2)
// ─────────────────────────────────────────────────────────────────────

/**
 * Scope subsumption (`candidate ⊆ holderScopes`) — per plan §4.3.
 *
 * Returns true if at least one of `holderScopes` admits everything
 * the candidate scope admits. Same-kind-only by design: a holder of
 * `server.environment=staging` does NOT subsume a candidate of
 * `server.id=<staging-server-id>`, because the rule engine can't
 * prove the id is in the named environment without joining live data
 * (Architect H5). The product surface treats those two kinds as
 * independent.
 *
 *   - `null` candidate (unconditional) is admitted only by a `null`
 *     holder. Most-permissive holder wins.
 *   - `null` holder (unconditional) admits any candidate.
 *   - Otherwise: kinds must match and the candidate's set of
 *     ids/values must be a subset of the holder's.
 */
export function isScopeSubsumed(
  candidate: ScopeJson | null,
  holderScopes: ReadonlyArray<ScopeJson | null>
): boolean {
  if (candidate === null) {
    return holderScopes.some((s) => s === null);
  }
  return holderScopes.some((holder) => {
    if (holder === null) return true;
    if (holder.kind !== candidate.kind) return false;
    if (candidate.kind === "server.id" && holder.kind === "server.id") {
      return candidate.ids.every((id) => holder.ids.includes(id));
    }
    if (
      candidate.kind === "server.environment" &&
      holder.kind === "server.environment"
    ) {
      return candidate.values.every((v) => holder.values.includes(v));
    }
    return false;
  });
}

/**
 * `assertCanGrantCustomRole` — the "creator currently holds (key,
 * scope)" invariant from plan §4.2 / §4.4. MUST be called inside the
 * SERIALIZABLE transaction that holds `FOR UPDATE` on the actor's
 * `WorkspaceMember` row, otherwise a parallel demotion can sneak in
 * between the authority lookup and the role mutation commit.
 *
 * Re-resolves the actor's effective permissions in the same tx
 * (no cache), then for every candidate `(key, scope)` row asserts
 * that the actor holds at least one `(key, holderScope)` with
 * `candidate ⊆ holderScope` (per {@link isScopeSubsumed}).
 *
 * Throws `FORBIDDEN` on the first mismatch — the cause payload
 * carries the offending permission + scopes so the frontend can
 * point the operator at the specific row.
 */
export async function assertCanGrantCustomRole(
  tx: Prisma.TransactionClient,
  actorMemberId: string,
  candidateRolePermissions: ReadonlyArray<{
    key: WorkspacePermission;
    scope: ScopeJson | null;
  }>
): Promise<void> {
  const actorEffective = await loadEffectivePermissionsInTx(tx, actorMemberId);
  if (!actorEffective) {
    // Actor's membership disappeared mid-tx — fail closed.
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "auth.workspacePermissionRequired",
      cause: { code: "WORKSPACE_PERMISSION", reason: "actor_not_member" },
    });
  }

  // Build (key → scopes[]) view. Built-in roles hold every catalog
  // permission unconditionally (null scope); custom roles get the
  // explicit `scopeRows` array.
  const heldByKey = new Map<WorkspacePermission, Array<ScopeJson | null>>();
  if (actorEffective.kind === "builtin") {
    for (const key of actorEffective.permissions) {
      heldByKey.set(key, [null]);
    }
  } else {
    for (const row of actorEffective.scopeRows) {
      const list = heldByKey.get(row.permissionKey) ?? [];
      list.push((row.scopeJson as ScopeJson | null) ?? null);
      heldByKey.set(row.permissionKey, list);
    }
  }

  for (const cand of candidateRolePermissions) {
    const holderScopes = heldByKey.get(cand.key);
    if (!holderScopes || !isScopeSubsumed(cand.scope, holderScopes)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "auth.cannotGrantPermissionExceedingActorAuthority",
        cause: {
          code: "PRIVILEGE_ESCALATION",
          permission: cand.key,
          requestedScope: cand.scope,
          actorScopes: holderScopes ?? [],
        },
      });
    }
  }
}
