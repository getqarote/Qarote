import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockAccountFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    account: {
      findFirst: (...a: unknown[]) => mockAccountFindFirst(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
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

vi.mock("@/core/auth", () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/services/audit.service", () => ({
  auditService: {
    logPasswordEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockGenerateVerificationToken = vi
  .fn()
  .mockResolvedValue("verify-token-123");
const mockSendVerificationEmail = vi
  .fn()
  .mockResolvedValue({ success: true, error: null });

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    generateVerificationToken: (...a: unknown[]) =>
      mockGenerateVerificationToken(...a),
    sendVerificationEmail: (...a: unknown[]) => mockSendVerificationEmail(...a),
  },
}));

// Import after mocks
const { emailRouter } = await import("../email");

// --- Helpers ---

const mockUserWithPassword = {
  id: "user-1",
  email: "user@example.com",
  passwordHash: "bcrypt-hash",
  firstName: "Jane",
  lastName: "Doe",
};

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      account: { findFirst: mockAccountFindFirst },
      user: {
        findUnique: mockUserFindUnique,
        update: mockUserUpdate,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "MEMBER",
      isActive: true,
      email: "user@example.com",
      workspaceId: "ws-1",
    },
    locale: "en",
    req: {},
    ...overrides,
  };
}

// --- requestEmailChange ---

describe("emailRouter.requestEmailChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests email change successfully", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true as never);

    mockAccountFindFirst.mockResolvedValue({ password: "scrypt-hash" });
    mockUserFindUnique
      .mockResolvedValueOnce(mockUserWithPassword) // current user
      .mockResolvedValueOnce(null); // new email not in use
    mockUserUpdate.mockResolvedValue({ ...mockUserWithPassword });

    const caller = emailRouter.createCaller(makeCtx() as never);
    const result = await caller.requestEmailChange({
      newEmail: "newemail@example.com",
      password: "correct-password",
    });

    expect(result.pendingEmail).toBe("newemail@example.com");
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { pendingEmail: "newemail@example.com" },
      })
    );
  });

  it("throws NOT_FOUND when user not found in DB", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(
      caller.requestEmailChange({
        newEmail: "newemail@example.com",
        password: "any",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when user has no password (google-only account)", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({
      ...mockUserWithPassword,
      passwordHash: null,
    });

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(
      caller.requestEmailChange({
        newEmail: "newemail@example.com",
        password: "any",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws UNAUTHORIZED when password is incorrect", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(false as never);

    mockAccountFindFirst.mockResolvedValue({ password: "scrypt-hash" });
    mockUserFindUnique.mockResolvedValue(mockUserWithPassword);

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(
      caller.requestEmailChange({
        newEmail: "newemail@example.com",
        password: "wrong-password",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws BAD_REQUEST when new email is already in use", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true as never);

    mockAccountFindFirst.mockResolvedValue({ password: "scrypt-hash" });
    mockUserFindUnique
      .mockResolvedValueOnce(mockUserWithPassword)
      .mockResolvedValueOnce({ id: "other-user" }); // email already taken

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(
      caller.requestEmailChange({
        newEmail: "taken@example.com",
        password: "correct-password",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("uses Account.password when available, falls back to User.passwordHash", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true as never);

    mockAccountFindFirst.mockResolvedValue({ password: "scrypt-hash" }); // account exists
    mockUserFindUnique
      .mockResolvedValueOnce(mockUserWithPassword)
      .mockResolvedValueOnce(null);
    mockUserUpdate.mockResolvedValue(mockUserWithPassword);
    mockSendVerificationEmail.mockResolvedValue({ success: true });

    const caller = emailRouter.createCaller(makeCtx() as never);
    await caller.requestEmailChange({
      newEmail: "newemail@example.com",
      password: "correct-password",
    });

    expect(comparePassword).toHaveBeenCalledWith(
      "correct-password",
      "scrypt-hash" // Account.password is preferred
    );
  });
});

// --- cancelEmailChange ---

describe("emailRouter.cancelEmailChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels email change by clearing pendingEmail", async () => {
    mockUserUpdate.mockResolvedValue({ id: "user-1", pendingEmail: null });

    const caller = emailRouter.createCaller(makeCtx() as never);
    const result = await caller.cancelEmailChange();

    expect(result.message).toBeDefined();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { pendingEmail: null },
    });
  });

  it("throws INTERNAL_SERVER_ERROR on DB failure", async () => {
    mockUserUpdate.mockRejectedValue(new Error("DB error"));

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(caller.cancelEmailChange()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
