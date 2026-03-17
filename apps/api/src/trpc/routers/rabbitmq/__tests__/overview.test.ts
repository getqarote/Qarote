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
  getUserPlan: vi.fn().mockResolvedValue("DEVELOPER"),
  getOverLimitWarningMessage: vi.fn().mockReturnValue("You are over limit"),
  getUpgradeRecommendationForOverLimit: vi.fn().mockReturnValue({
    message: "Upgrade to Enterprise",
    recommendedPlan: "ENTERPRISE",
  }),
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
  OverviewMapper: { toApiResponse: vi.fn((o) => o) },
  QueueMapper: {
    toApiResponseArray: vi.fn((a) => a),
    toApiResponse: vi.fn((q) => q),
  },
  NodeMapper: { toApiResponseArray: vi.fn((a) => a) },
  ExchangeMapper: { toApiResponseArray: vi.fn((a) => a) },
  BindingMapper: { toApiResponseArray: vi.fn((a) => a) },
  ConsumerMapper: { toApiResponseArray: vi.fn((a) => a) },
  UserMapper: {
    toApiResponseArray: vi.fn((a) => a),
    toApiResponse: vi.fn((u) => u),
  },
  VHostMapper: {
    toApiResponseArray: vi.fn((a) => a),
    toApiResponse: vi.fn((v) => v),
  },
}));

// Import after mocks
const { overviewRouter } = await import("../overview");

// --- Helpers ---

const mockRabbitmqOverview = {
  rabbitmq_version: "3.12.0",
  cluster_name: "rabbit@localhost",
  queue_totals: { messages: 10 },
};

const mockRabbitClient = {
  getOverview: vi.fn().mockResolvedValue(mockRabbitmqOverview),
};

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "admin@example.com",
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

// --- getOverview ---

describe("overviewRouter.getOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRabbitMQClient.mockResolvedValue(mockRabbitClient);
    mockRabbitClient.getOverview.mockResolvedValue(mockRabbitmqOverview);
  });

  it("returns overview for valid server", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      id: "srv-1",
      name: "Test Server",
      isOverQueueLimit: false,
      workspace: { id: "ws-1" },
      queueCountAtConnect: null,
      overLimitWarningShown: false,
    });

    const caller = overviewRouter.createCaller(makeCtx() as never);
    const result = await caller.getOverview({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.overview).toBeDefined();
    expect(result.warning).toBeUndefined();
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = overviewRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getOverview({ serverId: "no-server", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("includes warning when server is over queue limit", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      id: "srv-1",
      name: "Test Server",
      isOverQueueLimit: true,
      workspace: { id: "ws-1" },
      queueCountAtConnect: 100,
      overLimitWarningShown: true,
    });

    const caller = overviewRouter.createCaller(makeCtx() as never);
    const result = await caller.getOverview({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.warning).toBeDefined();
    expect(result.warning?.isOverLimit).toBe(true);
  });
});
