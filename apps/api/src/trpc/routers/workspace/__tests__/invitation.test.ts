import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockInvitationFindMany = vi.fn();
const mockInvitationFindFirst = vi.fn();
const mockInvitationCreate = vi.fn();
const mockInvitationDelete = vi.fn();
const mockWorkspaceMemberCount = vi.fn();
const mockWorkspaceMemberFindFirst = vi.fn();
const mockSubscriptionFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
    },
    workspace: {
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
    },
    invitation: {
      findMany: (...a: unknown[]) => mockInvitationFindMany(...a),
      findFirst: (...a: unknown[]) => mockInvitationFindFirst(...a),
      create: (...a: unknown[]) => mockInvitationCreate(...a),
      delete: (...a: unknown[]) => mockInvitationDelete(...a),
    },
    workspaceMember: {
      count: (...a: unknown[]) => mockWorkspaceMemberCount(...a),
      findFirst: (...a: unknown[]) => mockWorkspaceMemberFindFirst(...a),
    },
    subscription: {
      findUnique: (...a: unknown[]) => mockSubscriptionFindUnique(...a),
    },
  },
}));

vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => false,
  isCloudMode: () => true,
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/trpc/middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/services/plan/plan.service", () => ({
  getUserPlan: vi.fn(),
  validateUserInvitation: vi.fn(),
  getPlanFeatures: vi.fn().mockReturnValue({ maxMembers: 5 }),
  canUserAddWorkspaceWithCount: vi.fn().mockReturnValue(true),
  validateWorkspaceCreation: vi.fn(),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/core/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
  getLicensePayload: vi.fn(),
  invalidateLicenseCache: vi.fn(),
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
  getUserWorkspaceRole: vi.fn().mockResolvedValue("ADMIN"),
}));

vi.mock("@/services/email/core-email.service", () => ({
  CoreEmailService: {
    loadEffectiveConfig: vi.fn().mockResolvedValue({ enabled: false }),
  },
}));

vi.mock("@/services/email/email.service", () => ({
  EmailService: {
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/encryption.service", () => ({
  EncryptionService: {
    generateEncryptionKey: vi.fn().mockReturnValue("test-token-123"),
  },
}));

vi.mock("@/core/utils", () => ({
  formatInvitedBy: vi.fn((u) => u),
  getUserDisplayName: vi.fn().mockReturnValue("Admin User"),
}));

// Import after mocks
const { invitationRouter } = await import("../invitation");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
      workspace: { findUnique: mockWorkspaceFindUnique },
      invitation: {
        findMany: mockInvitationFindMany,
        findFirst: mockInvitationFindFirst,
        create: mockInvitationCreate,
        delete: mockInvitationDelete,
      },
      workspaceMember: {
        count: mockWorkspaceMemberCount,
        findFirst: mockWorkspaceMemberFindFirst,
      },
      subscription: { findUnique: mockSubscriptionFindUnique },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    req: {},
    ...overrides,
  };
}

const mockInvitation = {
  id: "inv-1",
  email: "invite@example.com",
  role: "MEMBER",
  token: "test-token-123",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date("2024-01-01"),
  invitedBy: {
    id: "user-1",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
  },
};

const mockWorkspace = {
  id: "ws-1",
  name: "Test Workspace",
  ownerId: "user-1",
};

// --- getInvitations ---

describe("invitationRouter.getInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns formatted pending invitations", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockInvitationFindMany.mockResolvedValue([mockInvitation]);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getInvitations();

    expect(result.invitations).toHaveLength(1);
    expect(result.invitations[0].email).toBe("invite@example.com");
    expect(typeof result.invitations[0].expiresAt).toBe("string");
    expect(typeof result.invitations[0].createdAt).toBe("string");
  });

  it("returns empty array when no invitations exist", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockInvitationFindMany.mockResolvedValue([]);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getInvitations();

    expect(result.invitations).toHaveLength(0);
  });

  it("throws FORBIDDEN when user has no workspaceId in DB", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: null });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(caller.getInvitations()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(mockInvitationFindMany).not.toHaveBeenCalled();
  });

  it("reads workspaceId fresh from DB, not from session", async () => {
    // Session has "ws-1" but DB returns "ws-fresh"
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-fresh" });
    mockInvitationFindMany.mockResolvedValue([]);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await caller.getInvitations();

    expect(mockInvitationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-fresh" }),
      })
    );
  });
});

// --- sendInvitation ---

describe("invitationRouter.sendInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates invitation successfully", async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ workspaceId: "ws-1" }) // fresh user lookup
      .mockResolvedValueOnce(null); // existing user check (none)
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
    mockWorkspaceMemberCount.mockResolvedValue(1);
    mockSubscriptionFindUnique.mockResolvedValue({ plan: "FREE" });
    mockInvitationFindFirst.mockResolvedValue(null); // no existing invitation
    mockInvitationCreate.mockResolvedValue({
      ...mockInvitation,
      workspaceId: "ws-1",
    });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.sendInvitation({
      email: "invite@example.com",
      role: "MEMBER",
    });

    expect(result.invitation.email).toBe("invite@example.com");
    expect(result.inviteUrl).toContain("test-token-123");
    expect(mockInvitationCreate).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when user has no workspaceId in DB", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: null });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.sendInvitation({ email: "invite@example.com", role: "MEMBER" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mockInvitationCreate).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when workspace does not exist", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockWorkspaceFindUnique.mockResolvedValue(null);
    mockWorkspaceMemberCount.mockResolvedValue(0);
    mockSubscriptionFindUnique.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.sendInvitation({ email: "invite@example.com", role: "MEMBER" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when invitation already pending for that email", async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ workspaceId: "ws-1" })
      .mockResolvedValueOnce(null);
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
    mockWorkspaceMemberCount.mockResolvedValue(1);
    mockSubscriptionFindUnique.mockResolvedValue({ plan: "FREE" });
    mockInvitationFindFirst.mockResolvedValue(mockInvitation); // existing pending

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.sendInvitation({ email: "invite@example.com", role: "MEMBER" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mockInvitationCreate).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when user is already a workspace member", async () => {
    const existingUser = { id: "existing-user", email: "invite@example.com" };

    mockUserFindUnique
      .mockResolvedValueOnce({ workspaceId: "ws-1" }) // fresh lookup
      .mockResolvedValueOnce(existingUser); // user already exists
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
    mockWorkspaceMemberCount.mockResolvedValue(1);
    mockSubscriptionFindUnique.mockResolvedValue({ plan: "FREE" });
    mockInvitationFindFirst.mockResolvedValue(null); // no pending invitation
    mockWorkspaceMemberFindFirst.mockResolvedValue({ id: "member-1" }); // already a member

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.sendInvitation({ email: "invite@example.com", role: "MEMBER" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mockInvitationCreate).not.toHaveBeenCalled();
  });

  it("creates invitation when existing user is NOT a member", async () => {
    const existingUser = { id: "existing-user", email: "invite@example.com" };

    mockUserFindUnique
      .mockResolvedValueOnce({ workspaceId: "ws-1" })
      .mockResolvedValueOnce(existingUser);
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
    mockWorkspaceMemberCount.mockResolvedValue(1);
    mockSubscriptionFindUnique.mockResolvedValue({ plan: "FREE" });
    mockInvitationFindFirst.mockResolvedValue(null);
    mockWorkspaceMemberFindFirst.mockResolvedValue(null); // NOT a member
    mockInvitationCreate.mockResolvedValue({
      ...mockInvitation,
      email: "invite@example.com",
    });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.sendInvitation({
      email: "invite@example.com",
      role: "MEMBER",
    });

    expect(result.invitation.email).toBe("invite@example.com");
    expect(mockInvitationCreate).toHaveBeenCalledOnce();
  });

  it("sets emailSent=false when email is disabled", async () => {
    const { CoreEmailService } =
      await import("@/services/email/core-email.service");
    vi.mocked(CoreEmailService.loadEffectiveConfig).mockResolvedValue({
      enabled: false,
    } as never);

    mockUserFindUnique
      .mockResolvedValueOnce({ workspaceId: "ws-1" })
      .mockResolvedValueOnce(null);
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
    mockWorkspaceMemberCount.mockResolvedValue(1);
    mockSubscriptionFindUnique.mockResolvedValue({ plan: "FREE" });
    mockInvitationFindFirst.mockResolvedValue(null);
    mockInvitationCreate.mockResolvedValue(mockInvitation);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.sendInvitation({
      email: "invite@example.com",
      role: "MEMBER",
    });

    expect(result.emailSent).toBe(false);
  });
});

// --- revokeInvitation ---

describe("invitationRouter.revokeInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes invitation successfully", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockInvitationDelete.mockResolvedValue(mockInvitation);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.revokeInvitation({ invitationId: "inv-1" });

    expect(result.message).toBe("Invitation revoked successfully");
    expect(mockInvitationDelete).toHaveBeenCalledWith({
      where: { id: "inv-1" },
    });
  });

  it("throws FORBIDDEN when user has no workspaceId in DB", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: null });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.revokeInvitation({ invitationId: "inv-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mockInvitationDelete).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when invitation does not exist", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.revokeInvitation({ invitationId: "inv-999" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockInvitationDelete).not.toHaveBeenCalled();
  });

  it("looks up invitation by workspaceId to prevent cross-workspace revocation", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.revokeInvitation({ invitationId: "inv-1" })
    ).rejects.toThrow(TRPCError);

    expect(mockInvitationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-1" }),
      })
    );
  });
});
