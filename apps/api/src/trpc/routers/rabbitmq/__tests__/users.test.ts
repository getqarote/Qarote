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
  UserMapper: {
    toApiResponseArray: vi.fn((a) => a),
    toApiResponse: vi.fn((u) => u),
  },
}));

// Import after mocks
const { usersRouter } = await import("../users");

// --- Helpers ---

const mockRabbitUser = {
  name: "guest",
  password_hash: "...",
  hashing_algorithm: "rabbit_password_hashing_sha256",
  tags: ["administrator"],
};

const mockRabbitClient = {
  getUsers: vi.fn().mockResolvedValue([mockRabbitUser]),
  getUser: vi.fn().mockResolvedValue(mockRabbitUser),
  getUserPermissions: vi
    .fn()
    .mockResolvedValue([
      { vhost: "/", configure: ".*", write: ".*", read: ".*" },
    ]),
  createUser: vi.fn().mockResolvedValue({}),
  updateUser: vi.fn().mockResolvedValue({}),
  deleteUser: vi.fn().mockResolvedValue({}),
  setUserPermissions: vi.fn().mockResolvedValue({}),
  deleteUserPermissions: vi.fn().mockResolvedValue({}),
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

// --- getUsers ---

describe("usersRouter.getUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("returns list of RabbitMQ users", async () => {
    const caller = usersRouter.createCaller(makeCtx() as never);
    const result = await caller.getUsers({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].name).toBe("guest");
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = usersRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getUsers({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- getUser ---

describe("usersRouter.getUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("returns user details with permissions", async () => {
    const caller = usersRouter.createCaller(makeCtx() as never);
    const result = await caller.getUser({
      serverId: "srv-1",
      workspaceId: "ws-1",
      username: "guest",
    });

    expect(result.user.name).toBe("guest");
    expect(result.permissions).toHaveLength(1);
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = usersRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getUser({
        serverId: "no-srv",
        workspaceId: "ws-1",
        username: "guest",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- createUser ---

describe("usersRouter.createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("creates user and returns success message", async () => {
    const caller = usersRouter.createCaller(makeCtx() as never);
    const result = await caller.createUser({
      serverId: "srv-1",
      workspaceId: "ws-1",
      username: "newuser",
      password: "password123",
      tags: "monitoring",
    });

    expect(result.message).toBe("User created successfully");
    expect(mockRabbitClient.createUser).toHaveBeenCalledWith("newuser", {
      password: "password123",
      tags: "monitoring",
    });
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = usersRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createUser({
        serverId: "no-srv",
        workspaceId: "ws-1",
        username: "u",
        password: "p",
        tags: "",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- deleteUser ---

describe("usersRouter.deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("deletes user and returns success message", async () => {
    const caller = usersRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteUser({
      serverId: "srv-1",
      workspaceId: "ws-1",
      username: "guest",
    });

    expect(result.message).toBe("User deleted successfully");
    expect(mockRabbitClient.deleteUser).toHaveBeenCalledWith("guest");
  });
});

// --- setPermissions ---

describe("usersRouter.setPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
  });

  it("sets user permissions and returns success", async () => {
    const caller = usersRouter.createCaller(makeCtx() as never);
    const result = await caller.setPermissions({
      serverId: "srv-1",
      workspaceId: "ws-1",
      username: "guest",
      vhost: "/",
      configure: ".*",
      write: ".*",
      read: ".*",
    });

    expect(result.message).toBe("Permissions set successfully");
    expect(mockRabbitClient.setUserPermissions).toHaveBeenCalledOnce();
  });
});
