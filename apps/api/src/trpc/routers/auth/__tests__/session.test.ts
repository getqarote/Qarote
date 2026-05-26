import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
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

vi.mock("@/mappers/auth", () => ({
  UserMapper: {
    toApiResponse: vi.fn((u) => ({
      id: u.id,
      email: u.email,
      authProvider: null,
      hasPassword: false,
    })),
  },
}));

const { sessionRouter } = await import("../session");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: { id: "user-1", email: "test@example.com", isActive: true },
    locale: "en",
    ...overrides,
  };
}

const mockFullUser = {
  id: "user-1",
  email: "test@example.com",
  image: null,
  firstName: "John",
  lastName: "Doe",
  role: "USER",
  workspaceId: "ws-1",
  isActive: true,
  emailVerified: true,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  pendingEmail: null,
  subscription: null,
  workspace: { id: "ws-1" },
  accounts: [{ providerId: "credential" }],
};

// --- Tests ---

describe("sessionRouter.getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND when user no longer exists in DB", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = sessionRouter.createCaller(makeCtx() as never);
    await expect(caller.getSession()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns user with credential auth provider", async () => {
    mockUserFindUnique.mockResolvedValue(mockFullUser);

    const caller = sessionRouter.createCaller(makeCtx() as never);
    const result = await caller.getSession();

    expect(result.user).toBeDefined();
    expect(result.user.id).toBe("user-1");
  });

  it("sets authProvider=google when account has google providerId", async () => {
    const { UserMapper } = await import("@/mappers/auth");
    const mapped = {
      id: "user-1",
      email: "test@example.com",
      authProvider: null as string | null,
      hasPassword: false,
    };
    vi.mocked(UserMapper.toApiResponse).mockReturnValue(mapped as never);

    mockUserFindUnique.mockResolvedValue({
      ...mockFullUser,
      accounts: [{ providerId: "google" }],
    });

    const caller = sessionRouter.createCaller(makeCtx() as never);
    const result = await caller.getSession();

    expect(result.user.authProvider).toBe("google");
    expect(result.user.hasPassword).toBe(false);
  });

  it("sets authProvider=password and hasPassword=true for credential account", async () => {
    const { UserMapper } = await import("@/mappers/auth");
    const mapped = {
      id: "user-1",
      email: "test@example.com",
      authProvider: null as string | null,
      hasPassword: false,
    };
    vi.mocked(UserMapper.toApiResponse).mockReturnValue(mapped as never);

    mockUserFindUnique.mockResolvedValue({
      ...mockFullUser,
      accounts: [{ providerId: "credential" }],
    });

    const caller = sessionRouter.createCaller(makeCtx() as never);
    const result = await caller.getSession();

    expect(result.user.authProvider).toBe("password");
    expect(result.user.hasPassword).toBe(true);
  });

  it("fetches user by ctx.user.id", async () => {
    mockUserFindUnique.mockResolvedValue(mockFullUser);

    const caller = sessionRouter.createCaller(makeCtx() as never);
    await caller.getSession();

    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    );
  });
});
