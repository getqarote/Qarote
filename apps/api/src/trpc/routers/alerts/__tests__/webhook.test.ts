import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockWebhookFindMany = vi.fn();
const mockWebhookFindFirst = vi.fn();
const mockWebhookCreate = vi.fn();
const mockWebhookUpdate = vi.fn();
const mockWebhookDelete = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    webhook: {
      findMany: (...a: unknown[]) => mockWebhookFindMany(...a),
      findFirst: (...a: unknown[]) => mockWebhookFindFirst(...a),
      create: (...a: unknown[]) => mockWebhookCreate(...a),
      update: (...a: unknown[]) => mockWebhookUpdate(...a),
      delete: (...a: unknown[]) => mockWebhookDelete(...a),
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
  FEATURES: { WEBHOOK_INTEGRATION: "webhook_integration" },
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

// Import after mocks
const { webhookRouter } = await import("../webhook");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      webhook: {
        findMany: mockWebhookFindMany,
        findFirst: mockWebhookFindFirst,
        create: mockWebhookCreate,
        update: mockWebhookUpdate,
        delete: mockWebhookDelete,
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

const mockWebhook = {
  id: "wh-1",
  url: "https://hooks.example.com/notify",
  enabled: true,
  secret: null,
  version: "v1",
  workspaceId: "ws-1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// --- getWebhooks ---

describe("webhookRouter.getWebhooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns serialized webhooks list", async () => {
    mockWebhookFindMany.mockResolvedValue([mockWebhook]);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    const result = await caller.getWebhooks();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("wh-1");
    expect(typeof result[0].createdAt).toBe("string");
    expect(typeof result[0].updatedAt).toBe("string");
  });

  it("returns empty array when no webhooks", async () => {
    mockWebhookFindMany.mockResolvedValue([]);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    expect(await caller.getWebhooks()).toHaveLength(0);
  });

  it("filters by workspaceId", async () => {
    mockWebhookFindMany.mockResolvedValue([]);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    await caller.getWebhooks();

    expect(mockWebhookFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws-1" },
      })
    );
  });
});

// --- createWebhook ---

describe("webhookRouter.createWebhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates webhook with url and version=v1", async () => {
    mockWebhookCreate.mockResolvedValue(mockWebhook);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    const result = await caller.createWebhook({
      url: "https://hooks.example.com/notify",
    });

    expect(result.id).toBe("wh-1");
    expect(mockWebhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: "v1", workspaceId: "ws-1" }),
      })
    );
  });

  it("defaults enabled to true when not specified", async () => {
    mockWebhookCreate.mockResolvedValue(mockWebhook);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    await caller.createWebhook({ url: "https://hooks.example.com/notify" });

    expect(mockWebhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ enabled: true }),
      })
    );
  });

  it("stores secret as null when not provided", async () => {
    mockWebhookCreate.mockResolvedValue(mockWebhook);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    await caller.createWebhook({ url: "https://hooks.example.com/notify" });

    expect(mockWebhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ secret: null }),
      })
    );
  });

  it("stores secret when provided", async () => {
    mockWebhookCreate.mockResolvedValue({
      ...mockWebhook,
      secret: "my-secret",
    });

    const caller = webhookRouter.createCaller(makeCtx() as never);
    await caller.createWebhook({
      url: "https://hooks.example.com/notify",
      secret: "my-secret",
    });

    expect(mockWebhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ secret: "my-secret" }),
      })
    );
  });
});

// --- updateWebhook ---

describe("webhookRouter.updateWebhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates webhook when it belongs to workspace", async () => {
    mockWebhookFindFirst.mockResolvedValue(mockWebhook);
    mockWebhookUpdate.mockResolvedValue({
      ...mockWebhook,
      url: "https://hooks.example.com/updated",
    });

    const caller = webhookRouter.createCaller(makeCtx() as never);
    const result = await caller.updateWebhook({
      id: "wh-1",
      url: "https://hooks.example.com/updated",
    });

    expect(result.url).toBe("https://hooks.example.com/updated");
    expect(mockWebhookUpdate).toHaveBeenCalledOnce();
  });

  it("throws NOT_FOUND when webhook does not belong to workspace", async () => {
    mockWebhookFindFirst.mockResolvedValue(null);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateWebhook({ id: "wh-other", url: "https://x.com" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockWebhookUpdate).not.toHaveBeenCalled();
  });
});

// --- deleteWebhook ---

describe("webhookRouter.deleteWebhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes webhook successfully", async () => {
    mockWebhookFindFirst.mockResolvedValue(mockWebhook);
    mockWebhookDelete.mockResolvedValue(mockWebhook);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteWebhook({ id: "wh-1" });

    expect(result.message).toBe("Webhook deleted successfully");
    expect(mockWebhookDelete).toHaveBeenCalledWith({ where: { id: "wh-1" } });
  });

  it("throws NOT_FOUND when webhook does not exist", async () => {
    mockWebhookFindFirst.mockResolvedValue(null);

    const caller = webhookRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteWebhook({ id: "nonexistent" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockWebhookDelete).not.toHaveBeenCalled();
  });
});
