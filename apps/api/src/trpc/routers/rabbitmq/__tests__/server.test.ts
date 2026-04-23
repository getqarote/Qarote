import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockServerFindMany = vi.fn();
const mockServerFindUnique = vi.fn();
const mockServerUpdate = vi.fn();
const mockServerDelete = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    rabbitMQServer: {
      findMany: (...a: unknown[]) => mockServerFindMany(...a),
      findUnique: (...a: unknown[]) => mockServerFindUnique(...a),
      update: (...a: unknown[]) => mockServerUpdate(...a),
      delete: (...a: unknown[]) => mockServerDelete(...a),
      create: vi.fn(),
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
  getOrgPlan: vi.fn().mockResolvedValue("FREE"),
  getOrgResourceCounts: vi
    .fn()
    .mockResolvedValue({ servers: 0, users: 0, workspaces: 0 }),
  validateServerCreation: vi.fn(),
  validateRabbitMqVersion: vi.fn(),
  extractMajorMinorVersion: vi.fn().mockReturnValue("3.12"),
}));

vi.mock("@/services/encryption.service", () => ({
  EncryptionService: {
    encrypt: vi.fn((v) => `enc:${v}`),
    decrypt: vi.fn((v) => v?.replace?.("enc:", "") ?? v),
    generateEncryptionKey: vi.fn().mockReturnValue("key-xyz"),
  },
}));

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClient = vi.fn();

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: (...a: unknown[]) => mockCreateRabbitMQClient(...a),
  createRabbitMQClientFromServer: vi.fn(),
}));

vi.mock("@/services/alerts/alert.default-rules", () => ({
  seedDefaultAlertRules: vi.fn().mockResolvedValue(undefined),
}));

const mockGetOverview = vi.fn();
vi.mock("@/core/rabbitmq", () => {
  return {
    RabbitMQClient: class {
      getOverview = mockGetOverview;
    },
    RabbitMQAmqpClientFactory: { createClient: vi.fn() },
    QueuePauseState: {},
  };
});

const { serverRouter } = await import("../server");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      rabbitMQServer: {
        findMany: mockServerFindMany,
        findUnique: mockServerFindUnique,
        update: mockServerUpdate,
        delete: mockServerDelete,
      },
    },
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
  name: "My RabbitMQ",
  host: "rabbitmq.example.com",
  port: 15672,
  amqpPort: 5672,
  username: "enc:guest",
  password: "enc:password",
  vhost: "/",
  useHttps: false,
  isOverQueueLimit: false,
  queueCountAtConnect: null,
  overLimitWarningShown: false,
  workspaceId: "ws-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  workspace: { id: "ws-1", name: "Test WS" },
};

// --- Tests ---

describe("serverRouter.getServers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns servers for workspace with decrypted username", async () => {
    mockServerFindMany.mockResolvedValue([mockServer]);

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.getServers({ workspaceId: "ws-1" });

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].username).toBe("guest"); // decrypted
    expect(mockServerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws-1" } })
    );
  });

  it("returns empty array when no servers", async () => {
    mockServerFindMany.mockResolvedValue([]);

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.getServers({ workspaceId: "ws-1" });

    expect(result.servers).toHaveLength(0);
  });
});

describe("serverRouter.getServer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when server does not exist", async () => {
    mockServerFindUnique.mockResolvedValue(null);

    const caller = serverRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getServer({ id: "srv-999", workspaceId: "ws-1" })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns server with decrypted username", async () => {
    mockServerFindUnique.mockResolvedValue(mockServer);

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.getServer({ id: "srv-1", workspaceId: "ws-1" });

    expect(result.server.id).toBe("srv-1");
    expect(result.server.username).toBe("guest"); // decrypted
  });
});

describe("serverRouter.deleteServer (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when server does not exist in workspace", async () => {
    mockServerFindUnique.mockResolvedValue(null);

    const caller = serverRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteServer({ id: "srv-999", workspaceId: "ws-1" })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes server and returns success message", async () => {
    mockServerFindUnique.mockResolvedValue(mockServer);
    mockServerDelete.mockResolvedValue({});

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteServer({
      id: "srv-1",
      workspaceId: "ws-1",
    });

    expect(mockServerDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "srv-1" } })
    );
    expect(result.message).toBeDefined();
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = serverRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@u.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(
      caller.deleteServer({ id: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("serverRouter.testConnection (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with version info when connection works", async () => {
    mockGetOverview.mockResolvedValue({
      rabbitmq_version: "3.12.0",
      cluster_name: "test-cluster",
    });

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.testConnection({
      workspaceId: "ws-1",
      host: "rabbitmq.example.com",
      port: 15672,
      amqpPort: 5672,
      username: "guest",
      password: "guest",
      vhost: "/",
      useHttps: false,
    });

    expect(result.success).toBe(true);
    expect(result.version).toBe("3.12.0");
    expect(result.cluster_name).toBe("test-cluster");
  });

  it("throws BAD_REQUEST when connection fails", async () => {
    mockGetOverview.mockRejectedValue(new Error("Connection refused"));

    const caller = serverRouter.createCaller(makeCtx() as never);
    await expect(
      caller.testConnection({
        workspaceId: "ws-1",
        host: "bad.host",
        port: 15672,
        amqpPort: 5672,
        username: "guest",
        password: "wrong",
        vhost: "/",
        useHttps: false,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
