import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockWorkspaceFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    workspace: {
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
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

vi.mock("../../../middlewares/rateLimiter", () => ({
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
const { coreRouter } = await import("../core");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
      workspace: { findUnique: mockWorkspaceFindUnique },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
      workspaceId: "old-ws",
    },
    workspaceId: "old-ws",
    locale: "en",
    req: {},
    ...overrides,
  };
}

const mockWorkspaceData = {
  id: "new-ws",
  name: "Test Workspace",
  contactEmail: "contact@test.com",
  logoUrl: null,
  ownerId: "user-1",
  tags: [],
  emailNotificationsEnabled: false,
  notificationSeverities: [],
  browserNotificationsEnabled: false,
  browserNotificationSeverities: [],
  notificationServerIds: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  _count: { members: 1, servers: 0 },
};

// --- Tests ---

describe("coreRouter.getCurrent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses fresh DB workspaceId, not session cache", async () => {
    // Session has "old-ws" but DB returns "new-ws"
    mockUserFindUnique.mockResolvedValue({ workspaceId: "new-ws" });
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspaceData);

    const caller = coreRouter.createCaller(makeCtx() as never);
    await caller.getCurrent();

    // Verify workspace was fetched using the fresh DB workspaceId, not the cached one
    expect(mockWorkspaceFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "new-ws" },
      })
    );
    // Ensure it was NOT called with the stale session value
    expect(mockWorkspaceFindUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "old-ws" },
      })
    );
  });

  it("throws NOT_FOUND when user has no workspaceId in DB", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: null });

    const caller = coreRouter.createCaller(makeCtx() as never);

    await expect(caller.getCurrent()).rejects.toThrow(TRPCError);
    await expect(caller.getCurrent()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    // workspace.findUnique should never be called
    expect(mockWorkspaceFindUnique).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when workspace does not exist", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "new-ws" });
    mockWorkspaceFindUnique.mockResolvedValue(null);

    const caller = coreRouter.createCaller(makeCtx() as never);

    await expect(caller.getCurrent()).rejects.toThrow(TRPCError);
    await expect(caller.getCurrent()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns workspace when found", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "new-ws" });
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspaceData);

    const caller = coreRouter.createCaller(makeCtx() as never);
    const result = await caller.getCurrent();

    expect(result.workspace).toBeDefined();
    expect(result.workspace.id).toBe("new-ws");
    expect(result.workspace.name).toBe("Test Workspace");
    expect(result.workspace._count).toEqual({ members: 1, servers: 0 });
  });
});
