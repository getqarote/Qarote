import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockAccountFindFirst = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
    account: {
      findFirst: (...a: unknown[]) => mockAccountFindFirst(...a),
    },
  },
}));

vi.mock("@/core/auth", () => ({
  comparePassword: vi.fn(),
}));

vi.mock("@/services/audit.service", () => ({
  auditService: {
    logPasswordEvent: vi.fn(),
  },
}));

const mockGenerateVerificationToken = vi.fn().mockResolvedValue("tok-xyz");
const mockSendVerificationEmail = vi.fn().mockResolvedValue({ success: true });

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    generateVerificationToken: (...a: unknown[]) =>
      mockGenerateVerificationToken(...a),
    sendVerificationEmail: (...a: unknown[]) => mockSendVerificationEmail(...a),
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

const { emailRouter } = await import("../email");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
      account: { findFirst: mockAccountFindFirst },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: { id: "user-1", email: "test@example.com", isActive: true },
    locale: "en",
    ...overrides,
  };
}

const mockUserRecord = {
  id: "user-1",
  email: "test@example.com",
  passwordHash: "hashed-pw",
  firstName: "John",
  lastName: "Doe",
};

// --- Tests ---

describe("emailRouter.requestEmailChange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when user does not exist", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValueOnce(null); // userWithPassword lookup

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(
      caller.requestEmailChange({ newEmail: "new@example.com", password: "pw" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when user has no password (Google account)", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({
      ...mockUserRecord,
      passwordHash: null,
    });

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(
      caller.requestEmailChange({ newEmail: "new@example.com", password: "pw" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws UNAUTHORIZED when password is incorrect", async () => {
    mockAccountFindFirst.mockResolvedValue({ password: "hashed-pw" });
    mockUserFindUnique.mockResolvedValue(mockUserRecord);

    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(false);

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(
      caller.requestEmailChange({
        newEmail: "new@example.com",
        password: "wrong",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws BAD_REQUEST when new email is already in use", async () => {
    mockAccountFindFirst.mockResolvedValue({ password: "hashed-pw" });
    mockUserFindUnique
      .mockResolvedValueOnce(mockUserRecord) // userWithPassword
      .mockResolvedValueOnce({ id: "other-user" }); // existingUser check

    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true);

    const caller = emailRouter.createCaller(makeCtx() as never);
    await expect(
      caller.requestEmailChange({
        newEmail: "taken@example.com",
        password: "correct",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sets pending email and sends verification on success", async () => {
    mockAccountFindFirst.mockResolvedValue({ password: "hashed-pw" });
    mockUserFindUnique
      .mockResolvedValueOnce(mockUserRecord) // userWithPassword
      .mockResolvedValueOnce(null); // existingUser (email is free)
    mockUserUpdate.mockResolvedValue({});

    const { comparePassword } = await import("@/core/auth");
    vi.mocked(comparePassword).mockResolvedValue(true);

    const caller = emailRouter.createCaller(makeCtx() as never);
    const result = await caller.requestEmailChange({
      newEmail: "new@example.com",
      password: "correct",
    });

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { pendingEmail: "new@example.com" },
      })
    );
    expect(mockSendVerificationEmail).toHaveBeenCalledOnce();
    expect(result.pendingEmail).toBe("new@example.com");
  });
});

describe("emailRouter.cancelEmailChange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears pending email", async () => {
    mockUserUpdate.mockResolvedValue({});

    const caller = emailRouter.createCaller(makeCtx() as never);
    const result = await caller.cancelEmailChange();

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { pendingEmail: null },
      })
    );
    expect(result.message).toBeDefined();
  });
});
