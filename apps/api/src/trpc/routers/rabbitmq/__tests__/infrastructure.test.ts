import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClient = vi.fn();

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: (...a: unknown[]) => mockCreateRabbitMQClient(...a),
  createRabbitMQClientFromServer: vi.fn(),
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
  ExchangeMapper: { toApiResponseArray: vi.fn((a) => a) },
  BindingMapper: { toApiResponseArray: vi.fn((a) => a) },
}));

// Import after mocks
const { infrastructureRouter } = await import("../infrastructure");

// --- Helpers ---

const mockNodes = [{ name: "rabbit@localhost", running: true }];
const mockConnections = [{ name: "conn-1" }, { name: "conn-2" }];
const mockChannels = [{ name: "chan-1" }];
const mockExchanges = [{ name: "amq.direct", type: "direct", vhost: "/" }];
const mockBindings = [
  { source: "amq.direct", destination: "test-queue", vhost: "/" },
];

const mockRabbitClient = {
  getNodes: vi.fn().mockResolvedValue(mockNodes),
  getConnections: vi.fn().mockResolvedValue(mockConnections),
  getChannels: vi.fn().mockResolvedValue(mockChannels),
  getExchanges: vi.fn().mockResolvedValue(mockExchanges),
  getBindings: vi.fn().mockResolvedValue(mockBindings),
  createExchange: vi.fn().mockResolvedValue({}),
  deleteExchange: vi.fn().mockResolvedValue({}),
};

const mockServer = { id: "srv-1", name: "Test Server" };

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "admin@example.com",
      role: "ADMIN",
      isActive: true,
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    req: {},
    ...overrides,
  };
}

// --- getNodes ---

describe("infrastructureRouter.getNodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("returns nodes list", async () => {
    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.getNodes({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.nodes).toHaveLength(1);
  });

  it("returns permission status on 401 error", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue({
      ...mockRabbitClient,
      getNodes: vi.fn().mockRejectedValue(new Error("401 Unauthorized")),
    });

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.getNodes({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.nodes).toBeNull();
    expect(result.permissionStatus?.hasPermission).toBe(false);
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getNodes({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- getConnections ---

describe("infrastructureRouter.getConnections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("returns connections and channels", async () => {
    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.getConnections({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.success).toBe(true);
    expect(result.totalConnections).toBe(2);
    expect(result.totalChannels).toBe(1);
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getConnections({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- getExchanges ---

describe("infrastructureRouter.getExchanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("returns exchanges with exchange type counts", async () => {
    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.getExchanges({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.success).toBe(true);
    expect(result.exchanges).toHaveLength(1);
    expect(result.exchangeTypes.direct).toBe(1);
  });
});

// --- createExchange ---

describe("infrastructureRouter.createExchange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("creates exchange and returns success", async () => {
    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.createExchange({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhost: "%2F",
      name: "my-exchange",
      type: "direct",
      durable: true,
    });

    expect(result.success).toBe(true);
    expect(result.exchange.name).toBe("my-exchange");
  });

  it("throws BAD_REQUEST for invalid exchange type", async () => {
    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createExchange({
        serverId: "srv-1",
        workspaceId: "ws-1",
        vhost: "%2F",
        name: "bad-exchange",
        type: "invalid-type" as never,
        durable: true,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// --- deleteExchange ---

describe("infrastructureRouter.deleteExchange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("deletes exchange and returns success", async () => {
    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteExchange({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhost: "%2F",
      exchangeName: "amq.direct",
    });

    expect(result.success).toBe(true);
  });

  it("throws BAD_REQUEST when exchange is in use (400 error)", async () => {
    mockCreateRabbitMQClient.mockResolvedValue({
      ...mockRabbitClient,
      deleteExchange: vi
        .fn()
        .mockRejectedValue(new Error("400 Bad Request: exchange in use")),
    });

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteExchange({
        serverId: "srv-1",
        workspaceId: "ws-1",
        vhost: "%2F",
        exchangeName: "in-use-exchange",
        ifUnused: true,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
