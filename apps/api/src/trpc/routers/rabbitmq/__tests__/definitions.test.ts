import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClientFromServer = vi.fn();

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
  createRabbitMQClientFromServer: (...a: unknown[]) =>
    mockCreateRabbitMQClientFromServer(...a),
}));

const { definitionsRouter } = await import("../definitions");

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

const mockServer = { id: "srv-1", workspaceId: "ws-1" };

const mockDefinitions = {
  rabbit_version: "3.12.0",
  queues: [{ name: "my-queue", vhost: "/" }],
  exchanges: [],
  bindings: [],
};

// --- Tests ---

describe("definitionsRouter.getDefinitions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = definitionsRouter.createCaller(
      makeCtx({
        user: {
          id: "user-2",
          email: "user@test.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(
      caller.getDefinitions({ serverId: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = definitionsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getDefinitions({ serverId: "srv-999", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns definitions for all vhosts when no vhost provided", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      getDefinitions: vi.fn().mockResolvedValue(mockDefinitions),
    };
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = definitionsRouter.createCaller(makeCtx() as never);
    const result = await caller.getDefinitions({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result).toEqual(mockDefinitions);
    expect(mockClient.getDefinitions).toHaveBeenCalledWith(undefined);
  });

  it("passes decoded vhost to client.getDefinitions", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      getDefinitions: vi.fn().mockResolvedValue(mockDefinitions),
    };
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = definitionsRouter.createCaller(makeCtx() as never);
    await caller.getDefinitions({
      serverId: "srv-1",
      workspaceId: "ws-1",
      vhost: "%2F",
    });

    expect(mockClient.getDefinitions).toHaveBeenCalledWith("/");
  });
});

describe("definitionsRouter.importDefinitions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = definitionsRouter.createCaller(
      makeCtx({
        user: {
          id: "user-2",
          email: "user@test.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(
      caller.importDefinitions({
        serverId: "srv-1",
        workspaceId: "ws-1",
        definitions: mockDefinitions,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = definitionsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.importDefinitions({
        serverId: "srv-999",
        workspaceId: "ws-1",
        definitions: mockDefinitions,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("calls uploadDefinitions and returns undefined on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      uploadDefinitions: vi.fn().mockResolvedValue(undefined),
    };
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = definitionsRouter.createCaller(makeCtx() as never);
    const result = await caller.importDefinitions({
      serverId: "srv-1",
      workspaceId: "ws-1",
      definitions: mockDefinitions,
    });

    expect(mockClient.uploadDefinitions).toHaveBeenCalledWith(
      mockDefinitions,
      undefined
    );
    expect(result).toBeUndefined();
  });

  it("passes decoded vhost to uploadDefinitions", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      uploadDefinitions: vi.fn().mockResolvedValue(undefined),
    };
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);

    const caller = definitionsRouter.createCaller(makeCtx() as never);
    await caller.importDefinitions({
      serverId: "srv-1",
      workspaceId: "ws-1",
      definitions: mockDefinitions,
      vhost: "%2F",
    });

    expect(mockClient.uploadDefinitions).toHaveBeenCalledWith(
      mockDefinitions,
      "/"
    );
  });
});
