import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserUpdate = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { update: (...a: unknown[]) => mockUserUpdate(...a) },
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

vi.mock("@/core/utils", () => ({
  getUserDisplayName: vi.fn().mockReturnValue("Jane Doe"),
}));

const mockCreateCustomer = vi.fn();
const mockCreateCheckoutSession = vi.fn();

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    createCustomer: (...a: unknown[]) => mockCreateCustomer(...a),
    createCheckoutSession: (...a: unknown[]) => mockCreateCheckoutSession(...a),
  },
}));

vi.mock("@/config", () => ({
  emailConfig: { frontendUrl: "https://app.example.com" },
}));

// Import after mocks
const { checkoutRouter } = await import("../checkout");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { update: mockUserUpdate },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "MEMBER",
      isActive: true,
      email: "user@example.com",
      workspaceId: "ws-1",
      stripeCustomerId: "cus_123",
    },
    locale: "en",
    req: {},
    ...overrides,
  };
}

// --- createCheckoutSession ---

describe("checkoutRouter.createCheckoutSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates checkout session for paid plan", async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/session/cs_123",
    });

    const caller = checkoutRouter.createCaller(makeCtx() as never);
    const result = await caller.createCheckoutSession({
      plan: "DEVELOPER",
      billingInterval: "monthly",
    });

    expect(result.url).toBe("https://checkout.stripe.com/session/cs_123");
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        plan: "DEVELOPER",
        billingInterval: "monthly",
      })
    );
  });

  it("throws BAD_REQUEST when plan is FREE", async () => {
    const caller = checkoutRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createCheckoutSession({ plan: "FREE", billingInterval: "monthly" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("creates Stripe customer when user has no stripeCustomerId", async () => {
    mockCreateCustomer.mockResolvedValue({ id: "cus_new" });
    mockUserUpdate.mockResolvedValue({});
    mockCreateCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/session/cs_123",
    });

    const caller = checkoutRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "user@example.com",
          workspaceId: "ws-1",
          stripeCustomerId: null,
        },
      }) as never
    );
    await caller.createCheckoutSession({
      plan: "DEVELOPER",
      billingInterval: "monthly",
    });

    expect(mockCreateCustomer).toHaveBeenCalledOnce();
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stripeCustomerId: "cus_new" },
      })
    );
  });

  it("skips customer creation when stripeCustomerId already exists", async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/session/cs_123",
    });

    const caller = checkoutRouter.createCaller(makeCtx() as never);
    await caller.createCheckoutSession({
      plan: "ENTERPRISE",
      billingInterval: "yearly",
    });

    expect(mockCreateCustomer).not.toHaveBeenCalled();
  });
});
