import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockOrgFindUnique = vi.fn();
const mockOrgUpdate = vi.fn();
const mockSubscriptionUpdateMany = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    organization: {
      findUnique: (...a: unknown[]) => mockOrgFindUnique(...a),
      update: (...a: unknown[]) => mockOrgUpdate(...a),
    },
    subscription: {
      updateMany: (...a: unknown[]) => mockSubscriptionUpdateMany(...a),
    },
  },
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
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

const mockCancelSubscription = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockCreateCustomer = vi.fn().mockResolvedValue({ id: "cus-123" });

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    cancelSubscription: (...a: unknown[]) => mockCancelSubscription(...a),
    createCheckoutSession: (...a: unknown[]) => mockCreateCheckoutSession(...a),
    createCustomer: (...a: unknown[]) => mockCreateCustomer(...a),
  },
}));

vi.mock("@/services/stripe/core.service", () => ({
  CoreStripeService: {
    mapStripeStatusToSubscriptionStatus: vi.fn((s) => s),
  },
}));

vi.mock("@/core/utils", () => ({
  getUserDisplayName: vi.fn((u) => u?.email ?? ""),
}));

const { subscriptionRouter } = await import("../subscription");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      organization: { findUnique: mockOrgFindUnique, update: mockOrgUpdate },
      subscription: { updateMany: mockSubscriptionUpdateMany },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "admin@test.com",
      isActive: true,
      role: "ADMIN",
      workspaceId: "ws-1",
    },
    organizationId: "org-1",
    orgRole: "ADMIN",
    resolveOrg: vi
      .fn()
      .mockResolvedValue({ organizationId: "org-1", role: "ADMIN" }),
    locale: "en",
    ...overrides,
  };
}

// --- Tests ---

describe("subscriptionRouter.cancelSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when org has no active subscription", async () => {
    mockOrgFindUnique.mockResolvedValue({ stripeSubscriptionId: null });

    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    await expect(caller.cancelSubscription({})).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("cancels subscription and returns success", async () => {
    mockOrgFindUnique.mockResolvedValue({ stripeSubscriptionId: "sub-123" });
    mockCancelSubscription.mockResolvedValue({
      id: "sub-123",
      status: "canceled",
      cancel_at_period_end: false,
      canceled_at: null,
      items: { data: [] },
    });
    mockSubscriptionUpdateMany.mockResolvedValue({ count: 1 });

    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    const result = await caller.cancelSubscription({ cancelImmediately: true });

    expect(result.success).toBe(true);
    expect(result.subscription.id).toBe("sub-123");
  });
});

describe("subscriptionRouter.renewSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when org does not exist", async () => {
    mockOrgFindUnique.mockResolvedValue(null);

    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    await expect(
      caller.renewSubscription({ plan: "DEVELOPER" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns checkout URL for renewal", async () => {
    mockOrgFindUnique.mockResolvedValue({
      id: "org-1",
      stripeCustomerId: "cus-existing",
    });
    mockCreateCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/renew",
    });

    const caller = subscriptionRouter.createCaller(makeCtx() as never);
    const result = await caller.renewSubscription({
      plan: "ENTERPRISE",
      interval: "yearly",
    });

    expect(result.url).toBe("https://checkout.stripe.com/renew");
  });
});
