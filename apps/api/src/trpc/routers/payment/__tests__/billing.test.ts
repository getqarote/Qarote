import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockPaymentFindMany = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    workspace: {
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
    },
    payment: { findMany: (...a: unknown[]) => mockPaymentFindMany(...a) },
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
  getUserResourceCounts: vi.fn().mockResolvedValue({ servers: 1, users: 2 }),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/core/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
  getLicensePayload: vi.fn(),
  invalidateLicenseCache: vi.fn(),
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

const mockCreatePortalSession = vi.fn();
const mockGetSubscription = vi.fn();
const mockGetUpcomingInvoice = vi.fn();
const mockGetCustomer = vi.fn();
const mockGetPaymentMethod = vi.fn();
const mockTransformPaymentDescription = vi.fn().mockReturnValue("Pro Plan");

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    createPortalSession: (...a: unknown[]) => mockCreatePortalSession(...a),
    getSubscription: (...a: unknown[]) => mockGetSubscription(...a),
    getUpcomingInvoice: (...a: unknown[]) => mockGetUpcomingInvoice(...a),
    getCustomer: (...a: unknown[]) => mockGetCustomer(...a),
    getPaymentMethod: (...a: unknown[]) => mockGetPaymentMethod(...a),
    transformPaymentDescription: (...a: unknown[]) =>
      mockTransformPaymentDescription(...a),
  },
}));

vi.mock("@/config", () => ({
  config: { FRONTEND_URL: "https://app.example.com" },
  emailConfig: { frontendUrl: "https://app.example.com" },
}));

// Import after mocks
const { billingRouter } = await import("../billing");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
      workspace: { findUnique: mockWorkspaceFindUnique },
      payment: { findMany: mockPaymentFindMany },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "MEMBER",
      isActive: true,
      email: "user@example.com",
      workspaceId: "ws-1",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: null,
    },
    locale: "en",
    req: {},
    ...overrides,
  };
}

const mockSubscription = {
  id: "sub-db-1",
  status: "ACTIVE",
  plan: "DEVELOPER",
  billingInterval: "MONTH",
  canceledAt: null,
  cancelAtPeriodEnd: false,
  isRenewalAfterCancel: false,
  previousCancelDate: null,
  trialStart: null,
  trialEnd: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// --- getBillingOverview ---

describe("billingRouter.getBillingOverview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns billing overview when user found", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      subscription: mockSubscription,
      stripeSubscriptionId: null,
      stripeCustomerId: "cus_123",
      workspaceId: "ws-1",
    });
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", name: "Test WS" });
    mockPaymentFindMany.mockResolvedValue([]);

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.getBillingOverview();

    expect(result.subscription?.plan).toBe("DEVELOPER");
    expect(result.workspace?.id).toBe("ws-1");
    expect(result.recentPayments).toHaveLength(0);
  });

  it("throws NOT_FOUND when user not in DB", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = billingRouter.createCaller(makeCtx() as never);
    await expect(caller.getBillingOverview()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns null subscription when user has no subscription", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      subscription: null,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
    });
    mockWorkspaceFindUnique.mockResolvedValue(null);
    mockPaymentFindMany.mockResolvedValue([]);

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.getBillingOverview();

    expect(result.subscription).toBeNull();
  });

  it("serializes subscription dates to ISO strings", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      subscription: mockSubscription,
      stripeSubscriptionId: null,
      stripeCustomerId: "cus_123",
    });
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", name: "Test WS" });
    mockPaymentFindMany.mockResolvedValue([]);

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.getBillingOverview();

    expect(typeof result.subscription?.createdAt).toBe("string");
    expect(typeof result.subscription?.updatedAt).toBe("string");
  });
});

// --- createBillingPortalSession ---

describe("billingRouter.createBillingPortalSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates portal session when stripeCustomerId exists", async () => {
    mockCreatePortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/portal/session",
    });

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.createBillingPortalSession();

    expect(result.url).toBe("https://billing.stripe.com/portal/session");
    expect(mockCreatePortalSession).toHaveBeenCalledWith(
      "cus_123",
      expect.stringContaining("/billing")
    );
  });

  it("throws BAD_REQUEST when user has no stripeCustomerId", async () => {
    const caller = billingRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@e.com",
          stripeCustomerId: null,
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(caller.createBillingPortalSession()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

// --- createPortalSession ---

describe("billingRouter.createPortalSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates portal session when stripeCustomerId exists", async () => {
    mockCreatePortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/portal/session",
    });

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.createPortalSession();

    expect(result.url).toBe("https://billing.stripe.com/portal/session");
  });

  it("throws BAD_REQUEST when user has no stripeCustomerId", async () => {
    const caller = billingRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@e.com",
          stripeCustomerId: null,
          workspaceId: "ws-1",
        },
      }) as never
    );
    await expect(caller.createPortalSession()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
