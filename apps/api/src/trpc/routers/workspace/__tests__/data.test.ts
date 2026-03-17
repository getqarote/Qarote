import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockWorkspaceFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
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
  FEATURES: { DATA_EXPORT: "data_export" },
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
  getUserWorkspaceRole: vi.fn().mockResolvedValue("ADMIN"),
}));

// Import after mocks
const { dataRouter } = await import("../data");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      workspace: { findUnique: mockWorkspaceFindUnique },
      user: { findUnique: mockUserFindUnique },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    req: {},
    ...overrides,
  };
}

const mockWorkspaceBasic = {
  id: "ws-1",
  name: "Test Workspace",
  ownerId: "user-1",
};

const mockFullWorkspace = {
  id: "ws-1",
  name: "Test Workspace",
  ownerId: "user-1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-15"),
  members: [
    {
      id: "member-1",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      user: {
        id: "user-1",
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
        createdAt: new Date("2024-01-01"),
        lastLogin: new Date("2024-01-10"),
        subscription: { plan: "FREE", status: "ACTIVE" },
      },
    },
  ],
  servers: [
    {
      id: "srv-1",
      name: "prod-rabbit",
      host: "rabbit.example.com",
      port: 5672,
      createdAt: new Date("2024-01-03"),
    },
  ],
};

const mockOwner = {
  id: "user-1",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  subscription: { plan: "FREE", status: "ACTIVE" },
};

// --- Tests ---

describe("dataRouter.export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns serialized workspace data when workspace found", async () => {
    // First call: basic info
    mockWorkspaceFindUnique
      .mockResolvedValueOnce(mockWorkspaceBasic)
      // Second call: full workspace with includes
      .mockResolvedValueOnce(mockFullWorkspace);
    mockUserFindUnique.mockResolvedValue(mockOwner);

    const caller = dataRouter.createCaller(makeCtx() as never);
    const result = await caller.export({ workspaceId: "ws-1" });

    expect(result.workspace.id).toBe("ws-1");
    expect(result.workspace.name).toBe("Test Workspace");
    expect(result.exportedAt).toBeDefined();
    // Dates serialized to ISO strings
    expect(typeof result.workspace.createdAt).toBe("string");
    expect(typeof result.workspace.updatedAt).toBe("string");
    expect(typeof result.workspace.members[0].createdAt).toBe("string");
    expect(typeof result.workspace.servers[0].createdAt).toBe("string");
  });

  it("serializes member user dates to ISO strings", async () => {
    mockWorkspaceFindUnique
      .mockResolvedValueOnce(mockWorkspaceBasic)
      .mockResolvedValueOnce(mockFullWorkspace);
    mockUserFindUnique.mockResolvedValue(mockOwner);

    const caller = dataRouter.createCaller(makeCtx() as never);
    const result = await caller.export({ workspaceId: "ws-1" });

    const member = result.workspace.members[0];
    expect(typeof member.user.createdAt).toBe("string");
    expect(typeof member.user.lastLogin).toBe("string");
  });

  it("sets lastLogin to null when user has no lastLogin", async () => {
    const workspaceWithNullLogin = {
      ...mockFullWorkspace,
      members: [
        {
          ...mockFullWorkspace.members[0],
          user: { ...mockFullWorkspace.members[0].user, lastLogin: null },
        },
      ],
    };

    mockWorkspaceFindUnique
      .mockResolvedValueOnce(mockWorkspaceBasic)
      .mockResolvedValueOnce(workspaceWithNullLogin);
    mockUserFindUnique.mockResolvedValue(mockOwner);

    const caller = dataRouter.createCaller(makeCtx() as never);
    const result = await caller.export({ workspaceId: "ws-1" });

    expect(result.workspace.members[0].user.lastLogin).toBeNull();
  });

  it("throws NOT_FOUND when workspace does not exist (first lookup)", async () => {
    mockWorkspaceFindUnique.mockResolvedValueOnce(null);

    const caller = dataRouter.createCaller(makeCtx() as never);
    await expect(
      caller.export({ workspaceId: "ws-999" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when full workspace lookup returns null", async () => {
    mockWorkspaceFindUnique
      .mockResolvedValueOnce(mockWorkspaceBasic)
      .mockResolvedValueOnce(null);

    const caller = dataRouter.createCaller(makeCtx() as never);
    await expect(caller.export({ workspaceId: "ws-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("includes owner data when ownerId is set", async () => {
    mockWorkspaceFindUnique
      .mockResolvedValueOnce(mockWorkspaceBasic)
      .mockResolvedValueOnce(mockFullWorkspace);
    mockUserFindUnique.mockResolvedValue(mockOwner);

    const caller = dataRouter.createCaller(makeCtx() as never);
    const result = await caller.export({ workspaceId: "ws-1" });

    expect(result.workspace.owner).toEqual(mockOwner);
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    );
  });

  it("sets owner to null when workspace has no ownerId", async () => {
    const workspaceNoOwner = { ...mockWorkspaceBasic, ownerId: null };
    const fullWorkspaceNoOwner = { ...mockFullWorkspace, ownerId: null };

    mockWorkspaceFindUnique
      .mockResolvedValueOnce(workspaceNoOwner)
      .mockResolvedValueOnce(fullWorkspaceNoOwner);

    const caller = dataRouter.createCaller(makeCtx() as never);
    const result = await caller.export({ workspaceId: "ws-1" });

    expect(result.workspace.owner).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("includes exportedAt ISO timestamp", async () => {
    mockWorkspaceFindUnique
      .mockResolvedValueOnce(mockWorkspaceBasic)
      .mockResolvedValueOnce(mockFullWorkspace);
    mockUserFindUnique.mockResolvedValue(mockOwner);

    const caller = dataRouter.createCaller(makeCtx() as never);
    const result = await caller.export({ workspaceId: "ws-1" });

    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("throws TRPCError on unexpected error", async () => {
    mockWorkspaceFindUnique.mockRejectedValue(new Error("DB connection lost"));

    const caller = dataRouter.createCaller(makeCtx() as never);
    await expect(caller.export({ workspaceId: "ws-1" })).rejects.toThrow(
      TRPCError
    );
  });
});
