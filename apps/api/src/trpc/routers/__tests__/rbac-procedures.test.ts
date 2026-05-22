/**
 * Wire-contract test for RBAC error `cause` codes.
 *
 * The pure-function invariants (assertCanGrantRole, assertWorkspaceWillKeepOwner,
 * assertInviterStillGrantable) are tested in auth/__tests__/workspace-roles.test.ts.
 * The full route-level invariants of `workspace.role.assignRole` (anti-escalation,
 * last-OWNER, no-op short-circuit, NOT_FOUND) ride on those pure functions and
 * the dedicated assignRole coverage there.
 *
 * This file pins the wire shape: the `cause.code` discriminators that the
 * frontend reads off `err.data.cause` (lifted by errorFormatter via
 * `PROPAGATED_CAUSE_CODES`).
 */

import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { assertCanGrantRole, assertWorkspaceWillKeepOwner } =
  await import("@/auth/workspace-roles");
const { WorkspaceRole } = await import("@/generated/prisma/client");

describe("RBAC error cause codes (wire-contract coherence)", () => {
  it("assertCanGrantRole attaches WORKSPACE_PERMISSION cause code", () => {
    try {
      assertCanGrantRole(WorkspaceRole.MEMBER, WorkspaceRole.ADMIN);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError & { cause: { code: string } }).cause.code).toBe(
        "WORKSPACE_PERMISSION"
      );
      return;
    }
    throw new Error("expected throw");
  });

  it("assertWorkspaceWillKeepOwner attaches LAST_OWNER_BLOCKED cause code", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      workspaceMember: { count: vi.fn().mockResolvedValue(0) },
    } as unknown as Parameters<typeof assertWorkspaceWillKeepOwner>[0];
    try {
      await assertWorkspaceWillKeepOwner(tx, {
        workspaceId: "ws-1",
        affectedMemberId: "m-1",
      });
    } catch (e) {
      expect((e as TRPCError & { cause: { code: string } }).cause.code).toBe(
        "LAST_OWNER_BLOCKED"
      );
      return;
    }
    throw new Error("expected throw");
  });
});
