import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockAccountFindFirst = vi.fn();
const mockAccountUpsert = vi.fn();
const mockPasswordResetFindUnique = vi.fn();
const mockPasswordResetCreate = vi.fn();
const mockPasswordResetDeleteMany = vi.fn();
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
      create: (...a: unknown[]) => mockPasswordResetCreate(...a),
      deleteMany: (...a: unknown[]) => mockPasswordResetDeleteMany(...a),
      delete: (...a: unknown[]) => mockPasswordResetDelete(...a),
      update: (...a: unknown[]) => mockPasswordResetUpdate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

vi.mock("@/core/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("bcrypt-hash"),
  comparePassword: vi.fn(),
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("scrypt-hash"),
}));

vi.mock("@/services/audit.service", () => ({
  auditService: {
    logPasswordResetRequest: vi.fn(),
    logPasswordResetFailed: vi.fn(),
    logPasswordResetCompleted: vi.fn(),
    logPasswordChange: vi.fn(),
  },
}));

vi.mock("@/services/email/password-reset-email.service", () => ({
  passwordResetEmailService: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/encryption.service", () => ({
  EncryptionService: {
    generateEncryptionKey: vi.fn().mockReturnValue("reset-tok-xyz"),
  },
}));

vi.mock("@/config", () => ({
  isDevelopment: vi.fn().mockReturnValue(false),
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

const { passwordRouter } = await import("../password");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
      account: { findFirst: mockAccountFindFirst, upsert: mockAccountUpsert },
      passwordReset: {
        findUnique: mockPasswordResetFindUnique,
        create: mockPasswordResetCreate,
        deleteMany: mockPasswordResetDeleteMany,
        delete: mockPasswordResetDelete,
        update: mockPasswordResetUpdate,
      },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: { id: "user-1", email: "test@example.com", isActive: true },
    locale: "en",
    ...overrides,
  };
}

// --- Tests ---

describe("passwordRouter.requestPasswordReset", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success message even when email not found (security)", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    const result = await caller.requestPasswordReset({ email: "ghost@x.com" });

    expect(result.message).toBeDefined();
    expect(mockPasswordResetCreate).not.toHaveBeenCalled();
  });

  it("creates reset token and sends email when user exists", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
    });
    mockPasswordResetDeleteMany.mockResolvedValue({});
    mockPasswordResetCreate.mockResolvedValue({});

    const caller = passwordRouter.createCaller(makeCtx() as never);
    const result = await caller.requestPasswordReset({
      email: "test@example.com",
    });

    expect(mockPasswordResetCreate).toHaveBeenCalledOnce();
    expect(result.message).toBeDefined();
  });

  it("does not expose token in production", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      firstName: null,
      lastName: null,
    });
    mockPasswordResetDeleteMany.mockResolvedValue({});
    mockPasswordResetCreate.mockResolvedValue({});

    const caller = passwordRouter.createCaller(makeCtx() as never);
    const result = await caller.requestPasswordReset({
      email: "test@example.com",
    });

    expect((result as Record<string, unknown>).token).toBeUndefined();
  });
});

describe("passwordRouter.resetPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  const futureDate = new Date(Date.now() + 86_400_000);
  const mockReset = {
    id: "reset-1",
    userId: "user-1",
    token: "reset-tok-xyz",
    expiresAt: futureDate,
    used: false,
    user: {
      id: "user-1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
    },
  };

  it("throws BAD_REQUEST for invalid token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue(null);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resetPassword({ token: "bad-tok", password: "NewPass123!" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST for expired token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      ...mockReset,
      expiresAt: new Date(Date.now() - 1000),
    });
    mockPasswordResetDelete.mockResolvedValue({});

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resetPassword({ token: "tok", password: "NewPass123!" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST for already-used token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({ ...mockReset, used: true });

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resetPassword({ token: "tok", password: "NewPass123!" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("resets password successfully for valid token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue(mockReset);
    mockTransaction.mockResolvedValue([]);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    const result = await caller.resetPassword({
      token: "reset-tok-xyz",
      password: "NewPass123!",
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(result.message).toBeDefined();
  });
});

describe("passwordRouter.changePassword", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockUserRecord = {
    id: "user-1",
    email: "test@example.com",
    passwordHash: "bcrypt-hash",
  };

  it("throws NOT_FOUND when user does not exist", async () => {
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

  it("throws BAD_REQUEST when user has no password (Google sign-in)", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({
      ...mockUserRecord,
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

  it("throws BAD_REQUEST when current password is wrong", async () => {
    mockAccountFindFirst.mockResolvedValue({ password: "bcrypt-hash" });
    mockUserFindUnique.mockResolvedValue(mockUserRecord);

    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(false);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    await expect(
      caller.changePassword({
        currentPassword: "wrong",
        newPassword: "NewPass123!",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("changes password successfully", async () => {
    mockAccountFindFirst.mockResolvedValue({ password: "bcrypt-hash" });
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockTransaction.mockResolvedValue([]);

    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true);

    const caller = passwordRouter.createCaller(makeCtx() as never);
    const result = await caller.changePassword({
      currentPassword: "OldPass123!",
      newPassword: "NewPass123!",
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(result.message).toBeDefined();
  });
});
