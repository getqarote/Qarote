import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClientFromServer = vi.fn();

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: vi.fn(),
  createRabbitMQClientFromServer: (...a: unknown[]) =>
    mockCreateRabbitMQClientFromServer(...a),
  createAmqpClient: vi.fn(),
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
  requirePremiumFeature: () => (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/mappers/rabbitmq", () => ({
  NodeMapper: { toApiResponseArray: vi.fn((a) => a) },
  OverviewMapper: { toApiResponse: vi.fn((o) => o) },
}));

vi.mock("@/core/rabbitmq/MetricsCalculator", () => ({
  RabbitMQMetricsCalculator: {
    extractMessageRates: vi.fn().mockReturnValue([]),
    extractQueueTotals: vi.fn().mockReturnValue({
      messages: 0,
      messages_ready: 0,
      messages_unacknowledged: 0,
    }),
    detectRatesMode: vi.fn().mockReturnValue("sample"),
  },
}));

vi.mock("@/core/utils", () => ({
  abortableSleep: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
const { metricsRouter } = await import("../metrics");

// --- Helpers ---

const mockEnhancedMetrics = {
  nodes: [{ name: "rabbit@localhost", running: true }],
  overview: { rabbitmq_version: "3.12.0", queue_totals: { messages: 5 } },
  cpuUsage: 10,
  memoryUsage: 50,
};

const mockRabbitClient = {
  getMetrics: vi.fn().mockResolvedValue(mockEnhancedMetrics),
  getOverviewWithTimeRange: vi.fn().mockResolvedValue({ message_stats: {} }),
  getQueueWithTimeRange: vi.fn().mockResolvedValue({ name: "q", messages: 3 }),
};

const mockServer = { id: "srv-1", name: "Test Server" };

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "user@example.com",
      role: "MEMBER",
      isActive: true,
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    req: {},
    ...overrides,
  };
}

// --- getMetrics ---

describe("metricsRouter.getMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockRabbitClient);
  });

  it("returns metrics for valid server", async () => {
    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getMetrics({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.metrics).toBeDefined();
    expect(result.metrics?.nodes).toHaveLength(1);
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getMetrics({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns permission status on 401 error", async () => {
    mockCreateRabbitMQClientFromServer.mockReturnValue({
      getMetrics: vi.fn().mockRejectedValue(new Error("401 Unauthorized")),
    });

    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getMetrics({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.metrics).toBeNull();
    expect(result.permissionStatus?.hasPermission).toBe(false);
  });
});

// --- getRates ---

describe("metricsRouter.getRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockRabbitClient);
  });

  it("returns rates data for valid server", async () => {
    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getRates({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.serverId).toBe("srv-1");
    expect(result.dataSource).toBe("live_rates_with_time_range");
    expect(typeof result.timestamp).toBe("string");
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getRates({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns permission denied when 401 error occurs", async () => {
    mockCreateRabbitMQClientFromServer.mockReturnValue({
      getOverviewWithTimeRange: vi
        .fn()
        .mockRejectedValue(new Error("401 Unauthorized")),
    });

    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getRates({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.dataSource).toBe("permission_denied");
    expect(result.permissionStatus?.hasPermission).toBe(false);
  });
});

// --- getQueueRates ---

describe("metricsRouter.getQueueRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockRabbitClient);
  });

  it("returns queue-specific rates", async () => {
    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueueRates({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "test-queue",
      vhost: "%2F",
    });

    expect(result.queueName).toBe("test-queue");
    expect(result.dataSource).toBe("queue_live_rates_with_time_range");
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getQueueRates({
        serverId: "no-srv",
        workspaceId: "ws-1",
        queueName: "q",
        vhost: "%2F",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
