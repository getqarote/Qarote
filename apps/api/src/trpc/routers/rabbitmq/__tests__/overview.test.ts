import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClient = vi.fn();

vi.mock("@/core/prisma", () => ({ prisma: {} }));
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
  getOrgPlan: vi.fn().mockResolvedValue("FREE"),
  getOverLimitWarningMessage: vi.fn().mockReturnValue("Over limit warning"),
  getUpgradeRecommendationForOverLimit: vi
    .fn()
    .mockReturnValue({ message: "Upgrade now", recommendedPlan: "PRO" }),
}));
vi.mock("@/mappers/rabbitmq", () => ({
  OverviewMapper: { toApiResponse: vi.fn((d) => d) },
}));
vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: (...a: unknown[]) => mockCreateRabbitMQClient(...a),
}));

const { overviewRouter } = await import("../overview");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {},
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "admin@test.com",
      isActive: true,
      role: "ADMIN",
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    resolveOrg: vi
      .fn()
      .mockResolvedValue({ organizationId: "org-1", role: "ADMIN" }),
    locale: "en",
    ...overrides,
  };
}

const mockServer = {
  id: "srv-1",
  workspaceId: "ws-1",
  isOverQueueLimit: false,
  queueCountAtConnect: null,
  overLimitWarningShown: false,
  workspace: null,
};

const mockOverviewData = {
  cluster_name: "rabbit@node1",
  rabbitmq_version: "3.12.0",
  queue_totals: { messages: 10 },
};

// --- Tests ---

describe("overviewRouter.getOverview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = overviewRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getOverview({ serverId: "srv-999", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns overview on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      getOverview: vi.fn().mockResolvedValue(mockOverviewData),
    };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = overviewRouter.createCaller(makeCtx() as never);
    const result = await caller.getOverview({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.overview).toEqual(mockOverviewData);
    expect(mockClient.getOverview).toHaveBeenCalledOnce();
  });

  it("includes warning block when server isOverQueueLimit", async () => {
    const serverWithLimit = {
      ...mockServer,
      isOverQueueLimit: true,
      queueCountAtConnect: 5,
      overLimitWarningShown: false,
      workspace: { id: "ws-1", name: "Test WS" },
    };
    mockVerifyServerAccess.mockResolvedValue(serverWithLimit);
    const mockClient = {
      getOverview: vi.fn().mockResolvedValue(mockOverviewData),
    };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = overviewRouter.createCaller(makeCtx() as never);
    const result = await caller.getOverview({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.warning).toBeDefined();
    expect(result.warning?.isOverLimit).toBe(true);
  });
});

describe("overviewRouter.setClusterName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = overviewRouter.createCaller(
      makeCtx({
        user: {
          id: "user-2",
          email: "user@test.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(
      caller.setClusterName({
        serverId: "srv-1",
        workspaceId: "ws-1",
        name: "new-name",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = overviewRouter.createCaller(makeCtx() as never);
    await expect(
      caller.setClusterName({
        serverId: "srv-999",
        workspaceId: "ws-1",
        name: "new-name",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns success when cluster name is set", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = { setClusterName: vi.fn().mockResolvedValue(undefined) };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = overviewRouter.createCaller(makeCtx() as never);
    const result = await caller.setClusterName({
      serverId: "srv-1",
      workspaceId: "ws-1",
      name: "my-cluster",
    });

    expect(result.success).toBe(true);
    expect(mockClient.setClusterName).toHaveBeenCalledWith("my-cluster");
  });
});
