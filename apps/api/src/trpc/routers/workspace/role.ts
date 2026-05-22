/**
 * Custom-role router (RBAC Phase 3 PR-2).
 *
 * Eight procedures covering the full custom-role lifecycle:
 *
 *   list / get / permission.list     — read surfaces
 *   create / update / setPermissions / delete — role mutation (OWNER + rbac_advanced)
 *   assignRole                        — bulk member→role assignment (ADMIN + rbac_advanced for custom targets)
 *
 * Authority-bearing mutations (`create`, `setPermissions`,
 * `assignRole`, `delete`) run in a SERIALIZABLE transaction with
 * `FOR UPDATE` on the actor's `WorkspaceMember` row and retry SQLSTATE
 * 40001 up to 3× via `withSerializableRetry`. They re-resolve the
 * actor's effective permissions inside the tx (closing the TOCTOU
 * window) and call `assertCanGrantCustomRole` to enforce the
 * "creator currently holds (key, scope)" invariant. `update` is a
 * pure rename/redescribe and runs at default isolation with
 * optimistic locking only — no authority impact.
 *
 * Caching: every successful mutation calls `invalidateRoleCache` so
 * the in-memory `customRoleCache` on the same pod sees the change
 * immediately; other pods catch up via the per-request
 * `Role.updatedAt` revalidation in the resolver.
 */

import { TRPCError } from "@trpc/server";

import { logger } from "@/core/logger";
import { withSerializableRetry } from "@/core/serializable-retry";

import { recordFromContext } from "@/services/audit";
import { requirePremiumFeature } from "@/services/feature-gate";
import { throwGateError } from "@/services/feature-gate/error";
import { resolveFeatureGate } from "@/services/feature-gate/resolver";

import {
  AssignRoleInputSchema,
  CreateRoleInputSchema,
  DeleteRoleInputSchema,
  GetRoleInputSchema,
  ListBuiltinRolesInputSchema,
  ListPermissionsInputSchema,
  ListRolesInputSchema,
  SetPermissionsInputSchema,
  UpdateRoleInputSchema,
} from "@/schemas/role";

import { FEATURES } from "@/config/features";

import { router, workspacePermissionProcedure } from "@/trpc/trpc";

import { invalidateRoleCache } from "@/auth/effective-permissions";
import {
  permissionsForRole,
  WORKSPACE_PERMISSION_REQUIREMENTS,
  type WorkspacePermission,
} from "@/auth/permissions";
import {
  canonicalizeScope,
  scopeFingerprint,
  type ScopeJson,
} from "@/auth/scope-canonical";
import {
  assertCanGrantCustomRole,
  assertWorkspaceWillKeepOwner,
} from "@/auth/workspace-roles";
import { Prisma, WorkspaceRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

// ─── helpers ─────────────────────────────────────────────────────────

/**
 * Catalog membership check at write time. Rejects permission keys
 * absent from `WORKSPACE_PERMISSION_REQUIREMENTS`. Deprecated-key
 * rejection (per plan §6 — check `Permission.deprecatedAt IS NOT NULL`)
 * is a follow-up: the `Permission.deprecatedAt` column is in place
 * (PR-1 schema) but no key in the catalog has been deprecated yet, so
 * the gate would be a no-op today. Add the DB check when the first
 * key is marked deprecated.
 */
function assertValidPermissionKey(
  key: string,
  locale: string
): asserts key is WorkspacePermission {
  // `Object.hasOwn` rather than `in` — the latter walks the prototype
  // chain so a request with `permissionKey: "toString"` would slip
  // past the gate (then crash later in scope eval or DB insert).
  if (!Object.hasOwn(WORKSPACE_PERMISSION_REQUIREMENTS, key)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: te(locale, "role.unknownPermissionKey"),
      cause: { code: "UNKNOWN_PERMISSION", permission: key },
    });
  }
}

/**
 * Resolve a workspace-scoped `Role` row, asserting it belongs to the
 * caller's workspace and is a custom role (not a built-in). 404s
 * on mismatch — never leak existence across workspaces.
 */
async function loadCustomRoleInWorkspace(
  tx: Prisma.TransactionClient,
  roleId: string,
  workspaceId: string,
  locale: string
) {
  const role = await tx.role.findFirst({
    where: { id: roleId, workspaceId, isSystem: false },
    select: {
      id: true,
      name: true,
      description: true,
      workspaceId: true,
      isSystem: true,
      builtinKey: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!role) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: te(locale, "role.notFound"),
    });
  }
  return role;
}

const SERIALIZABLE_TX = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

// ─────────────────────────────────────────────────────────────────────

export const roleRouter = router({
  /**
   * List custom roles in the workspace (names + member counts only).
   *
   * ADMIN-tier read by design — full assignment detail (who holds
   * which role, scope contents) is `get` and requires
   * `role:read:assignments` (OWNER).
   */
  list: workspacePermissionProcedure("role:read")
    .input(ListRolesInputSchema)
    .query(async ({ input, ctx }) => {
      const rows = await ctx.prisma.role.findMany({
        where: { workspaceId: input.workspaceId, isSystem: false },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { members: true } },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        take: input.limit + 1,
      });
      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;
      return {
        items: items.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          memberCount: r._count.members,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
      };
    }),

  /**
   * Return the four system role rows (`OWNER`, `ADMIN`, `MEMBER`,
   * `READONLY`) with their stable UUIDs. Used by the team page so the
   * role-assignment dropdown can address built-ins via `assignRole`'s
   * `targetRoleId` parameter — the only mutation path that handles both
   * built-in and custom roles uniformly.
   *
   * System roles live in the global `Role` table (`workspaceId = null`,
   * `isSystem = true`) and are seeded by the Phase 3 foundation
   * migration. Result shape is intentionally tiny.
   */
  builtins: workspacePermissionProcedure("role:read")
    .input(ListBuiltinRolesInputSchema)
    .query(async ({ ctx }) => {
      const rows = await ctx.prisma.role.findMany({
        where: { workspaceId: null, isSystem: true },
        select: { id: true, builtinKey: true, name: true },
        orderBy: { builtinKey: "asc" },
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          builtinKey: r.builtinKey,
          name: r.name,
        })),
      };
    }),

  /**
   * Full role detail including `(permissionKey, scope)` rows.
   * OWNER-tier — exposes the workspace's authority surface.
   */
  get: workspacePermissionProcedure("role:read:assignments")
    .input(GetRoleInputSchema)
    .query(async ({ input, ctx }) => {
      const role = await ctx.prisma.role.findFirst({
        where: {
          id: input.roleId,
          workspaceId: input.workspaceId,
          isSystem: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          permissions: {
            select: {
              permissionKey: true,
              scopeJson: true,
              scopeFingerprint: true,
            },
          },
          _count: { select: { members: true } },
        },
      });
      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "role.notFound"),
        });
      }
      return {
        id: role.id,
        name: role.name,
        description: role.description,
        memberCount: role._count.members,
        createdById: role.createdById,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
        permissions: role.permissions.map((rp) => ({
          permissionKey: rp.permissionKey,
          scope: rp.scopeJson as ScopeJson | null,
          scopeFingerprint: rp.scopeFingerprint,
        })),
      };
    }),

  /**
   * Permission catalog browse — used by the role-editor UI to render
   * the permission picker. Returns the full catalog with the lowest
   * built-in tier that grants each key.
   */
  permissionList: workspacePermissionProcedure("role:read")
    .input(ListPermissionsInputSchema)
    .query(() => {
      return {
        permissions: (
          Object.keys(
            WORKSPACE_PERMISSION_REQUIREMENTS
          ) as WorkspacePermission[]
        ).map((key) => ({
          key,
          minimumBuiltinTier: WORKSPACE_PERMISSION_REQUIREMENTS[key],
        })),
      };
    }),

  /**
   * Create a new custom role with its initial permission set.
   *
   * OWNER + `rbac_advanced` plan-gate. Re-validates actor authority
   * inside a SERIALIZABLE tx with FOR UPDATE on the actor's
   * `WorkspaceMember` (closes TOCTOU between authority check and
   * insert).
   */
  create: workspacePermissionProcedure("role:manage")
    .use(requirePremiumFeature(FEATURES.RBAC_ADVANCED))
    .input(CreateRoleInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, name, description, permissions } = input;

      // Validate every permission key against the catalog before
      // opening the tx — cheap, fail-closed on unknown keys.
      for (const p of permissions) {
        assertValidPermissionKey(p.permissionKey, ctx.locale);
      }

      // Dedupe input by `(key, scopeFingerprint)` — see setPermissions
      // for the rationale.
      const seenKeysCreate = new Set<string>();
      for (const p of permissions) {
        const fp = `${p.permissionKey}:${scopeFingerprint(p.scope)}`;
        if (seenKeysCreate.has(fp)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "role.duplicatePermissionEntry"),
            cause: {
              code: "DUPLICATE_PERMISSION_ENTRY",
              permission: p.permissionKey,
              scope: p.scope,
            },
          });
        }
        seenKeysCreate.add(fp);
      }

      const actorMemberId = ctx.workspaceMember.id;
      const created = await withSerializableRetry(() =>
        ctx.prisma.$transaction(async (tx) => {
          // Lock actor's membership row so any parallel role mutation
          // that could change actor authority serializes against us.
          await tx.$queryRaw`
            SELECT id FROM "WorkspaceMember"
            WHERE id = ${actorMemberId}
            FOR UPDATE
          `;

          await assertCanGrantCustomRole(
            tx,
            actorMemberId,
            permissions.map((p) => ({
              key: p.permissionKey as WorkspacePermission,
              scope: p.scope,
            }))
          );

          const role = await tx.role.create({
            data: {
              workspaceId,
              name,
              description: description ?? null,
              isSystem: false,
              createdById: ctx.user.id,
              permissions: {
                create: permissions.map((p) => ({
                  permissionKey: p.permissionKey,
                  scopeJson: p.scope as Prisma.InputJsonValue,
                  scopeCanonical: canonicalizeScope(p.scope),
                })),
              },
            },
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          return role;
        }, SERIALIZABLE_TX)
      );

      invalidateRoleCache(created.id);

      void recordFromContext(ctx, {
        action: "workspace.role.created",
        category: "workspace",
        entityType: "role",
        entityId: created.id,
        entityLabel: created.name,
        metadata: {
          permissions: permissions.map((p) => ({
            key: p.permissionKey,
            scope: p.scope as Prisma.InputJsonValue | null,
          })),
        },
      });

      return {
        id: created.id,
        name: created.name,
        description: created.description,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    }),

  /**
   * Rename / redescribe an existing custom role. Optimistic-locked on
   * `updatedAt` to prevent silent overwrite of a concurrent edit.
   */
  update: workspacePermissionProcedure("role:manage")
    .use(requirePremiumFeature(FEATURES.RBAC_ADVANCED))
    .input(UpdateRoleInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, roleId, expectedUpdatedAt, name, description } =
        input;

      const updated = await ctx.prisma.$transaction(async (tx) => {
        await loadCustomRoleInWorkspace(tx, roleId, workspaceId, ctx.locale);

        const res = await tx.role.updateMany({
          where: {
            id: roleId,
            workspaceId,
            isSystem: false,
            updatedAt: expectedUpdatedAt,
          },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined
              ? { description: description ?? null }
              : {}),
          },
        });
        if (res.count === 0) {
          // Concurrent edit OR the row no longer exists.
          const current = await tx.role.findFirst({
            where: { id: roleId, workspaceId },
            select: { updatedAt: true },
          });
          throw new TRPCError({
            code: "CONFLICT",
            message: te(ctx.locale, "role.staleUpdate"),
            cause: {
              code: "STALE_UPDATE",
              currentUpdatedAt: current?.updatedAt.toISOString() ?? null,
            },
          });
        }
        return tx.role.findFirstOrThrow({
          where: { id: roleId, workspaceId },
          select: {
            id: true,
            name: true,
            description: true,
            updatedAt: true,
          },
        });
      });

      invalidateRoleCache(updated.id);

      void recordFromContext(ctx, {
        action: "workspace.role.updated",
        category: "workspace",
        entityType: "role",
        entityId: updated.id,
        entityLabel: updated.name,
        metadata: { name, description },
      });

      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        updatedAt: updated.updatedAt.toISOString(),
      };
    }),

  /**
   * Replace the role's full permission set atomically. Re-validates
   * actor authority + optimistic-locks on `updatedAt`.
   */
  setPermissions: workspacePermissionProcedure("role:manage")
    .use(requirePremiumFeature(FEATURES.RBAC_ADVANCED))
    .input(SetPermissionsInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, roleId, expectedUpdatedAt, permissions } = input;

      for (const p of permissions) {
        assertValidPermissionKey(p.permissionKey, ctx.locale);
      }

      // Dedupe by `(permissionKey, scopeFingerprint)` — the DB has a
      // partial unique on those columns, so a client request that
      // accidentally repeats a row would crash mid-tx with P2002 and
      // surface an opaque error. Surface a clean BAD_REQUEST instead.
      const seenKeys = new Set<string>();
      for (const p of permissions) {
        const fp = `${p.permissionKey}:${scopeFingerprint(p.scope)}`;
        if (seenKeys.has(fp)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "role.duplicatePermissionEntry"),
            cause: {
              code: "DUPLICATE_PERMISSION_ENTRY",
              permission: p.permissionKey,
              scope: p.scope,
            },
          });
        }
        seenKeys.add(fp);
      }

      const actorMemberId = ctx.workspaceMember.id;
      const result = await withSerializableRetry(() =>
        ctx.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`
            SELECT id FROM "WorkspaceMember"
            WHERE id = ${actorMemberId}
            FOR UPDATE
          `;
          // Serialize against any concurrent `assignRole` / `delete`
          // that reads this role's permissions; without the Role-row
          // lock those readers could observe a half-replaced set or
          // race their authority check against our commit.
          await tx.$queryRaw`
            SELECT id FROM "Role"
            WHERE id = ${roleId}
              AND "workspaceId" = ${workspaceId}
              AND "isSystem" = false
            FOR UPDATE
          `;

          const role = await loadCustomRoleInWorkspace(
            tx,
            roleId,
            workspaceId,
            ctx.locale
          );

          if (role.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
            throw new TRPCError({
              code: "CONFLICT",
              message: te(ctx.locale, "role.staleUpdate"),
              cause: {
                code: "STALE_UPDATE",
                currentUpdatedAt: role.updatedAt.toISOString(),
              },
            });
          }

          await assertCanGrantCustomRole(
            tx,
            actorMemberId,
            permissions.map((p) => ({
              key: p.permissionKey as WorkspacePermission,
              scope: p.scope,
            }))
          );

          const before = await tx.rolePermission.findMany({
            where: { roleId },
            select: { permissionKey: true, scopeJson: true },
          });

          // Atomic replace — delete + insert in the same tx.
          await tx.rolePermission.deleteMany({ where: { roleId } });
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleId,
              permissionKey: p.permissionKey,
              scopeJson: p.scope as Prisma.InputJsonValue,
              scopeCanonical: canonicalizeScope(p.scope),
            })),
          });

          // Touch `Role.updatedAt` so the resolver's cache-version
          // check picks up the change on the next request.
          const after = await tx.role.update({
            where: { id: roleId },
            data: { updatedAt: new Date() },
            select: { id: true, name: true, updatedAt: true },
          });

          return { role: after, before };
        }, SERIALIZABLE_TX)
      );

      invalidateRoleCache(result.role.id);

      void recordFromContext(ctx, {
        action: "workspace.role.permissions_set",
        category: "workspace",
        entityType: "role",
        entityId: result.role.id,
        entityLabel: result.role.name,
        metadata: {
          before: result.before.map((rp) => ({
            key: rp.permissionKey,
            scope: rp.scopeJson as Prisma.InputJsonValue | null,
          })),
          after: permissions.map((p) => ({
            key: p.permissionKey,
            scope: p.scope as Prisma.InputJsonValue | null,
          })),
        },
      });

      return {
        id: result.role.id,
        name: result.role.name,
        updatedAt: result.role.updatedAt.toISOString(),
      };
    }),

  /**
   * Delete a custom role. Members holding it are reassigned to the
   * built-in `MEMBER` tier inside the same tx — the FK is `RESTRICT`,
   * so deleting without reassigning would fail.
   *
   * Runs SERIALIZABLE with `FOR UPDATE` on the actor's `WorkspaceMember`
   * **and** the target `Role` row. Without the role lock a concurrent
   * `assignRole` could assign members to a role that's about to be
   * deleted, then commit after the FK reference is gone (P2003 / 500).
   * The last-OWNER guard does not apply here because custom roles
   * never carry the `OWNER` built-in tier — every member on this role
   * was already off the OWNER built-in.
   */
  delete: workspacePermissionProcedure("role:manage")
    .use(requirePremiumFeature(FEATURES.RBAC_ADVANCED))
    .input(DeleteRoleInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, roleId, expectedUpdatedAt } = input;
      const actorMemberId = ctx.workspaceMember.id;

      const result = await withSerializableRetry(() =>
        ctx.prisma.$transaction(async (tx) => {
          // Lock actor + target Role row up front.
          await tx.$queryRaw`
            SELECT id FROM "WorkspaceMember"
            WHERE id = ${actorMemberId}
            FOR UPDATE
          `;
          await tx.$queryRaw`
            SELECT id FROM "Role"
            WHERE id = ${roleId}
              AND "workspaceId" = ${workspaceId}
              AND "isSystem" = false
            FOR UPDATE
          `;

          const role = await loadCustomRoleInWorkspace(
            tx,
            roleId,
            workspaceId,
            ctx.locale
          );

          if (role.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
            throw new TRPCError({
              code: "CONFLICT",
              message: te(ctx.locale, "role.staleUpdate"),
              cause: {
                code: "STALE_UPDATE",
                currentUpdatedAt: role.updatedAt.toISOString(),
              },
            });
          }

          // Resolve the built-in MEMBER role to redirect members to.
          // ESLint's no-restricted-syntax rule blocks `WorkspaceRole.X`
          // comparisons in router *business logic*; here we're
          // identifying a built-in Role row by its tag, which is FK
          // resolution, not a permission/tier check.
          // eslint-disable-next-line no-restricted-syntax
          const memberBuiltinKey = WorkspaceRole.MEMBER;
          const memberBuiltin = await tx.role.findUnique({
            where: { builtinKey: memberBuiltinKey },
            select: { id: true },
          });
          if (!memberBuiltin) {
            logger.error(
              { roleId, workspaceId },
              "Built-in MEMBER role missing — RBAC Phase 3 migration must run first"
            );
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: te(ctx.locale, "role.deleteFailed"),
            });
          }

          // Reassign before delete (FK is RESTRICT). Returns the count
          // so the audit row can record how many members moved.
          const reassigned = await tx.workspaceMember.updateMany({
            where: { workspaceId, roleId },
            data: { roleId: memberBuiltin.id },
          });

          await tx.rolePermission.deleteMany({ where: { roleId } });
          await tx.role.delete({ where: { id: roleId } });

          return {
            deletedRoleId: role.id,
            deletedRoleName: role.name,
            reassignedMemberCount: reassigned.count,
          };
        }, SERIALIZABLE_TX)
      );

      invalidateRoleCache(result.deletedRoleId);

      void recordFromContext(ctx, {
        action: "workspace.role.deleted",
        category: "workspace",
        entityType: "role",
        entityId: result.deletedRoleId,
        entityLabel: result.deletedRoleName,
        metadata: {
          reassignedMemberCount: result.reassignedMemberCount,
        },
      });

      return result;
    }),

  /**
   * Bulk member→role assignment. Built-in OR custom target. The
   * `member:update_role` permission alone gates ADMIN-or-above; the
   * `rbac_advanced` plan-gate runs inside the handler when the target
   * role is custom (per plan §5.4) so an ADMIN on a Developer plan
   * can still re-tier members between built-ins.
   *
   * `assertCanGrantCustomRole` re-runs even for built-in targets so
   * the same anti-escalation check applies uniformly.
   */
  assignRole: workspacePermissionProcedure("member:update_role")
    .input(AssignRoleInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, memberIds, targetRoleId } = input;
      const actorMemberId = ctx.workspaceMember.id;

      // Sort memberIds for consistent FOR UPDATE order — avoids
      // deadlock with another bulk assign hitting the same rows.
      const sortedMemberIds = Array.from(new Set(memberIds)).sort();

      const result = await withSerializableRetry(() =>
        ctx.prisma.$transaction(async (tx) => {
          // 1. Locate target role to discriminate built-in vs custom.
          //    We only `select` enough to gate the plan + lock decision
          //    here; permissions are re-read AFTER the Role-row lock
          //    so a concurrent `setPermissions` can't escalate us
          //    between this read and `assertCanGrantCustomRole`.
          const targetIdentity = await tx.role.findFirst({
            where: {
              id: targetRoleId,
              OR: [{ workspaceId }, { workspaceId: null, isSystem: true }],
            },
            select: {
              id: true,
              name: true,
              workspaceId: true,
              isSystem: true,
              builtinKey: true,
            },
          });
          if (!targetIdentity) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: te(ctx.locale, "role.notFound"),
            });
          }

          // 2. Plan-gate when assigning a custom (non-built-in) role.
          //    Built-in reassignment is free across plans. Imperative
          //    here because tRPC middlewares can't see input — same
          //    helper the middleware uses so the wire shape matches.
          if (!targetIdentity.isSystem) {
            const gate = await resolveFeatureGate(FEATURES.RBAC_ADVANCED, {
              organizationId: ctx.organizationId,
            });
            if (gate.kind === "blocked") throwGateError(gate);
          }

          // 3. Lock actor first, then re-resolve authority.
          await tx.$queryRaw`
            SELECT id FROM "WorkspaceMember"
            WHERE id = ${actorMemberId}
            FOR UPDATE
          `;

          // 3a. If the actor holds a custom role, lock their own Role
          //     row too. Without this, a concurrent `setPermissions`
          //     on the actor's role between the WorkspaceMember lock
          //     above and the post-lock `loadEffectivePermissionsInTx`
          //     call below could shift the actor's effective
          //     permission set mid-flight (PR-4.1 security fix).
          //     Built-in actors are immutable and don't race.
          //
          //     We re-read the actor's role inside the transaction
          //     rather than trusting `ctx.workspaceMember` /
          //     `ctx.effectivePermissions` — those are request-snapshot
          //     state and may be stale relative to the locked DB rows.
          const actorRoleRow = await tx.workspaceMember.findFirst({
            where: { id: actorMemberId, workspaceId },
            select: {
              role: { select: { id: true, isSystem: true } },
            },
          });
          if (actorRoleRow && !actorRoleRow.role.isSystem) {
            await tx.$queryRaw`
              SELECT id FROM "Role"
              WHERE id = ${actorRoleRow.role.id}
                AND "workspaceId" = ${workspaceId}
                AND "isSystem" = false
              FOR UPDATE
            `;
          }

          // 3b. Lock the target Role row (custom only — built-ins
          //     are immutable and don't race). Coordinates with
          //     `setPermissions` / `delete` so we never read a
          //     mid-mutation permission snapshot.
          if (!targetIdentity.isSystem) {
            await tx.$queryRaw`
              SELECT id FROM "Role"
              WHERE id = ${targetIdentity.id}
                AND "workspaceId" = ${workspaceId}
                AND "isSystem" = false
              FOR UPDATE
            `;
          }

          // For built-in targets, `assertCanGrantCustomRole` is still
          // correct: built-in's effective permissions are the catalog
          // set under null scope. The actor must hold all of those.
          if (targetIdentity.isSystem && targetIdentity.builtinKey) {
            // Built-in targets: use the catalog as the candidate
            // permission set (null scope for each).
            const builtinPerms = permissionsForRole(targetIdentity.builtinKey);
            await assertCanGrantCustomRole(
              tx,
              actorMemberId,
              builtinPerms.map((key) => ({ key, scope: null }))
            );
          } else {
            // Custom target — re-read permissions under the Role lock
            // so the authority check sees a consistent post-lock state.
            const targetPermissions = await tx.rolePermission.findMany({
              where: { roleId: targetIdentity.id },
              select: { permissionKey: true, scopeJson: true },
            });
            await assertCanGrantCustomRole(
              tx,
              actorMemberId,
              targetPermissions.map((rp) => ({
                key: rp.permissionKey as WorkspacePermission,
                scope: rp.scopeJson as ScopeJson | null,
              }))
            );
          }

          // 4. Load + lock the affected members in sorted order.
          //    Each row is locked individually via FOR UPDATE.
          const placeholders = sortedMemberIds
            .map((_, i) => `$${i + 1}`)
            .join(",");
          await tx.$queryRawUnsafe(
            `SELECT id FROM "WorkspaceMember" WHERE id IN (${placeholders}) AND "workspaceId" = $${sortedMemberIds.length + 1} ORDER BY id ASC FOR UPDATE`,
            ...sortedMemberIds,
            workspaceId
          );

          const affectedBefore = await tx.workspaceMember.findMany({
            where: { id: { in: sortedMemberIds }, workspaceId },
            select: {
              id: true,
              userId: true,
              role: { select: { id: true, builtinKey: true } },
            },
          });
          if (affectedBefore.length !== sortedMemberIds.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: te(ctx.locale, "role.memberNotInWorkspace"),
            });
          }

          // 5. Last-OWNER guard: if any OWNER is being demoted (i.e.
          //    moved off the OWNER built-in), assert that at least
          //    one OWNER remains AFTER the entire bulk is applied.
          //    Per-OWNER iteration is unsound — N concurrent demotions
          //    each see N-1 remaining and all pass, leaving zero.
          // Identifying built-in role-row tags (not a permission/tier
          // comparison) — see deletion helper above for context.

          const OWNER_BUILTIN_KEY = WorkspaceRole.OWNER;
          const owners = affectedBefore.filter(
            (m) => m.role.builtinKey === OWNER_BUILTIN_KEY
          );
          const movingOwnersOff =
            !(
              targetIdentity.isSystem &&
              targetIdentity.builtinKey === OWNER_BUILTIN_KEY
            ) && owners.length > 0;
          if (movingOwnersOff) {
            await assertWorkspaceWillKeepOwner(tx, {
              workspaceId,
              affectedMemberIds: owners.map((o) => o.id),
            });
          }

          // 6. Apply.
          await tx.workspaceMember.updateMany({
            where: { id: { in: sortedMemberIds }, workspaceId },
            data: { roleId: targetIdentity.id },
          });

          return {
            targetRole: {
              id: targetIdentity.id,
              name: targetIdentity.name,
              isSystem: targetIdentity.isSystem,
            },
            affected: affectedBefore.map((m) => ({
              memberId: m.id,
              userId: m.userId,
              previousRoleId: m.role.id,
              previousBuiltinKey: m.role.builtinKey,
            })),
          };
        }, SERIALIZABLE_TX)
      );

      invalidateRoleCache(result.targetRole.id);

      void recordFromContext(ctx, {
        action: "workspace.role.assigned",
        category: "workspace",
        entityType: "role",
        entityId: result.targetRole.id,
        entityLabel: result.targetRole.name,
        metadata: {
          targetIsSystem: result.targetRole.isSystem,
          affected: result.affected,
        },
      });

      return {
        targetRoleId: result.targetRole.id,
        assignedCount: result.affected.length,
      };
    }),
});
