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

const mockWorkspaceFindUnique = vi.fn();
const mockWorkspaceMemberCount = vi.fn();
const mockWorkspaceMemberFindFirst = vi.fn();
const mockWorkspaceMemberFindUnique = vi.fn();
const mockSubscriptionFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockInvitationFindMany = vi.fn();
const mockInvitationCreate = vi.fn();
const mockInvitationFindFirst = vi.fn();
const mockInvitationDelete = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: (...args: unknown[]) => mockWorkspaceFindUnique(...args),
    },
    workspaceMember: {
      count: (...args: unknown[]) => mockWorkspaceMemberCount(...args),
      findFirst: (...args: unknown[]) => mockWorkspaceMemberFindFirst(...args),
      findUnique: (...args: unknown[]) =>
        mockWorkspaceMemberFindUnique(...args),
    },
    subscription: {
      findUnique: (...args: unknown[]) => mockSubscriptionFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    invitation: {
      findMany: (...args: unknown[]) => mockInvitationFindMany(...args),
      create: (...args: unknown[]) => mockInvitationCreate(...args),
      findFirst: (...args: unknown[]) => mockInvitationFindFirst(...args),
      delete: (...args: unknown[]) => mockInvitationDelete(...args),
    },
  },
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock rate limiter to be a passthrough
vi.mock("../../../middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

// Mock plan service
vi.mock("@/services/plan/plan.service", () => ({
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
  validateUserInvitation: vi.fn(), // no-op by default
}));

// Mock workspace middleware
vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

// Mock workspace-access (getUserWorkspaceRole)
const mockGetUserWorkspaceRole = vi.fn();
vi.mock("@/core/workspace-access", () => ({
  getUserWorkspaceRole: (...args: unknown[]) =>
    mockGetUserWorkspaceRole(...args),
}));

// Mock utils
vi.mock("@/core/utils", () => ({
  formatInvitedBy: (u: Record<string, unknown>) =>
    `${u.firstName} ${u.lastName}`,
  getUserDisplayName: (u: Record<string, unknown>) =>
    `${u.firstName} ${u.lastName}`,
}));

// Mock email and encryption services
vi.mock("@/services/email/core-email.service", () => ({
  CoreEmailService: {
    loadEffectiveConfig: vi.fn().mockResolvedValue({ enabled: false }),
  },
}));
vi.mock("@/services/email/email.service", () => ({
  EmailService: { sendInvitationEmail: vi.fn() },
}));
vi.mock("@/services/encryption.service", () => ({
  EncryptionService: {
    generateEncryptionKey: () => "mock-token-123",
  },
}));
vi.mock("@/config", () => ({
  emailConfig: { frontendUrl: "http://localhost:8080" },
}));

// Import after mocks
const { invitationRouter } = await import("../invitation");

// --- Helpers ---

const WORKSPACE_ID = "ws-1";

function makeAdminCtx() {
  return {
    prisma: {
      workspace: { findUnique: mockWorkspaceFindUnique },
      workspaceMember: {
        count: mockWorkspaceMemberCount,
        findFirst: mockWorkspaceMemberFindFirst,
        findUnique: mockWorkspaceMemberFindUnique,
      },
      subscription: { findUnique: mockSubscriptionFindUnique },
      user: { findUnique: mockUserFindUnique },
      invitation: {
        findMany: mockInvitationFindMany,
        create: mockInvitationCreate,
        findFirst: mockInvitationFindFirst,
        delete: mockInvitationDelete,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "admin-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
      firstName: "Admin",
      lastName: "User",
      workspaceId: WORKSPACE_ID,
    },
    workspaceId: WORKSPACE_ID,
    req: {},
  };
}

function makeMemberCtx() {
  return {
    ...makeAdminCtx(),
    user: {
      id: "member-1",
      role: "MEMBER",
      isActive: true,
      email: "member@test.com",
      firstName: "Member",
      lastName: "User",
      workspaceId: WORKSPACE_ID,
    },
  };
}

function makeReadonlyCtx() {
  return {
    ...makeAdminCtx(),
    user: {
      id: "readonly-1",
      role: "READONLY",
      isActive: true,
      email: "readonly@test.com",
      firstName: "Readonly",
      lastName: "User",
      workspaceId: WORKSPACE_ID,
    },
  };
}

// --- Tests ---

describe("invitationRouter workspace-scoped authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getInvitations", () => {
    it("allows workspace admin to list invitations", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("ADMIN");
      mockInvitationFindMany.mockResolvedValue([]);

      const caller = invitationRouter.createCaller(makeAdminCtx() as never);
      const result = await caller.getInvitations();

      expect(result.invitations).toEqual([]);
    });

    it("rejects workspace member from listing invitations", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const caller = invitationRouter.createCaller(makeMemberCtx() as never);
      await expect(caller.getInvitations()).rejects.toThrow(
        /workspaceAdminRequired/
      );
    });

    it("rejects readonly user from listing invitations", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("READONLY");

      const caller = invitationRouter.createCaller(makeReadonlyCtx() as never);
      await expect(caller.getInvitations()).rejects.toThrow(
        /workspaceAdminRequired/
      );
    });
  });

  describe("sendInvitation", () => {
    it("allows workspace admin to send invitation", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("ADMIN");
      mockWorkspaceFindUnique.mockResolvedValue({
        id: WORKSPACE_ID,
        name: "Test WS",
        ownerId: "admin-1",
      });
      mockWorkspaceMemberCount.mockResolvedValue(1);
      mockSubscriptionFindUnique.mockResolvedValue({ plan: "DEVELOPER" });
      mockUserFindUnique.mockResolvedValue(null); // no existing user
      mockInvitationCreate.mockResolvedValue({
        id: "inv-1",
        email: "new@test.com",
        role: "MEMBER",
        token: "mock-token-123",
        expiresAt: new Date("2025-02-01"),
        createdAt: new Date("2025-01-01"),
        invitedBy: {
          id: "admin-1",
          email: "admin@test.com",
          firstName: "Admin",
          lastName: "User",
        },
      });

      const caller = invitationRouter.createCaller(makeAdminCtx() as never);
      const result = await caller.sendInvitation({
        email: "new@test.com",
        role: "MEMBER",
      });

      expect(result.message).toBe("Invitation sent successfully");
      expect(result.inviteUrl).toContain("/invite/");
    });

    it("rejects workspace member from sending invitation", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const caller = invitationRouter.createCaller(makeMemberCtx() as never);
      await expect(
        caller.sendInvitation({ email: "new@test.com", role: "MEMBER" })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });

    it("rejects readonly user from sending invitation", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("READONLY");

      const caller = invitationRouter.createCaller(makeReadonlyCtx() as never);
      await expect(
        caller.sendInvitation({ email: "new@test.com", role: "MEMBER" })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });
  });

  describe("revokeInvitation", () => {
    it("allows workspace admin to revoke invitation", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("ADMIN");
      mockInvitationFindFirst.mockResolvedValue({
        id: "inv-1",
        workspaceId: WORKSPACE_ID,
        status: "PENDING",
      });
      mockInvitationDelete.mockResolvedValue({});

      const caller = invitationRouter.createCaller(makeAdminCtx() as never);
      const result = await caller.revokeInvitation({
        invitationId: "inv-1",
      });

      expect(result.message).toBe("Invitation revoked successfully");
    });

    it("rejects workspace member from revoking invitation", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const caller = invitationRouter.createCaller(makeMemberCtx() as never);
      await expect(
        caller.revokeInvitation({ invitationId: "inv-1" })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });

    it("rejects readonly user from revoking invitation", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("READONLY");

      const caller = invitationRouter.createCaller(makeReadonlyCtx() as never);
      await expect(
        caller.revokeInvitation({ invitationId: "inv-1" })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });
  });

  describe("privilege escalation guard", () => {
    it("admin can invite another admin (at own level)", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("ADMIN");
      mockWorkspaceFindUnique.mockResolvedValue({
        id: WORKSPACE_ID,
        name: "Test WS",
        ownerId: "admin-1",
      });
      mockWorkspaceMemberCount.mockResolvedValue(1);
      mockSubscriptionFindUnique.mockResolvedValue({ plan: "DEVELOPER" });
      mockUserFindUnique.mockResolvedValue(null);
      mockInvitationCreate.mockResolvedValue({
        id: "inv-2",
        email: "peer@test.com",
        role: "ADMIN",
        token: "mock-token-123",
        expiresAt: new Date("2025-02-01"),
        createdAt: new Date("2025-01-01"),
        invitedBy: {
          id: "admin-1",
          email: "admin@test.com",
          firstName: "Admin",
          lastName: "User",
        },
      });

      const caller = invitationRouter.createCaller(makeAdminCtx() as never);
      const result = await caller.sendInvitation({
        email: "peer@test.com",
        role: "ADMIN",
      });

      expect(result.message).toBe("Invitation sent successfully");
    });

    it("rejects OWNER role in invitation (not in INVITABLE_ROLES)", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("OWNER");

      const caller = invitationRouter.createCaller(makeAdminCtx() as never);
      await expect(
        caller.sendInvitation({ email: "new@test.com", role: "OWNER" as never })
      ).rejects.toThrow();
    });
  });

  describe("cross-workspace isolation", () => {
    it("rejects user who is globally ADMIN but not admin in target workspace", async () => {
      // Global ADMIN, but workspace role is MEMBER
      mockGetUserWorkspaceRole.mockResolvedValue("MEMBER");

      const ctx = makeMemberCtx();
      ctx.user.role = "ADMIN"; // Global admin

      const caller = invitationRouter.createCaller(ctx as never);
      await expect(
        caller.sendInvitation({ email: "new@test.com", role: "MEMBER" })
      ).rejects.toThrow(/workspaceAdminRequired/);
    });

    it("rejects user with no workspace from interacting with invitations", async () => {
      const ctx = makeAdminCtx();
      ctx.user.workspaceId = null as unknown as string;

      const caller = invitationRouter.createCaller(ctx as never);
      await expect(caller.getInvitations()).rejects.toThrow(
        /userNotAuthenticatedOrNotInWorkspace/
      );
    });
  });
});
