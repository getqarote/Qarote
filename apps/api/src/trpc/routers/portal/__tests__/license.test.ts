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

const mockValidateLicense = vi.fn();
const mockGetLicensesForUser = vi.fn();

vi.mock("@/services/license/license.service", () => ({
  licenseService: {
    validateLicense: (...a: unknown[]) => mockValidateLicense(...a),
    getLicensesForUser: (...a: unknown[]) => mockGetLicensesForUser(...a),
  },
}));

const mockCreateCustomer = vi.fn();
const mockStripeCheckoutCreate = vi.fn();

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    createCustomer: (...a: unknown[]) => mockCreateCustomer(...a),
  },
  stripe: {
    checkout: {
      sessions: {
        create: (...a: unknown[]) => mockStripeCheckoutCreate(...a),
      },
    },
  },
}));

vi.mock("@/mappers/license", () => ({
  LicenseMapper: {
    toApiResponseArray: vi.fn((arr) => arr),
  },
}));

vi.mock("@/config", () => ({
  emailConfig: {
    frontendUrl: "https://app.example.com",
    portalFrontendUrl: "https://portal.example.com",
  },
  stripeConfig: {
    priceIds: {
      developer: { yearly: "price_dev_yearly" },
      enterprise: { yearly: "price_ent_yearly" },
    },
  },
}));

// Import after mocks
const { licenseRouter } = await import("../license");

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

const mockLicense = {
  id: "lic-1",
  licenseKey: "LIC-KEY-123",
  expiresAt: new Date("2025-12-31"),
};

// --- validate ---

describe("licenseRouter.validate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns valid license when key is valid", async () => {
    mockValidateLicense.mockResolvedValue({
      valid: true,
      license: mockLicense,
    });

    const caller = licenseRouter.createCaller(makeCtx() as never);
    const result = await caller.validate({ licenseKey: "LIC-KEY-123" });

    expect(result.valid).toBe(true);
    expect(result.license).toBeDefined();
    expect(typeof result.license?.expiresAt).toBe("string");
  });

  it("throws FORBIDDEN when license is invalid", async () => {
    mockValidateLicense.mockResolvedValue({
      valid: false,
      message: "License expired",
    });

    const caller = licenseRouter.createCaller(makeCtx() as never);
    await expect(
      caller.validate({ licenseKey: "BAD-KEY" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// --- getLicenses ---

describe("licenseRouter.getLicenses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns licenses for authenticated user", async () => {
    mockGetLicensesForUser.mockResolvedValue([mockLicense]);

    const caller = licenseRouter.createCaller(makeCtx() as never);
    const result = await caller.getLicenses();

    expect(result.licenses).toHaveLength(1);
    expect(mockGetLicensesForUser).toHaveBeenCalledWith(
      "user@example.com",
      "ws-1"
    );
  });

  it("returns empty array when no licenses", async () => {
    mockGetLicensesForUser.mockResolvedValue([]);

    const caller = licenseRouter.createCaller(makeCtx() as never);
    const result = await caller.getLicenses();

    expect(result.licenses).toHaveLength(0);
  });
});

// --- purchaseLicense ---

describe("licenseRouter.purchaseLicense", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates checkout session for DEVELOPER tier", async () => {
    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/cs_license",
    });

    const caller = licenseRouter.createCaller(makeCtx() as never);
    const result = await caller.purchaseLicense({ tier: "DEVELOPER" });

    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/cs_license");
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({ price: "price_dev_yearly" })],
      })
    );
  });

  it("creates Stripe customer when user has no stripeCustomerId", async () => {
    mockCreateCustomer.mockResolvedValue({ id: "cus_new" });
    mockUserUpdate.mockResolvedValue({});
    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/cs_license",
    });

    const caller = licenseRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "user@example.com",
          workspaceId: "ws-1",
          stripeCustomerId: null,
        },
      }) as never
    );
    await caller.purchaseLicense({ tier: "DEVELOPER" });

    expect(mockCreateCustomer).toHaveBeenCalledOnce();
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stripeCustomerId: "cus_new" },
      })
    );
  });
});
