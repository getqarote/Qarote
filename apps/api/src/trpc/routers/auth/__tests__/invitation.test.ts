import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockInvitationFindFirst = vi.fn();
const mockInvitationFindUnique = vi.fn();
const mockInvitationUpdate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockAccountFindFirst = vi.fn();
const mockAccountCreate = vi.fn();
const mockSubscriptionFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    invitation: {
      findFirst: (...a: unknown[]) => mockInvitationFindFirst(...a),
      findUnique: (...a: unknown[]) => mockInvitationFindUnique(...a),
      update: (...a: unknown[]) => mockInvitationUpdate(...a),
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
    subscription: {
      findUnique: (...a: unknown[]) => mockSubscriptionFindUnique(...a),
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
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/core/auth", () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/core/utils", () => ({
  formatInvitedBy: vi.fn((u) => u),
  getUserDisplayName: vi.fn().mockReturnValue("Admin User"),
}));

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
  getUserWorkspaceRole: vi.fn().mockResolvedValue("MEMBER"),
}));

vi.mock("@/mappers/auth", () => ({
  UserMapper: {
    toApiResponse: vi.fn((u) => ({
      ...u,
      createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() ?? u.updatedAt,
    })),
  },
}));

vi.mock("@/mappers/workspace", () => ({
  WorkspaceMapper: {
    toApiResponse: vi.fn((w) => w),
  },
}));

// Import after mocks
const { invitationRouter } = await import("../invitation");

// --- Helpers ---

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

const mockInvitation = {
  id: "inv-1",
  email: "invited@example.com",
  role: "MEMBER",
  token: "valid-token",
  status: "PENDING",
  workspaceId: "ws-1",
  expiresAt: futureDate,
  createdAt: new Date("2024-01-01"),
  workspace: {
    id: "ws-1",
    name: "Test Workspace",
    contactEmail: "owner@example.com",
    ownerId: "owner-1",
  },
  invitedBy: {
    id: "admin-1",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
  },
};

const mockNewUser = {
  id: "user-new",
  email: "invited@example.com",
  firstName: "New",
  lastName: "User",
  role: "MEMBER",
  workspaceId: "ws-1",
  isActive: true,
  emailVerified: true,
  emailVerifiedAt: new Date(),
  lastLogin: new Date(),
  passwordHash: "hashed-password",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      invitation: {
        findFirst: mockInvitationFindFirst,
        findUnique: mockInvitationFindUnique,
        update: mockInvitationUpdate,
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
      subscription: { findUnique: mockSubscriptionFindUnique },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: null,
    locale: "en",
    req: {},
    ...overrides,
  };
}

// --- getInvitationDetails ---

describe("invitationRouter.getInvitationDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invitation details when invitation is valid", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockSubscriptionFindUnique.mockResolvedValue({ plan: "FREE" });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getInvitationDetails({ token: "valid-token" });

    expect(result.success).toBe(true);
    expect(result.invitation.email).toBe("invited@example.com");
    expect(result.invitation.workspace.name).toBe("Test Workspace");
    expect(typeof result.invitation.expiresAt).toBe("string");
  });

  it("throws NOT_FOUND when invitation not found or expired", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getInvitationDetails({ token: "bad-token" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when workspace owner has no subscription", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockSubscriptionFindUnique.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getInvitationDetails({ token: "valid-token" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// --- acceptInvitation ---

describe("invitationRouter.acceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue(mockNewUser),
          update: vi.fn().mockResolvedValue(mockNewUser),
        },
        account: { create: vi.fn().mockResolvedValue({}) },
        invitation: { update: vi.fn().mockResolvedValue({}) },
        workspaceMember: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(tx);
    });
  });

  it("creates new user when invited user doesn't exist", async () => {
    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null); // no existing user

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.acceptInvitation({
      token: "valid-token",
      password: "NewPass123!",
      firstName: "New",
      lastName: "User",
    });

    expect(result.user.email).toBe("invited@example.com");
  });

  it("throws BAD_REQUEST for new user missing required fields", async () => {
    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({
        token: "valid-token",
        // Missing password, firstName, lastName
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when invitation token invalid", async () => {
    mockInvitationFindUnique.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({
        token: "bad-token",
        password: "pass",
        firstName: "A",
        lastName: "B",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when invitation already used/expired (status != PENDING)", async () => {
    mockInvitationFindUnique.mockResolvedValue({
      ...mockInvitation,
      status: "ACCEPTED",
    });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({
        token: "valid-token",
        password: "pass",
        firstName: "A",
        lastName: "B",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when invitation is expired (expiresAt in past)", async () => {
    mockInvitationFindUnique.mockResolvedValue({
      ...mockInvitation,
      expiresAt: pastDate,
    });
    mockInvitationUpdate.mockResolvedValue({});

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({
        token: "valid-token",
        password: "pass",
        firstName: "A",
        lastName: "B",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires password for existing user", async () => {
    const existingUser = { ...mockNewUser, id: "existing-user" };
    mockInvitationFindUnique.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(existingUser);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitation({
        token: "valid-token",
        // No password
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// --- acceptInvitationWithRegistration ---

describe("invitationRouter.acceptInvitationWithRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue(mockNewUser) },
        account: { create: vi.fn().mockResolvedValue({}) },
        invitation: { update: vi.fn().mockResolvedValue({}) },
        workspaceMember: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(tx);
    });
  });

  it("registers and accepts invitation successfully", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null); // no existing user

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.acceptInvitationWithRegistration({
      token: "valid-token",
      password: "SecurePass123!",
      firstName: "New",
      lastName: "User",
    });

    expect(result.user).toBeDefined();
    expect(result.workspace.id).toBe("ws-1");
  });

  it("throws NOT_FOUND when invitation not found or expired", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitationWithRegistration({
        token: "bad-token",
        password: "pass",
        firstName: "A",
        lastName: "B",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws CONFLICT when user with invited email already exists", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue({ id: "existing" }); // user exists

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptInvitationWithRegistration({
        token: "valid-token",
        password: "pass",
        firstName: "A",
        lastName: "B",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
