import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockAccountCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      create: (...a: unknown[]) => mockUserCreate(...a),
    },
    account: {
      create: (...a: unknown[]) => mockAccountCreate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => false,
  isCloudMode: () => false,
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

vi.mock("@/core/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  comparePassword: vi.fn(),
}));

vi.mock("@/mappers/auth", () => ({
  UserMapper: {
    toApiResponse: vi.fn((u) => ({
      ...u,
      createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() ?? u.updatedAt,
    })),
  },
}));

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    generateVerificationToken: vi.fn().mockResolvedValue("verify-token-123"),
    sendVerificationEmail: vi
      .fn()
      .mockResolvedValue({ success: true, error: null }),
  },
}));

vi.mock("@/services/integrations/notion.service", () => ({
  notionService: { syncUser: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/services/sentry", () => ({
  trackSignUpError: vi.fn(),
}));

vi.mock("@/services/stripe/customer.service", () => ({
  StripeCustomerService: {
    provisionTrialForNewUser: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/config", () => ({
  emailConfig: { enabled: false, frontendUrl: "https://app.example.com" },
  registrationConfig: { enabled: true },
  isDevelopment: vi.fn().mockReturnValue(false),
}));

// Import after mocks
const { registrationRouter } = await import("../registration");

// --- Helpers ---

const mockNewUser = {
  id: "user-new",
  email: "new@example.com",
  firstName: "Jane",
  lastName: "Doe",
  role: "MEMBER",
  workspaceId: null,
  isActive: true,
  emailVerified: false,
  lastLogin: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique, create: mockUserCreate },
      account: { create: mockAccountCreate },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: null,
    locale: "en",
    req: {},
    ...overrides,
  };
}

const validInput = {
  email: "new@example.com",
  password: "SecurePass123!",
  firstName: "Jane",
  lastName: "Doe",
  acceptTerms: true,
};

// --- Tests ---

describe("registrationRouter.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: transaction calls user.create and account.create
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue(mockNewUser),
        },
        account: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(tx);
    });
  });

  it("registers a new user successfully", async () => {
    mockUserFindUnique
      .mockResolvedValueOnce(null) // user doesn't exist
      .mockResolvedValueOnce(mockNewUser); // notion sync lookup

    const caller = registrationRouter.createCaller(makeCtx() as never);
    const result = await caller.register(validInput);

    expect(result.user.email).toBe("new@example.com");
    expect(result.autoVerified).toBe(true); // email disabled → auto-verify
  });

  it("throws FORBIDDEN when registration is disabled", async () => {
    const { registrationConfig } = await import("@/config");
    vi.mocked(registrationConfig as { enabled: boolean }).enabled = false;

    const caller = registrationRouter.createCaller(makeCtx() as never);
    await expect(caller.register(validInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    // Restore
    vi.mocked(registrationConfig as { enabled: boolean }).enabled = true;
  });

  it("throws BAD_REQUEST when terms not accepted", async () => {
    const caller = registrationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.register({ ...validInput, acceptTerms: false })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when email already in use", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing" }); // user exists

    const caller = registrationRouter.createCaller(makeCtx() as never);
    await expect(caller.register(validInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("creates user and Account record in a transaction", async () => {
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockNewUser);

    const txUserCreate = vi.fn().mockResolvedValue(mockNewUser);
    const txAccountCreate = vi.fn().mockResolvedValue({});
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      return cb({
        user: { create: txUserCreate },
        account: { create: txAccountCreate },
      });
    });

    const caller = registrationRouter.createCaller(makeCtx() as never);
    await caller.register(validInput);

    expect(txUserCreate).toHaveBeenCalledOnce();
    expect(txAccountCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerId: "credential" }),
      })
    );
  });
});
