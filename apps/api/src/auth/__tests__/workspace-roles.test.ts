import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import {
  assertCanGrantRole,
  assertInviterStillGrantable,
  assertWorkspaceWillKeepOwner,
} from "@/auth/workspace-roles";
import { InvitationStatus, WorkspaceRole } from "@/generated/prisma/client";

describe("assertCanGrantRole — full 4×4 matrix (R-AUTHZ-3)", () => {
  const ALL: WorkspaceRole[] = [
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.READONLY,
  ];

  // [grantor, target, allowed]
  const CASES: Array<[WorkspaceRole, WorkspaceRole, boolean]> = [
    [WorkspaceRole.OWNER, WorkspaceRole.OWNER, true], // co-owner
    [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, true],
    [WorkspaceRole.OWNER, WorkspaceRole.MEMBER, true],
    [WorkspaceRole.OWNER, WorkspaceRole.READONLY, true],

    [WorkspaceRole.ADMIN, WorkspaceRole.OWNER, false],
    [WorkspaceRole.ADMIN, WorkspaceRole.ADMIN, true],
    [WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, true],
    [WorkspaceRole.ADMIN, WorkspaceRole.READONLY, true],

    [WorkspaceRole.MEMBER, WorkspaceRole.OWNER, false],
    [WorkspaceRole.MEMBER, WorkspaceRole.ADMIN, false],
    [WorkspaceRole.MEMBER, WorkspaceRole.MEMBER, false],
    [WorkspaceRole.MEMBER, WorkspaceRole.READONLY, false],

    [WorkspaceRole.READONLY, WorkspaceRole.OWNER, false],
    [WorkspaceRole.READONLY, WorkspaceRole.ADMIN, false],
    [WorkspaceRole.READONLY, WorkspaceRole.MEMBER, false],
    [WorkspaceRole.READONLY, WorkspaceRole.READONLY, false],
  ];

  it("covers every (grantor, target) pair", () => {
    expect(CASES.length).toBe(ALL.length * ALL.length);
  });

  it.each(CASES)("%s → %s = %s", (grantor, target, allowed) => {
    if (allowed) {
      expect(() => assertCanGrantRole(grantor, target)).not.toThrow();
    } else {
      expect(() => assertCanGrantRole(grantor, target)).toThrow(TRPCError);
    }
  });
});

describe("assertWorkspaceWillKeepOwner (R-AUTHZ-4)", () => {
  function buildTx(remainingOwners: number) {
    return {
      $queryRaw: vi.fn().mockResolvedValue([]),
      workspaceMember: {
        count: vi.fn().mockResolvedValue(remainingOwners),
      },
    } as unknown as Parameters<typeof assertWorkspaceWillKeepOwner>[0];
  }

  it("locks the parent Workspace row and resolves when ≥1 OWNER remains", async () => {
    const tx = buildTx(1);
    await expect(
      assertWorkspaceWillKeepOwner(tx, {
        workspaceId: "ws-1",
        affectedMemberId: "m-1",
      })
    ).resolves.toBeUndefined();
    const queryRaw = (
      tx as unknown as { $queryRaw: { mock: { calls: unknown[][] } } }
    ).$queryRaw;
    expect(queryRaw.mock.calls.length).toBe(1);
    // The lock targets the Workspace parent (not WorkspaceMember rows)
    // so concurrent demotions of two distinct OWNERs serialize.
    const fragments = queryRaw.mock
      .calls[0][0] as unknown as TemplateStringsArray;
    expect(fragments.join("")).toMatch(/Workspace/);
    expect(fragments.join("")).toMatch(/FOR UPDATE/);
  });

  it("rejects when removing the last OWNER would leave the workspace ownerless", async () => {
    const tx = buildTx(0);
    await expect(
      assertWorkspaceWillKeepOwner(tx, {
        workspaceId: "ws-1",
        affectedMemberId: "m-1",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("excludes the affected member from the remaining-owners count", async () => {
    const tx = buildTx(2);
    await assertWorkspaceWillKeepOwner(tx, {
      workspaceId: "ws-1",
      affectedMemberId: "m-self",
    });
    const countMock = (
      tx as unknown as {
        workspaceMember: { count: { mock: { calls: unknown[][] } } };
      }
    ).workspaceMember.count.mock.calls[0][0] as {
      where: { NOT: { id: { in: string[] } } };
    };
    // Helper now accepts both `affectedMemberId` (legacy single) and
    // `affectedMemberIds` (bulk); single-id callers get normalised to
    // the bulk shape internally — the count query always uses `in: […]`.
    expect(countMock.where.NOT.id.in).toEqual(["m-self"]);
  });

  it("excludes the full set of affected owners on bulk demotion (R-AUTHZ-4 bulk)", async () => {
    // Regression: the per-OWNER iteration that PR-2's `assignRole`
    // originally used would call the guard N times each excluding
    // only one ID, masking a "demote-everyone" race. The bulk shape
    // takes the full id set in a single query.
    const tx = buildTx(3);
    await assertWorkspaceWillKeepOwner(tx, {
      workspaceId: "ws-1",
      affectedMemberIds: ["o-1", "o-2"],
    });
    const countMock = (
      tx as unknown as {
        workspaceMember: { count: { mock: { calls: unknown[][] } } };
      }
    ).workspaceMember.count.mock.calls[0][0] as {
      where: { NOT: { id: { in: string[] } } };
    };
    expect(countMock.where.NOT.id.in).toEqual(["o-1", "o-2"]);
  });

  it("rejects when bulk demotion would drop OWNER count to zero", async () => {
    // 2 owners total; demoting both → 0 remaining → reject.
    const tx = buildTx(0);
    await expect(
      assertWorkspaceWillKeepOwner(tx, {
        workspaceId: "ws-1",
        affectedMemberIds: ["o-1", "o-2"],
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("assertInviterStillGrantable (R-INV-3)", () => {
  function buildTx(opts: {
    inviterRole: WorkspaceRole | null;
    revokeCount?: number;
  }) {
    return {
      workspaceMember: {
        findUnique: vi
          .fn()
          .mockResolvedValue(
            opts.inviterRole ? { role: { builtinKey: opts.inviterRole } } : null
          ),
      },
      invitation: {
        updateMany: vi.fn().mockResolvedValue({ count: opts.revokeCount ?? 1 }),
      },
    } as unknown as Parameters<typeof assertInviterStillGrantable>[0];
  }

  const baseInvitation = {
    id: "inv-1",
    invitedById: "u-inviter",
    workspaceId: "ws-1",
    role: WorkspaceRole.ADMIN,
  };

  it("resolves when the inviter is still ADMIN-grantable", async () => {
    const tx = buildTx({ inviterRole: WorkspaceRole.OWNER });
    await expect(
      assertInviterStillGrantable(tx, baseInvitation)
    ).resolves.toBeUndefined();
    const updateMany = (
      tx as unknown as {
        invitation: { updateMany: { mock: { calls: unknown[] } } };
      }
    ).invitation.updateMany;
    expect(updateMany.mock.calls.length).toBe(0);
  });

  it("auto-revokes and rejects when the inviter is no longer in the workspace", async () => {
    const tx = buildTx({ inviterRole: null });
    await expect(
      assertInviterStillGrantable(tx, baseInvitation)
    ).rejects.toThrow(TRPCError);
    const updateMany = (
      tx as unknown as {
        invitation: { updateMany: { mock: { calls: unknown[][] } } };
      }
    ).invitation.updateMany;
    expect(updateMany.mock.calls.length).toBe(1);
    const args = updateMany.mock.calls[0][0] as {
      where: { id: string; status: InvitationStatus };
      data: { status: InvitationStatus; revokedAt: Date };
    };
    // Conditional update: only flips PENDING — won't clobber a row a
    // racing accept already accepted.
    expect(args.where).toEqual({
      id: "inv-1",
      status: InvitationStatus.PENDING,
    });
    expect(args.data.status).toBe(InvitationStatus.REVOKED);
    expect(args.data.revokedAt).toBeInstanceOf(Date);
  });

  it("auto-revokes when the inviter has been demoted below grantable threshold", async () => {
    const tx = buildTx({ inviterRole: WorkspaceRole.MEMBER });
    await expect(
      assertInviterStillGrantable(tx, baseInvitation)
    ).rejects.toThrow(TRPCError);
  });

  it("attaches a discriminator cause for the frontend", async () => {
    const tx = buildTx({ inviterRole: WorkspaceRole.READONLY });
    try {
      await assertInviterStillGrantable(tx, baseInvitation);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      const cause = (e as TRPCError).cause as unknown as Record<
        string,
        unknown
      >;
      expect(cause.code).toBe("INVITER_ROLE_INSUFFICIENT");
      expect(cause.invitationId).toBe("inv-1");
      expect(cause.currentInviterRole).toEqual({
        builtinKey: WorkspaceRole.READONLY,
      });
      return;
    }
    throw new Error("expected throw");
  });
});
