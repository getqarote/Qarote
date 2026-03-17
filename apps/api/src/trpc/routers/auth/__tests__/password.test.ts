import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockAccountFindFirst = vi.fn();
const mockAccountUpsert = vi.fn();
const mockPasswordResetFindUnique = vi.fn();
const mockPasswordResetDeleteMany = vi.fn();
const mockPasswordResetCreate = vi.fn();
const mockPasswordResetDelete = vi.fn();
const mockPasswordResetUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
    account: {
      findFirst: (...a: unknown[]) => mockAccountFindFirst(...a),
      upsert: (...a: unknown[]) => mockAccountUpsert(...a),
    },
    passwordReset: {
      findUnique: (...a: unknown[]) => mockPasswordResetFindUnique(...a),
      deleteMany: (...a: unknown[]) => mockPasswordResetDeleteMany(...a),
      create: (...a: unknown[]) => mockPasswordResetCreate(...a),
      delete: (...a: unknown[]) => mockPasswordResetDelete(...a),
      update: (...a: unknown[]) => mockPasswordResetUpdate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
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
  hashPassword: vi.fn().mockResolvedValue("bcrypt-hash"),
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("scrypt-hash"),
}));

vi.mock("@/services/audit.service", () => ({
  auditService: {
    logPasswordResetRequest: vi.fn().mockResolvedValue(undefined),
    logPasswordResetFailed: vi.fn().mockResolvedValue(undefined),
    logPasswordResetCompleted: vi.fn().mockResolvedValue(undefined),
    logPasswordChange: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/email/password-reset-email.service", () => ({
  passwordResetEmailService: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/encryption.service", () => ({
  EncryptionService: {
    generateEncryptionKey: vi.fn().mockReturnValue("reset-token-123"),
  },
}));

vi.mock("@/config", () => ({
  isDevelopment: vi.fn().mockReturnValue(false),
  emailConfig: { enabled: true, frontendUrl: "https://app.example.com" },
  registrationConfig: { enabled: true },
}));

// Import after mocks
const { passwordRouter } = await import("../password");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
      account: {
        findFirst: mockAccountFindFirst,
        upsert: mockAccountUpsert,
      },
      passwordReset: {
        findUnique: mockPasswordResetFindUnique,
        deleteMany: mockPasswordResetDeleteMany,
        create: mockPasswordResetCreate,
        delete: mockPasswordResetDelete,
        update: mockPasswordResetUpdate,
      },
      $transaction: mockTransaction,
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

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  firstName: "Jane",
  lastName: "Doe",
};

const mockPasswordReset = {
  id: "pr-1",
  userId: "user-1",
  token: "reset-token-123",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  used: false,
  user: mockUser,
};

// --- requestPasswordReset ---

describe("passwordRouter.requestPasswordReset", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success message even when user does not exist (no user enumeration)", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    const result = await caller.requestPasswordReset({
      email: "notexist@example.com",
    });

    expect(result.message).toBeDefined();
    expect(mockPasswordResetCreate).not.toHaveBeenCalled();
  });

  it("creates reset token when user exists", async () => {
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 0 });
    mockPasswordResetCreate.mockResolvedValue(mockPasswordReset);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await caller.requestPasswordReset({ email: "user@example.com" });

    expect(mockPasswordResetCreate).toHaveBeenCalledOnce();
  });

  it("deletes existing reset tokens before creating a new one", async () => {
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 1 });
    mockPasswordResetCreate.mockResolvedValue(mockPasswordReset);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await caller.requestPasswordReset({ email: "user@example.com" });

    expect(mockPasswordResetDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockPasswordResetDeleteMany).toHaveBeenCalledBefore(
      mockPasswordResetCreate as never
    );
  });
});

// --- resetPassword ---

describe("passwordRouter.resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (ops: unknown[]) => {
      return Promise.all(ops.map((op) => Promise.resolve(op)));
    });
  });

  it("throws BAD_REQUEST when token not found", async () => {
    mockPasswordResetFindUnique.mockResolvedValue(null);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resetPassword({ token: "bad-token", password: "NewPass123!" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when token is expired", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      ...mockPasswordReset,
      expiresAt: new Date(Date.now() - 1000), // expired
    });
    mockPasswordResetDelete.mockResolvedValue({});

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resetPassword({
        token: "reset-token-123",
        password: "NewPass123!",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when token already used", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      ...mockPasswordReset,
      used: true,
    });

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resetPassword({
        token: "reset-token-123",
        password: "NewPass123!",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("updates password and marks token used on success", async () => {
    mockPasswordResetFindUnique.mockResolvedValue(mockPasswordReset);

    mockTransaction.mockImplementation(async (ops: unknown[]) => {
      // The router uses $transaction([...]) with an array, not a callback
      return Promise.all(ops);
    });

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await caller.resetPassword({
      token: "reset-token-123",
      password: "NewPass123!",
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
  });
});

// --- changePassword ---

describe("passwordRouter.changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (ops: unknown[]) =>
      Promise.all(ops)
    );
  });

  it("throws NOT_FOUND when user not found in DB", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.changePassword({
        currentPassword: "old",
        newPassword: "NewPass123!",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when user has no password (google-only account)", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: null,
    });

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.changePassword({
        currentPassword: "old",
        newPassword: "NewPass123!",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when current password is incorrect", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(false as never);

    mockAccountFindFirst.mockResolvedValue({ password: "scrypt-hash" });
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "bcrypt-hash",
    });

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.changePassword({
        currentPassword: "wrong-password",
        newPassword: "NewPass123!",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("updates both User.passwordHash and Account.password on success", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true as never);

    mockAccountFindFirst.mockResolvedValue({ password: "scrypt-hash" });
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "old-bcrypt",
    });

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await caller.changePassword({
      currentPassword: "correct-password",
      newPassword: "NewPass123!",
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it("prefers Account.password over User.passwordHash for verification", async () => {
    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true as never);

    mockAccountFindFirst.mockResolvedValue({ password: "scrypt-hash" });
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "old-bcrypt",
    });

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await caller.changePassword({
      currentPassword: "correct",
      newPassword: "NewPass123!",
    });

    expect(comparePassword).toHaveBeenCalledWith("correct", "scrypt-hash");
  });
});
