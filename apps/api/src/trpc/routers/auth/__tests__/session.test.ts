import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
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
      createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() ?? u.updatedAt,
      authProvider: null,
      hasPassword: null,
    })),
  },
}));

// Import after mocks
const { sessionRouter } = await import("../session");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "MEMBER",
      isActive: true,
      email: "user@example.com",
      workspaceId: "ws-1",
    },
    locale: "en",
    req: {},
    ...overrides,
  };
}

const makeFullUser = (accountProviders: string[]) => ({
  id: "user-1",
  email: "user@example.com",
  image: null,
  firstName: "Jane",
  lastName: "Doe",
  role: "MEMBER",
  workspaceId: "ws-1",
  isActive: true,
  emailVerified: true,
  lastLogin: new Date("2024-01-10"),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  pendingEmail: null,
  subscription: { plan: "FREE", status: "ACTIVE" },
  workspace: { id: "ws-1" },
  accounts: accountProviders.map((p) => ({ providerId: p })),
});

// --- Tests ---

describe("sessionRouter.getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns session with authProvider=google when has google account", async () => {
    mockUserFindUnique.mockResolvedValue(makeFullUser(["google"]));

    const caller = sessionRouter.createCaller(makeCtx() as never);
    const result = await caller.getSession();

    expect(result.user.authProvider).toBe("google");
  });

  it("returns authProvider=password when has credential account", async () => {
    mockUserFindUnique.mockResolvedValue(makeFullUser(["credential"]));

    const caller = sessionRouter.createCaller(makeCtx() as never);
    const result = await caller.getSession();

    expect(result.user.authProvider).toBe("password");
  });

  it("sets hasPassword=true when credential account exists", async () => {
    mockUserFindUnique.mockResolvedValue(makeFullUser(["credential"]));

    const caller = sessionRouter.createCaller(makeCtx() as never);
    const result = await caller.getSession();

    expect(result.user.hasPassword).toBe(true);
  });

  it("sets hasPassword=false when only google account exists", async () => {
    mockUserFindUnique.mockResolvedValue(makeFullUser(["google"]));

    const caller = sessionRouter.createCaller(makeCtx() as never);
    const result = await caller.getSession();

    expect(result.user.hasPassword).toBe(false);
  });

  it("throws NOT_FOUND when user not found in DB", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = sessionRouter.createCaller(makeCtx() as never);
    await expect(caller.getSession()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns user object with expected fields", async () => {
    mockUserFindUnique.mockResolvedValue(makeFullUser(["credential"]));

    const caller = sessionRouter.createCaller(makeCtx() as never);
    const result = await caller.getSession();

    expect(result.user.id).toBe("user-1");
    expect(result.user.email).toBe("user@example.com");
  });

  it("throws INTERNAL_SERVER_ERROR on unexpected error", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB failure"));

    const caller = sessionRouter.createCaller(makeCtx() as never);
    await expect(caller.getSession()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
