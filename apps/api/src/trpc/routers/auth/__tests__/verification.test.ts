import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
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

const mockVerifyToken = vi.fn();
const mockGenerateVerificationToken = vi.fn().mockResolvedValue("new-token");
const mockSendVerificationEmail = vi
  .fn()
  .mockResolvedValue({ success: true, error: null });

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {
    verifyToken: (...a: unknown[]) => mockVerifyToken(...a),
    generateVerificationToken: (...a: unknown[]) =>
      mockGenerateVerificationToken(...a),
    sendVerificationEmail: (...a: unknown[]) => mockSendVerificationEmail(...a),
  },
}));

vi.mock("@/services/integrations/notion.service", () => ({
  notionService: { syncUser: vi.fn().mockResolvedValue(undefined) },
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

// Import after mocks
const { verificationRouter } = await import("../verification");

// --- Helpers ---

const mockVerifiedUser = {
  id: "user-1",
  email: "user@example.com",
  firstName: "Jane",
  lastName: "Doe",
  role: "MEMBER",
  workspaceId: "ws-1",
  isActive: true,
  emailVerified: true,
  emailVerifiedAt: new Date("2024-01-02"),
  lastLogin: null,
  pendingEmail: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
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

// --- verifyEmail ---

describe("verificationRouter.verifyEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies email successfully", async () => {
    mockVerifyToken.mockResolvedValue({
      success: true,
      user: { id: "user-1" },
    });
    mockUserFindUnique.mockResolvedValue(mockVerifiedUser);

    const caller = verificationRouter.createCaller(makeCtx() as never);
    const result = await caller.verifyEmail({ token: "valid-token" });

    expect(result.message).toBe("Email verified successfully");
    expect(result.user.email).toBe("user@example.com");
  });

  it("throws BAD_REQUEST when token is invalid", async () => {
    mockVerifyToken.mockResolvedValue({
      success: false,
      error: "Token is invalid",
    });

    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.verifyEmail({ token: "bad-token" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws NOT_FOUND when user not found after verification", async () => {
    mockVerifyToken.mockResolvedValue({
      success: true,
      user: { id: "user-1" },
    });
    mockUserFindUnique.mockResolvedValue(null);

    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.verifyEmail({ token: "valid-token" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// --- resendVerification ---

describe("verificationRouter.resendVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resends verification email for authenticated user (SIGNUP)", async () => {
    const caller = verificationRouter.createCaller(makeCtx() as never);
    const result = await caller.resendVerification({ type: "SIGNUP" });

    expect(result.message).toBe("Verification email sent successfully");
    expect(mockGenerateVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SIGNUP" })
    );
  });

  it("resends EMAIL_CHANGE for authenticated user with pendingEmail", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...mockVerifiedUser,
      pendingEmail: "newemail@example.com",
    });

    const caller = verificationRouter.createCaller(makeCtx() as never);
    const result = await caller.resendVerification({ type: "EMAIL_CHANGE" });

    expect(result.message).toBe("Verification email sent successfully");
    expect(mockGenerateVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "newemail@example.com",
        type: "EMAIL_CHANGE",
      })
    );
  });

  it("throws BAD_REQUEST when authenticated user has no pendingEmail for EMAIL_CHANGE", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...mockVerifiedUser,
      pendingEmail: null,
    });

    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.resendVerification({ type: "EMAIL_CHANGE" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns generic message for unauthenticated user with non-existent email", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = verificationRouter.createCaller(
      makeCtx({ user: null }) as never
    );
    const result = await caller.resendVerification({
      type: "SIGNUP",
      email: "notexist@example.com",
    });

    expect(result.message).toContain("If an account exists");
    expect(mockGenerateVerificationToken).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST for unauthenticated user with already verified email", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...mockVerifiedUser,
      emailVerified: true,
      isActive: true,
    });

    const caller = verificationRouter.createCaller(
      makeCtx({ user: null }) as never
    );
    await expect(
      caller.resendVerification({
        type: "SIGNUP",
        email: "user@example.com",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST for unauthenticated without email", async () => {
    const caller = verificationRouter.createCaller(
      makeCtx({ user: null }) as never
    );
    await expect(
      caller.resendVerification({ type: "SIGNUP" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws UNAUTHORIZED for unauthenticated EMAIL_CHANGE", async () => {
    const caller = verificationRouter.createCaller(
      makeCtx({ user: null }) as never
    );
    await expect(
      caller.resendVerification({
        type: "EMAIL_CHANGE",
        email: "user@example.com",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// --- getVerificationStatus ---

describe("verificationRouter.getVerificationStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns verification status for the current user", async () => {
    mockUserFindUnique.mockResolvedValue({
      emailVerified: true,
      emailVerifiedAt: new Date("2024-01-02"),
      pendingEmail: null,
    });

    const caller = verificationRouter.createCaller(makeCtx() as never);
    const result = await caller.getVerificationStatus();

    expect(result.emailVerified).toBe(true);
    expect(result.pendingEmail).toBeNull();
  });

  it("throws NOT_FOUND when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const caller = verificationRouter.createCaller(makeCtx() as never);
    await expect(caller.getVerificationStatus()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns pendingEmail when user has one", async () => {
    mockUserFindUnique.mockResolvedValue({
      emailVerified: true,
      emailVerifiedAt: new Date("2024-01-02"),
      pendingEmail: "pending@example.com",
    });

    const caller = verificationRouter.createCaller(makeCtx() as never);
    const result = await caller.getVerificationStatus();

    expect(result.pendingEmail).toBe("pending@example.com");
  });
});
