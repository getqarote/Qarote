import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockVerifyServerAccess = vi.fn();
const mockCreateRabbitMQClient = vi.fn();

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
  createRabbitMQClient: (...a: unknown[]) => mockCreateRabbitMQClient(...a),
}));

const { policiesRouter } = await import("../policies");

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

const mockPolicies = [
  {
    name: "ha-all",
    vhost: "/",
    pattern: ".*",
    "apply-to": "all",
    definition: { "ha-mode": "all" },
    priority: 0,
  },
];

const baseInput = { serverId: "srv-1", workspaceId: "ws-1" };

// --- Tests ---

describe("policiesRouter.getPolicies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = policiesRouter.createCaller(makeCtx() as never);
    await expect(caller.getPolicies(baseInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns policies list on success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = { getPolicies: vi.fn().mockResolvedValue(mockPolicies) };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = policiesRouter.createCaller(makeCtx() as never);
    const result = await caller.getPolicies(baseInput);

    expect(result.success).toBe(true);
    expect(result.policies).toEqual(mockPolicies);
    expect(result.totalPolicies).toBe(1);
    expect(mockClient.getPolicies).toHaveBeenCalledWith(undefined);
  });

  it("passes decoded vhost to client.getPolicies", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = { getPolicies: vi.fn().mockResolvedValue([]) };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = policiesRouter.createCaller(makeCtx() as never);
    await caller.getPolicies({ ...baseInput, vhost: "%2F" });

    expect(mockClient.getPolicies).toHaveBeenCalledWith("/");
  });
});

describe("policiesRouter.createOrUpdatePolicy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = policiesRouter.createCaller(
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
      caller.createOrUpdatePolicy({
        ...baseInput,
        vhost: "/",
        name: "ha-all",
        pattern: ".*",
        applyTo: "all",
        definition: { "ha-mode": "all" },
        priority: 0,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = policiesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createOrUpdatePolicy({
        ...baseInput,
        vhost: "/",
        name: "ha-all",
        pattern: ".*",
        applyTo: "all",
        definition: { "ha-mode": "all" },
        priority: 0,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("calls createOrUpdatePolicy and returns success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = {
      createOrUpdatePolicy: vi.fn().mockResolvedValue(undefined),
    };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = policiesRouter.createCaller(makeCtx() as never);
    const result = await caller.createOrUpdatePolicy({
      ...baseInput,
      vhost: "%2F",
      name: "ha-all",
      pattern: ".*",
      applyTo: "all",
      definition: { "ha-mode": "all" },
      priority: 0,
    });

    expect(result.success).toBe(true);
    expect(mockClient.createOrUpdatePolicy).toHaveBeenCalledWith(
      "/",
      "ha-all",
      {
        pattern: ".*",
        "apply-to": "all",
        definition: { "ha-mode": "all" },
        priority: 0,
      }
    );
  });
});

describe("policiesRouter.deletePolicy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = policiesRouter.createCaller(
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
      caller.deletePolicy({ ...baseInput, vhost: "/", policyName: "ha-all" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when verifyServerAccess returns null", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);

    const caller = policiesRouter.createCaller(makeCtx() as never);
    await expect(
      caller.deletePolicy({ ...baseInput, vhost: "/", policyName: "ha-all" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("calls deletePolicy and returns success", async () => {
    mockVerifyServerAccess.mockResolvedValue(mockServer);
    const mockClient = { deletePolicy: vi.fn().mockResolvedValue(undefined) };
    mockCreateRabbitMQClient.mockResolvedValue(mockClient);

    const caller = policiesRouter.createCaller(makeCtx() as never);
    const result = await caller.deletePolicy({
      ...baseInput,
      vhost: "%2F",
      policyName: "ha-all",
    });

    expect(result.success).toBe(true);
    expect(mockClient.deletePolicy).toHaveBeenCalledWith("/", "ha-all");
  });
});
