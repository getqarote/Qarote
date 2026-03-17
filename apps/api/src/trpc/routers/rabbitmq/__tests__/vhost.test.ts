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
  VHostMapper: {
    toApiResponseArray: vi.fn((a) => a),
    toApiResponse: vi.fn((v) => v),
  },
}));

// Import after mocks
const { vhostRouter } = await import("../vhost");

// --- Helpers ---

const mockRabbitClient = {
  getVHosts: vi.fn().mockResolvedValue([{ name: "/" }, { name: "test-vhost" }]),
  getVHost: vi.fn().mockResolvedValue({ name: "test-vhost" }),
  getVHostPermissions: vi.fn().mockResolvedValue([]),
  getVHostLimits: vi.fn().mockResolvedValue({}),
  getQueues: vi.fn().mockResolvedValue([]),
  getExchanges: vi.fn().mockResolvedValue([]),
  getConnections: vi.fn().mockResolvedValue([]),
  deleteVHost: vi.fn().mockResolvedValue({}),
  createVHost: vi.fn().mockResolvedValue({}),
  updateVHost: vi.fn().mockResolvedValue({}),
  setUserPermissions: vi.fn().mockResolvedValue({}),
  deleteUserPermissions: vi.fn().mockResolvedValue({}),
  setVHostLimit: vi.fn().mockResolvedValue({}),
  deleteVHostLimit: vi.fn().mockResolvedValue({}),
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

// --- getVHosts ---

describe("vhostRouter.getVHosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("returns vhosts list", async () => {
    const caller = vhostRouter.createCaller(makeCtx() as never);
    const result = await caller.getVHosts({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.success).toBe(true);
    expect(result.vhosts).toHaveLength(2);
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getVHosts({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- deleteVHost ---

describe("vhostRouter.deleteVHost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("deletes vhost successfully", async () => {
    const caller = vhostRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteVHost({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhostName: "test-vhost",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("test-vhost");
    expect(mockRabbitClient.deleteVHost).toHaveBeenCalledWith("test-vhost");
  });

  it("throws BAD_REQUEST when deleting default vhost", async () => {
    const caller = vhostRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteVHost({
        serverId: "srv-1",
        workspaceId: "ws-1",
        vhostName: "/",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteVHost({
        serverId: "no-srv",
        workspaceId: "ws-1",
        vhostName: "v",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- createVHost ---

describe("vhostRouter.createVHost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("creates vhost and returns it", async () => {
    const caller = vhostRouter.createCaller(makeCtx() as never);
    const result = await caller.createVHost({
      serverId: "srv-1",
      workspaceId: "ws-1",
      name: "new-vhost",
    });

    expect(result.success).toBe(true);
    expect(result.vhost.name).toBe("new-vhost");
    expect(mockRabbitClient.createVHost).toHaveBeenCalledOnce();
  });
});

// --- setLimit ---

describe("vhostRouter.setLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("sets vhost limit successfully", async () => {
    const caller = vhostRouter.createCaller(makeCtx() as never);
    const result = await caller.setLimit({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhostName: "test-vhost",
      limitType: "max-queues",
      value: 100,
    });

    expect(result.success).toBe(true);
    expect(mockRabbitClient.setVHostLimit).toHaveBeenCalledWith(
      "test-vhost",
      "max-queues",
      { value: 100 }
    );
  });
});
