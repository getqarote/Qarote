import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockOrgFindUnique = vi.fn();
const mockOrgUpdate = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    organization: {
      findUnique: (...a: unknown[]) => mockOrgFindUnique(...a),
      update: (...a: unknown[]) => mockOrgUpdate(...a),
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

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    createCustomer: vi.fn().mockResolvedValue({ id: "cus-123" }),
    createCheckoutSession: vi
      .fn()
      .mockResolvedValue({ url: "https://checkout.stripe.com/test" }),
  },
}));

vi.mock("@/core/utils", () => ({
  getUserDisplayName: vi.fn((u) => u?.email ?? ""),
}));

const { checkoutRouter } = await import("../checkout");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      organization: { findUnique: mockOrgFindUnique, update: mockOrgUpdate },
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

describe("checkoutRouter.createCheckoutSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when plan is FREE", async () => {
    const caller = checkoutRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createCheckoutSession({ plan: "FREE", billingInterval: "monthly" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when organization does not exist", async () => {
    mockOrgFindUnique.mockResolvedValue(null);

    const caller = checkoutRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createCheckoutSession({
        plan: "DEVELOPER",
        billingInterval: "monthly",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("creates checkout session with existing Stripe customer", async () => {
    mockOrgFindUnique.mockResolvedValue({
      id: "org-1",
      stripeCustomerId: "cus-existing",
    });

    const caller = checkoutRouter.createCaller(makeCtx() as never);
    const result = await caller.createCheckoutSession({
      plan: "DEVELOPER",
      billingInterval: "monthly",
    });

    expect(result.url).toBe("https://checkout.stripe.com/test");
  });

  it("creates Stripe customer when none exists and updates org", async () => {
    mockOrgFindUnique.mockResolvedValue({
      id: "org-1",
      stripeCustomerId: null,
    });
    mockOrgUpdate.mockResolvedValue({});

    const caller = checkoutRouter.createCaller(makeCtx() as never);
    const result = await caller.createCheckoutSession({
      plan: "ENTERPRISE",
      billingInterval: "yearly",
    });

    expect(mockOrgUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        data: { stripeCustomerId: "cus-123" },
      })
    );
    expect(result.url).toBe("https://checkout.stripe.com/test");
  });
});
