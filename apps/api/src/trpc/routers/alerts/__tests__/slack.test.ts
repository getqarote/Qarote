import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockSlackConfigFindMany = vi.fn();
const mockSlackConfigFindFirst = vi.fn();
const mockSlackConfigCreate = vi.fn();
const mockSlackConfigUpdate = vi.fn();
const mockSlackConfigDelete = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    slackConfig: {
      findMany: (...a: unknown[]) => mockSlackConfigFindMany(...a),
      findFirst: (...a: unknown[]) => mockSlackConfigFindFirst(...a),
      create: (...a: unknown[]) => mockSlackConfigCreate(...a),
      update: (...a: unknown[]) => mockSlackConfigUpdate(...a),
      delete: (...a: unknown[]) => mockSlackConfigDelete(...a),
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
  FEATURES: { SLACK_INTEGRATION: "slack_integration" },
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

// Import after mocks
const { slackRouter } = await import("../slack");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      slackConfig: {
        findMany: mockSlackConfigFindMany,
        findFirst: mockSlackConfigFindFirst,
        create: mockSlackConfigCreate,
        update: mockSlackConfigUpdate,
        delete: mockSlackConfigDelete,
      },
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

const mockConfig = {
  id: "slack-1",
  webhookUrl: "https://hooks.slack.com/services/T00/B00/xxx",
  customValue: null,
  enabled: true,
  workspaceId: "ws-1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// --- getConfigs ---

describe("slackRouter.getConfigs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns serialized slack configs", async () => {
    mockSlackConfigFindMany.mockResolvedValue([mockConfig]);

    const caller = slackRouter.createCaller(makeCtx() as never);
    const result = await caller.getConfigs();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("slack-1");
    expect(typeof result[0].createdAt).toBe("string");
    expect(typeof result[0].updatedAt).toBe("string");
  });

  it("returns empty array when no configs", async () => {
    mockSlackConfigFindMany.mockResolvedValue([]);

    const caller = slackRouter.createCaller(makeCtx() as never);
    expect(await caller.getConfigs()).toHaveLength(0);
  });

  it("filters by workspaceId", async () => {
    mockSlackConfigFindMany.mockResolvedValue([]);

    const caller = slackRouter.createCaller(makeCtx() as never);
    await caller.getConfigs();

    expect(mockSlackConfigFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws-1" } })
    );
  });
});

// --- createConfig ---

describe("slackRouter.createConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates slack config with webhookUrl", async () => {
    mockSlackConfigCreate.mockResolvedValue(mockConfig);

    const caller = slackRouter.createCaller(makeCtx() as never);
    const result = await caller.createConfig({
      webhookUrl: "https://hooks.slack.com/services/T00/B00/xxx",
    });

    expect(result.id).toBe("slack-1");
    expect(mockSlackConfigCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          webhookUrl: "https://hooks.slack.com/services/T00/B00/xxx",
          workspaceId: "ws-1",
        }),
      })
    );
  });

  it("defaults enabled to true", async () => {
    mockSlackConfigCreate.mockResolvedValue(mockConfig);

    const caller = slackRouter.createCaller(makeCtx() as never);
    await caller.createConfig({
      webhookUrl: "https://hooks.slack.com/services/T00/B00/xxx",
    });

    expect(mockSlackConfigCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ enabled: true }),
      })
    );
  });

  it("stores customValue as null when not provided", async () => {
    mockSlackConfigCreate.mockResolvedValue(mockConfig);

    const caller = slackRouter.createCaller(makeCtx() as never);
    await caller.createConfig({
      webhookUrl: "https://hooks.slack.com/services/T00/B00/xxx",
    });

    expect(mockSlackConfigCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customValue: null }),
      })
    );
  });
});

// --- updateConfig ---

describe("slackRouter.updateConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates config when it belongs to workspace", async () => {
    mockSlackConfigFindFirst.mockResolvedValue(mockConfig);
    mockSlackConfigUpdate.mockResolvedValue({ ...mockConfig, enabled: false });

    const caller = slackRouter.createCaller(makeCtx() as never);
    const result = await caller.updateConfig({ id: "slack-1", enabled: false });

    expect(result.enabled).toBe(false);
    expect(mockSlackConfigUpdate).toHaveBeenCalledOnce();
  });

  it("throws NOT_FOUND when config does not belong to workspace", async () => {
    mockSlackConfigFindFirst.mockResolvedValue(null);

    const caller = slackRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateConfig({ id: "other", enabled: false })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockSlackConfigUpdate).not.toHaveBeenCalled();
  });
});

// --- deleteConfig ---

describe("slackRouter.deleteConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes config successfully", async () => {
    mockSlackConfigFindFirst.mockResolvedValue(mockConfig);
    mockSlackConfigDelete.mockResolvedValue(mockConfig);

    const caller = slackRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteConfig({ id: "slack-1" });

    expect(result.message).toBe("Slack configuration deleted successfully");
    expect(mockSlackConfigDelete).toHaveBeenCalledWith({
      where: { id: "slack-1" },
    });
  });

  it("throws NOT_FOUND when config does not exist", async () => {
    mockSlackConfigFindFirst.mockResolvedValue(null);

    const caller = slackRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteConfig({ id: "nonexistent" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockSlackConfigDelete).not.toHaveBeenCalled();
  });
});
