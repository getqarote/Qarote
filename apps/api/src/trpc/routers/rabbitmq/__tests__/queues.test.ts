import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClientFromServer = vi.fn();
const mockCreateAmqpClient = vi.fn();

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: vi.fn(),
  createRabbitMQClientFromServer: (...a: unknown[]) =>
    mockCreateRabbitMQClientFromServer(...a),
  createAmqpClient: (...a: unknown[]) => mockCreateAmqpClient(...a),
}));

const mockQueueTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    $transaction: (...a: unknown[]) => mockQueueTransaction(...a),
    queue: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "q-1" }),
      upsert: vi.fn().mockResolvedValue({ id: "q-db-1" }),
      delete: vi.fn().mockResolvedValue({}),
    },
    queueMetric: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
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
  getUserResourceCounts: vi.fn().mockResolvedValue({ servers: 1, users: 2 }),
  validateQueueCreationOnServer: vi.fn(),
  getOverLimitWarningMessage: vi.fn().mockReturnValue("Over limit"),
  getUpgradeRecommendationForOverLimit: vi.fn().mockReturnValue({
    message: "Upgrade",
    recommendedPlan: "ENTERPRISE",
  }),
  getPlanDisplayName: vi.fn().mockReturnValue("Enterprise"),
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
  QueueMapper: {
    toApiResponseArray: vi.fn((a) => a),
    toApiResponse: vi.fn((q) => q),
  },
  BindingMapper: { toApiResponseArray: vi.fn((a) => a) },
  ConsumerMapper: { toApiResponseArray: vi.fn((a) => a) },
}));

vi.mock("@/core/utils", () => ({
  abortableSleep: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
const { queuesRouter } = await import("../queues");

// --- Helpers ---

const mockRabbitClient = {
  getQueues: vi.fn().mockResolvedValue([
    {
      name: "test-queue",
      vhost: "/",
      messages: 5,
      messages_ready: 3,
      messages_unacknowledged: 2,
      consumers: 1,
      message_stats: {
        publish_details: { rate: 1 },
        deliver_details: { rate: 0.5 },
      },
    },
  ]),
  getQueue: vi
    .fn()
    .mockResolvedValue({ name: "test-queue", vhost: "/", messages: 5 }),
  getQueueConsumers: vi.fn().mockResolvedValue([]),
  getQueueBindings: vi.fn().mockResolvedValue([]),
  createQueue: vi.fn().mockResolvedValue({ name: "new-queue" }),
  purgeQueue: vi.fn().mockResolvedValue({}),
  deleteQueue: vi.fn().mockResolvedValue({}),
};

const mockAmqpClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  pauseQueue: vi.fn().mockResolvedValue({
    queueName: "test-queue",
    isPaused: true,
    pausedAt: new Date(),
  }),
  resumeQueue: vi.fn().mockResolvedValue({
    queueName: "test-queue",
    isPaused: false,
    resumedAt: new Date(),
  }),
  getQueuePauseState: vi.fn().mockReturnValue(null),
  disconnect: vi.fn().mockResolvedValue(undefined),
};

const mockServer = {
  id: "srv-1",
  name: "Test Server",
  isOverQueueLimit: false,
  workspace: { id: "ws-1" },
  queueCountAtConnect: null,
  overLimitWarningShown: false,
  workspaceId: "ws-1",
  vhost: "/",
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

// --- getQueues ---

describe("queuesRouter.getQueues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockRabbitClient);
    mockQueueTransaction.mockImplementation(
      async (cb: (tx: unknown) => unknown) => {
        const tx = {
          queue: { upsert: vi.fn().mockResolvedValue({ id: "q-db-1" }) },
          queueMetric: { create: vi.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      }
    );
  });

  it("returns queues for valid server", async () => {
    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueues({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.queues).toHaveLength(1);
    expect(result.queues[0].name).toBe("test-queue");
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getQueues({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when server has no workspace", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      ...mockServer,
      workspace: null,
    });

    const caller = queuesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getQueues({ serverId: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- getQueue ---

describe("queuesRouter.getQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockRabbitClient);
  });

  it("returns a specific queue", async () => {
    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueue({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "test-queue",
      vhost: encodeURIComponent("/"),
    });

    expect(result.queue.name).toBe("test-queue");
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getQueue({
        serverId: "no-srv",
        workspaceId: "ws-1",
        queueName: "q",
        vhost: "%2F",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- purgeQueue ---

describe("queuesRouter.purgeQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockRabbitClient);
  });

  it("purges queue and returns success", async () => {
    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.purgeQueue({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "test-queue",
      vhost: "%2F",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("purged");
    expect(mockRabbitClient.purgeQueue).toHaveBeenCalledOnce();
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.purgeQueue({
        serverId: "no-srv",
        workspaceId: "ws-1",
        queueName: "q",
        vhost: "%2F",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- pauseQueue ---

describe("queuesRouter.pauseQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateAmqpClient.mockResolvedValue(mockAmqpClient);
  });

  it("pauses a queue via AMQP", async () => {
    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.pauseQueue({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "test-queue",
    });

    expect(result.success).toBe(true);
    expect(result.pauseState.isPaused).toBe(true);
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.pauseQueue({
        serverId: "no-srv",
        workspaceId: "ws-1",
        queueName: "q",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
