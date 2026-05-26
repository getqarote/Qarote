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

const mockValidateLicense = vi.fn();
const mockGetLicensesForUser = vi.fn();

vi.mock("@/services/license/license.service", () => ({
  licenseService: {
    validateLicense: (...a: unknown[]) => mockValidateLicense(...a),
    getLicensesForUser: (...a: unknown[]) => mockGetLicensesForUser(...a),
  },
}));

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    createCustomer: vi.fn().mockResolvedValue({ id: "cus-123" }),
  },
  stripe: {
    checkout: {
      sessions: {
        create: vi
          .fn()
          .mockResolvedValue({ url: "https://checkout.stripe.com/license" }),
      },
    },
  },
}));

vi.mock("@/mappers/license", () => ({
  LicenseMapper: {
    toApiResponseArray: vi.fn((l) => l),
  },
}));

vi.mock("@/core/utils", () => ({
  getUserDisplayName: vi.fn((u) => u?.email ?? ""),
}));

const { licenseRouter } = await import("../license");

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

describe("licenseRouter.validate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when license is invalid", async () => {
    mockValidateLicense.mockResolvedValue({
      valid: false,
      message: "License expired",
    });

    const caller = licenseRouter.createCaller(makeCtx({ user: null }) as never);
    await expect(
      caller.validate({ licenseKey: "bad-key" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns valid=true with license data when valid", async () => {
    const expiresAt = new Date("2026-12-31");
    mockValidateLicense.mockResolvedValue({
      valid: true,
      license: { id: "lic-1", tier: "DEVELOPER", expiresAt },
    });

    const caller = licenseRouter.createCaller(makeCtx({ user: null }) as never);
    const result = await caller.validate({ licenseKey: "valid-key" });

    expect(result.valid).toBe(true);
    expect(result.license?.expiresAt).toBe(expiresAt.toISOString());
  });
});

describe("licenseRouter.getLicenses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns licenses for authenticated user", async () => {
    const licenses = [{ id: "lic-1", tier: "DEVELOPER" }];
    mockGetLicensesForUser.mockResolvedValue(licenses);

    const caller = licenseRouter.createCaller(makeCtx() as never);
    const result = await caller.getLicenses();

    expect(result.licenses).toEqual(licenses);
    expect(mockGetLicensesForUser).toHaveBeenCalledWith(
      "admin@test.com",
      "ws-1"
    );
  });
});

describe("licenseRouter.purchaseLicense", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when org does not exist", async () => {
    mockOrgFindUnique.mockResolvedValue(null);

    const caller = licenseRouter.createCaller(makeCtx() as never);
    await expect(
      caller.purchaseLicense({ tier: "DEVELOPER" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns checkout URL when org exists with customer", async () => {
    mockOrgFindUnique.mockResolvedValue({
      id: "org-1",
      stripeCustomerId: "cus-existing",
    });

    const caller = licenseRouter.createCaller(makeCtx() as never);
    const result = await caller.purchaseLicense({ tier: "DEVELOPER" });

    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/license");
  });
});
