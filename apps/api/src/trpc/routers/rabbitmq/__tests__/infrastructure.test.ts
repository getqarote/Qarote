import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClient = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: { rabbitMQServer: { update: vi.fn() } },
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
  getOrgPlan: vi.fn().mockResolvedValue("FREE"),
}));

vi.mock("@/mappers/rabbitmq", () => ({
  NodeMapper: { toApiResponseArray: vi.fn((ns) => ns) },
  ExchangeMapper: { toApiResponseArray: vi.fn((es) => es) },
  BindingMapper: { toApiResponseArray: vi.fn((bs) => bs) },
}));

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: (...a: unknown[]) => mockCreateRabbitMQClient(...a),
  createRabbitMQClientFromServer: vi.fn(),
}));

const { infrastructureRouter } = await import("../infrastructure");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: { rabbitMQServer: { update: vi.fn() } },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "admin@test.com",
      isActive: true,
      role: "ADMIN",
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    resolveOrg: vi
      .fn()
      .mockResolvedValue({ organizationId: "org-1", role: "ADMIN" }),
    ...overrides,
  };
}

const mockServer = {
  id: "srv-1",
  name: "Test Server",
  host: "rabbitmq.example.com",
  port: 15672,
  useHttps: false,
  workspaceId: "ws-1",
};

const mockClient = {
  getNodes: vi.fn().mockResolvedValue([]),
  getConnections: vi.fn().mockResolvedValue([]),
  getChannels: vi.fn().mockResolvedValue([]),
  getExchanges: vi.fn().mockResolvedValue([]),
  getBindings: vi.fn().mockResolvedValue([]),
  createExchange: vi.fn().mockResolvedValue(undefined),
  deleteExchange: vi.fn().mockResolvedValue(undefined),
};

// --- Tests ---

describe("infrastructureRouter.getNodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getNodes({ serverId: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns nodes list on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.getNodes.mockResolvedValue([
      { name: "rabbit@node1", running: true },
    ]);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.getNodes({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.nodes).toBeDefined();
    expect(mockClient.getNodes).toHaveBeenCalled();
  });
});

describe("infrastructureRouter.getConnections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getConnections({ serverId: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns connections and channel counts on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.getConnections.mockResolvedValue([
      { name: "conn-1" },
      { name: "conn-2" },
    ]);
    mockClient.getChannels.mockResolvedValue([{ name: "chan-1" }]);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.getConnections({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.success).toBe(true);
    expect(result.totalConnections).toBe(2);
    expect(result.totalChannels).toBe(1);
  });
});

describe("infrastructureRouter.createExchange (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createExchange({
        serverId: "srv-1",
        workspaceId: "ws-1",
        name: "my-exchange",
        type: "direct",
        vhost: "/",
        durable: true,
        auto_delete: false,
        internal: false,
        arguments: {},
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates exchange and returns success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.createExchange({
      serverId: "srv-1",
      workspaceId: "ws-1",
      name: "my-exchange",
      type: "direct",
      vhost: "/",
      durable: true,
      auto_delete: false,
      internal: false,
      arguments: {},
    });

    expect(result.success).toBe(true);
    expect(mockClient.createExchange).toHaveBeenCalledWith(
      "my-exchange",
      "direct",
      "/",
      expect.any(Object)
    );
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = infrastructureRouter.createCaller(
      makeCtx({
        user: {
          id: "user-2",
          email: "u@u.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(
      caller.createExchange({
        serverId: "srv-1",
        workspaceId: "ws-1",
        name: "my-exchange",
        type: "direct",
        vhost: "/",
        durable: true,
        auto_delete: false,
        internal: false,
        arguments: {},
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("infrastructureRouter.deleteExchange (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteExchange({
        serverId: "srv-1",
        workspaceId: "ws-1",
        exchangeName: "old-exchange",
        vhost: "/",
        ifUnused: false,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes exchange and returns success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = infrastructureRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteExchange({
      serverId: "srv-1",
      workspaceId: "ws-1",
      exchangeName: "old-exchange",
      vhost: "/",
      ifUnused: false,
    });

    expect(result.success).toBe(true);
    expect(mockClient.deleteExchange).toHaveBeenCalledWith(
      "old-exchange",
      "/",
      expect.any(Object)
    );
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = infrastructureRouter.createCaller(
      makeCtx({
        user: {
          id: "user-2",
          email: "u@u.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(
      caller.deleteExchange({
        serverId: "srv-1",
        workspaceId: "ws-1",
        exchangeName: "old-exchange",
        vhost: "/",
        ifUnused: false,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
