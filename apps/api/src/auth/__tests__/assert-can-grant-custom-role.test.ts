/**
 * Tests for `assertCanGrantCustomRole` — the "creator currently
 * holds (key, scope)" invariant (plan §4.2 / §4.4).
 *
 * The helper takes a tx + actorMemberId + candidate (key, scope)
 * list and throws FORBIDDEN if the actor doesn't hold ⊇ what the
 * candidate set requests. Tests use a hand-rolled tx mock so we can
 * pin the exact authority shape `loadEffectivePermissionsInTx`
 * returns to the helper.
 */

import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import type { WorkspacePermission } from "@/auth/permissions";
import { type ScopeJson } from "@/auth/scope-canonical";
import { assertCanGrantCustomRole } from "@/auth/workspace-roles";
import { WorkspaceRole } from "@/generated/prisma/client";

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

/**
 * Build a tx mock whose `workspaceMember.findUnique` returns the
 * pinned `role` shape and whose `rolePermission.findMany` returns
 * the pinned scopeRows. Mirrors what `loadEffectivePermissionsInTx`
 * reads.
 */
function buildTx(opts: {
  /** When `kind: "builtin"`, the role.builtinKey is set; the helper
   *  treats the actor as holding the full catalog set under null
   *  scope. */
  actor:
    | { kind: "builtin"; builtinKey: WorkspaceRole }
    | {
        kind: "custom";
        roleId: string;
        rows: Array<{ permissionKey: string; scopeJson: ScopeJson | null }>;
      }
    | null;
}) {
  const role =
    opts.actor === null
      ? null
      : opts.actor.kind === "builtin"
        ? {
            id: "role-actor-builtin",
            isSystem: true,
            builtinKey: opts.actor.builtinKey,
          }
        : {
            id: opts.actor.roleId,
            isSystem: false,
            builtinKey: null,
          };

  return {
    workspaceMember: {
      findUnique: vi
        .fn()
        .mockResolvedValue(opts.actor === null ? null : { role }),
    },
    rolePermission: {
      findMany: vi.fn().mockResolvedValue(
        opts.actor && opts.actor.kind === "custom"
          ? opts.actor.rows.map((r, i) => ({
              permissionKey: r.permissionKey,
              scopeJson: r.scopeJson,
              scopeFingerprint: `fp-${i}`,
            }))
          : []
      ),
    },
  } as unknown as Parameters<typeof assertCanGrantCustomRole>[0];
}

describe("assertCanGrantCustomRole", () => {
  it("OWNER actor (builtin) can grant any catalog key under null scope", async () => {
    const tx = buildTx({
      actor: { kind: "builtin", builtinKey: WorkspaceRole.OWNER },
    });
    await expect(
      assertCanGrantCustomRole(tx, "m-actor", [
        { key: "queue:purge" as WorkspacePermission, scope: null },
        { key: "workspace:delete" as WorkspacePermission, scope: null },
      ])
    ).resolves.toBeUndefined();
  });

  it("READONLY actor (builtin) cannot grant any write key", async () => {
    const tx = buildTx({
      actor: { kind: "builtin", builtinKey: WorkspaceRole.READONLY },
    });
    await expect(
      assertCanGrantCustomRole(tx, "m-actor", [
        { key: "queue:purge" as WorkspacePermission, scope: null },
      ])
    ).rejects.toThrow(TRPCError);
  });

  it("custom actor: cannot grant a key they don't hold", async () => {
    const tx = buildTx({
      actor: {
        kind: "custom",
        roleId: "role-custom",
        rows: [{ permissionKey: "queue:read", scopeJson: null }],
      },
    });
    await expect(
      assertCanGrantCustomRole(tx, "m-actor", [
        { key: "queue:purge" as WorkspacePermission, scope: null },
      ])
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      cause: { code: "PRIVILEGE_ESCALATION", permission: "queue:purge" },
    });
  });

  it("custom actor with staging-scoped queue:purge cannot grant unconditional", async () => {
    // The plan §4.3 keystone case: holder scoped to staging, candidate
    // unconditional. Rejected.
    const tx = buildTx({
      actor: {
        kind: "custom",
        roleId: "role-custom",
        rows: [
          {
            permissionKey: "queue:purge",
            scopeJson: { kind: "server.environment", values: ["staging"] },
          },
        ],
      },
    });
    await expect(
      assertCanGrantCustomRole(tx, "m-actor", [
        { key: "queue:purge" as WorkspacePermission, scope: null },
      ])
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      cause: { code: "PRIVILEGE_ESCALATION" },
    });
  });

  it("custom actor with staging-scoped queue:purge can grant staging-scoped", async () => {
    const tx = buildTx({
      actor: {
        kind: "custom",
        roleId: "role-custom",
        rows: [
          {
            permissionKey: "queue:purge",
            scopeJson: { kind: "server.environment", values: ["staging"] },
          },
        ],
      },
    });
    await expect(
      assertCanGrantCustomRole(tx, "m-actor", [
        {
          key: "queue:purge" as WorkspacePermission,
          scope: { kind: "server.environment", values: ["staging"] },
        },
      ])
    ).resolves.toBeUndefined();
  });

  it("custom actor: OR-across-rows for the same key (union semantics)", async () => {
    // Actor holds queue:purge in both staging and dev (two separate
    // rows). Candidate scoped to staging → admitted by the staging row.
    const tx = buildTx({
      actor: {
        kind: "custom",
        roleId: "role-custom",
        rows: [
          {
            permissionKey: "queue:purge",
            scopeJson: { kind: "server.environment", values: ["staging"] },
          },
          {
            permissionKey: "queue:purge",
            scopeJson: { kind: "server.environment", values: ["dev"] },
          },
        ],
      },
    });
    await expect(
      assertCanGrantCustomRole(tx, "m-actor", [
        {
          key: "queue:purge" as WorkspacePermission,
          scope: { kind: "server.environment", values: ["dev"] },
        },
      ])
    ).resolves.toBeUndefined();
  });

  it("missing actor membership fails closed with FORBIDDEN", async () => {
    const tx = buildTx({ actor: null });
    await expect(
      assertCanGrantCustomRole(tx, "m-missing", [
        { key: "workspace:read" as WorkspacePermission, scope: null },
      ])
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      cause: { reason: "actor_not_member" },
    });
  });

  it("empty candidate set always passes (no-op grants need no authority)", async () => {
    const tx = buildTx({
      actor: { kind: "builtin", builtinKey: WorkspaceRole.READONLY },
    });
    await expect(
      assertCanGrantCustomRole(tx, "m-actor", [])
    ).resolves.toBeUndefined();
  });
});
