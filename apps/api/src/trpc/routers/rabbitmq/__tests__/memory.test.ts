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

// Import after mocks
const { memoryRouter } = await import("../memory");

// --- Helpers ---

const mockNode = {
  name: "rabbit@localhost",
  running: true,
  uptime: 100000,
  mem_limit: 8_000_000_000,
  mem_used: 1_000_000_000,
  mem_alarm: false,
  mem_calculation_strategy: "rss",
  fd_used: 50,
  fd_total: 1024,
  sockets_used: 10,
  sockets_total: 900,
  proc_used: 100,
  proc_total: 1_000_000,
  gc_num: 500,
  gc_bytes_reclaimed: 10_000_000,
  gc_num_details: { rate: 5 },
  io_read_count: 100,
  io_read_bytes: 10_000,
  io_read_avg_time: 0.5,
  io_write_count: 50,
  io_write_bytes: 5_000,
  io_write_avg_time: 0.3,
  io_sync_count: 20,
  io_sync_avg_time: 0.1,
  mnesia_ram_tx_count: 200,
  mnesia_disk_tx_count: 10,
  msg_store_read_count: 30,
  msg_store_write_count: 40,
  queue_index_read_count: 15,
  queue_index_write_count: 25,
  run_queue: 0,
  processors: 4,
  context_switches: 1000,
  disk_free_alarm: false,
  mem_used_details: { rate: 100 },
  disk_free_details: { rate: -50 },
  fd_used_details: { rate: 0 },
  sockets_used_details: { rate: 0 },
  proc_used_details: { rate: 1 },
};

const mockRabbitClient = {
  getNodes: vi.fn().mockResolvedValue([mockNode]),
};

const mockServer = {
  id: "srv-1",
  name: "Test Server",
  workspace: { id: "ws-1" },
};

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

// --- getNodeMemory ---

describe("memoryRouter.getNodeMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("returns basic memory metrics for a node", async () => {
    const caller = memoryRouter.createCaller(makeCtx() as never);
    const result = await caller.getNodeMemory({
      serverId: "srv-1",
      workspaceId: "ws-1",
      nodeName: "rabbit@localhost",
    });

    expect(result.node.name).toBe("rabbit@localhost");
    expect(result.node.immediate.totalMemory).toBe(8_000_000_000);
    expect(result.node.immediate.usedMemory).toBe(1_000_000_000);
    expect(result.planAccess.hasBasic).toBe(true);
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = memoryRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getNodeMemory({
        serverId: "no-srv",
        workspaceId: "ws-1",
        nodeName: "rabbit@localhost",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when server has no workspace", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      ...mockServer,
      workspace: null,
    });

    const caller = memoryRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getNodeMemory({
        serverId: "srv-1",
        workspaceId: "ws-1",
        nodeName: "rabbit@localhost",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when node not found", async () => {
    mockRabbitClient.getNodes.mockResolvedValue([]);

    const caller = memoryRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getNodeMemory({
        serverId: "srv-1",
        workspaceId: "ws-1",
        nodeName: "no-such-node",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("calculates memory usage percentage correctly", async () => {
    const caller = memoryRouter.createCaller(makeCtx() as never);
    const result = await caller.getNodeMemory({
      serverId: "srv-1",
      workspaceId: "ws-1",
      nodeName: "rabbit@localhost",
    });

    const expectedPercentage = (1_000_000_000 / 8_000_000_000) * 100;
    expect(result.node.immediate.memoryUsagePercentage).toBeCloseTo(
      expectedPercentage
    );
  });
});
