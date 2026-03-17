import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();

vi.mock("../shared", () => ({
  verifyServerAccess: (...a: unknown[]) => mockVerifyServerAccess(...a),
  createRabbitMQClient: vi.fn(),
  createRabbitMQClientFromServer: vi.fn(),
  createAmqpClient: vi.fn(),
}));

const mockWorkspaceFindUnique = vi.fn();
const mockWorkspaceUpdate = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
      update: (...a: unknown[]) => mockWorkspaceUpdate(...a),
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
  getUserPlan: vi.fn().mockResolvedValue("DEVELOPER"),
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

vi.mock("@/core/utils", () => ({
  abortableSleep: vi.fn().mockResolvedValue(undefined),
}));

const mockAlertService = {
  getServerAlerts: vi.fn().mockResolvedValue({
    alerts: [
      {
        id: "a-1",
        severity: "warning",
        category: "queue",
        resolved: false,
        timestamp: new Date().toISOString(),
      },
    ],
    summary: { total: 1, critical: 0, warning: 1, info: 0 },
  }),
  getResolvedAlerts: vi.fn().mockResolvedValue({ alerts: [], total: 0 }),
  getHealthCheck: vi.fn().mockResolvedValue({ status: "healthy", checks: [] }),
  getWorkspaceThresholds: vi
    .fn()
    .mockResolvedValue({ queueMessageThreshold: 100 }),
  canModifyThresholds: vi.fn().mockResolvedValue(true),
  getDefaultThresholds: vi.fn().mockReturnValue({ queueMessageThreshold: 100 }),
  updateWorkspaceThresholds: vi
    .fn()
    .mockResolvedValue({ success: true, message: "Updated" }),
  getActiveAlertsFromDb: vi.fn().mockResolvedValue({
    alerts: [],
    summary: { total: 0, critical: 0, warning: 0, info: 0 },
  }),
};

vi.mock("@/services/alerts/alert.service", () => ({
  alertService: mockAlertService,
}));

// Import after mocks
const { alertsRouter } = await import("../alerts");

// --- Helpers ---

const mockServer = { id: "srv-1", name: "Test Server" };

function makeCtx(userId = "user-1", overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      workspace: {
        findUnique: mockWorkspaceFindUnique,
        update: mockWorkspaceUpdate,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: userId,
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

// --- getAlerts ---

describe("alertsRouter.getAlerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns full alerts for non-free users", async () => {
    const { getUserPlan } = await import("@/services/plan/plan.service");
    vi.mocked(getUserPlan).mockResolvedValue("DEVELOPER" as never);
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = alertsRouter.createCaller(makeCtx() as never);
    const result = await caller.getAlerts({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.success).toBe(true);
    expect(result.alerts).toHaveLength(1);
    expect(result.summary.total).toBe(1);
  });

  it("returns empty alerts for FREE plan users", async () => {
    const { getUserPlan } = await import("@/services/plan/plan.service");
    vi.mocked(getUserPlan).mockResolvedValue("FREE" as never);
    mockVerifyServerAccess.mockResolvedValue(mockServer);

    const caller = alertsRouter.createCaller(makeCtx() as never);
    const result = await caller.getAlerts({
      serverId: "srv-1",
      workspaceId: "ws-1",
    });

    expect(result.alerts).toHaveLength(0);
    expect(result.total).toBe(1); // Summary total still returned
  });

  it("throws NOT_FOUND when server not found", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = alertsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getAlerts({ serverId: "no-srv", workspaceId: "ws-1" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- getThresholds ---

describe("alertsRouter.getThresholds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns workspace thresholds", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1" });

    const caller = alertsRouter.createCaller(makeCtx() as never);
    const result = await caller.getThresholds();

    expect(result.success).toBe(true);
    expect(result.thresholds).toBeDefined();
    expect(result.canModify).toBe(true);
  });

  it("throws NOT_FOUND when workspace not found", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(null);

    const caller = alertsRouter.createCaller(makeCtx() as never);
    await expect(caller.getThresholds()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// --- updateThresholds ---

describe("alertsRouter.updateThresholds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates thresholds successfully", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1" });
    mockAlertService.updateWorkspaceThresholds.mockResolvedValue({
      success: true,
      message: "Updated",
    });

    const caller = alertsRouter.createCaller(makeCtx() as never);
    const result = await caller.updateThresholds({
      thresholds: { queueMessageThreshold: 200 },
    });

    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN when threshold update fails", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1" });
    mockAlertService.updateWorkspaceThresholds.mockResolvedValue({
      success: false,
      message: "Plan restriction",
    });

    const caller = alertsRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateThresholds({ thresholds: { queueMessageThreshold: 999 } })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// --- getNotificationSettings ---

describe("alertsRouter.getNotificationSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns notification settings with defaults", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      emailNotificationsEnabled: true,
      contactEmail: "owner@example.com",
      notificationSeverities: null,
      notificationServerIds: null,
      browserNotificationsEnabled: false,
      browserNotificationSeverities: null,
    });

    const caller = alertsRouter.createCaller(makeCtx() as never);
    const result = await caller.getNotificationSettings();

    expect(result.success).toBe(true);
    expect(result.settings.notificationSeverities).toEqual([
      "critical",
      "warning",
      "info",
    ]);
    expect(result.settings.notificationServerIds).toBeNull();
  });

  it("throws NOT_FOUND when workspace not found", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(null);

    const caller = alertsRouter.createCaller(makeCtx() as never);
    await expect(caller.getNotificationSettings()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// --- updateNotificationSettings ---

describe("alertsRouter.updateNotificationSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates settings when user is workspace owner", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ ownerId: "owner-1" });
    mockWorkspaceUpdate.mockResolvedValue({
      emailNotificationsEnabled: true,
      contactEmail: "new@example.com",
      notificationSeverities: ["critical"],
      notificationServerIds: null,
      browserNotificationsEnabled: false,
      browserNotificationSeverities: null,
    });

    const caller = alertsRouter.createCaller(makeCtx("owner-1") as never);
    const result = await caller.updateNotificationSettings({
      emailNotificationsEnabled: true,
      contactEmail: "new@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN when user is not workspace owner", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ ownerId: "owner-1" });

    const caller = alertsRouter.createCaller(makeCtx("user-99") as never);
    await expect(
      caller.updateNotificationSettings({ emailNotificationsEnabled: false })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
