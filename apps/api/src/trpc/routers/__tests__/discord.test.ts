import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
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

// Import after mocks
const { discordRouter } = await import("../discord");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
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

// --- markJoined ---

describe("discordRouter.markJoined", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks user as joined Discord", async () => {
    const joinedAt = new Date("2024-01-15");
    mockUserUpdate.mockResolvedValue({
      id: "user-1",
      discordJoined: true,
      discordJoinedAt: joinedAt,
    });

    const caller = discordRouter.createCaller(makeCtx() as never);
    const result = await caller.markJoined();

    expect(result.success).toBe(true);
    expect(result.discordJoined).toBe(true);
    expect(typeof result.discordJoinedAt).toBe("string");
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ discordJoined: true }),
      })
    );
  });

  it("serializes discordJoinedAt to ISO string", async () => {
    const joinedAt = new Date("2024-06-01T12:00:00Z");
    mockUserUpdate.mockResolvedValue({
      id: "user-1",
      discordJoined: true,
      discordJoinedAt: joinedAt,
    });

    const caller = discordRouter.createCaller(makeCtx() as never);
    const result = await caller.markJoined();

    expect(result.discordJoinedAt).toBe(joinedAt.toISOString());
  });

  it("returns null discordJoinedAt when not set", async () => {
    mockUserUpdate.mockResolvedValue({
      id: "user-1",
      discordJoined: true,
      discordJoinedAt: null,
    });

    const caller = discordRouter.createCaller(makeCtx() as never);
    const result = await caller.markJoined();

    expect(result.discordJoinedAt).toBeNull();
  });

  it("throws INTERNAL_SERVER_ERROR on DB failure", async () => {
    mockUserUpdate.mockRejectedValue(new Error("DB error"));

    const caller = discordRouter.createCaller(makeCtx() as never);
    await expect(caller.markJoined()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});

// --- getStatus ---

describe("discordRouter.getStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns Discord join status", async () => {
    const joinedAt = new Date("2024-01-15");
    mockUserFindUnique.mockResolvedValue({
      discordJoined: true,
      discordJoinedAt: joinedAt,
    });

    const caller = discordRouter.createCaller(makeCtx() as never);
    const result = await caller.getStatus();

    expect(result.discordJoined).toBe(true);
    expect(result.discordJoinedAt).toBe(joinedAt.toISOString());
  });

  it("returns discordJoined=false when not joined", async () => {
    mockUserFindUnique.mockResolvedValue({
      discordJoined: false,
      discordJoinedAt: null,
    });

    const caller = discordRouter.createCaller(makeCtx() as never);
    const result = await caller.getStatus();

    expect(result.discordJoined).toBe(false);
    expect(result.discordJoinedAt).toBeNull();
  });

  it("throws NOT_FOUND when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = discordRouter.createCaller(makeCtx() as never);
    await expect(caller.getStatus()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
