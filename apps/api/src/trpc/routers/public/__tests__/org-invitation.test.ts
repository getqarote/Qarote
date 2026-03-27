import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/trpc/middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/services/plan/plan.service", () => ({
  PlanValidationError: class extends Error {},
  PlanLimitExceededError: class extends Error {},
  PlanErrorCode: {
    PLAN_RESTRICTION: "PLAN_RESTRICTION",
    PLAN_LIMIT_EXCEEDED: "PLAN_LIMIT_EXCEEDED",
  },
}));

const { publicOrgInvitationRouter } = await import("../org-invitation");

const mockInvitationFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      organizationInvitation: {
        findFirst: mockInvitationFindFirst,
      },
      user: {
        findUnique: mockUserFindUnique,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: null,
    workspaceId: null,
    organizationId: null,
    orgRole: null,
    locale: "en",
    ...overrides,
  };
}

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const mockInvitation = {
  id: "inv-1",
  email: "invited@test.com",
  token: "valid-token",
  role: "MEMBER",
  expiresAt: futureDate,
  acceptedAt: null,
  organizationId: "org-1",
  organization: { id: "org-1", name: "Acme Corp" },
  invitedBy: {
    id: "user-1",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publicOrgInvitationRouter.getDetails", () => {
  it("returns userExists: true when invited email has an existing account", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue({ id: "existing-user-1" });

    const caller = publicOrgInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getDetails({ token: "valid-token" });

    expect(result.success).toBe(true);
    expect(result.invitation.userExists).toBe(true);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: "invited@test.com" },
      select: { id: true },
    });
  });

  it("returns userExists: false when invited email has no account", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null);

    const caller = publicOrgInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getDetails({ token: "valid-token" });

    expect(result.invitation.userExists).toBe(false);
  });

  it("throws NOT_FOUND for invalid token", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = publicOrgInvitationRouter.createCaller(makeCtx() as never);

    await expect(
      caller.getDetails({ token: "invalid-token" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns invitation details with org info", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null);

    const caller = publicOrgInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getDetails({ token: "valid-token" });

    expect(result.invitation.email).toBe("invited@test.com");
    expect(result.invitation.organization.name).toBe("Acme Corp");
    expect(result.invitation.role).toBe("MEMBER");
  });
});
