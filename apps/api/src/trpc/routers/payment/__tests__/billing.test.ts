import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockSubscriptionFindUnique = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockPaymentFindMany = vi.fn();
const mockOrgFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: (...a: unknown[]) => mockSubscriptionFindUnique(...a),
    },
    workspace: {
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
    },
    payment: { findMany: (...a: unknown[]) => mockPaymentFindMany(...a) },
    organization: { findUnique: (...a: unknown[]) => mockOrgFindUnique(...a) },
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
  getOrgResourceCounts: vi.fn().mockResolvedValue({ servers: 1, users: 2 }),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

const mockStripeGetSubscription = vi.fn().mockResolvedValue(null);
const mockStripeGetCustomer = vi.fn().mockResolvedValue(null);
const mockStripeGetPaymentMethod = vi.fn().mockResolvedValue(null);
const mockStripeGetUpcomingInvoice = vi.fn().mockResolvedValue(null);
const mockStripeCreatePortalSession = vi
  .fn()
  .mockResolvedValue({ url: "https://billing.stripe.com/portal/test" });
const mockStripeTransformPaymentDescription = vi
  .fn()
  .mockImplementation((desc: unknown) => desc ?? "");

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    getSubscription: (...a: unknown[]) => mockStripeGetSubscription(...a),
    getCustomer: (...a: unknown[]) => mockStripeGetCustomer(...a),
    getPaymentMethod: (...a: unknown[]) => mockStripeGetPaymentMethod(...a),
    getUpcomingInvoice: (...a: unknown[]) => mockStripeGetUpcomingInvoice(...a),
    createPortalSession: (...a: unknown[]) =>
      mockStripeCreatePortalSession(...a),
    transformPaymentDescription: (...a: unknown[]) =>
      (
        mockStripeTransformPaymentDescription as (...args: unknown[]) => unknown
      )(...a),
  },
}));

vi.mock("@/config", () => ({
  config: { FRONTEND_URL: "https://app.test.com" },
}));

const { billingRouter } = await import("../billing");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      subscription: { findUnique: mockSubscriptionFindUnique },
      workspace: { findUnique: mockWorkspaceFindUnique },
      payment: { findMany: mockPaymentFindMany },
      organization: { findUnique: mockOrgFindUnique },
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

// Minimal Stripe subscription shape that satisfies the router's field access
const mockStripeSubscription = {
  id: "sub_123",
  status: "active",
  items: {
    data: [
      {
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        price: {
          id: "price_123",
          unit_amount: 2900,
          currency: "usd",
          recurring: { interval: "month" },
        },
      },
    ],
  },
  cancel_at_period_end: false,
  canceled_at: null,
  default_payment_method: "pm_123",
  currency: "usd",
};

// Minimal payment method returned by StripeService.getPaymentMethod
const mockFullPaymentMethod = {
  id: "pm_123",
  type: "card",
  card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2026 },
  billing_details: { name: "Test User", email: "admin@test.com" },
};

// The org's Subscription row. It now carries the Stripe subscription id — the
// denormalized mirror on Organization is gone.
function dbSubscription(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "dbsub-1",
    status: "ACTIVE",
    plan: "DEVELOPER",
    billingInterval: "MONTH",
    stripeSubscriptionId: "sub_123",
    canceledAt: null,
    isRenewalAfterCancel: false,
    previousCancelDate: null,
    trialStart: null,
    trialEnd: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// --- Tests ---

describe("billingRouter.getBillingOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all DB queries return null / empty
    mockSubscriptionFindUnique.mockResolvedValue(null);
    mockWorkspaceFindUnique.mockResolvedValue(null);
    mockPaymentFindMany.mockResolvedValue([]);
    mockOrgFindUnique.mockResolvedValue(null);
    mockStripeGetSubscription.mockResolvedValue(null);
    mockStripeGetPaymentMethod.mockResolvedValue(null);
    mockStripeGetUpcomingInvoice.mockResolvedValue(null);
  });

  it("returns null subscription and workspace when all DB queries return null", async () => {
    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.getBillingOverview();

    expect(result.subscription).toBeNull();
    expect(result.workspace).toBeNull();
    expect(result.stripeSubscription).toBeNull();
    expect(result.paymentMethod).toBeNull();
    expect(result.upcomingInvoice).toBeNull();
    expect(result.recentPayments).toEqual([]);
    expect(result.currentUsage).toEqual({
      servers: 1,
      users: 2,
      queues: 0,
      messagesThisMonth: 0,
    });
  });

  it("assembles overview from subscription + workspace + org without a Stripe subscription ID", async () => {
    const now = new Date();
    mockSubscriptionFindUnique.mockResolvedValue(
      dbSubscription({ stripeSubscriptionId: null })
    );
    mockWorkspaceFindUnique.mockResolvedValue({
      id: "ws-1",
      name: "Acme Workspace",
    });
    mockOrgFindUnique.mockResolvedValue({
      stripeCustomerId: null,
    });
    mockPaymentFindMany.mockResolvedValue([
      {
        id: "pay-1",
        amount: 2900,
        status: "SUCCEEDED",
        description: "Developer plan",
        createdAt: now,
      },
    ]);

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.getBillingOverview();

    expect(result.subscription).toMatchObject({
      id: "dbsub-1",
      status: "ACTIVE",
      plan: "DEVELOPER",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    });
    expect(result.workspace).toEqual({ id: "ws-1", name: "Acme Workspace" });
    expect(result.stripeSubscription).toBeNull();
    expect(result.recentPayments).toHaveLength(1);
    expect(result.recentPayments[0].id).toBe("pay-1");
    // Stripe was never consulted because there's no stripeSubscriptionId
    expect(mockStripeGetSubscription).not.toHaveBeenCalled();
  });

  it("fetches and returns Stripe subscription shape when stripeSubscriptionId is present", async () => {
    mockSubscriptionFindUnique.mockResolvedValue(dbSubscription());
    mockOrgFindUnique.mockResolvedValue({
      stripeCustomerId: "cus_abc",
    });
    mockStripeGetSubscription.mockResolvedValue(mockStripeSubscription);
    // Payment method resolution: subscription has a pm ID so getPaymentMethod is called
    mockStripeGetPaymentMethod.mockResolvedValue(mockFullPaymentMethod);

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.getBillingOverview();

    expect(mockStripeGetSubscription).toHaveBeenCalledWith("sub_123");
    expect(result.stripeSubscription).toMatchObject({
      id: "sub_123",
      status: "active",
      cancel_at_period_end: false,
      canceled_at: null,
      currency: "usd",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: {
        data: [
          {
            price: {
              id: "price_123",
              unit_amount: 2900,
              currency: "usd",
              recurring: { interval: "month" },
            },
          },
        ],
      },
    });
  });

  it("returns resolved paymentMethod when StripeService.getPaymentMethod succeeds", async () => {
    mockSubscriptionFindUnique.mockResolvedValue(dbSubscription());
    mockOrgFindUnique.mockResolvedValue({
      stripeCustomerId: "cus_abc",
    });
    mockStripeGetSubscription.mockResolvedValue(mockStripeSubscription);
    mockStripeGetPaymentMethod.mockResolvedValue(mockFullPaymentMethod);

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.getBillingOverview();

    expect(result.paymentMethod).toMatchObject({
      id: "pm_123",
      type: "card",
      card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2026 },
      billing_details: { name: "Test User", email: "admin@test.com" },
    });
  });

  it("returns null stripeSubscription and warns when StripeService.getSubscription throws", async () => {
    mockSubscriptionFindUnique.mockResolvedValue(dbSubscription());
    mockOrgFindUnique.mockResolvedValue({
      stripeCustomerId: "cus_abc",
    });
    mockStripeGetSubscription.mockRejectedValue(
      new Error("Stripe unavailable")
    );

    const ctx = makeCtx();
    const caller = billingRouter.createCaller(ctx as never);
    const result = await caller.getBillingOverview();

    expect(result.stripeSubscription).toBeNull();
    expect(result.paymentMethod).toBeNull();
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      "Failed to fetch Stripe subscription"
    );
    // Phase 3 (invoice + payment method) should never run
    expect(mockStripeGetPaymentMethod).not.toHaveBeenCalled();
    expect(mockStripeGetUpcomingInvoice).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN when the caller's org role is not ADMIN or OWNER", async () => {
    const caller = billingRouter.createCaller(
      makeCtx({
        resolveOrg: vi
          .fn()
          .mockResolvedValue({ organizationId: "org-1", role: "MEMBER" }),
      }) as never
    );
    await expect(caller.getBillingOverview()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("billingRouter.createBillingPortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeCreatePortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/portal/test",
    });
  });

  it("throws BAD_REQUEST when org has no stripeCustomerId", async () => {
    mockOrgFindUnique.mockResolvedValue({ stripeCustomerId: null });

    const caller = billingRouter.createCaller(makeCtx() as never);
    await expect(caller.createBillingPortalSession()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mockStripeCreatePortalSession).not.toHaveBeenCalled();
  });

  it("returns portal URL when org has a valid stripeCustomerId", async () => {
    mockOrgFindUnique.mockResolvedValue({ stripeCustomerId: "cus_abc" });

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.createBillingPortalSession();

    expect(result.url).toBe("https://billing.stripe.com/portal/test");
    expect(mockStripeCreatePortalSession).toHaveBeenCalledWith(
      "cus_abc",
      "https://app.test.com/settings/subscription/billing"
    );
  });
});

describe("billingRouter.createPortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeCreatePortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/portal/test",
    });
  });

  it("throws BAD_REQUEST when org has no stripeCustomerId", async () => {
    mockOrgFindUnique.mockResolvedValue({ stripeCustomerId: null });

    const caller = billingRouter.createCaller(makeCtx() as never);
    await expect(caller.createPortalSession()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mockStripeCreatePortalSession).not.toHaveBeenCalled();
  });

  it("returns portal URL when org has a valid stripeCustomerId", async () => {
    mockOrgFindUnique.mockResolvedValue({ stripeCustomerId: "cus_xyz" });

    const caller = billingRouter.createCaller(makeCtx() as never);
    const result = await caller.createPortalSession();

    expect(result.url).toBe("https://billing.stripe.com/portal/test");
    expect(mockStripeCreatePortalSession).toHaveBeenCalledWith(
      "cus_xyz",
      "https://app.test.com/settings/subscription/billing"
    );
  });
});
