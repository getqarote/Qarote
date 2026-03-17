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
  FEATURES: { TOPOLOGY_VISUALIZATION: "topology_visualization" },
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/mappers/rabbitmq", () => ({
  ExchangeMapper: { toApiResponseArray: vi.fn((exchanges) => exchanges) },
  QueueMapper: { toApiResponseArray: vi.fn((a) => a) },
  BindingMapper: { toApiResponseArray: vi.fn((a) => a) },
  ConsumerMapper: { toApiResponseArray: vi.fn((a) => a) },
}));

// Import after mocks
const { topologyRouter } = await import("../topology");

// --- Helpers ---

const mockRabbitClient = {
  getExchanges: vi
    .fn()
    .mockResolvedValue([{ name: "amq.direct", type: "direct", vhost: "/" }]),
  getQueues: vi
    .fn()
    .mockResolvedValue([{ name: "test-queue", vhost: "/", messages: 0 }]),
  getBindings: vi.fn().mockResolvedValue([
    {
      source: "amq.direct",
      destination: "test-queue",
      vhost: "/",
      routing_key: "key",
    },
  ]),
  getConsumers: vi
    .fn()
    .mockResolvedValue([
      { queue: { name: "test-queue", vhost: "/" }, channel_details: {} },
    ]),
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

// --- getTopology ---

describe("topologyRouter.getTopology", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("returns topology with exchanges, queues, bindings, and consumers", async () => {
    const caller = topologyRouter.createCaller(makeCtx() as never);
    const result = await caller.getTopology({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.exchanges).toHaveLength(1);
    expect(result.queues).toHaveLength(1);
    expect(result.bindings).toHaveLength(1);
    expect(result.consumers).toHaveLength(1);
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = topologyRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getTopology({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns topology without vhost filter when no vhost provided", async () => {
    const caller = topologyRouter.createCaller(makeCtx() as never);
    await caller.getTopology({ serverId: "srv-1", workspaceId: "ws-1" });

    expect(mockRabbitClient.getExchanges).toHaveBeenCalledWith(undefined);
    expect(mockRabbitClient.getQueues).toHaveBeenCalledWith(undefined);
  });

  it("filters consumers by vhost when vhost is provided", async () => {
    const caller = topologyRouter.createCaller(makeCtx() as never);
    const result = await caller.getTopology({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhost: "%2F",
    });

    // Consumers are filtered by vhost matching "/"
    expect(result.consumers).toHaveLength(1);
  });

  it("continues gracefully when bindings fetch fails", async () => {
    mockCreateRabbitMQClient.mockResolvedValue({
      ...mockRabbitClient,
      getBindings: vi
        .fn()
        .mockRejectedValue(new Error("Bindings not available")),
    });

    const caller = topologyRouter.createCaller(makeCtx() as never);
    const result = await caller.getTopology({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.bindings).toHaveLength(0);
  });
});
