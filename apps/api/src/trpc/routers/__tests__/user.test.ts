import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserFindMany = vi.fn();
const mockWorkspaceMemberFindMany = vi.fn();
const mockWorkspaceMemberCount = vi.fn();
const mockWorkspaceMemberDeleteMany = vi.fn();
const mockWorkspaceUpdate = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockInvitationFindMany = vi.fn();
const mockOrganizationMemberFindFirst = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
      findMany: (...a: unknown[]) => mockUserFindMany(...a),
    },
    workspaceMember: {
      findMany: (...a: unknown[]) => mockWorkspaceMemberFindMany(...a),
      count: (...a: unknown[]) => mockWorkspaceMemberCount(...a),
      deleteMany: (...a: unknown[]) => mockWorkspaceMemberDeleteMany(...a),
    },
    workspace: {
      update: (...a: unknown[]) => mockWorkspaceUpdate(...a),
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
    },
    invitation: {
      findMany: (...a: unknown[]) => mockInvitationFindMany(...a),
    },
    organizationMember: {
      findFirst: (...a: unknown[]) => mockOrganizationMemberFindFirst(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
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
}));

vi.mock("@/services/plan/plan.service", () => ({
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    generateVerificationToken: vi.fn().mockResolvedValue("tok-verify"),
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
    })),
  },
}));

const { userRouter } = await import("../user");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: {
        findUnique: mockUserFindUnique,
        update: mockUserUpdate,
        findMany: mockUserFindMany,
      },
      workspaceMember: {
        findMany: mockWorkspaceMemberFindMany,
        count: mockWorkspaceMemberCount,
        deleteMany: mockWorkspaceMemberDeleteMany,
      },
      workspace: {
        update: mockWorkspaceUpdate,
        findUnique: mockWorkspaceFindUnique,
      },
      invitation: { findMany: mockInvitationFindMany },
      organizationMember: { findFirst: mockOrganizationMemberFindFirst },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "admin@test.com",
      isActive: true,
      role: "ADMIN",
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    ...overrides,
  };
}

const mockUser = {
  id: "user-1",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  image: null,
  role: "ADMIN",
  workspaceId: "ws-1",
  isActive: true,
  emailVerified: true,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  googleId: null,
  pendingEmail: null,
  workspace: null,
};

// --- Tests ---

describe("userRouter.getOnboardingInfo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns hasOrganization=false when user has no org membership", async () => {
    mockOrganizationMemberFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({ onboardingCompletedAt: null });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getOnboardingInfo();

    expect(result.hasOrganization).toBe(false);
    expect(result.organizationName).toBeNull();
    expect(result.onboardingCompleted).toBe(false);
  });

  it("returns hasOrganization=true with org name", async () => {
    mockOrganizationMemberFindFirst.mockResolvedValue({
      organization: { id: "org-1", name: "Acme Corp" },
    });
    mockUserFindUnique.mockResolvedValue({ onboardingCompletedAt: new Date() });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getOnboardingInfo();

    expect(result.hasOrganization).toBe(true);
    expect(result.organizationName).toBe("Acme Corp");
    expect(result.onboardingCompleted).toBe(true);
  });
});

describe("userRouter.getProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(caller.getProfile()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns user profile with workspace", async () => {
    const workspace = {
      id: "ws-1",
      name: "Test WS",
      contactEmail: "ws@test.com",
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { users: 2, servers: 1 },
    };
    mockUserFindUnique.mockResolvedValue({ ...mockUser, workspace });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getProfile();

    expect(result.profile).toBeDefined();
    expect(result.profile.workspace?.id).toBe("ws-1");
  });
});

describe("userRouter.updateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates profile fields without email change", async () => {
    mockUserUpdate.mockResolvedValue({ ...mockUser, firstName: "Updated" });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.updateProfile({ firstName: "Updated" });

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { firstName: "Updated" },
      })
    );
    expect(result.user).toBeDefined();
  });

  it("throws BAD_REQUEST when new email is already in use", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "other-user" });

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateProfile({ email: "taken@example.com" })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("initiates email change flow when new email is free", async () => {
    mockUserFindUnique.mockResolvedValue(null); // email not taken
    mockUserUpdate.mockResolvedValue({
      ...mockUser,
      pendingEmail: "new@example.com",
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.updateProfile({ email: "new@example.com" });

    expect(result.message).toBeDefined();
  });
});

describe("userRouter.getWorkspaceUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated workspace members", async () => {
    mockWorkspaceMemberCount.mockResolvedValue(1);
    mockWorkspaceMemberFindMany.mockResolvedValue([
      {
        role: "MEMBER",
        user: {
          id: "user-2",
          email: "member@test.com",
          firstName: "Jane",
          lastName: "Doe",
          image: null,
          isActive: true,
          lastLogin: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ]);

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getWorkspaceUsers({
      workspaceId: "ws-1",
      page: 1,
      limit: 10,
    });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].email).toBe("member@test.com");
    expect(result.pagination).toBeDefined();
  });
});

describe("userRouter.getInvitations (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns invitations for workspace", async () => {
    mockInvitationFindMany.mockResolvedValue([
      { id: "inv-1", email: "u@u.com", role: "MEMBER", status: "PENDING" },
    ]);

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getInvitations({ workspaceId: "ws-1" });

    expect(result.invitations).toHaveLength(1);
    expect(mockInvitationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "ws-1",
          status: "PENDING",
        }),
      })
    );
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = userRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@u.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(
      caller.getInvitations({ workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("userRouter.getUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getUser({ id: "unknown", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns user data when found", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...mockUser,
      workspace: { id: "ws-1", name: "WS" },
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.getUser({ id: "user-1", workspaceId: "ws-1" });

    expect(result.user).toBeDefined();
    expect(result.user.workspace?.id).toBe("ws-1");
  });
});

describe("userRouter.updateUser (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateUser({ id: "unknown", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates user and returns updated profile", async () => {
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockUserUpdate.mockResolvedValue({ ...mockUser, firstName: "NewName" });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.updateUser({
      id: "user-1",
      workspaceId: "ws-1",
      firstName: "NewName",
    });

    expect(result.user).toBeDefined();
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { firstName: "NewName" },
      })
    );
  });
});

describe("userRouter.updateWorkspace (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when user has no workspaceId", async () => {
    const caller = userRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@u.com",
          isActive: true,
          role: "ADMIN",
          workspaceId: null,
        },
      }) as never
    );
    await expect(
      caller.updateWorkspace({ name: "New Name" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("updates workspace and returns serialized data", async () => {
    const ws = {
      id: "ws-1",
      name: "Updated WS",
      contactEmail: "ws@test.com",
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { users: 1, servers: 0 },
    };
    mockWorkspaceUpdate.mockResolvedValue(ws);

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.updateWorkspace({ name: "Updated WS" });

    expect(result.workspace.name).toBe("Updated WS");
    expect(typeof result.workspace.createdAt).toBe("string");
  });
});

describe("userRouter.removeFromWorkspace (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when target user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.removeFromWorkspace({ userId: "ghost", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when trying to remove self", async () => {
    const { getUserWorkspaceRole } = await import("@/core/workspace-access");
    vi.mocked(getUserWorkspaceRole).mockResolvedValue("MEMBER");
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      firstName: "Admin",
      lastName: "User",
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(
      caller.removeFromWorkspace({ userId: "user-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("removes a member from the workspace successfully", async () => {
    const { getUserWorkspaceRole } = await import("@/core/workspace-access");
    vi.mocked(getUserWorkspaceRole).mockResolvedValue("MEMBER");
    mockUserFindUnique.mockResolvedValue({
      id: "user-2",
      email: "member@test.com",
      firstName: "Jane",
      lastName: "Doe",
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        workspaceMember: { deleteMany: vi.fn() },
        user: { update: vi.fn() },
      };
      return fn(tx);
    });

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.removeFromWorkspace({
      userId: "user-2",
      workspaceId: "ws-1",
    });

    expect(result.message).toBeDefined();
    expect(result.removedUser.id).toBe("user-2");
  });
});

describe("userRouter.updateLocale", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST for unsupported locale", async () => {
    const caller = userRouter.createCaller(makeCtx() as never);
    await expect(caller.updateLocale({ locale: "xx" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("updates locale and returns it", async () => {
    mockUserUpdate.mockResolvedValue({});

    const caller = userRouter.createCaller(makeCtx() as never);
    const result = await caller.updateLocale({ locale: "en" });

    expect(result.locale).toBe("en");
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { locale: "en" },
      })
    );
  });
});
