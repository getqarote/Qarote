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

const { memoryRouter } = await import("../memory");

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
  workspace: { id: "ws-1", name: "Test WS" },
};

const mockNode = {
  name: "rabbit@node1",
  running: true,
  uptime: 1000000,
  mem_limit: 8589934592,
  mem_used: 2147483648,
  mem_alarm: false,
  mem_calculation_strategy: "rss",
  fd_used: 100,
  fd_total: 1024,
  sockets_used: 10,
  sockets_total: 100,
  proc_used: 200,
  proc_total: 1048576,
  gc_num: 5000,
  gc_bytes_reclaimed: 100000,
  gc_num_details: { rate: 10 },
  io_read_count: 1000,
  io_read_bytes: 500000,
  io_read_avg_time: 0.5,
  io_write_count: 2000,
  io_write_bytes: 1000000,
  io_write_avg_time: 0.3,
  io_sync_count: 500,
  io_sync_avg_time: 0.1,
  mnesia_ram_tx_count: 100,
  mnesia_disk_tx_count: 50,
  msg_store_read_count: 300,
  msg_store_write_count: 400,
  queue_index_read_count: 200,
  queue_index_write_count: 300,
  run_queue: 0,
  processors: 4,
  context_switches: 10000,
  disk_free_alarm: false,
  mem_used_details: { rate: 1024 },
  disk_free_details: { rate: -512 },
  fd_used_details: { rate: 0 },
  sockets_used_details: { rate: 0 },
  proc_used_details: { rate: 0 },
};

// --- Tests ---

describe("memoryRouter.getNodeMemory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = memoryRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getNodeMemory({
        serverId: "srv-999",
        workspaceId: "ws-1",
        nodeName: "rabbit@node1",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when server has no workspace", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      ...mockServer,
      workspace: null,
    });
    const mockClient = { getNodes: vi.fn().mockResolvedValue([mockNode]) };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = memoryRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getNodeMemory({
        serverId: "srv-1",
        workspaceId: "ws-1",
        nodeName: "rabbit@node1",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when the requested node is not in the list", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = { getNodes: vi.fn().mockResolvedValue([mockNode]) };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = memoryRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getNodeMemory({
        serverId: "srv-1",
        workspaceId: "ws-1",
        nodeName: "rabbit@nonexistent",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns node memory data on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = { getNodes: vi.fn().mockResolvedValue([mockNode]) };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = memoryRouter.createCaller(makeCtx() as never);
    const result = await caller.getNodeMemory({
      serverId: "srv-1",
      workspaceId: "ws-1",
      nodeName: "rabbit@node1",
    });

    expect(result.node.name).toBe("rabbit@node1");
    expect(result.node.running).toBe(true);
    expect(result.node.immediate).toBeDefined();
    expect(result.node.immediate.totalMemory).toBe(mockNode.mem_limit);
    expect(result.node.immediate.usedMemory).toBe(mockNode.mem_used);
    expect(result.planAccess.hasBasic).toBe(true);
    expect(mockClient.getNodes).toHaveBeenCalledOnce();
  });

  it("returns correct memory usage percentage", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = { getNodes: vi.fn().mockResolvedValue([mockNode]) };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = memoryRouter.createCaller(makeCtx() as never);
    const result = await caller.getNodeMemory({
      serverId: "srv-1",
      workspaceId: "ws-1",
      nodeName: "rabbit@node1",
    });

    const expectedPct = (mockNode.mem_used / mockNode.mem_limit) * 100;
    expect(result.node.immediate.memoryUsagePercentage).toBeCloseTo(
      expectedPct
    );
  });
});
