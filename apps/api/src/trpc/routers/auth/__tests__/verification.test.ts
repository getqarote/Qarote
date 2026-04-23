import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
  },
}));

const mockVerifyToken = vi.fn();
const mockGenerateVerificationToken = vi.fn().mockResolvedValue("tok-abc");
const mockSendVerificationEmail = vi.fn().mockResolvedValue({ success: true });

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    verifyToken: (...a: unknown[]) => mockVerifyToken(...a),
    generateVerificationToken: (...a: unknown[]) =>
      mockGenerateVerificationToken(...a),
    sendVerificationEmail: (...a: unknown[]) => mockSendVerificationEmail(...a),
  },
}));

vi.mock("@/services/integrations/notion.service", () => ({
  notionService: { syncUser: vi.fn() },
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
  UserMapper: { toApiResponse: vi.fn((u) => ({ id: u.id, email: u.email })) },
}));

const { verificationRouter } = await import("../verification");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: null,
    locale: "en",
    ...overrides,
  };
}

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "USER",
  workspaceId: null,
  isActive: true,
  emailVerified: true,
  emailVerifiedAt: new Date(),
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  pendingEmail: null,
};

// --- Tests ---

describe("verificationRouter.verifyEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when token is invalid", async () => {
    mockVerifyToken.mockResolvedValue({
      success: false,
      error: "Invalid token",
    });

    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.verifyEmail({ token: "bad-tok" })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws NOT_FOUND when user is missing after verification", async () => {
    mockVerifyToken.mockResolvedValue({
      success: true,
      user: { id: "user-1" },
    });
    mockUserFindUnique.mockResolvedValue(null);

    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(caller.verifyEmail({ token: "tok-ok" })).rejects.toMatchObject(
      {
        code: "NOT_FOUND",
      }
    );
  });

  it("returns user on successful verification", async () => {
    mockVerifyToken.mockResolvedValue({
      success: true,
      user: { id: "user-1" },
    });
    mockUserFindUnique.mockResolvedValue(mockUser);

    const caller = verificationRouter.createCaller(makeCtx() as never);
    const result = await caller.verifyEmail({ token: "tok-ok" });

    expect(result.message).toBe("Email verified successfully");
    expect(result.user).toBeDefined();
  });
});

describe("verificationRouter.resendVerification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when unauthenticated and no email provided", async () => {
    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resendVerification({ type: "SIGNUP" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws UNAUTHORIZED when EMAIL_CHANGE requested unauthenticated", async () => {
    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resendVerification({ type: "EMAIL_CHANGE", email: "x@x.com" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns generic message for non-existent email (security)", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = verificationRouter.createCaller(makeCtx() as never);
    const result = await caller.resendVerification({
      type: "SIGNUP",
      email: "ghost@example.com",
    });

    expect(result.message).toContain("If an account exists");
  });

  it("throws BAD_REQUEST when email already verified (SIGNUP type)", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...mockUser,
      emailVerified: true,
      isActive: true,
    });

    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resendVerification({ type: "SIGNUP", email: "test@example.com" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sends verification email for authenticated user", async () => {
    const authedCtx = makeCtx({
      user: {
        id: "user-1",
        email: "test@example.com",
        firstName: "John",
        workspaceId: null,
      },
    });

    const caller = verificationRouter.createCaller(authedCtx as never);
    const result = await caller.resendVerification({ type: "SIGNUP" });

    expect(mockGenerateVerificationToken).toHaveBeenCalledOnce();
    expect(mockSendVerificationEmail).toHaveBeenCalledOnce();
    expect(result.message).toBe("Verification email sent successfully");
  });

  it("throws BAD_REQUEST when authenticated user has no pending email for EMAIL_CHANGE", async () => {
    mockUserFindUnique.mockResolvedValue({ ...mockUser, pendingEmail: null });

    const authedCtx = makeCtx({
      user: {
        id: "user-1",
        email: "test@example.com",
        firstName: "John",
        workspaceId: null,
      },
    });

    const caller = verificationRouter.createCaller(authedCtx as never);
    await expect(
      caller.resendVerification({ type: "EMAIL_CHANGE" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("verificationRouter.getVerificationStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const ctx = makeCtx({ user: { id: "user-1", isActive: true } });
    const caller = verificationRouter.createCaller(ctx as never);
    await expect(caller.getVerificationStatus()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns verification status", async () => {
    mockUserFindUnique.mockResolvedValue({
      emailVerified: true,
      emailVerifiedAt: new Date("2024-01-01"),
      pendingEmail: "pending@example.com",
    });

    const ctx = makeCtx({ user: { id: "user-1", isActive: true } });
    const caller = verificationRouter.createCaller(ctx as never);
    const result = await caller.getVerificationStatus();

    expect(result.emailVerified).toBe(true);
    expect(result.pendingEmail).toBe("pending@example.com");
  });
});
