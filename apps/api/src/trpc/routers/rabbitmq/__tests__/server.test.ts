import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockServerFindMany = vi.fn();
const mockServerFindUnique = vi.fn();
const mockServerUpdate = vi.fn();
const mockServerDelete = vi.fn();
const mockServerCreate = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    rabbitMQServer: {
      findMany: (...a: unknown[]) => mockServerFindMany(...a),
      findUnique: (...a: unknown[]) => mockServerFindUnique(...a),
      update: (...a: unknown[]) => mockServerUpdate(...a),
      delete: (...a: unknown[]) => mockServerDelete(...a),
      create: (...a: unknown[]) => mockServerCreate(...a),
    },
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

vi.mock("@/services/alerts/alert-seeding.service", () => ({
  seedDefaultAlertRules: vi.fn().mockResolvedValue(undefined),
}));
// Partial: the FORBIDDEN paths still go through the real recordAuditLog.
vi.mock("@/services/audit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/audit")>()),
  recordFromContext: vi.fn(),
  recordCapabilityRecheck: vi.fn(),
}));
vi.mock("@/services/feature-gate/capability-refresh", () => ({
  refreshServerCapabilities: vi.fn().mockResolvedValue(undefined),
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
  const role = ((overrides.user as { role?: string }) ?? {}).role ?? "ADMIN";
  const serverPerms =
    role === "ADMIN"
      ? new Set([
          "server:read",
          "server:create",
          "server:update",
          "server:delete",
          "server:test_connection",
        ])
      : new Set(["server:read"]);
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
    effectivePermissionsLoader: {
      load: vi.fn().mockResolvedValue({
        kind: "builtin",
        role,
        permissions: serverPerms,
        scopeRows: [],
      }),
    },
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
  queueLimitOverride: null,
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

  it("throws FORBIDDEN when the caller is not an ADMIN", async () => {
    const caller = serverRouter.createCaller(
      makeCtx({
        user: {
          id: "user-2",
          email: "member@test.com",
          isActive: true,
          role: "MEMBER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(
      caller.testConnection({
        workspaceId: "ws-1",
        host: "rabbitmq.example.com",
        port: 15672,
        amqpPort: 5672,
        username: "guest",
        password: "guest",
        vhost: "/",
        useHttps: false,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockGetOverview).not.toHaveBeenCalled();
  });
});

describe("serverRouter.createServer — queue ceiling at connect", () => {
  beforeEach(() => {
    mockServerCreate.mockReset();
    mockGetOverview.mockReset();
  });

  const input = {
    workspaceId: "ws-1",
    name: "Big broker",
    host: "rabbitmq.example.com",
    port: 15672,
    amqpPort: 5672,
    username: "guest",
    password: "guest",
    vhost: "/",
    useHttps: false,
  };

  it("admits a broker above the ceiling, flagged, instead of refusing it", async () => {
    // Refusing left "contact us" with no row to grant an exception on. The
    // broker is stored with the flag set, so the cron skips it and the
    // override has something to attach to.
    mockGetOverview.mockResolvedValue({
      rabbitmq_version: "4.1.0",
      object_totals: { queues: 348 },
    });
    mockServerCreate.mockImplementation(async ({ data }) => ({
      ...mockServer,
      id: "srv-new",
      ...data,
    }));

    const ctx = makeCtx();
    const caller = serverRouter.createCaller(ctx as never);
    await expect(caller.createServer(input)).resolves.toBeDefined();

    expect(mockServerCreate).toHaveBeenCalledTimes(1);
    expect(mockServerCreate.mock.calls[0]![0].data).toMatchObject({
      isOverQueueLimit: true,
      queueCountAtConnect: 348,
    });
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ queueCount: 348, limit: 100 }),
      expect.stringContaining("admitted above the queue ceiling")
    );
  });

  it("stores a broker at or below the ceiling unflagged", async () => {
    mockGetOverview.mockResolvedValue({
      rabbitmq_version: "4.1.0",
      object_totals: { queues: 100 },
    });
    mockServerCreate.mockImplementation(async ({ data }) => ({
      ...mockServer,
      id: "srv-new",
      ...data,
    }));

    const caller = serverRouter.createCaller(makeCtx() as never);
    await caller.createServer(input);

    expect(mockServerCreate.mock.calls[0]![0].data).toMatchObject({
      isOverQueueLimit: false,
      queueCountAtConnect: 100,
    });
  });
});
