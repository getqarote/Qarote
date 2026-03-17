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
  getUserPlan: vi.fn().mockResolvedValue("DEVELOPER"),
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

// Import after mocks
const { messagesRouter } = await import("../messages");

// --- Helpers ---

const mockRabbitClient = {
  publishMessage: vi.fn().mockResolvedValue({ routed: true }),
};

const mockServer = {
  id: "srv-1",
  name: "Test Server",
  workspaceId: "ws-1",
};

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

// --- publishMessage ---

describe("messagesRouter.publishMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
    mockRabbitClient.publishMessage.mockResolvedValue({ routed: true });
  });

  it("publishes message to queue successfully", async () => {
    const caller = messagesRouter.createCaller(makeCtx() as never);
    const result = await caller.publishMessage({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "test-queue",
      message: "Hello, World!",
      vhost: "%2F",
    });

    expect(result.success).toBe(true);
    expect(result.routed).toBe(true);
    expect(result.message).toContain("successfully");
    expect(result.queueName).toBe("test-queue");
    expect(result.messageLength).toBe("Hello, World!".length);
  });

  it("uses queueName as default routing key when none provided", async () => {
    const caller = messagesRouter.createCaller(makeCtx() as never);
    await caller.publishMessage({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "my-queue",
      message: "test",
      vhost: "%2F",
    });

    expect(mockRabbitClient.publishMessage).toHaveBeenCalledWith(
      "",
      "my-queue",
      "/",
      "test",
      undefined
    );
  });

  it("uses provided exchange and routing key when given", async () => {
    const caller = messagesRouter.createCaller(makeCtx() as never);
    await caller.publishMessage({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "test-queue",
      message: "test",
      exchange: "my-exchange",
      routingKey: "my-key",
      vhost: "%2F",
    });

    expect(mockRabbitClient.publishMessage).toHaveBeenCalledWith(
      "my-exchange",
      "my-key",
      "/",
      "test",
      undefined
    );
  });

  it("throws UNPROCESSABLE_CONTENT when message is not routed", async () => {
    mockRabbitClient.publishMessage.mockResolvedValue({ routed: false });

    const caller = messagesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.publishMessage({
        serverId: "srv-1",
        workspaceId: "ws-1",
        queueName: "nonexistent-queue",
        message: "test",
        vhost: "%2F",
      })
    ).rejects.toMatchObject({ code: "UNPROCESSABLE_CONTENT" });
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = messagesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.publishMessage({
        serverId: "no-srv",
        workspaceId: "ws-1",
        queueName: "q",
        message: "test",
        vhost: "%2F",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("converts camelCase properties to RabbitMQ snake_case format", async () => {
    const caller = messagesRouter.createCaller(makeCtx() as never);
    await caller.publishMessage({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "test-queue",
      message: "test",
      vhost: "%2F",
      properties: {
        deliveryMode: 2,
        priority: 1,
        contentType: "application/json",
        correlationId: "corr-123",
      },
    });

    expect(mockRabbitClient.publishMessage).toHaveBeenCalledWith(
      "",
      "test-queue",
      "/",
      "test",
      expect.objectContaining({
        delivery_mode: 2,
        priority: 1,
        content_type: "application/json",
        correlation_id: "corr-123",
      })
    );
  });
});
