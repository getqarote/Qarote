import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockInvitationFindMany = vi.fn();
const mockInvitationFindFirst = vi.fn();
const mockInvitationDelete = vi.fn();
const mockInvitationCreate = vi.fn();
const mockInvitationCount = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    invitation: {
      findMany: (...a: unknown[]) => mockInvitationFindMany(...a),
      findFirst: (...a: unknown[]) => mockInvitationFindFirst(...a),
      delete: (...a: unknown[]) => mockInvitationDelete(...a),
      create: (...a: unknown[]) => mockInvitationCreate(...a),
      count: (...a: unknown[]) => mockInvitationCount(...a),
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
  getWorkspacePlan: vi.fn().mockResolvedValue("FREE"),
  validateUserInvitation: vi.fn().mockResolvedValue(undefined),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/services/email/email.service", () => ({
  EmailService: {
    sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/services/email/core-email.service", () => ({
  CoreEmailService: {
    sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/services/encryption.service", () => ({
  EncryptionService: {
    generateEncryptionKey: vi.fn().mockReturnValue("token-xyz"),
  },
}));

vi.mock("@/core/utils", () => ({
  formatInvitedBy: vi.fn((u) => u),
  getUserDisplayName: vi.fn((u) => u?.email ?? ""),
}));

vi.mock("@/config", () => ({
  emailConfig: { enabled: true },
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/core/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
  getLicensePayload: vi.fn(),
  invalidateLicenseCache: vi.fn(),
}));

const { invitationRouter } = await import("../invitation");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
      invitation: {
        findMany: mockInvitationFindMany,
        findFirst: mockInvitationFindFirst,
        delete: mockInvitationDelete,
        create: mockInvitationCreate,
        count: mockInvitationCount,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "admin@test.com",
      role: "ADMIN",
      isActive: true,
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    ...overrides,
  };
}

// --- Tests ---

describe("invitationRouter.getInvitations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when user has no workspace in DB", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: null });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getInvitations({ page: 1, limit: 10 })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns paginated invitations for workspace", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockInvitationCount.mockResolvedValue(2);
    mockInvitationFindMany.mockResolvedValue([
      {
        id: "inv-1",
        email: "user@example.com",
        role: "MEMBER",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        invitedBy: {
          id: "user-1",
          email: "admin@test.com",
          firstName: "Admin",
          lastName: "User",
        },
      },
    ]);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getInvitations({ page: 1, limit: 10 });

    expect(result.invitations).toHaveLength(1);
    expect(mockInvitationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-1" }),
      })
    );
  });
});

describe("invitationRouter.revokeInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when user has no workspace", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: null });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.revokeInvitation({ invitationId: "inv-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when invitation does not exist in workspace", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.revokeInvitation({ invitationId: "inv-999" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes invitation when found", async () => {
    mockUserFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockInvitationFindFirst.mockResolvedValue({
      id: "inv-1",
      workspaceId: "ws-1",
    });
    mockInvitationDelete.mockResolvedValue({});

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.revokeInvitation({ invitationId: "inv-1" });

    expect(mockInvitationDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inv-1" } })
    );
    expect(result.message).toBeDefined();
  });
});
