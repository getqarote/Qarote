import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClientFromServer = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspaceMember: {
      findFirst: vi.fn().mockResolvedValue({
        id: "mem-1",
        roleId: null,
        role: null,
        workspace: { organizationId: null, licenseTier: null },
      }),
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
  getOrgPlan: vi.fn().mockResolvedValue("DEVELOPER"),
}));
vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClientFromServer: (...a: unknown[]) =>
    mockCreateRabbitMQClientFromServer(...a),
  createRabbitMQClient: vi.fn(),
}));
vi.mock("@/core/rabbitmq/MetricsCalculator", () => ({
  RabbitMQMetricsCalculator: {
    extractMessageRates: vi.fn().mockReturnValue([]),
    extractQueueTotals: vi.fn().mockReturnValue({
      messages: 0,
      messages_ready: 0,
      messages_unacknowledged: 0,
    }),
    detectRatesMode: vi.fn().mockReturnValue("rates"),
  },
}));
vi.mock("@/mappers/rabbitmq", () => ({
  NodeMapper: { toApiResponseArray: vi.fn().mockReturnValue([]) },
  OverviewMapper: {
    toApiResponse: vi.fn().mockReturnValue({ rabbitmq_version: "3.12.0" }),
  },
  QueueMapper: { toApiResponseArray: vi.fn().mockReturnValue([]) },
  ExchangeMapper: { toApiResponseArray: vi.fn().mockReturnValue([]) },
  BindingMapper: { toApiResponseArray: vi.fn().mockReturnValue([]) },
  ConsumerMapper: { toApiResponseArray: vi.fn().mockReturnValue([]) },
}));
vi.mock("@/core/utils", () => ({
  abortableSleep: vi.fn().mockResolvedValue(undefined),
  getUserDisplayName: vi.fn((u) => u?.email ?? ""),
  formatInvitedBy: vi.fn(),
}));

const { metricsRouter } = await import("../metrics");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  const role = ((overrides.user as { role?: string }) ?? {}).role ?? "ADMIN";
  const perms =
    role === "ADMIN" || role === "OWNER"
      ? new Set(["metric:read"])
      : new Set<string>();
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
    effectivePermissionsLoader: {
      load: vi.fn().mockResolvedValue({
        kind: "builtin",
        role,
        permissions: perms,
        scopeRows: [],
      }),
    },
    ...overrides,
  };
}

const mockServer = {
  id: "srv-1",
  workspaceId: "ws-1",
  name: "Test Server",
  host: "rabbitmq.example.com",
  port: 15672,
  amqpPort: 5672,
  username: "enc:guest",
  password: "enc:password",
  vhost: "/",
  useHttps: false,
};

function makeMockClient(overrides: Record<string, unknown> = {}) {
  return {
    getMetrics: vi.fn().mockResolvedValue({
      nodes: [],
      overview: { rabbitmq_version: "3.12.0", queue_totals: {} },
      cluster_name: "rabbit@localhost",
      object_totals: {},
    }),
    getOverviewWithTimeRange: vi.fn().mockResolvedValue({}),
    getQueueWithTimeRange: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

// --- Tests ---

describe("metricsRouter.getMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getMetrics({ serverId: "srv-999", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns metrics with mapped overview and nodes on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = makeMockClient();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getMetrics({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.metrics).toBeDefined();
    expect(result.metrics).not.toBeNull();
    // Mapped overview and nodes are injected by OverviewMapper / NodeMapper
    expect(result.metrics?.overview).toEqual({ rabbitmq_version: "3.12.0" });
    expect(result.metrics?.nodes).toEqual([]);
    expect(mockClient.getMetrics).toHaveBeenCalledOnce();
  });

  it("returns { metrics: null, permissionStatus } when client.getMetrics throws 401", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = makeMockClient({
      getMetrics: vi.fn().mockRejectedValue(new Error("401 Unauthorized")),
    });
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getMetrics({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.metrics).toBeNull();
    expect(result.permissionStatus).toMatchObject({ hasPermission: false });
  });
});

describe("metricsRouter.getRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getRates({ serverId: "srv-999", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns live rates payload with dataSource 'live_rates_with_time_range' on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = makeMockClient();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getRates({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.dataSource).toBe("live_rates_with_time_range");
    expect(result.serverId).toBe("srv-1");
    expect(result.timeRange).toBe("1m");
    expect(result.messagesRates).toEqual([]);
    expect(result.queueTotals).toBeDefined();
    expect(result.ratesMode).toBe("rates");
    expect(mockClient.getOverviewWithTimeRange).toHaveBeenCalledOnce();
  });

  it("returns permissionStatus when client.getOverviewWithTimeRange throws 401", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = makeMockClient({
      getOverviewWithTimeRange: vi
        .fn()
        .mockRejectedValue(new Error("401 Unauthorized")),
    });
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getRates({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.dataSource).toBe("permission_denied");
    expect(result.permissionStatus).toMatchObject({ hasPermission: false });
    expect(result.messagesRates).toEqual([]);
    expect(result.ratesMode).toBe("none");
  });
});

describe("metricsRouter.getQueueRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getQueueRates({
        serverId: "srv-999",
        workspaceId: "ws-1",
        queueName: "my-queue",
        vhost: "/",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns queue rates with dataSource 'queue_live_rates_with_time_range' on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = makeMockClient();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueueRates({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "my-queue",
      vhost: "/",
    });

    expect(result.dataSource).toBe("queue_live_rates_with_time_range");
    expect(result.serverId).toBe("srv-1");
    expect(result.queueName).toBe("my-queue");
    expect(result.timeRange).toBe("1m");
    expect(result.rates).toEqual([]);
    expect(result.queueTotals).toBeDefined();
    expect(result.ratesMode).toBe("rates");
    expect(mockClient.getQueueWithTimeRange).toHaveBeenCalledOnce();
  });

  it("returns permissionStatus when client.getQueueWithTimeRange throws 401", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = makeMockClient({
      getQueueWithTimeRange: vi
        .fn()
        .mockRejectedValue(new Error("401 Unauthorized")),
    });
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = metricsRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueueRates({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "my-queue",
      vhost: "/",
    });

    expect(result.dataSource).toBe("permission_denied");
    expect(result.permissionStatus).toMatchObject({ hasPermission: false });
    expect(result.rates).toEqual([]);
    expect(result.ratesMode).toBe("none");
  });
});
