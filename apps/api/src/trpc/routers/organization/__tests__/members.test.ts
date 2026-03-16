import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEnsureWorkspaceMember = vi.fn();
const mockGetUserWorkspaceRole = vi.fn();

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: (...a: unknown[]) => mockEnsureWorkspaceMember(...a),
  getUserWorkspaceRole: (...a: unknown[]) => mockGetUserWorkspaceRole(...a),
}));

const mockOrgMemberFindFirst = vi.fn();
const mockOrgMemberFindUnique = vi.fn();
const mockOrgMemberFindMany = vi.fn();
const mockOrgMemberCreate = vi.fn();
const mockOrgMemberCount = vi.fn();
const mockOrgMemberDelete = vi.fn();
const mockOrgMemberUpdate = vi.fn();
const mockOrgInvitationFindUnique = vi.fn();
const mockOrgInvitationFindMany = vi.fn();
const mockOrgInvitationUpsert = vi.fn();
const mockOrgInvitationUpdate = vi.fn();
const mockOrgInvitationCount = vi.fn();
const mockOrgInvitationDelete = vi.fn();
const mockWorkspaceFindMany = vi.fn();
const mockWorkspaceFindFirst = vi.fn();
const mockWorkspaceMemberFindMany = vi.fn();
const mockWorkspaceMemberDeleteMany = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockUserUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/services/email/core-email.service", () => ({
  CoreEmailService: {
    loadEffectiveConfig: vi.fn().mockResolvedValue({ enabled: false }),
  },
}));

vi.mock("@/services/email/email.service", () => ({
  EmailService: { sendOrgInvitationEmail: vi.fn() },
}));

vi.mock("@/services/encryption.service", () => ({
  EncryptionService: { generateEncryptionKey: () => "test-token-123" },
}));

vi.mock("@/services/plan/plan.service", () => ({
  getOrgPlan: vi.fn().mockResolvedValue("ENTERPRISE"),
  validateUserInvitation: vi.fn(),
}));

vi.mock("../../../middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/i18n", () => ({
  te: (_locale: string, key: string) => key,
}));

vi.mock("@/config", () => ({
  emailConfig: { frontendUrl: "https://app.test.com" },
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

const { membersRouter } = await import("../members");
const { applyWorkspaceAssignments } =
  await import("@/core/org-invitation-accept");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      organizationMember: {
        findFirst: mockOrgMemberFindFirst,
        findUnique: mockOrgMemberFindUnique,
        findMany: mockOrgMemberFindMany,
        create: mockOrgMemberCreate,
        count: mockOrgMemberCount,
        delete: mockOrgMemberDelete,
        update: mockOrgMemberUpdate,
      },
      organizationInvitation: {
        findUnique: mockOrgInvitationFindUnique,
        findMany: mockOrgInvitationFindMany,
        upsert: mockOrgInvitationUpsert,
        update: mockOrgInvitationUpdate,
        count: mockOrgInvitationCount,
        delete: mockOrgInvitationDelete,
      },
      workspace: {
        findMany: mockWorkspaceFindMany,
        findFirst: mockWorkspaceFindFirst,
      },
      workspaceMember: {
        findMany: mockWorkspaceMemberFindMany,
        deleteMany: mockWorkspaceMemberDeleteMany,
      },
      user: {
        findUnique: mockUserFindUnique,
        updateMany: mockUserUpdateMany,
        update: mockUserUpdate,
      },
      organization: {
        findUnique: vi.fn().mockResolvedValue({ name: "Test Org" }),
      },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      isActive: true,
      workspaceId: "ws-1",
      firstName: "Admin",
      lastName: "User",
    },
    workspaceId: "ws-1",
    req: {},
    locale: "en",
    ...overrides,
  };
}

/** Set up requireOrgAdmin to succeed by default (OWNER). */
function setupOrgAdmin(organizationId = "org-1", role = "OWNER") {
  mockOrgMemberFindFirst.mockResolvedValue({ organizationId, role });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("applyWorkspaceAssignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns user to ALL org workspaces as MEMBER when assignments array is empty", async () => {
    const mockTx = {
      workspace: {
        findMany: vi.fn().mockResolvedValue([{ id: "ws-1" }, { id: "ws-2" }]),
      },
    };

    const result = await applyWorkspaceAssignments(
      mockTx as never,
      "user-1",
      "org-1",
      []
    );

    expect(mockTx.workspace.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    expect(mockEnsureWorkspaceMember).toHaveBeenCalledTimes(2);
    expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
      "user-1",
      "ws-1",
      "MEMBER",
      mockTx
    );
    expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
      "user-1",
      "ws-2",
      "MEMBER",
      mockTx
    );
    expect(result).toBe("ws-1");
  });

  it("assigns user to specific workspaces with given roles", async () => {
    const mockTx = {
      workspace: {
        findMany: vi.fn().mockResolvedValue([{ id: "ws-1" }, { id: "ws-2" }]),
      },
    };

    const result = await applyWorkspaceAssignments(
      mockTx as never,
      "user-1",
      "org-1",
      [
        { workspaceId: "ws-1", role: "ADMIN" },
        { workspaceId: "ws-2", role: "READONLY" },
      ]
    );

    expect(mockTx.workspace.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["ws-1", "ws-2"] },
        organizationId: "org-1",
      },
      select: { id: true },
    });
    expect(mockEnsureWorkspaceMember).toHaveBeenCalledTimes(2);
    expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
      "user-1",
      "ws-1",
      "ADMIN",
      mockTx
    );
    expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
      "user-1",
      "ws-2",
      "READONLY",
      mockTx
    );
    expect(result).toBe("ws-1");
  });

  it("skips stale workspace IDs not found in org", async () => {
    const mockTx = {
      workspace: {
        findMany: vi.fn().mockResolvedValue([{ id: "ws-2" }]),
      },
    };

    const result = await applyWorkspaceAssignments(
      mockTx as never,
      "user-1",
      "org-1",
      [
        { workspaceId: "ws-stale", role: "ADMIN" },
        { workspaceId: "ws-2", role: "MEMBER" },
      ]
    );

    expect(mockEnsureWorkspaceMember).toHaveBeenCalledTimes(1);
    expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
      "user-1",
      "ws-2",
      "MEMBER",
      mockTx
    );
    expect(result).toBe("ws-2");
  });

  it("treats invalid JSON in rawAssignments as empty (falls back to all workspaces)", async () => {
    const mockTx = {
      workspace: {
        findMany: vi.fn().mockResolvedValue([{ id: "ws-1" }]),
      },
    };

    const result = await applyWorkspaceAssignments(
      mockTx as never,
      "user-1",
      "org-1",
      "not-a-valid-array"
    );

    // Should fall back to all org workspaces
    expect(mockTx.workspace.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
      "user-1",
      "ws-1",
      "MEMBER",
      mockTx
    );
    expect(result).toBe("ws-1");
  });

  it("returns null when no workspaces exist", async () => {
    const mockTx = {
      workspace: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await applyWorkspaceAssignments(
      mockTx as never,
      "user-1",
      "org-1",
      []
    );

    expect(result).toBeNull();
  });
});

describe("membersRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── invite ───────────────────────────────────────────────────────────────

  describe("invite", () => {
    it("creates invitation with empty workspaceAssignments", async () => {
      setupOrgAdmin();
      mockOrgMemberCount.mockResolvedValue(3);
      mockOrgInvitationCount.mockResolvedValue(0);
      mockUserFindUnique.mockResolvedValue(null);
      mockOrgInvitationUpsert.mockResolvedValue({
        id: "inv-1",
        email: "new@test.com",
        role: "MEMBER",
        expiresAt: new Date("2030-01-01"),
      });

      const ctx = makeCtx();
      const caller = membersRouter.createCaller(ctx as never);
      const result = await caller.invite({
        email: "new@test.com",
        role: "MEMBER",
        workspaceAssignments: [],
      });

      expect(result.invitation.email).toBe("new@test.com");
      expect(mockOrgInvitationUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            workspaceAssignments: [],
          }),
        })
      );
    });

    it("creates invitation with valid workspace assignments", async () => {
      setupOrgAdmin();
      mockOrgMemberCount.mockResolvedValue(3);
      mockOrgInvitationCount.mockResolvedValue(0);
      mockWorkspaceFindMany.mockResolvedValue([{ id: "ws-1" }, { id: "ws-2" }]);
      mockGetUserWorkspaceRole.mockResolvedValue("ADMIN");
      mockUserFindUnique.mockResolvedValue(null);
      mockOrgInvitationUpsert.mockResolvedValue({
        id: "inv-1",
        email: "new@test.com",
        role: "ADMIN",
        expiresAt: new Date("2030-01-01"),
      });

      const ctx = makeCtx();
      const caller = membersRouter.createCaller(ctx as never);
      const result = await caller.invite({
        email: "new@test.com",
        role: "ADMIN",
        workspaceAssignments: [
          { workspaceId: "ws-1", role: "ADMIN" },
          { workspaceId: "ws-2", role: "READONLY" },
        ],
      });

      expect(result.invitation.email).toBe("new@test.com");
      expect(mockOrgInvitationUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            workspaceAssignments: [
              { workspaceId: "ws-1", role: "ADMIN" },
              { workspaceId: "ws-2", role: "READONLY" },
            ],
          }),
        })
      );
    });

    it("throws BAD_REQUEST when workspace ID does not belong to org", async () => {
      setupOrgAdmin();
      mockOrgMemberCount.mockResolvedValue(3);
      mockOrgInvitationCount.mockResolvedValue(0);
      // Return empty — no matching workspace in org
      mockWorkspaceFindMany.mockResolvedValue([]);

      const ctx = makeCtx();
      const caller = membersRouter.createCaller(ctx as never);

      await expect(
        caller.invite({
          email: "new@test.com",
          role: "MEMBER",
          workspaceAssignments: [{ workspaceId: "ws-unknown", role: "MEMBER" }],
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.invite({
          email: "new@test.com",
          role: "MEMBER",
          workspaceAssignments: [{ workspaceId: "ws-unknown", role: "MEMBER" }],
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("throws FORBIDDEN when inviter is not ADMIN in target workspace", async () => {
      setupOrgAdmin();
      mockOrgMemberCount.mockResolvedValue(3);
      mockOrgInvitationCount.mockResolvedValue(0);
      mockWorkspaceFindMany.mockResolvedValue([{ id: "ws-1" }]);
      // Inviter is only MEMBER, not ADMIN
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const ctx = makeCtx();
      const caller = membersRouter.createCaller(ctx as never);

      await expect(
        caller.invite({
          email: "new@test.com",
          role: "MEMBER",
          workspaceAssignments: [{ workspaceId: "ws-1", role: "MEMBER" }],
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  // ─── acceptInvitation ─────────────────────────────────────────────────────

  describe("acceptInvitation", () => {
    it("assigns user to ALL org workspaces when invitation has empty assignments", async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockOrgInvitationFindUnique.mockResolvedValue({
        id: "inv-1",
        email: "admin@test.com",
        organizationId: "org-1",
        role: "MEMBER",
        acceptedAt: null,
        expiresAt: futureDate,
        workspaceAssignments: [],
      });
      mockOrgMemberFindUnique.mockResolvedValue(null);

      // The $transaction mock needs to execute the callback
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          organizationInvitation: { update: vi.fn() },
          organizationMember: { create: vi.fn() },
          workspace: {
            findMany: vi
              .fn()
              .mockResolvedValue([{ id: "ws-1" }, { id: "ws-2" }]),
          },
          user: { update: vi.fn() },
        })
      );

      const ctx = makeCtx({ user: { ...makeCtx().user, workspaceId: null } });
      const caller = membersRouter.createCaller(ctx as never);
      const result = await caller.acceptInvitation({ invitationId: "inv-1" });

      expect(result.success).toBe(true);
      // applyWorkspaceAssignments is called with empty assignments
      // which falls back to all org workspaces as MEMBER
      expect(mockEnsureWorkspaceMember).toHaveBeenCalledTimes(2);
      expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
        "admin-1",
        "ws-1",
        "MEMBER",
        expect.anything()
      );
    });

    it("assigns user to specific workspaces from invitation assignments", async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockOrgInvitationFindUnique.mockResolvedValue({
        id: "inv-1",
        email: "admin@test.com",
        organizationId: "org-1",
        role: "ADMIN",
        acceptedAt: null,
        expiresAt: futureDate,
        workspaceAssignments: [
          { workspaceId: "ws-1", role: "ADMIN" },
          { workspaceId: "ws-2", role: "READONLY" },
        ],
      });
      mockOrgMemberFindUnique.mockResolvedValue(null);

      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          organizationInvitation: { update: vi.fn() },
          organizationMember: { create: vi.fn() },
          workspace: {
            findMany: vi
              .fn()
              .mockResolvedValue([{ id: "ws-1" }, { id: "ws-2" }]),
          },
          user: { update: vi.fn() },
        })
      );

      const ctx = makeCtx();
      const caller = membersRouter.createCaller(ctx as never);
      const result = await caller.acceptInvitation({ invitationId: "inv-1" });

      expect(result.success).toBe(true);
      expect(mockEnsureWorkspaceMember).toHaveBeenCalledTimes(2);
      expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
        "admin-1",
        "ws-1",
        "ADMIN",
        expect.anything()
      );
      expect(mockEnsureWorkspaceMember).toHaveBeenCalledWith(
        "admin-1",
        "ws-2",
        "READONLY",
        expect.anything()
      );
    });
  });

  // ─── removeFromWorkspace ──────────────────────────────────────────────────

  describe("removeFromWorkspace", () => {
    it("removes workspace member and clears active workspace", async () => {
      setupOrgAdmin();
      mockWorkspaceFindFirst.mockResolvedValue({
        id: "ws-1",
        organizationId: "org-1",
      });
      mockWorkspaceMemberDeleteMany.mockResolvedValue({ count: 1 });
      mockUserUpdateMany.mockResolvedValue({ count: 1 });

      const ctx = makeCtx();
      const caller = membersRouter.createCaller(ctx as never);
      const result = await caller.removeFromWorkspace({
        userId: "user-2",
        workspaceId: "ws-1",
      });

      expect(result.success).toBe(true);
      expect(mockWorkspaceMemberDeleteMany).toHaveBeenCalledWith({
        where: { userId: "user-2", workspaceId: "ws-1" },
      });
      expect(mockUserUpdateMany).toHaveBeenCalledWith({
        where: { id: "user-2", workspaceId: "ws-1" },
        data: { workspaceId: null },
      });
    });

    it("throws NOT_FOUND when workspace is not in org", async () => {
      setupOrgAdmin();
      mockWorkspaceFindFirst.mockResolvedValue(null);

      const ctx = makeCtx();
      const caller = membersRouter.createCaller(ctx as never);

      await expect(
        caller.removeFromWorkspace({
          userId: "user-2",
          workspaceId: "ws-unknown",
        })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  // ─── listOrgMembersNotInWorkspace ─────────────────────────────────────────

  describe("listOrgMembersNotInWorkspace", () => {
    it("returns only org members NOT in the specified workspace", async () => {
      setupOrgAdmin();
      mockWorkspaceFindFirst.mockResolvedValue({
        id: "ws-1",
        organizationId: "org-1",
      });
      mockOrgMemberFindMany.mockResolvedValue([
        {
          role: "ADMIN",
          user: {
            id: "user-1",
            email: "a@test.com",
            firstName: "A",
            lastName: "User",
            image: null,
          },
        },
        {
          role: "MEMBER",
          user: {
            id: "user-2",
            email: "b@test.com",
            firstName: "B",
            lastName: "User",
            image: null,
          },
        },
        {
          role: "MEMBER",
          user: {
            id: "user-3",
            email: "c@test.com",
            firstName: "C",
            lastName: "User",
            image: null,
          },
        },
      ]);
      // user-1 and user-3 are already in the workspace
      mockWorkspaceMemberFindMany.mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-3" },
      ]);

      const ctx = makeCtx();
      const caller = membersRouter.createCaller(ctx as never);
      const result = await caller.listOrgMembersNotInWorkspace({
        workspaceId: "ws-1",
      });

      expect(result.members).toHaveLength(1);
      expect(result.members[0].userId).toBe("user-2");
      expect(result.members[0].email).toBe("b@test.com");
      expect(result.members[0].orgRole).toBe("MEMBER");
    });
  });
});
