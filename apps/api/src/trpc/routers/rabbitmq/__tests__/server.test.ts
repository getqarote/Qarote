import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockRabbitMQServerFindMany = vi.fn();
const mockRabbitMQServerFindUnique = vi.fn();
const mockRabbitMQServerCreate = vi.fn();
const mockRabbitMQServerUpdate = vi.fn();
const mockRabbitMQServerDelete = vi.fn();
const mockGetOverview = vi.fn().mockResolvedValue({
  rabbitmq_version: "3.12.0",
  cluster_name: "test-cluster",
});

vi.mock("@/core/prisma", () => ({
  prisma: {
    rabbitMQServer: {
      findMany: (...a: unknown[]) => mockRabbitMQServerFindMany(...a),
      findUnique: (...a: unknown[]) => mockRabbitMQServerFindUnique(...a),
      create: (...a: unknown[]) => mockRabbitMQServerCreate(...a),
      update: (...a: unknown[]) => mockRabbitMQServerUpdate(...a),
      delete: (...a: unknown[]) => mockRabbitMQServerDelete(...a),
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
  validateServerCreation: vi.fn(),
  validateRabbitMqVersion: vi.fn(),
  extractMajorMinorVersion: vi.fn().mockReturnValue("3.12"),
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

vi.mock("@/services/encryption.service", () => ({
  EncryptionService: {
    encrypt: vi.fn((v: string) => `enc(${v})`),
    decrypt: vi.fn((v: string) => v.replace(/^enc\(|\)$/g, "")),
  },
}));

vi.mock("@/core/rabbitmq", () => ({
  RabbitMQClient: vi.fn().mockImplementation(() => ({
    getOverview: mockGetOverview,
  })),
}));

vi.mock("@/services/alerts/alert.default-rules", () => ({
  seedDefaultAlertRules: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
const { serverRouter } = await import("../server");

// --- Helpers ---

const now = new Date("2024-01-01");

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      rabbitMQServer: {
        findMany: mockRabbitMQServerFindMany,
        findUnique: mockRabbitMQServerFindUnique,
        create: mockRabbitMQServerCreate,
        update: mockRabbitMQServerUpdate,
        delete: mockRabbitMQServerDelete,
      },
    },
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

const mockServer = {
  id: "srv-1",
  name: "Test Server",
  host: "localhost",
  port: 15672,
  amqpPort: 5672,
  username: "enc(guest)",
  vhost: "/",
  useHttps: false,
  isOverQueueLimit: false,
  queueCountAtConnect: null,
  overLimitWarningShown: false,
  createdAt: now,
  updatedAt: now,
  workspaceId: "ws-1",
};

// --- getServers ---

describe("serverRouter.getServers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns decrypted server list", async () => {
    mockRabbitMQServerFindMany.mockResolvedValue([mockServer]);

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.getServers({ workspaceId: "ws-1" });

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].name).toBe("Test Server");
    expect(result.servers[0].username).toBe("guest"); // decrypted
    expect(typeof result.servers[0].createdAt).toBe("string");
  });

  it("returns empty array when no servers", async () => {
    mockRabbitMQServerFindMany.mockResolvedValue([]);

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.getServers({ workspaceId: "ws-1" });

    expect(result.servers).toHaveLength(0);
  });
});

// --- getServer ---

describe("serverRouter.getServer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns decrypted server by ID", async () => {
    mockRabbitMQServerFindUnique.mockResolvedValue(mockServer);

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.getServer({ id: "srv-1", workspaceId: "ws-1" });

    expect(result.server.id).toBe("srv-1");
    expect(result.server.username).toBe("guest");
    expect(typeof result.server.createdAt).toBe("string");
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockRabbitMQServerFindUnique.mockResolvedValue(null);

    const caller = serverRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getServer({ id: "no-server", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- deleteServer ---

describe("serverRouter.deleteServer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes server successfully", async () => {
    mockRabbitMQServerFindUnique.mockResolvedValue(mockServer);
    mockRabbitMQServerDelete.mockResolvedValue({});

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteServer({
      id: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.message).toBeDefined();
    expect(mockRabbitMQServerDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "srv-1" } })
    );
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockRabbitMQServerFindUnique.mockResolvedValue(null);

    const caller = serverRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteServer({ id: "no-server", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- testConnection ---

describe("serverRouter.testConnection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success when connection works", async () => {
    mockGetOverview.mockResolvedValue({
      rabbitmq_version: "3.12.0",
      cluster_name: "my-cluster",
    });

    const caller = serverRouter.createCaller(makeCtx() as never);
    const result = await caller.testConnection({
      workspaceId: "ws-1",
      host: "localhost",
      port: 15672,
      amqpPort: 5672,
      username: "guest",
      password: "guest",
      vhost: "/",
      useHttps: false,
    });

    expect(result.success).toBe(true);
    expect(result.version).toBe("3.12.0");
    expect(result.cluster_name).toBe("my-cluster");
  });

  it("throws BAD_REQUEST when connection fails", async () => {
    mockGetOverview.mockRejectedValue(new Error("Connection refused"));

    const caller = serverRouter.createCaller(makeCtx() as never);
    await expect(
      caller.testConnection({
        workspaceId: "ws-1",
        host: "badhost",
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
