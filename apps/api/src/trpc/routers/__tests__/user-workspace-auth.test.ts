import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

// Mock workspace packages that aren't resolved in worktrees
vi.mock("@qarote/i18n", () => ({
  SUPPORTED_LOCALES: ["en", "fr", "es", "zh"],
}));
vi.mock("@qarote/i18n/server", () => ({
  createServerI18nInstance: () => ({
    t: (key: string) => key,
  }),
}));

const mockWorkspaceMemberFindMany = vi.fn();
const mockWorkspaceMemberFindUnique = vi.fn();
const mockWorkspaceMemberDeleteMany = vi.fn();
const mockWorkspaceMemberUpdate = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockWorkspaceFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockInvitationFindMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: (...args: unknown[]) => mockWorkspaceFindUnique(...args),
      findFirst: (...args: unknown[]) => mockWorkspaceFindFirst(...args),
    },
    workspaceMember: {
      findMany: (...args: unknown[]) => mockWorkspaceMemberFindMany(...args),
      findUnique: (...args: unknown[]) =>
        mockWorkspaceMemberFindUnique(...args),
      deleteMany: (...args: unknown[]) =>
        mockWorkspaceMemberDeleteMany(...args),
      update: (...args: unknown[]) => mockWorkspaceMemberUpdate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    invitation: {
      findMany: (...args: unknown[]) => mockInvitationFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock rate limiter to be a passthrough
vi.mock("../../middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

// Mock plan service
vi.mock("@/services/plan/plan.service", () => ({
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

// Mock workspace middleware — hasWorkspaceAccess
const mockHasWorkspaceAccess = vi.fn().mockResolvedValue(true);
vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: (...args: unknown[]) => mockHasWorkspaceAccess(...args),
}));

// Mock workspace-access (getUserWorkspaceRole)
const mockGetUserWorkspaceRole = vi.fn();
vi.mock("@/core/workspace-access", () => ({
  getUserWorkspaceRole: (...args: unknown[]) =>
    mockGetUserWorkspaceRole(...args),
}));

// Mock UserMapper
vi.mock("@/mappers/auth", () => ({
  UserMapper: {
    toApiResponse: (u: Record<string, unknown>) => ({
      ...u,
      lastLogin: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    }),
  },
}));

// Mock email verification
vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    generateVerificationToken: vi.fn(),
    sendVerificationEmail: vi.fn(),
  },
}));

// Import after mocks
const { userRouter } = await import("../user");

// --- Helpers ---

const WORKSPACE_ID = "ws-1";

function makeAdminCtx(workspaceId = WORKSPACE_ID) {
  return {
    prisma: {
      workspaceMember: {
        findMany: mockWorkspaceMemberFindMany,
        findUnique: mockWorkspaceMemberFindUnique,
        deleteMany: mockWorkspaceMemberDeleteMany,
        update: mockWorkspaceMemberUpdate,
      },
      workspace: {
        findUnique: mockWorkspaceFindUnique,
        findFirst: mockWorkspaceFindFirst,
      },
      user: {
        findUnique: mockUserFindUnique,
        update: mockUserUpdate,
      },
      invitation: {
        findMany: mockInvitationFindMany,
      },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "admin-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
      firstName: "Admin",
      lastName: "User",
      workspaceId,
    },
    workspaceId,
    req: {},
  };
}

function makeMemberCtx(workspaceId = WORKSPACE_ID) {
  return {
    ...makeAdminCtx(workspaceId),
    user: {
      id: "member-1",
      role: "MEMBER",
      isActive: true,
      email: "member@test.com",
      firstName: "Member",
      lastName: "User",
      workspaceId,
    },
  };
}

function makeReadonlyCtx(workspaceId = WORKSPACE_ID) {
  return {
    ...makeAdminCtx(workspaceId),
    user: {
      id: "readonly-1",
      role: "READONLY",
      isActive: true,
      email: "readonly@test.com",
      firstName: "Readonly",
      lastName: "User",
      workspaceId,
    },
  };
}

// --- Tests ---

describe("userRouter workspace-scoped authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: workspace exists and user is a member
    mockHasWorkspaceAccess.mockResolvedValue(true);
  });

  describe("getInvitations", () => {
    it("allows workspace admin to get invitations", async () => {
      // getUserWorkspaceRole returns ADMIN for the workspace
      mockGetUserWorkspaceRole.mockResolvedValue("ADMIN");
      mockInvitationFindMany.mockResolvedValue([]);

      const caller = userRouter.createCaller(makeAdminCtx() as never);
      const result = await caller.getInvitations({
        workspaceId: WORKSPACE_ID,
      });

      expect(result.invitations).toEqual([]);
    });

    it("rejects workspace member (non-admin) from getting invitations", async () => {
      // getUserWorkspaceRole returns MEMBER
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const caller = userRouter.createCaller(makeMemberCtx() as never);
      await expect(
        caller.getInvitations({ workspaceId: WORKSPACE_ID })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });

    it("rejects readonly user from getting invitations", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("READONLY");

      const caller = userRouter.createCaller(makeReadonlyCtx() as never);
      await expect(
        caller.getInvitations({ workspaceId: WORKSPACE_ID })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });

    it("rejects user who is admin in different workspace", async () => {
      // User is admin globally but NOT in the target workspace
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const ctx = makeAdminCtx(WORKSPACE_ID);
      // The user's global role is ADMIN, but workspace role is MEMBER
      const caller = userRouter.createCaller(ctx as never);
      await expect(
        caller.getInvitations({ workspaceId: WORKSPACE_ID })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });
  });

  describe("updateUser", () => {
    it("allows workspace admin to update a user", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("ADMIN");
      mockUserFindUnique.mockResolvedValue({
        id: "target-user",
        email: "target@test.com",
      });
      mockHasWorkspaceAccess.mockResolvedValue(true);

      const updatedUser = {
        id: "target-user",
        email: "target@test.com",
        firstName: "Updated",
        lastName: "User",
        role: "MEMBER",
        workspaceId: WORKSPACE_ID,
        isActive: true,
        emailVerified: true,
        lastLogin: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      mockTransaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: { update: vi.fn().mockResolvedValue(updatedUser) },
            workspaceMember: {
              findUnique: vi.fn().mockResolvedValue({ role: "MEMBER" }),
              update: vi.fn(),
            },
          });
        }
      );

      const caller = userRouter.createCaller(makeAdminCtx() as never);
      const result = await caller.updateUser({
        id: "target-user",
        workspaceId: WORKSPACE_ID,
        firstName: "Updated",
      });

      expect(result.user).toBeDefined();
      expect(result.user.role).toBe("MEMBER");
    });

    it("rejects workspace member from updating a user", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const caller = userRouter.createCaller(makeMemberCtx() as never);
      await expect(
        caller.updateUser({
          id: "target-user",
          workspaceId: WORKSPACE_ID,
          firstName: "Hacked",
        })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });
  });

  describe("updateWorkspace", () => {
    it("allows workspace admin to update workspace info", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("ADMIN");

      const mockPrisma = makeAdminCtx().prisma;
      const mockWorkspaceUpdate = vi.fn().mockResolvedValue({
        id: WORKSPACE_ID,
        name: "Updated WS",
        contactEmail: "ws@test.com",
        logoUrl: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        _count: { users: 1, servers: 0 },
      });

      const ctx = {
        ...makeAdminCtx(),
        prisma: {
          ...mockPrisma,
          workspace: {
            ...mockPrisma.workspace,
            update: mockWorkspaceUpdate,
          },
        },
      };

      const caller = userRouter.createCaller(ctx as never);
      const result = await caller.updateWorkspace({ name: "Updated WS" });

      expect(result.workspace.name).toBe("Updated WS");
    });

    it("rejects workspace member from updating workspace info", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const caller = userRouter.createCaller(makeMemberCtx() as never);
      await expect(
        caller.updateWorkspace({ name: "Hacked WS" })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });
  });

  describe("removeFromWorkspace", () => {
    it("allows workspace admin to remove a member", async () => {
      mockGetUserWorkspaceRole
        .mockResolvedValueOnce("ADMIN") // for workspaceAdminProcedure check (caller)
        .mockResolvedValueOnce("MEMBER"); // for target user role check

      mockUserFindUnique.mockResolvedValue({
        id: "target-user",
        email: "target@test.com",
        firstName: "Target",
        lastName: "User",
      });

      mockTransaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            workspaceMember: {
              deleteMany: vi.fn(),
              findFirst: vi.fn().mockResolvedValue(null),
            },
            user: {
              findUnique: vi
                .fn()
                .mockResolvedValue({ workspaceId: WORKSPACE_ID }),
              update: vi.fn(),
            },
          });
        }
      );

      const caller = userRouter.createCaller(makeAdminCtx() as never);
      const result = await caller.removeFromWorkspace({
        userId: "target-user",
        workspaceId: WORKSPACE_ID,
      });

      expect(result.removedUser.id).toBe("target-user");
    });

    it("rejects workspace member from removing another user", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const caller = userRouter.createCaller(makeMemberCtx() as never);
      await expect(
        caller.removeFromWorkspace({
          userId: "admin-1",
          workspaceId: WORKSPACE_ID,
        })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });

    it("rejects readonly user from removing another user", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("READONLY");

      const caller = userRouter.createCaller(makeReadonlyCtx() as never);
      await expect(
        caller.removeFromWorkspace({
          userId: "member-1",
          workspaceId: WORKSPACE_ID,
        })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });

    it("prevents cross-workspace admin from removing users", async () => {
      // User is ADMIN in ws-other but MEMBER in ws-1
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");
      mockHasWorkspaceAccess.mockResolvedValue(true);

      const ctx = makeMemberCtx(WORKSPACE_ID);
      // Override global role to ADMIN (to prove global role doesn't matter)
      ctx.user.role = "ADMIN";

      const caller = userRouter.createCaller(ctx as never);
      await expect(
        caller.removeFromWorkspace({
          userId: "target-user",
          workspaceId: WORKSPACE_ID,
        })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });
  });

  describe("getWorkspaceUsers (unchanged - uses workspaceProcedure)", () => {
    it("allows any workspace member to list users", async () => {
      mockWorkspaceMemberFindMany.mockResolvedValue([]);
      mockHasWorkspaceAccess.mockResolvedValue(true);

      const caller = userRouter.createCaller(makeMemberCtx() as never);
      const result = await caller.getWorkspaceUsers({
        workspaceId: WORKSPACE_ID,
      });

      expect(result.users).toEqual([]);
    });
  });
});
