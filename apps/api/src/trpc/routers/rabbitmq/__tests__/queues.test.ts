import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClientFromServer = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    rabbitMQServer: { update: vi.fn() },
    workspaceMember: {
      findFirst: vi.fn().mockResolvedValue({
        id: "mem-1",
        roleId: null,
        role: null,
        workspace: { organizationId: null, licenseTier: null },
      }),
    },
    queue: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "q-1" }),
      delete: vi.fn().mockResolvedValue({}),
    },
    queueMetric: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockResolvedValue(undefined),
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
  getOrgPlan: vi.fn().mockResolvedValue("FREE"),
  getOrgResourceCounts: vi
    .fn()
    .mockResolvedValue({ servers: 0, users: 0, workspaces: 0 }),
  validateQueueCreationOnServer: vi.fn(),
}));

vi.mock("@/mappers/rabbitmq", () => ({
  QueueMapper: {
    toApiResponseArray: vi.fn((qs) => qs),
    toApiResponse: vi.fn((q) => q),
  },
  ConsumerMapper: { toApiResponseArray: vi.fn((cs) => cs) },
  BindingMapper: { toApiResponseArray: vi.fn((bs) => bs) },
}));

vi.mock("@/core/rabbitmq/AmqpClient", () => ({ RabbitMQAmqpClient: class {} }));
vi.mock("@/core/utils", () => ({ abortableSleep: vi.fn() }));

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: vi.fn(),
  createRabbitMQClientFromServer: (...a: unknown[]) =>
    mockCreateRabbitMQClientFromServer(...a),
  createAmqpClient: vi.fn(),
  createStandaloneAmqpConnection: vi.fn(),
}));

const { MAX_QUEUES_PER_SERVER } = await import("@/services/queue-limit");
const { queuesRouter } = await import("../queues");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  const role = ((overrides.user as { role?: string }) ?? {}).role ?? "ADMIN";
  const perms =
    role === "ADMIN" || role === "OWNER"
      ? new Set([
          "queue:read",
          "queue:create",
          "queue:delete",
          "queue:purge",
          "binding:read",
        ])
      : new Set<string>();
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
  name: "Test Server",
  host: "rabbitmq.example.com",
  port: 15672,
  amqpPort: 5672,
  username: "enc:guest",
  password: "enc:password",
  vhost: "/",
  useHttps: false,
  isOverQueueLimit: false,
  queueCountAtConnect: null,
  workspaceId: "ws-1",
  workspace: { id: "ws-1", name: "Test WS" },
};

const mockClient = {
  getQueues: vi.fn().mockResolvedValue([]),
  getQueue: vi.fn().mockResolvedValue({ name: "test-queue", vhost: "/" }),
  createQueue: vi.fn().mockResolvedValue({ name: "new-queue" }),
  deleteQueue: vi.fn().mockResolvedValue(undefined),
  purgeQueue: vi.fn().mockResolvedValue(undefined),
  getQueueConsumers: vi.fn().mockResolvedValue([]),
  getQueueBindings: vi.fn().mockResolvedValue([]),
};

// --- Tests ---

describe("queuesRouter.getQueues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getQueues({ serverId: "srv-1", workspaceId: "ws-1" })
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

  it("returns queue list on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.getQueues.mockResolvedValue([
      { name: "q1", vhost: "/", messages: 0 },
    ]);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueues({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.queues).toBeDefined();
    expect(mockClient.getQueues).toHaveBeenCalled();
  });

  // The ceiling stops metrics collection server-side. If the API does not say
  // so, the customer sees their data freeze with no explanation — the whole
  // point of the payload is that the UI can render a reason.
  it("explains itself when the server is over the ceiling", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      ...mockServer,
      isOverQueueLimit: true,
      queueCountAtConnect: 120,
    });
    mockClient.getQueues.mockResolvedValue(
      Array.from({ length: 120 }, (_, i) => ({
        name: `q${i}`,
        vhost: "/",
        messages: 0,
      }))
    );

    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueues({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.warning).toMatchObject({
      isOverLimit: true,
      currentQueueCount: 120,
      limit: MAX_QUEUES_PER_SERVER,
    });
    // Translated for the caller's locale, not a key or a raw template.
    expect(result.warning?.message).toContain("120");
    expect(result.warning?.message).not.toContain("{{");
    // No tier raises this ceiling: an upsell here would be a dead end.
    expect(result.warning).not.toHaveProperty("recommendedPlan");
    expect(result.warning?.message.toLowerCase()).not.toContain("upgrade");
  });

  it("stays silent while the server is under the ceiling", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.getQueues.mockResolvedValue([
      { name: "q1", vhost: "/", messages: 0 },
    ]);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueues({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.warning).toBeUndefined();
  });

  // The ceiling is broker-wide; the list in the response is not. Both callers
  // pass a vhost filter, so quoting the returned list would tell a customer with
  // a 150-queue broker that "12 queues" exceed a limit of 100.
  it("quotes the broker-wide count, not the filtered view", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      ...mockServer,
      isOverQueueLimit: true,
      queueCountAtConnect: 150,
    });
    mockClient.getQueues.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        name: `q${i}`,
        vhost: "/prod",
        messages: 0,
      }))
    );

    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.getQueues({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhost: "/prod",
    });

    expect(result.warning?.currentQueueCount).toBe(150);
    expect(result.warning?.message).toContain("150");
    expect(result.warning?.message).not.toContain("12 ");
  });
});

describe("queuesRouter.createQueue (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createQueue({
        serverId: "srv-1",
        workspaceId: "ws-1",
        vhost: "/",
        name: "my-queue",
        durable: true,
        autoDelete: false,
        exclusive: false,
        arguments: {},
        routingKey: "",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates queue and returns success on valid input", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.createQueue.mockResolvedValue({ name: "my-queue" });

    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.createQueue({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhost: "/",
      name: "my-queue",
      durable: true,
      autoDelete: false,
      exclusive: false,
      arguments: {},
      routingKey: "",
    });

    expect(result.success).toBe(true);
    expect(mockClient.createQueue).toHaveBeenCalledWith(
      "my-queue",
      "/",
      expect.objectContaining({ durable: true })
    );
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = queuesRouter.createCaller(
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
      caller.createQueue({
        serverId: "srv-1",
        workspaceId: "ws-1",
        vhost: "/",
        name: "my-queue",
        durable: true,
        autoDelete: false,
        exclusive: false,
        arguments: {},
        routingKey: "",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("queuesRouter.deleteQueue (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteQueue({
        serverId: "srv-1",
        workspaceId: "ws-1",
        queueName: "old-queue",
        vhost: "/",
        ifUnused: false,
        ifEmpty: false,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes queue and returns success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.deleteQueue.mockResolvedValue(undefined);

    const caller = queuesRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteQueue({
      serverId: "srv-1",
      workspaceId: "ws-1",
      queueName: "old-queue",
      vhost: "/",
      ifUnused: false,
      ifEmpty: false,
    });

    expect(result.success).toBe(true);
    expect(mockClient.deleteQueue).toHaveBeenCalledWith(
      "old-queue",
      "/",
      expect.any(Object)
    );
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = queuesRouter.createCaller(
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
      caller.deleteQueue({
        serverId: "srv-1",
        workspaceId: "ws-1",
        queueName: "old-queue",
        vhost: "/",
        ifUnused: false,
        ifEmpty: false,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
