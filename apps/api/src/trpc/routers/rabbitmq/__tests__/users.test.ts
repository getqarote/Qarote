import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClientFromServer = vi.fn();

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

vi.mock("@/services/encryption.service", () => ({
  EncryptionService: {
    encrypt: vi.fn((v) => `enc:${v}`),
    decrypt: vi.fn((v) => v?.replace?.("enc:", "") ?? v),
  },
}));

vi.mock("@/mappers/rabbitmq", () => ({
  UserMapper: {
    toApiResponseArray: vi.fn((us) => us),
    toApiResponse: vi.fn((u) => u),
  },
}));

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: vi.fn(),
  createRabbitMQClientFromServer: (...a: unknown[]) =>
    mockCreateRabbitMQClientFromServer(...a),
}));

const { usersRouter } = await import("../users");

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
  username: "enc:guest",
  password: "enc:password",
  vhost: "/",
  useHttps: false,
  workspaceId: "ws-1",
};

const mockClient = {
  getUsers: vi.fn().mockResolvedValue([]),
  getUser: vi
    .fn()
    .mockResolvedValue({
      name: "alice",
      tags: "administrator",
      password_hash: "hash123",
    }),
  getUserPermissions: vi.fn().mockResolvedValue([]),
  createUser: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn().mockResolvedValue(undefined),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  setUserPermissions: vi.fn().mockResolvedValue(undefined),
  deleteUserPermissions: vi.fn().mockResolvedValue(undefined),
};

// --- Tests ---

describe("usersRouter.getUsers (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = usersRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getUsers({ serverId: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns users list on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockClient.getUsers.mockResolvedValue([
      { name: "alice", tags: "administrator" },
      { name: "bob", tags: "" },
    ]);
    mockClient.getUserPermissions.mockResolvedValue([{ vhost: "/" }]);

    const caller = usersRouter.createCaller(makeCtx() as never);
    const result = await caller.getUsers({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.users).toBeDefined();
    expect(mockClient.getUsers).toHaveBeenCalled();
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = usersRouter.createCaller(
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
      caller.getUsers({ serverId: "srv-1", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("usersRouter.createUser (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = usersRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createUser({
        serverId: "srv-1",
        workspaceId: "ws-1",
        username: "newuser",
        password: "pass123",
        tags: "",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates user and returns success message", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = usersRouter.createCaller(makeCtx() as never);
    const result = await caller.createUser({
      serverId: "srv-1",
      workspaceId: "ws-1",
      username: "newuser",
      password: "pass123",
      tags: "",
    });

    expect(result.message).toBeDefined();
    expect(mockClient.createUser).toHaveBeenCalledWith(
      "newuser",
      expect.objectContaining({ password: "pass123" })
    );
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = usersRouter.createCaller(
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
      caller.createUser({
        serverId: "srv-1",
        workspaceId: "ws-1",
        username: "newuser",
        password: "pass123",
        tags: "",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("usersRouter.deleteUser (ADMIN only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClientFromServer.mockReturnValue(mockClient);
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = usersRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteUser({
        serverId: "srv-1",
        workspaceId: "ws-1",
        username: "olduser",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN when trying to delete the connection user", async () => {
    // EncryptionService.decrypt is mocked to strip "enc:" prefix, so "enc:guest" → "guest"
    mockVerifyServerAccess.mockResolvedValue({
      ...mockServer,
      username: "enc:guest",
    });

    const caller = usersRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteUser({
        serverId: "srv-1",
        workspaceId: "ws-1",
        username: "guest",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deletes user and returns success message", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = usersRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteUser({
      serverId: "srv-1",
      workspaceId: "ws-1",
      username: "olduser",
    });

    expect(result.message).toBeDefined();
    expect(mockClient.deleteUser).toHaveBeenCalledWith("olduser");
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = usersRouter.createCaller(
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
      caller.deleteUser({
        serverId: "srv-1",
        workspaceId: "ws-1",
        username: "olduser",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
