import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockInvitationFindFirst = vi.fn();
const mockInvitationFindUnique = vi.fn();
const mockInvitationUpdate = vi.fn();
const mockInvitationUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockAccountFindFirst = vi.fn();
const mockAccountCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    invitation: {
      findFirst: (...a: unknown[]) => mockInvitationFindFirst(...a),
      findUnique: (...a: unknown[]) => mockInvitationFindUnique(...a),
      update: (...a: unknown[]) => mockInvitationUpdate(...a),
      updateMany: (...a: unknown[]) => mockInvitationUpdateMany(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      create: (...a: unknown[]) => mockUserCreate(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
    account: {
      findFirst: (...a: unknown[]) => mockAccountFindFirst(...a),
      create: (...a: unknown[]) => mockAccountCreate(...a),
    },
    session: { deleteMany: vi.fn().mockResolvedValue({}) },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

vi.mock("@/services/posthog", () => ({
  posthog: null,
  trackEvent: vi.fn(),
  identifyUser: vi.fn(),
}));

vi.mock("@/services/audit", () => ({
  recordFromContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/auth/workspace-roles", () => ({
  assertInviterStillGrantable: vi.fn().mockResolvedValue(undefined),
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
  getWorkspacePlan: vi.fn().mockResolvedValue("FREE"),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/core/auth", () => ({
  comparePassword: vi.fn().mockResolvedValue(true),
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/core/utils", () => ({
  formatInvitedBy: vi.fn((u) => `${u?.firstName} ${u?.lastName}`.trim()),
  getUserDisplayName: vi.fn((u) => u?.email ?? ""),
}));

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/mappers/auth", () => ({
  UserMapper: {
    toApiResponse: vi.fn((u) => ({
      ...u,
      createdAt: u?.createdAt?.toISOString?.(),
    })),
  },
}));

vi.mock("@/mappers/workspace", () => ({
  WorkspaceMapper: { toApiResponse: vi.fn((w) => w) },
}));

const { invitationRouter } = await import("../invitation");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      invitation: {
        findFirst: mockInvitationFindFirst,
        findUnique: mockInvitationFindUnique,
        update: mockInvitationUpdate,
        updateMany: mockInvitationUpdateMany,
      },
      user: {
        findUnique: mockUserFindUnique,
        create: mockUserCreate,
        update: mockUserUpdate,
      },
      account: {
        findFirst: mockAccountFindFirst,
        create: mockAccountCreate,
      },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    locale: "en",
    ...overrides,
  };
}

// --- Mock data ---

const mockWorkspace = {
  id: "ws-1",
  name: "Acme Corp",
  contactEmail: "admin@acme.com",
};

const mockInvitation = {
  id: "inv-1",
  email: "new@user.com",
  token: "tok-abc",
  status: "PENDING",
  role: "MEMBER",
  workspaceId: "ws-1",
  expiresAt: new Date(Date.now() + 86_400_000), // 24h in the future
  workspace: mockWorkspace,
  invitedBy: {
    id: "user-0",
    email: "admin@acme.com",
    firstName: "Admin",
    lastName: "User",
  },
};

const mockExistingUser = {
  id: "user-2",
  email: "new@user.com",
  passwordHash: "old-hash",
  firstName: "Jane",
  lastName: "Doe",
  role: "MEMBER",
  workspaceId: null,
  isActive: true,
  emailVerified: true,
  emailVerifiedAt: new Date(),
  lastLogin: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockNewUser = {
  id: "user-3",
  email: "new@user.com",
  passwordHash: "hashed-password",
  firstName: "John",
  lastName: "Smith",
  name: "John Smith",
  role: "MEMBER",
  workspaceId: "ws-1",
  isActive: true,
  emailVerified: true,
  emailVerifiedAt: new Date(),
  lastLogin: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// --- Tests ---

describe("invitationRouter.getInvitationDetails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when no matching pending/non-expired invitation exists", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getInvitationDetails({ token: "bad-token" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns invitation details with plan on success", async () => {
    const { getWorkspacePlan } = await import("@/services/plan/plan.service");
    vi.mocked(getWorkspacePlan).mockResolvedValue("FREE" as never);
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getInvitationDetails({ token: "tok-abc" });

    expect(result.success).toBe(true);
    expect(result.invitation.email).toBe("new@user.com");
    expect(result.invitation.workspace.id).toBe("ws-1");
    expect(result.invitation.workspace.plan).toBe("FREE");
    expect(result.invitation.invitedBy).toBe("Admin User");
    expect(typeof result.invitation.expiresAt).toBe("string");
  });
});

describe("invitationRouter.acceptInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when invitation token is not found", async () => {
    mockInvitationFindUnique.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({ token: "missing-token", password: "pass1234" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when invitation status is not PENDING", async () => {
    mockInvitationFindUnique.mockResolvedValue({
      ...mockInvitation,
      status: "ACCEPTED",
    });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({ token: "tok-abc", password: "pass1234" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when invitation is expired and updates status to EXPIRED", async () => {
    const expiredInvitation = {
      ...mockInvitation,
      expiresAt: new Date(Date.now() - 86_400_000), // 24h in the past
    };
    mockInvitationFindUnique.mockResolvedValue(expiredInvitation);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({ token: "tok-abc", password: "pass1234" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mockInvitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "inv-1" }),
        data: expect.objectContaining({ status: "EXPIRED" }),
      })
    );
  });

  it("throws UNAUTHORIZED when existing user provides wrong password", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(false as never);

    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(mockExistingUser);
    mockAccountFindFirst.mockResolvedValue({ password: "bcrypt-hash" });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({ token: "tok-abc", password: "wrong-pass" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws BAD_REQUEST when existing user has no password hash and no credential account", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true as never);

    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue({
      ...mockExistingUser,
      passwordHash: null,
    });
    // No credential account found either
    mockAccountFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({ token: "tok-abc", password: "pass1234" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("succeeds for existing user with a credential account", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true as never);

    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(mockExistingUser);
    // Credential account exists — hasCredentialAccount = true, needsAccountMigration = false
    mockAccountFindFirst.mockResolvedValue({ password: "bcrypt-hash" });

    const updatedUser = { ...mockExistingUser, workspaceId: "ws-1" };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: { update: vi.fn().mockResolvedValue(updatedUser) },
        account: { create: mockAccountCreate },
        invitation: {
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return fn(tx);
    });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.acceptInvitation({
      token: "tok-abc",
      password: "pass1234",
    });

    expect(result.user).toBeDefined();
    expect(result.workspace).toBeDefined();
    // Account.create should NOT be called since hasCredentialAccount = true
    expect(mockAccountCreate).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when no existing user found and firstName/lastName are missing", async () => {
    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({ token: "tok-abc", password: "pass1234" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("migrates legacy user by creating Account row when passwordHash exists but no credential Account", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true as never);

    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue({
      ...mockExistingUser,
      passwordHash: "old-hash",
    });
    // No credential account → hasCredentialAccount = false → needsAccountMigration = true
    mockAccountFindFirst.mockResolvedValue(null);

    const updatedUser = { ...mockExistingUser, workspaceId: "ws-1" };
    const txAccountCreate = vi.fn().mockResolvedValue({});
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: { update: vi.fn().mockResolvedValue(updatedUser) },
        account: { create: txAccountCreate },
        invitation: {
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return fn(tx);
    });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.acceptInvitation({
      token: "tok-abc",
      password: "pass1234",
    });

    expect(result.user).toBeDefined();
    // Account row must be created to migrate legacy credential
    expect(txAccountCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: "credential",
          password: "old-hash",
        }),
      })
    );
  });

  it("succeeds for new user creation when no existing user is found", async () => {
    const { hashPassword } = await import("@/core/auth");
    vi.mocked(hashPassword).mockResolvedValue("hashed-password" as never);

    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    // No existing user
    mockUserFindUnique.mockResolvedValue(null);

    const txUserCreate = vi.fn().mockResolvedValue(mockNewUser);
    const txAccountCreate = vi.fn().mockResolvedValue({});
    const txInvitationUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: { create: txUserCreate },
        account: { create: txAccountCreate },
        invitation: { update: vi.fn(), updateMany: txInvitationUpdateMany },
      };
      return fn(tx);
    });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.acceptInvitation({
      token: "tok-abc",
      password: "pass1234",
      firstName: "John",
      lastName: "Smith",
    });

    expect(result.user).toBeDefined();
    expect(result.workspace).toBeDefined();
    expect(txUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@user.com",
          firstName: "John",
          lastName: "Smith",
          workspaceId: "ws-1",
          emailVerified: true,
          isActive: true,
        }),
      })
    );
    // Account row is always created for new users
    expect(txAccountCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: "credential",
          password: "hashed-password",
        }),
      })
    );
    expect(txInvitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACCEPTED" }),
      })
    );
  });
});

describe("invitationRouter.acceptInvitationWithRegistration", () => {
  beforeEach(() => vi.clearAllMocks());

  const validRegistrationInput = {
    token: "tok-abc",
    password: "pass1234",
    firstName: "John",
    lastName: "Smith",
  };

  it("throws NOT_FOUND when invitation is not found", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitationWithRegistration(validRegistrationInput)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws CONFLICT when a user with the invitation email already exists", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(mockExistingUser);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitationWithRegistration(validRegistrationInput)
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("creates new user and account in transaction for a fresh registration", async () => {
    const { hashPassword } = await import("@/core/auth");
    vi.mocked(hashPassword).mockResolvedValue("hashed-password" as never);

    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    // No existing user
    mockUserFindUnique.mockResolvedValue(null);

    const newUserWithSelect = {
      id: "user-3",
      email: "new@user.com",
      firstName: "John",
      lastName: "Smith",
      role: "MEMBER",
      workspaceId: "ws-1",
      isActive: true,
      emailVerified: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const txUserCreate = vi.fn().mockResolvedValue(newUserWithSelect);
    const txAccountCreate = vi.fn().mockResolvedValue({});
    const txInvitationUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: { create: txUserCreate },
        account: { create: txAccountCreate },
        invitation: { update: vi.fn(), updateMany: txInvitationUpdateMany },
      };
      return fn(tx);
    });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.acceptInvitationWithRegistration(
      validRegistrationInput
    );

    expect(result.user).toBeDefined();
    expect(result.workspace).toMatchObject({ id: "ws-1", name: "Acme Corp" });
    expect(result.message).toBeDefined();

    expect(txUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@user.com",
          firstName: "John",
          lastName: "Smith",
          workspaceId: "ws-1",
          emailVerified: true,
          isActive: true,
        }),
      })
    );
    expect(txAccountCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: "credential",
          password: "hashed-password",
        }),
      })
    );
    expect(txInvitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACCEPTED",
          invitedUserId: "user-3",
        }),
      })
    );
  });
});
