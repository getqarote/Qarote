import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockInvitationFindMany = vi.fn();
const mockInvitationUpdateMany = vi.fn();
const mockInvitationFindUnique = vi.fn();
const mockInvitationCreate = vi.fn();
const mockInvitationCount = vi.fn();
const mockWorkspaceMemberFindFirst = vi.fn().mockResolvedValue({
  id: "mem-1",
  roleId: null,
  role: null,
  workspace: { organizationId: null, licenseTier: null },
});

vi.mock("@/core/prisma", () => ({
  prisma: {
    invitation: {
      findMany: (...a: unknown[]) => mockInvitationFindMany(...a),
      updateMany: (...a: unknown[]) => mockInvitationUpdateMany(...a),
      findUnique: (...a: unknown[]) => mockInvitationFindUnique(...a),
      create: (...a: unknown[]) => mockInvitationCreate(...a),
      count: (...a: unknown[]) => mockInvitationCount(...a),
    },
    workspaceMember: {
      findFirst: (...a: unknown[]) => mockWorkspaceMemberFindFirst(...a),
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
  deploymentConfig: {
    mode: "selfhosted",
    isCloud: () => false,
    isSelfHosted: () => true,
  },
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

vi.mock("@/services/audit", () => ({
  recordFromContext: vi.fn().mockResolvedValue(undefined),
  recordAuditLog: vi.fn().mockResolvedValue(undefined),
  recordCapabilityRecheck: vi.fn().mockResolvedValue(undefined),
}));

const { invitationRouter } = await import("../invitation");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  const role = ((overrides.user as { role?: string }) ?? {}).role ?? "ADMIN";
  const memberPerms =
    role === "ADMIN"
      ? new Set(["member:read", "member:invite", "member:remove"])
      : new Set(["member:read"]);
  return {
    prisma: {
      invitation: {
        findMany: mockInvitationFindMany,
        updateMany: mockInvitationUpdateMany,
        findUnique: mockInvitationFindUnique,
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
    effectivePermissionsLoader: {
      load: vi.fn().mockResolvedValue({
        kind: "builtin",
        role,
        permissions: memberPerms,
        scopeRows: [],
      }),
    },
    ...overrides,
  };
}

// --- Tests ---

describe("invitationRouter.getInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceMemberFindFirst.mockResolvedValue({
      id: "mem-1",
      roleId: null,
      role: null,
      workspace: { organizationId: null, licenseTier: null },
    });
  });

  it("throws FORBIDDEN when user is not a workspace member", async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getInvitations({ workspaceId: "ws-1", page: 1, limit: 10 })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns paginated invitations for workspace", async () => {
    mockInvitationCount.mockResolvedValue(1);
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
    const result = await caller.getInvitations({
      workspaceId: "ws-1",
      page: 1,
      limit: 10,
    });

    expect(result.invitations).toHaveLength(1);
    expect(mockInvitationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-1" }),
      })
    );
  });
});

describe("invitationRouter.revokeInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceMemberFindFirst.mockResolvedValue({
      id: "mem-1",
      roleId: null,
      role: null,
      workspace: { organizationId: null, licenseTier: null },
    });
  });

  it("throws FORBIDDEN when user is not a workspace member", async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(null);

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.revokeInvitation({ workspaceId: "ws-1", invitationId: "inv-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when invitation does not exist or is not pending", async () => {
    mockInvitationUpdateMany.mockResolvedValue({ count: 0 });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.revokeInvitation({ workspaceId: "ws-1", invitationId: "inv-999" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("revokes invitation and returns success message", async () => {
    mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
    mockInvitationFindUnique.mockResolvedValue({ email: "user@example.com" });

    const caller = invitationRouter.createCaller(makeCtx() as never);
    const result = await caller.revokeInvitation({
      workspaceId: "ws-1",
      invitationId: "inv-1",
    });

    expect(mockInvitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "inv-1", workspaceId: "ws-1" }),
      })
    );
    expect(result.message).toBeDefined();
  });
});
