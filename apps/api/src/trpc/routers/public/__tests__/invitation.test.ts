import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockInvitationFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockSubscriptionFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    invitation: {
      findFirst: (...a: unknown[]) => mockInvitationFindFirst(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
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
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/core/utils", () => ({
  formatInvitedBy: vi.fn((u) => u),
}));

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
const { publicInvitationRouter } = await import("../invitation");

// --- Helpers ---

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
};

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      invitation: { findFirst: mockInvitationFindFirst },
      user: { findUnique: mockUserFindUnique },
      subscription: { findUnique: mockSubscriptionFindUnique },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: null, // public endpoint - no auth required
    locale: "en",
    req: {},
    ...overrides,
  };
}

// --- getDetails ---

describe("publicInvitationRouter.getDetails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns invitation details for valid token", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockSubscriptionFindUnique.mockResolvedValue({ plan: "DEVELOPER" });

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getDetails({ token: "valid-token" });

    expect(result.success).toBe(true);
    expect(result.invitation.email).toBe("invited@example.com");
    expect(result.invitation.workspace.name).toBe("Test Workspace");
    expect(result.invitation.workspace.plan).toBe("DEVELOPER");
  });

  it("defaults to FREE plan when owner has no subscription (self-hosted)", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockSubscriptionFindUnique.mockResolvedValue(null); // no subscription

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getDetails({ token: "valid-token" });

    expect(result.invitation.workspace.plan).toBe("FREE");
  });

  it("throws NOT_FOUND when invitation not found or expired", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getDetails({ token: "bad-token" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- accept ---

describe("publicInvitationRouter.accept", () => {
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

  it("creates new user and accepts invitation", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null); // no existing user

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.accept({
      token: "valid-token",
      password: "SecurePass123!",
      firstName: "New",
      lastName: "User",
    });

    expect(result.message).toBe("Invitation accepted successfully");
    expect(result.user.email).toBe("invited@example.com");
    expect(result.workspace.id).toBe("ws-1");
  });

  it("throws NOT_FOUND when invitation is invalid or expired", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.accept({
        token: "bad-token",
        password: "pass",
        firstName: "A",
        lastName: "B",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws CONFLICT when email already registered", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue({ id: "existing-user" });

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.accept({
        token: "valid-token",
        password: "pass",
        firstName: "A",
        lastName: "B",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("runs user creation and invitation update in a transaction", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null);

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    await caller.accept({
      token: "valid-token",
      password: "SecurePass123!",
      firstName: "New",
      lastName: "User",
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
  });
});
