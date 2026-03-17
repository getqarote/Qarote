import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockSubscriptionUpdate = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    subscription: {
      update: (...a: unknown[]) => mockSubscriptionUpdate(...a),
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
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

const mockCancelSubscription = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockMapStripeStatus = vi.fn().mockReturnValue("CANCELED");

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    cancelSubscription: (...a: unknown[]) => mockCancelSubscription(...a),
    createCheckoutSession: (...a: unknown[]) => mockCreateCheckoutSession(...a),
  },
}));

vi.mock("@/services/stripe/core.service", () => ({
  CoreStripeService: {
    mapStripeStatusToSubscriptionStatus: (...a: unknown[]) =>
      mockMapStripeStatus(...a),
  },
}));

vi.mock("@/config", () => ({
  config: { FRONTEND_URL: "https://app.example.com" },
}));

// Import after mocks
const { subscriptionRouter } = await import("../subscription");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      subscription: { update: mockSubscriptionUpdate },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "MEMBER",
      isActive: true,
      email: "user@example.com",
      workspaceId: "ws-1",
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_123",
    },
    locale: "en",
    req: {},
    ...overrides,
  };
}

const mockStripeSubscription = {
  id: "sub_123",
  status: "canceled",
  cancel_at_period_end: true,
  canceled_at: Math.floor(Date.now() / 1000),
  items: {
    data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 }],
  },
};

// --- cancelSubscription ---

describe("subscriptionRouter.cancelSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels subscription at period end by default", async () => {
    mockCancelSubscription.mockResolvedValue(mockStripeSubscription);
    mockSubscriptionUpdate.mockResolvedValue({});

    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    const result = await caller.cancelSubscription({});

    expect(result.success).toBe(true);
    expect(result.message).toContain("end of the current period");
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_123", false);
  });

  it("cancels immediately when cancelImmediately=true", async () => {
    mockCancelSubscription.mockResolvedValue(mockStripeSubscription);
    mockSubscriptionUpdate.mockResolvedValue({});

    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    const result = await caller.cancelSubscription({ cancelImmediately: true });

    expect(result.message).toContain("canceled immediately");
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_123", true);
  });

  it("throws BAD_REQUEST when user has no stripeSubscriptionId", async () => {
    const caller = subscriptionRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@e.com",
          workspaceId: "ws-1",
          stripeSubscriptionId: null,
        },
      }) as never
    );
    await expect(caller.cancelSubscription({})).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    expect(mockCancelSubscription).not.toHaveBeenCalled();
  });

  it("updates subscription status in DB after cancellation", async () => {
    mockCancelSubscription.mockResolvedValue(mockStripeSubscription);
    mockSubscriptionUpdate.mockResolvedValue({});

    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    await caller.cancelSubscription({});

    expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      })
    );
  });
});

// --- renewSubscription ---

describe("subscriptionRouter.renewSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates checkout session for renewal", async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/renew",
    });

    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    const result = await caller.renewSubscription({
      plan: "DEVELOPER",
      interval: "monthly",
    });

    expect(result.url).toBe("https://checkout.stripe.com/renew");
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "DEVELOPER",
        billingInterval: "monthly",
      })
    );
  });

  it("throws BAD_REQUEST when no plan provided", async () => {
    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    await expect(
      caller.renewSubscription({ plan: undefined as never })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
