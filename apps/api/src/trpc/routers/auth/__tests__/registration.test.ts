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
    account: { create: (...a: unknown[]) => mockAccountCreate(...a) },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

vi.mock("@/core/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-pw"),
}));

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    generateVerificationToken: vi.fn().mockResolvedValue("tok-123"),
    sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/services/integrations/notion.service", () => ({
  notionService: { syncUser: vi.fn() },
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
  emailConfig: { enabled: true },
  registrationConfig: { enabled: true },
  isDevelopment: () => false,
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
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/mappers/auth", () => ({
  UserMapper: {
    toApiResponse: vi.fn((u) => ({ id: u.id, email: u.email })),
  },
}));

const { registrationRouter } = await import("../registration");

// --- Helpers ---

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
  password: "Password123!",
  firstName: "John",
  lastName: "Doe",
  acceptTerms: true,
  sourceApp: "app" as const,
};

const mockCreatedUser = {
  id: "user-new",
  email: "new@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "USER",
  workspaceId: null,
  isActive: true,
  emailVerified: false,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// --- Tests ---

describe("registrationRouter.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when registration is disabled", async () => {
    const config = await import("@/config");
    const descriptor = Object.getOwnPropertyDescriptor(
      config.registrationConfig,
      "enabled"
    )!;
    Object.defineProperty(config.registrationConfig, "enabled", {
      ...descriptor,
      value: false,
    });

    try {
      const caller = registrationRouter.createCaller(makeCtx() as never);
      await expect(caller.register(validInput)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    } finally {
      Object.defineProperty(config.registrationConfig, "enabled", descriptor);
    }
  });

  it("throws BAD_REQUEST when terms not accepted", async () => {
    const caller = registrationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.register({ ...validInput, acceptTerms: false })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when email already exists", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing-user" });

    const caller = registrationRouter.createCaller(makeCtx() as never);
    await expect(caller.register(validInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("creates user and account in transaction when email is free", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue(mockCreatedUser) },
        account: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const caller = registrationRouter.createCaller(makeCtx() as never);
    const result = await caller.register(validInput);

    expect(result.user).toBeDefined();
    expect(result.autoVerified).toBe(false);
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it("auto-verifies user when email is disabled", async () => {
    const { emailConfig } = await import("@/config");
    vi.mocked(emailConfig).enabled = false;

    mockUserFindUnique.mockResolvedValue(null);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue({
            ...mockCreatedUser,
            emailVerified: true,
          }),
        },
        account: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const caller = registrationRouter.createCaller(makeCtx() as never);
    const result = await caller.register(validInput);

    expect(result.autoVerified).toBe(true);

    vi.mocked(emailConfig).enabled = true;
  });
});
