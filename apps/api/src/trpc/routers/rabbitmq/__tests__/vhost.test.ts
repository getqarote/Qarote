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
  VHostMapper: {
    toApiResponseArray: vi.fn((vs) => vs),
    toApiResponse: vi.fn((v) => v),
  },
}));

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: (...a: unknown[]) => mockCreateRabbitMQClient(...a),
  createRabbitMQClientFromServer: vi.fn(),
}));

const { vhostRouter } = await import("../vhost");

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
  host: "rabbitmq.example.com",
  port: 15672,
  useHttps: false,
  workspaceId: "ws-1",
};

const mockClient = {
  getVHosts: vi.fn().mockResolvedValue([]),
  getVHost: vi.fn().mockResolvedValue({ name: "my-vhost", tracing: false }),
  getVHostPermissions: vi.fn().mockResolvedValue([]),
  getVHostLimits: vi.fn().mockResolvedValue({}),
  getQueues: vi.fn().mockResolvedValue([]),
  getExchanges: vi.fn().mockResolvedValue([]),
  getConnections: vi.fn().mockResolvedValue([]),
  createVHost: vi.fn().mockResolvedValue(undefined),
  deleteVHost: vi.fn().mockResolvedValue(undefined),
  updateVHost: vi.fn().mockResolvedValue(undefined),
  setUserPermissions: vi.fn().mockResolvedValue(undefined),
  deleteUserPermissions: vi.fn().mockResolvedValue(undefined),
  setVHostLimit: vi.fn().mockResolvedValue(undefined),
  deleteVHostLimit: vi.fn().mockResolvedValue(undefined),
};

// --- Tests ---

describe("vhostRouter.getVHosts (ADMIN or MEMBER)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getVHosts({ serverId: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns vhosts list on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.getVHosts.mockResolvedValue([{ name: "/", tracing: false }]);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    const result = await caller.getVHosts({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.success).toBe(true);
    expect(result.vhosts).toBeDefined();
    expect(mockClient.getVHosts).toHaveBeenCalled();
  });

  it("throws FORBIDDEN when user is USER role", async () => {
    const caller = vhostRouter.createCaller(
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
      caller.getVHosts({ serverId: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("succeeds when user is MEMBER role", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.getVHosts.mockResolvedValue([]);

    const caller = vhostRouter.createCaller(
      makeCtx({
        user: {
          id: "user-3",
          email: "m@m.com",
          isActive: true,
          role: "MEMBER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    const result = await caller.getVHosts({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.success).toBe(true);
  });
});

describe("vhostRouter.createVHost (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createVHost({
        serverId: "srv-1",
        workspaceId: "ws-1",
        name: "new-vhost",
        tracing: false,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates vhost and returns success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    const result = await caller.createVHost({
      serverId: "srv-1",
      workspaceId: "ws-1",
      name: "new-vhost",
      tracing: false,
    });

    expect(result.success).toBe(true);
    expect(mockClient.createVHost).toHaveBeenCalledWith(
      expect.objectContaining({ name: "new-vhost" })
    );
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = vhostRouter.createCaller(
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
      caller.createVHost({
        serverId: "srv-1",
        workspaceId: "ws-1",
        name: "new-vhost",
        tracing: false,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("vhostRouter.deleteVHost (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteVHost({
        serverId: "srv-1",
        workspaceId: "ws-1",
        vhostName: "old-vhost",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when trying to delete the default vhost", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteVHost({
        serverId: "srv-1",
        workspaceId: "ws-1",
        vhostName: "/",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deletes vhost and returns success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = vhostRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteVHost({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhostName: "old-vhost",
    });

    expect(result.success).toBe(true);
    expect(mockClient.deleteVHost).toHaveBeenCalledWith("old-vhost");
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = vhostRouter.createCaller(
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
      caller.deleteVHost({
        serverId: "srv-1",
        workspaceId: "ws-1",
        vhostName: "old-vhost",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
