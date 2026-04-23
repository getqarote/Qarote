import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockOrgInvitationFindFirst = vi.fn();
const mockOrgMemberFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    organizationInvitation: {
      findFirst: (...a: unknown[]) => mockOrgInvitationFindFirst(...a),
    },
    organizationMember: {
      findUnique: (...a: unknown[]) => mockOrgMemberFindUnique(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

vi.mock("@/core/org-invitation-accept", () => ({
  applyWorkspaceAssignments: vi.fn().mockResolvedValue("ws-1"),
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

const { orgInvitationRouter } = await import("../org-invitation");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      organizationInvitation: { findFirst: mockOrgInvitationFindFirst },
      organizationMember: { findUnique: mockOrgMemberFindUnique },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "test@example.com",
      isActive: true,
      workspaceId: null,
    },
    locale: "en",
    ...overrides,
  };
}

const mockInvitation = {
  id: "inv-1",
  token: "tok-abc",
  email: "test@example.com",
  organizationId: "org-1",
  role: "MEMBER",
  workspaceAssignments: [],
  acceptedAt: null,
  expiresAt: new Date(Date.now() + 86_400_000),
  organization: { id: "org-1", name: "Acme Corp" },
};

// --- Tests ---

describe("orgInvitationRouter.acceptOrgInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND for invalid or expired token", async () => {
    mockOrgInvitationFindFirst.mockResolvedValue(null);

    const caller = orgInvitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptOrgInvitation({ token: "bad-tok" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN when invitation email does not match user email", async () => {
    mockOrgInvitationFindFirst.mockResolvedValue({
      ...mockInvitation,
      email: "other@example.com",
    });

    const caller = orgInvitationRouter.createCaller(makeCtx() as never);
    await expect(
      caller.acceptOrgInvitation({ token: "tok-abc" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts invitation and creates membership for new member", async () => {
    mockOrgInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockOrgMemberFindUnique.mockResolvedValue(null);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        organizationInvitation: { update: vi.fn() },
        organizationMember: { create: vi.fn() },
        user: { update: vi.fn() },
      };
      const { applyWorkspaceAssignments } =
        await import("@/core/org-invitation-accept");
      vi.mocked(applyWorkspaceAssignments).mockResolvedValue("ws-1");
      return fn(tx);
    });

    const caller = orgInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.acceptOrgInvitation({ token: "tok-abc" });

    expect(result.success).toBe(true);
    expect(result.organization.id).toBe("org-1");
  });

  it("accepts invitation and updates role for existing member (re-invite)", async () => {
    mockOrgInvitationFindFirst.mockResolvedValue({
      ...mockInvitation,
      role: "ADMIN",
    });
    mockOrgMemberFindUnique.mockResolvedValue({ id: "mem-1", role: "MEMBER" });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        organizationInvitation: { update: vi.fn() },
        organizationMember: { update: vi.fn() },
        user: { update: vi.fn() },
      };
      const { applyWorkspaceAssignments } =
        await import("@/core/org-invitation-accept");
      vi.mocked(applyWorkspaceAssignments).mockResolvedValue(null);
      return fn(tx);
    });

    const caller = orgInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.acceptOrgInvitation({ token: "tok-abc" });

    expect(result.success).toBe(true);
    expect(result.firstWorkspaceId).toBeNull();
  });
});
