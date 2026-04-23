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
}));
vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: (...a: unknown[]) => mockCreateRabbitMQClient(...a),
}));

const { messagesRouter } = await import("../messages");

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
};

const baseInput = {
  serverId: "srv-1",
  workspaceId: "ws-1",
  queueName: "my-queue",
  message: "Hello, RabbitMQ!",
  vhost: "%2F",
};

// --- Tests ---

describe("messagesRouter.publishMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = messagesRouter.createCaller(
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
    await expect(caller.publishMessage(baseInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = messagesRouter.createCaller(makeCtx() as never);
    await expect(caller.publishMessage(baseInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST when server has no workspaceId", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      ...mockServer,
      workspaceId: null,
    });

    const caller = messagesRouter.createCaller(makeCtx() as never);
    await expect(caller.publishMessage(baseInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("returns success when message is routed", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      publishMessage: vi.fn().mockResolvedValue({ routed: true }),
    };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = messagesRouter.createCaller(makeCtx() as never);
    const result = await caller.publishMessage(baseInput);

    expect(result.success).toBe(true);
    expect(result.routed).toBe(true);
    expect(result.queueName).toBe("my-queue");
    expect(result.messageLength).toBe("Hello, RabbitMQ!".length);
  });

  it("uses queue name as routing key when no routingKey provided", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      publishMessage: vi.fn().mockResolvedValue({ routed: true }),
    };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = messagesRouter.createCaller(makeCtx() as never);
    await caller.publishMessage(baseInput);

    // Default exchange = "", routing key = queue name
    expect(mockClient.publishMessage).toHaveBeenCalledWith(
      "",
      "my-queue",
      "/",
      "Hello, RabbitMQ!",
      undefined
    );
  });

  it("uses provided exchange and routingKey when specified", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      publishMessage: vi.fn().mockResolvedValue({ routed: true }),
    };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = messagesRouter.createCaller(makeCtx() as never);
    await caller.publishMessage({
      ...baseInput,
      exchange: "my-exchange",
      routingKey: "my-key",
    });

    expect(mockClient.publishMessage).toHaveBeenCalledWith(
      "my-exchange",
      "my-key",
      "/",
      "Hello, RabbitMQ!",
      undefined
    );
  });

  it("throws UNPROCESSABLE_CONTENT when message is not routed", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      publishMessage: vi.fn().mockResolvedValue({ routed: false }),
    };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = messagesRouter.createCaller(makeCtx() as never);
    await expect(caller.publishMessage(baseInput)).rejects.toMatchObject({
      code: "UNPROCESSABLE_CONTENT",
    });
  });

  it("converts camelCase properties to snake_case for publishMessage", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      publishMessage: vi.fn().mockResolvedValue({ routed: true }),
    };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = messagesRouter.createCaller(makeCtx() as never);
    await caller.publishMessage({
      ...baseInput,
      properties: {
        deliveryMode: 2,
        priority: 5,
        contentType: "application/json",
      },
    });

    expect(mockClient.publishMessage).toHaveBeenCalledWith(
      "",
      "my-queue",
      "/",
      "Hello, RabbitMQ!",
      expect.objectContaining({
        delivery_mode: 2,
        priority: 5,
        content_type: "application/json",
      })
    );
  });
});
