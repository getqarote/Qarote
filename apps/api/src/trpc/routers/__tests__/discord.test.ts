import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserUpdate = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      update: (...a: unknown[]) => mockUserUpdate(...a),
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
    },
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

vi.mock("@/services/plan/plan.service", () => ({
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

const { discordRouter } = await import("../discord");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { update: mockUserUpdate, findUnique: mockUserFindUnique },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: { id: "user-1", email: "test@example.com", isActive: true },
    locale: "en",
    ...overrides,
  };
}

// --- Tests ---

describe("discordRouter.markJoined", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets discordJoined=true and records timestamp", async () => {
    mockUserUpdate.mockResolvedValue({ id: "user-1", discordJoined: true });

    const caller = discordRouter.createCaller(makeCtx() as never);
    await caller.markJoined();

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ discordJoined: true }),
      })
    );
  });
});

describe("discordRouter.getStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns discordJoined=false when user has not joined", async () => {
    mockUserFindUnique.mockResolvedValue({
      discordJoined: false,
      discordJoinedAt: null,
    });

    const caller = discordRouter.createCaller(makeCtx() as never);
    const result = await caller.getStatus();

    expect(result.discordJoined).toBe(false);
    expect(result.discordJoinedAt).toBeNull();
  });

  it("returns discordJoined=true with timestamp", async () => {
    const joinedAt = new Date("2024-06-01");
    mockUserFindUnique.mockResolvedValue({
      discordJoined: true,
      discordJoinedAt: joinedAt,
    });

    const caller = discordRouter.createCaller(makeCtx() as never);
    const result = await caller.getStatus();

    expect(result.discordJoined).toBe(true);
    expect(result.discordJoinedAt).toBe(joinedAt.toISOString());
  });
});
