import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockAlertRuleFindMany = vi.fn();
const mockAlertRuleFindFirst = vi.fn();
const mockAlertRuleCreate = vi.fn();
const mockAlertRuleUpdate = vi.fn();
const mockAlertRuleDelete = vi.fn();
const mockRabbitMQServerFindFirst = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    alertRule: {
      findMany: (...a: unknown[]) => mockAlertRuleFindMany(...a),
      findFirst: (...a: unknown[]) => mockAlertRuleFindFirst(...a),
      create: (...a: unknown[]) => mockAlertRuleCreate(...a),
      update: (...a: unknown[]) => mockAlertRuleUpdate(...a),
      delete: (...a: unknown[]) => mockAlertRuleDelete(...a),
    },
    rabbitMQServer: {
      findFirst: (...a: unknown[]) => mockRabbitMQServerFindFirst(...a),
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
  FEATURES: {
    ALERTING: "alerting",
    ADVANCED_ALERT_RULES: "advanced_alert_rules",
  },
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

// Import after mocks
const { rulesRouter } = await import("../rules");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      alertRule: {
        findMany: mockAlertRuleFindMany,
        findFirst: mockAlertRuleFindFirst,
        create: mockAlertRuleCreate,
        update: mockAlertRuleUpdate,
        delete: mockAlertRuleDelete,
      },
      rabbitMQServer: { findFirst: mockRabbitMQServerFindFirst },
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

const mockRule = {
  id: "rule-1",
  name: "High Queue Depth",
  description: "Alert when queue depth > 1000",
  type: "QUEUE_DEPTH",
  threshold: 1000,
  operator: "GREATER_THAN",
  severity: "HIGH",
  enabled: true,
  isDefault: false,
  serverId: "srv-1",
  workspaceId: "ws-1",
  createdById: "user-1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  server: { id: "srv-1", name: "prod-rabbit", host: "rabbit.example.com" },
  user: {
    id: "user-1",
    firstName: "Admin",
    lastName: "User",
    email: "admin@test.com",
  },
  _count: { alerts: 3 },
};

const mockServer = { id: "srv-1", name: "prod-rabbit", workspaceId: "ws-1" };

// --- getRules ---

describe("rulesRouter.getRules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns serialized rules list for workspace", async () => {
    mockAlertRuleFindMany.mockResolvedValue([mockRule]);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    const result = await caller.getRules();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rule-1");
    expect(typeof result[0].createdAt).toBe("string");
    expect(typeof result[0].updatedAt).toBe("string");
  });

  it("returns empty array when no rules exist", async () => {
    mockAlertRuleFindMany.mockResolvedValue([]);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    const result = await caller.getRules();

    expect(result).toHaveLength(0);
  });

  it("filters by workspaceId", async () => {
    mockAlertRuleFindMany.mockResolvedValue([]);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await caller.getRules();

    expect(mockAlertRuleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-1" }),
      })
    );
  });
});

// --- getRule ---

describe("rulesRouter.getRule", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rule when found", async () => {
    mockAlertRuleFindFirst.mockResolvedValue(mockRule);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    const result = await caller.getRule({ id: "rule-1" });

    expect(result.id).toBe("rule-1");
    expect(typeof result.createdAt).toBe("string");
  });

  it("throws NOT_FOUND when rule does not exist", async () => {
    mockAlertRuleFindFirst.mockResolvedValue(null);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await expect(caller.getRule({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("looks up rule scoped to workspaceId", async () => {
    mockAlertRuleFindFirst.mockResolvedValue(mockRule);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await caller.getRule({ id: "rule-1" });

    expect(mockAlertRuleFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-1", id: "rule-1" }),
      })
    );
  });
});

// --- createRule ---

describe("rulesRouter.createRule", () => {
  beforeEach(() => vi.clearAllMocks());

  const createInput = {
    name: "New Rule",
    type: "QUEUE_DEPTH" as const,
    threshold: 500,
    operator: "GREATER_THAN" as const,
    severity: "MEDIUM" as const,
    serverId: "srv-1",
    enabled: true,
  };

  it("creates rule when server belongs to workspace", async () => {
    mockRabbitMQServerFindFirst.mockResolvedValue(mockServer);
    mockAlertRuleCreate.mockResolvedValue(mockRule);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    const result = await caller.createRule(createInput);

    expect(result.id).toBe("rule-1");
    expect(mockAlertRuleCreate).toHaveBeenCalledOnce();
  });

  it("throws NOT_FOUND when server does not belong to workspace", async () => {
    mockRabbitMQServerFindFirst.mockResolvedValue(null);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await expect(caller.createRule(createInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(mockAlertRuleCreate).not.toHaveBeenCalled();
  });
});

// --- updateRule ---

describe("rulesRouter.updateRule", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates rule successfully", async () => {
    mockAlertRuleFindFirst.mockResolvedValue(mockRule);
    mockAlertRuleUpdate.mockResolvedValue({
      ...mockRule,
      name: "Updated Rule",
    });

    const caller = rulesRouter.createCaller(makeCtx() as never);
    const result = await caller.updateRule({
      id: "rule-1",
      name: "Updated Rule",
    });

    expect(result.name).toBe("Updated Rule");
  });

  it("throws NOT_FOUND when rule does not exist", async () => {
    mockAlertRuleFindFirst.mockResolvedValue(null);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateRule({ id: "nonexistent", name: "X" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows toggling enabled on a default rule", async () => {
    const defaultRule = { ...mockRule, isDefault: true };
    mockAlertRuleFindFirst.mockResolvedValue(defaultRule);
    mockAlertRuleUpdate.mockResolvedValue({ ...defaultRule, enabled: false });

    const caller = rulesRouter.createCaller(makeCtx() as never);
    const result = await caller.updateRule({ id: "rule-1", enabled: false });

    expect(result.enabled).toBe(false);
    expect(mockAlertRuleUpdate).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when trying to modify structural fields of default rule", async () => {
    const defaultRule = { ...mockRule, isDefault: true };
    mockAlertRuleFindFirst.mockResolvedValue(defaultRule);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateRule({ id: "rule-1", name: "Cannot Change Name" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mockAlertRuleUpdate).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when updating serverId to non-workspace server", async () => {
    mockAlertRuleFindFirst.mockResolvedValue(mockRule);
    mockRabbitMQServerFindFirst.mockResolvedValue(null); // new server not in workspace

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.updateRule({ id: "rule-1", serverId: "other-srv" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- deleteRule ---

describe("rulesRouter.deleteRule", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes rule successfully", async () => {
    mockAlertRuleFindFirst.mockResolvedValue(mockRule);
    mockAlertRuleDelete.mockResolvedValue(mockRule);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    const result = await caller.deleteRule({ id: "rule-1" });

    expect(result.message).toBe("Alert rule deleted successfully");
    expect(mockAlertRuleDelete).toHaveBeenCalledWith({
      where: { id: "rule-1" },
    });
  });

  it("throws NOT_FOUND when rule does not exist", async () => {
    mockAlertRuleFindFirst.mockResolvedValue(null);

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deleteRule({ id: "nonexistent" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN when trying to delete a default rule", async () => {
    mockAlertRuleFindFirst.mockResolvedValue({ ...mockRule, isDefault: true });

    const caller = rulesRouter.createCaller(makeCtx() as never);
    await expect(caller.deleteRule({ id: "rule-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(mockAlertRuleDelete).not.toHaveBeenCalled();
  });
});
