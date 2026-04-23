import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockInvitationFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    invitation: {
      findFirst: (...a: unknown[]) => mockInvitationFindFirst(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      create: (...a: unknown[]) => mockUserCreate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

vi.mock("@/core/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-pw"),
}));

vi.mock("@/core/utils", () => ({
  formatInvitedBy: vi.fn((u) => u),
}));

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/plan/plan.service", () => ({
  getWorkspacePlan: vi.fn().mockResolvedValue("FREE"),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
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

const { publicInvitationRouter } = await import("../invitation");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      invitation: { findFirst: mockInvitationFindFirst },
      user: { findUnique: mockUserFindUnique, create: mockUserCreate },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: null,
    locale: "en",
    ...overrides,
  };
}

const futureDate = new Date(Date.now() + 86_400_000);

const mockInvitation = {
  id: "inv-1",
  email: "user@example.com",
  role: "MEMBER",
  token: "tok-abc",
  status: "PENDING",
  expiresAt: futureDate,
  workspaceId: "ws-1",
  workspace: {
    id: "ws-1",
    name: "Test Workspace",
    contactEmail: "ws@test.com",
  },
  invitedBy: {
    id: "u-1",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: null,
  },
};

// --- Tests ---

describe("publicInvitationRouter.getDetails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND for invalid/expired token", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    await expect(caller.getDetails({ token: "bad-tok" })).rejects.toMatchObject(
      {
        code: "NOT_FOUND",
      }
    );
  });

  it("returns invitation details with workspace plan", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.getDetails({ token: "tok-abc" });

    expect(result.success).toBe(true);
    expect(result.invitation.workspace.id).toBe("ws-1");
    expect(result.invitation.workspace.plan).toBe("FREE");
  });
});

describe("publicInvitationRouter.accept", () => {
  beforeEach(() => vi.clearAllMocks());

  const acceptInput = {
    token: "tok-abc",
    password: "Password123!",
    firstName: "Jane",
    lastName: "Doe",
  };

  it("throws NOT_FOUND for invalid/expired invitation token", async () => {
    mockInvitationFindFirst.mockResolvedValue(null);

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    await expect(caller.accept(acceptInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("creates user and accepts invitation in transaction", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue(null); // email not already taken
    const newUser = {
      id: "new-user",
      email: "user@example.com",
      firstName: "Jane",
      lastName: "Doe",
      role: "MEMBER",
      workspaceId: "ws-1",
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue(newUser) },
        account: { create: vi.fn() },
        invitation: { update: vi.fn() },
        workspaceMember: { create: vi.fn() },
      };
      return fn(tx);
    });

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    const result = await caller.accept(acceptInput);

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(result.message).toBeDefined();
    expect(result.user.id).toBe("new-user");
  });

  it("throws CONFLICT when email is already registered", async () => {
    mockInvitationFindFirst.mockResolvedValue(mockInvitation);
    mockUserFindUnique.mockResolvedValue({ id: "existing-user" });

    const caller = publicInvitationRouter.createCaller(makeCtx() as never);
    await expect(caller.accept(acceptInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
