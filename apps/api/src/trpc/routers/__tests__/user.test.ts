import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockWorkspaceMemberFindMany = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockWorkspaceUpdate = vi.fn();
const mockWorkspaceFindFirst = vi.fn();
const mockInvitationFindMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspaceMember: {
      findMany: (...a: unknown[]) => mockWorkspaceMemberFindMany(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
    workspace: {
      update: (...a: unknown[]) => mockWorkspaceUpdate(...a),
      findFirst: (...a: unknown[]) => mockWorkspaceFindFirst(...a),
    },
    invitation: {
      findMany: (...a: unknown[]) => mockInvitationFindMany(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
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

vi.mock("@/core/workspace-access", () => ({
  getUserWorkspaceRole: vi.fn().mockResolvedValue("MEMBER"),
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/plan/plan.service", () => ({
  getUserPlan: vi.fn(),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/core/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
  getLicensePayload: vi.fn(),
  invalidateLicenseCache: vi.fn(),
  requirePremiumFeature: () => (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    generateVerificationToken: vi.fn().mockResolvedValue("verify-token"),
    sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/mappers/auth", () => ({
  UserMapper: {
    toApiResponse: vi.fn((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      workspaceId: u.workspaceId,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      lastLogin: u.lastLogin?.toISOString() ?? null,
      createdAt: u.createdAt?.toISOString(),
      updatedAt: u.updatedAt?.toISOString(),
    })),
  },
}));

// Import after mocks
const { userRouter } = await import("../user");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      workspaceMember: { findMany: mockWorkspaceMemberFindMany },
      user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
      workspace: {
        update: mockWorkspaceUpdate,
        findFirst: mockWorkspaceFindFirst,
      },
      invitation: { findMany: mockInvitationFindMany },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
      role: "ADMIN",
      isActive: true,
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    req: {},
    ...overrides,
  };
}

const now = new Date("2024-01-01");

const mockUserRecord = {
  id: "user-1",
  email: "user@example.com",
  image: null,
  firstName: "Test",
  lastName: "User",
  role: "ADMIN",
  workspaceId: "ws-1",
  isActive: true,
  emailVerified: true,
  lastLogin: now,
  createdAt: now,
  updatedAt: now,
  googleId: null,
  pendingEmail: null,
  workspace: {
    id: "ws-1",
    name: "Test WS",
    contactEmail: "contact@example.com",
    logoUrl: null,
    createdAt: now,
    updatedAt: now,
    _count: { users: 5, servers: 2 },
  },
};

// --- getWorkspaceUsers ---

describe("userRouter.getWorkspaceUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns users from workspace members", async () => {
    mockWorkspaceMemberFindMany.mockResolvedValue([
      {
        role: "MEMBER",
        user: {
          id: "user-2",
          email: "member@example.com",
          image: null,
          firstName: "Member",
          lastName: "User",
          isActive: true,
          lastLogin: null,
          createdAt: now,
          updatedAt: now,
        },
      },
    ]);

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getWorkspaceUsers({ workspaceId: "ws-1" });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].email).toBe("member@example.com");
    expect(result.users[0].role).toBe("MEMBER");
    expect(result.users[0].lastLogin).toBeNull();
  });

  it("serializes lastLogin as ISO string when present", async () => {
    mockWorkspaceMemberFindMany.mockResolvedValue([
      {
        role: "ADMIN",
        user: {
          id: "user-1",
          email: "admin@example.com",
          image: null,
          firstName: "Admin",
          lastName: "User",
          isActive: true,
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        },
      },
    ]);

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getWorkspaceUsers({ workspaceId: "ws-1" });

    expect(typeof result.users[0].lastLogin).toBe("string");
    expect(typeof result.users[0].createdAt).toBe("string");
  });
});

// --- getProfile ---

describe("userRouter.getProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns profile for authenticated user", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getProfile();

    expect(result.profile.id).toBe("user-1");
    expect(result.profile.workspace?.name).toBe("Test WS");
    expect(typeof result.profile.workspace?.createdAt).toBe("string");
  });

  it("throws NOT_FOUND when user not in DB", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(caller.getProfile()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns null workspace when user has no workspace", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...mockUserRecord,
      workspace: null,
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getProfile();

    expect(result.profile.workspace).toBeNull();
  });
});

// --- updateProfile ---

describe("userRouter.updateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates profile without email change", async () => {
    mockUserUpdate.mockResolvedValue({
      ...mockUserRecord,
      firstName: "Updated",
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.updateProfile({ firstName: "Updated" });

    expect(result.user.firstName).toBe("Updated");
    expect(mockUserUpdate).toHaveBeenCalledOnce();
  });

  it("throws BAD_REQUEST when new email is already taken", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "other-user" }); // email taken

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateProfile({ email: "taken@example.com" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// --- getInvitations ---

describe("userRouter.getInvitations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns pending invitations", async () => {
    mockInvitationFindMany.mockResolvedValue([
      {
        id: "inv-1",
        email: "invited@example.com",
        role: "MEMBER",
        status: "PENDING",
        workspaceId: "ws-1",
        invitedBy: {
          id: "admin-1",
          email: "admin@example.com",
          firstName: "Admin",
          lastName: "User",
        },
      },
    ]);

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getInvitations({ workspaceId: "ws-1" });

    expect(result.invitations).toHaveLength(1);
    expect(result.invitations[0].email).toBe("invited@example.com");
  });
});

// --- updateWorkspace ---

describe("userRouter.updateWorkspace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates workspace successfully", async () => {
    mockWorkspaceUpdate.mockResolvedValue({
      id: "ws-1",
      name: "New Name",
      contactEmail: "new@example.com",
      logoUrl: null,
      createdAt: now,
      updatedAt: now,
      _count: { users: 5, servers: 2 },
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.updateWorkspace({ name: "New Name" });

    expect(result.workspace.name).toBe("New Name");
    expect(typeof result.workspace.createdAt).toBe("string");
  });

  it("throws BAD_REQUEST when user has no workspaceId", async () => {
    const caller = userRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@e.com",
          role: "ADMIN",
          isActive: true,
          workspaceId: null,
        },
      }) as never
    );
    await expect(caller.updateWorkspace({ name: "New" })).rejects.toMatchObject(
      {
        code: "BAD_REQUEST",
      }
    );
  });
});

// --- removeFromWorkspace ---

describe("userRouter.removeFromWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        workspaceMember: { deleteMany: vi.fn().mockResolvedValue({}) },
        user: { update: vi.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });
  });

  it("removes user from workspace successfully", async () => {
    const { getUserWorkspaceRole } = await import("@/core/workspace-access");
    vi.mocked(getUserWorkspaceRole).mockResolvedValue("MEMBER");

    mockUserFindUnique.mockResolvedValue({
      id: "user-2",
      email: "member@example.com",
      firstName: "Member",
      lastName: "User",
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.removeFromWorkspace({
      userId: "user-2",
      workspaceId: "ws-1",
    });

    expect(result.message).toContain("removed from workspace");
    expect(result.removedUser.id).toBe("user-2");
  });

  it("throws NOT_FOUND when user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.removeFromWorkspace({
        userId: "no-such-user",
        workspaceId: "ws-1",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when removing self", async () => {
    const { getUserWorkspaceRole } = await import("@/core/workspace-access");
    vi.mocked(getUserWorkspaceRole).mockResolvedValue("ADMIN");

    mockUserFindUnique.mockResolvedValue({
      id: "user-1", // same as ctx.user.id
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.removeFromWorkspace({ userId: "user-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws FORBIDDEN when non-owner tries to remove an admin", async () => {
    const { getUserWorkspaceRole } = await import("@/core/workspace-access");
    vi.mocked(getUserWorkspaceRole).mockResolvedValue("ADMIN");

    mockUserFindUnique.mockResolvedValue({
      id: "admin-2",
      email: "admin2@example.com",
      firstName: "Admin2",
      lastName: "User",
    });

    // Workspace lookup: current user is NOT the owner
    mockWorkspaceFindFirst.mockResolvedValue(null);

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.removeFromWorkspace({ userId: "admin-2", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// --- updateLocale ---

describe("userRouter.updateLocale", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates locale successfully", async () => {
    mockUserUpdate.mockResolvedValue({});

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.updateLocale({ locale: "en" });

    expect(result.locale).toBe("en");
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { locale: "en" } })
    );
  });

  it("throws BAD_REQUEST for unsupported locale", async () => {
    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateLocale({ locale: "xx-invalid" as never })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
