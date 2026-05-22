/**
 * Procedure × role access matrix (Task #14, rbac.md §8)
 *
 * Covers the three workspace procedure levels against every WorkspaceRole:
 *   workspaceProcedure         — all 4 roles admitted, non-members denied
 *   workspaceAdminProcedure    — OWNER/ADMIN admitted, MEMBER/READONLY denied
 *   workspaceOwnerProcedure    — OWNER only
 *
 * Also covers:
 *   R-AUDIT-1  — structured denial log on FORBIDDEN
 *   R-IDOR-1   — revokeInvitation cannot access another workspace's rows
 */

import DataLoader from "dataloader";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Constants (must precede mock objects that reference them) ────────────────

const WS_ID = "ws-1";

const MOCK_WORKSPACE = {
  id: WS_ID,
  name: "Test Workspace",
  contactEmail: "c@test.com",
  logoUrl: null,
  ownerId: "user-1",
  organizationId: "org-1",
  tags: [],
  emailNotificationsEnabled: false,
  notificationSeverities: [],
  browserNotificationsEnabled: false,
  browserNotificationSeverities: [],
  notificationServerIds: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  _count: { members: 1, servers: 0 },
};

// ─── Mocks (must precede dynamic import) ─────────────────────────────────────

const mockWarnLogger = vi.fn();

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: mockWarnLogger,
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockMemberFindFirst = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockInvitationUpdateMany = vi.fn();
const mockWorkspaceMemberCount = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspaceMember: {
      findFirst: (...a: unknown[]) => mockMemberFindFirst(...a),
      count: (...a: unknown[]) => mockWorkspaceMemberCount(...a),
    },
    workspace: {
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
    },
    invitation: {
      updateMany: (...a: unknown[]) => mockInvitationUpdateMany(...a),
    },
  },
}));

vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => false,
  isCloudMode: () => true,
  isDemoMode: () => false,
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
  getPlanFeatures: vi
    .fn()
    .mockReturnValue({ maxWorkspaces: 3, maxTraceRetentionHours: 24 }),
  getWorkspacePlan: vi.fn().mockResolvedValue("FREE"),
  getOrgPlan: vi.fn().mockResolvedValue("FREE"),
  validateUserInvitation: vi.fn(),
  validateWorkspaceCreation: vi.fn(),
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/services/feature-gate/license", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
  getLicensePayload: vi.fn(),
  invalidateLicenseCache: vi.fn(),
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
  getUserWorkspaceRole: vi.fn().mockResolvedValue("ADMIN"),
}));

vi.mock("@/services/posthog", () => ({ posthog: null }));

// Dynamic imports after all mocks are registered
const { coreRouter } = await import("../core");
const { managementRouter } = await import("../management");
const { invitationRouter } = await import("../invitation");
const { extractPropagatedCause } = await import("@/trpc/trpc");
const { permissionsForRole } = await import("@/auth/permissions");

// ─── New-shape Prisma + ctx-loader helpers ───────────────────────────────────

/**
 * Build the new-shape `workspaceMember.findFirst` mock return for a given
 * built-in role. Mirrors the select clause in `workspaceProcedure`.
 */
function memberRowForRole(role: WorkspaceRole) {
  return {
    id: `m-${role.toLowerCase()}`,
    roleId: `role-${role.toLowerCase()}`,
    role: {
      id: `role-${role.toLowerCase()}`,
      isSystem: true,
      builtinKey: role,
      updatedAt: new Date("2026-05-11T10:00:00Z"),
    },
    workspace: { organizationId: "org-1", licenseTier: "ENTERPRISE" },
  };
}

function makeFakePermissionsLoader(role: WorkspaceRole | null) {
  return new DataLoader<string, unknown>(async (ids) =>
    ids.map(() =>
      role
        ? {
            kind: "builtin" as const,
            role,
            permissions: new Set(permissionsForRole(role)),
          }
        : null
    )
  );
}

// ─── Context helpers ──────────────────────────────────────────────────────────

type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "READONLY";

const mockTxBase = {
  user: {
    updateMany: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  rabbitMQServer: { deleteMany: vi.fn().mockResolvedValue({}) },
  feedback: { deleteMany: vi.fn().mockResolvedValue({}) },
  workspace: {
    delete: vi.fn().mockResolvedValue({}),
    findFirst: vi.fn().mockResolvedValue(null),
  },
};

const mockCtxPrisma = {
  workspace: {
    findUnique: mockWorkspaceFindUnique,
    findFirst: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(MOCK_WORKSPACE),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  session: { deleteMany: vi.fn().mockResolvedValue({}) },
  workspaceMember: {
    findFirst: mockMemberFindFirst,
    count: mockWorkspaceMemberCount,
  },
  invitation: { updateMany: mockInvitationUpdateMany },
  $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockTxBase)),
};

function makeCtx(
  opts: {
    role?: WorkspaceRole | null;
    isActive?: boolean;
    user?: Record<string, unknown> | null;
    workspaceId?: string | null;
  } = {}
) {
  const {
    role = "MEMBER",
    isActive = true,
    user: userOverride,
    workspaceId = WS_ID,
  } = opts;

  const user =
    userOverride === null
      ? null
      : {
          id: "user-1",
          role: "USER",
          isActive,
          email: "user@test.com",
          workspaceId: null,
          ...(userOverride ?? {}),
        };

  if (role !== null) {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole(role));
  } else {
    mockMemberFindFirst.mockResolvedValue(null);
  }

  return {
    prisma: mockCtxPrisma,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    user,
    workspaceId,
    locale: "en",
    resolveOrg: vi.fn().mockResolvedValue({
      organizationId: "org-1",
      role: "OWNER",
    }),
    req: {},
    effectivePermissionsLoader: makeFakePermissionsLoader(role),
  };
}

// ─── workspaceProcedure ───────────────────────────────────────────────────────

describe("workspaceProcedure — every role is admitted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceFindUnique.mockResolvedValue(MOCK_WORKSPACE);
  });

  const ADMITTED_ROLES: WorkspaceRole[] = [
    "OWNER",
    "ADMIN",
    "MEMBER",
    "READONLY",
  ];

  it.each(ADMITTED_ROLES)(
    "%s can call a workspaceProcedure route",
    async (role) => {
      mockMemberFindFirst.mockResolvedValue(memberRowForRole(role));
      const caller = coreRouter.createCaller(makeCtx({ role }) as never);
      await expect(
        caller.getById({ workspaceId: WS_ID })
      ).resolves.toBeDefined();
    }
  );
});

describe("workspaceProcedure — denial cases (negative × 4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("non-member gets FORBIDDEN (not a workspace member)", async () => {
    const caller = coreRouter.createCaller(makeCtx({ role: null }) as never);
    await expect(caller.getById({ workspaceId: WS_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("inactive user gets FORBIDDEN before membership is checked", async () => {
    const caller = coreRouter.createCaller(
      makeCtx({ role: "MEMBER", isActive: false }) as never
    );
    await expect(caller.getById({ workspaceId: WS_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("unauthenticated caller (no user) gets UNAUTHORIZED", async () => {
    const caller = coreRouter.createCaller(makeCtx({ user: null }) as never);
    await expect(caller.getById({ workspaceId: WS_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("no workspaceId in input or context gets BAD_REQUEST", async () => {
    // All workspaceId sources are empty: input="", ctx.workspaceId=null, user.workspaceId=null
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("MEMBER"));
    const ctx = makeCtx({ role: "MEMBER", workspaceId: null });
    const caller = coreRouter.createCaller(ctx as never);
    // Schema requires a non-empty workspaceId; pass an empty string to bypass input schema
    // and force the procedure to fall back to null context
    await expect(caller.getById({ workspaceId: "  " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

// ─── workspaceAdminProcedure ──────────────────────────────────────────────────

describe("workspaceAdminProcedure — OWNER/ADMIN admitted, rest denied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Return null → procedure throws NOT_FOUND, confirming admission past the gate
    // (as opposed to FORBIDDEN, which would indicate a gate rejection)
    mockWorkspaceFindUnique.mockResolvedValue(null);
    mockCtxPrisma.workspace.findFirst.mockResolvedValue(null);
  });

  const ADMITTED: WorkspaceRole[] = ["OWNER", "ADMIN"];
  const DENIED: WorkspaceRole[] = ["MEMBER", "READONLY"];

  it.each(ADMITTED)(
    "%s passes the workspaceAdminProcedure gate",
    async (role) => {
      mockMemberFindFirst.mockResolvedValue(memberRowForRole(role));
      const caller = managementRouter.createCaller(makeCtx({ role }) as never);
      // NOT_FOUND means the role was admitted past the gate (workspace lookup returned null)
      await expect(
        caller.update({ workspaceId: WS_ID, name: "Updated" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  );

  it.each(DENIED)(
    "%s is blocked by workspaceAdminProcedure with FORBIDDEN",
    async (role) => {
      mockMemberFindFirst.mockResolvedValue(memberRowForRole(role));
      const caller = managementRouter.createCaller(makeCtx({ role }) as never);
      await expect(
        caller.update({ workspaceId: WS_ID, name: "Updated" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  );

  it("non-member gets FORBIDDEN from workspaceAdminProcedure", async () => {
    const caller = managementRouter.createCaller(
      makeCtx({ role: null }) as never
    );
    await expect(
      caller.update({ workspaceId: WS_ID, name: "Updated" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("unauthenticated caller gets UNAUTHORIZED from workspaceAdminProcedure", async () => {
    const caller = managementRouter.createCaller(
      makeCtx({ user: null }) as never
    );
    await expect(
      caller.update({ workspaceId: WS_ID, name: "Updated" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── workspaceOwnerProcedure ──────────────────────────────────────────────────

describe("workspaceOwnerProcedure — OWNER only admitted, all others denied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // null → NOT_FOUND, confirming admission past the gate
    mockWorkspaceFindUnique.mockResolvedValue(null);
  });

  it("OWNER passes the workspaceOwnerProcedure gate", async () => {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("OWNER"));
    const caller = managementRouter.createCaller(
      makeCtx({ role: "OWNER" }) as never
    );
    await expect(caller.delete({ workspaceId: WS_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  const NON_OWNER: WorkspaceRole[] = ["ADMIN", "MEMBER", "READONLY"];

  it.each(NON_OWNER)(
    "%s is blocked by workspaceOwnerProcedure with FORBIDDEN",
    async (role) => {
      mockMemberFindFirst.mockResolvedValue(memberRowForRole(role));
      const caller = managementRouter.createCaller(makeCtx({ role }) as never);
      await expect(caller.delete({ workspaceId: WS_ID })).rejects.toMatchObject(
        { code: "FORBIDDEN" }
      );
    }
  );

  it("non-member gets FORBIDDEN from workspaceOwnerProcedure", async () => {
    const caller = managementRouter.createCaller(
      makeCtx({ role: null }) as never
    );
    await expect(caller.delete({ workspaceId: WS_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ─── R-AUDIT-1: structured denial log ────────────────────────────────────────

describe("R-AUDIT-1 — structured denial log on authorization failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceFindUnique.mockResolvedValue(null);
  });

  it("logs rbac.denial with correct schema when MEMBER is denied on workspace:update", async () => {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("MEMBER"));
    const caller = managementRouter.createCaller(
      makeCtx({ role: "MEMBER" }) as never
    );
    await caller.update({ workspaceId: WS_ID, name: "x" }).catch(() => {});

    expect(mockWarnLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "rbac.denial",
        userId: "user-1",
        workspaceId: WS_ID,
        requiredRole: "ADMIN",
        actualRole: "MEMBER",
        reason: "permission_denied:workspace:update",
      }),
      expect.any(String)
    );
  });

  it("logs rbac.denial with correct schema when ADMIN is denied on workspace:delete", async () => {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("ADMIN"));
    const caller = managementRouter.createCaller(
      makeCtx({ role: "ADMIN" }) as never
    );
    await caller.delete({ workspaceId: WS_ID }).catch(() => {});

    expect(mockWarnLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "rbac.denial",
        userId: "user-1",
        workspaceId: WS_ID,
        requiredRole: "OWNER",
        actualRole: "ADMIN",
        reason: "permission_denied:workspace:delete",
      }),
      expect.any(String)
    );
  });

  it("logs rbac.denial when non-member accesses workspace", async () => {
    mockMemberFindFirst.mockResolvedValue(null);
    const caller = coreRouter.createCaller(makeCtx({ role: null }) as never);
    await caller.getById({ workspaceId: WS_ID }).catch(() => {});

    expect(mockWarnLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "rbac.denial",
        reason: "not_a_member",
      }),
      expect.any(String)
    );
  });
});

// ─── WORKSPACE_PERMISSION cause wire shape (frontend PR-C contract) ──────────

describe("WORKSPACE_PERMISSION cause payload — wire-stable shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceFindUnique.mockResolvedValue(null);
  });

  it("denied permission emits cause = { code, required, actual, permission }", async () => {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("MEMBER"));
    const caller = managementRouter.createCaller(
      makeCtx({ role: "MEMBER" }) as never
    );
    let thrown: unknown;
    try {
      await caller.update({ workspaceId: WS_ID, name: "x" });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    // Server-side cause on the TRPCError instance.
    const cause = (thrown as { cause?: Record<string, unknown> }).cause;
    expect(cause).toMatchObject({
      code: "WORKSPACE_PERMISSION",
      required: "ADMIN",
      actual: "MEMBER",
      permission: "workspace:update",
    });
    // Client-side wire shape: the same object after the errorFormatter
    // lifts it to shape.data.cause. Pins the contract PR-C branches on.
    expect(extractPropagatedCause(thrown)).toMatchObject({
      code: "WORKSPACE_PERMISSION",
      required: "ADMIN",
      actual: "MEMBER",
      permission: "workspace:update",
    });
  });

  it("READONLY denied on workspace:update — same shape, different fields", async () => {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("READONLY"));
    const caller = managementRouter.createCaller(
      makeCtx({ role: "READONLY" }) as never
    );
    let thrown: unknown;
    try {
      await caller.update({ workspaceId: WS_ID, name: "x" });
    } catch (e) {
      thrown = e;
    }
    const cause = (thrown as { cause?: Record<string, unknown> }).cause;
    expect(cause).toMatchObject({
      code: "WORKSPACE_PERMISSION",
      required: "ADMIN",
      actual: "READONLY",
      permission: "workspace:update",
    });
    expect(extractPropagatedCause(thrown)).toMatchObject({
      code: "WORKSPACE_PERMISSION",
      required: "ADMIN",
      actual: "READONLY",
      permission: "workspace:update",
    });
  });

  it("ADMIN denied on workspace:delete — required is OWNER", async () => {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("ADMIN"));
    const caller = managementRouter.createCaller(
      makeCtx({ role: "ADMIN" }) as never
    );
    let thrown: unknown;
    try {
      await caller.delete({ workspaceId: WS_ID });
    } catch (e) {
      thrown = e;
    }
    const cause = (thrown as { cause?: Record<string, unknown> }).cause;
    expect(cause).toMatchObject({
      code: "WORKSPACE_PERMISSION",
      required: "OWNER",
      actual: "ADMIN",
      permission: "workspace:delete",
    });
    expect(extractPropagatedCause(thrown)).toMatchObject({
      code: "WORKSPACE_PERMISSION",
      required: "OWNER",
      actual: "ADMIN",
      permission: "workspace:delete",
    });
  });

  it("non-RBAC errors return null from extractPropagatedCause (no leak)", async () => {
    // A generic error must not have its cause propagated to shape.data.cause —
    // only allowlisted RBAC discriminators (PROPAGATED_CAUSE_CODES) lift.
    const random = new Error("generic");
    expect(extractPropagatedCause(random)).toBeNull();
    // A TRPCError without a cause: also null.
    const noCause = new (await import("@trpc/server")).TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "oops",
    });
    expect(extractPropagatedCause(noCause)).toBeNull();
  });
});

// ─── R-IDOR-1: revokeInvitation cross-workspace isolation ────────────────────

describe("R-IDOR-1 — revokeInvitation cannot reach another workspace's rows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("ADMIN"));
  });

  it("returns NOT_FOUND when invitationId belongs to a different workspace", async () => {
    // updateMany returns count=0 because workspaceId filter doesn't match
    mockInvitationUpdateMany.mockResolvedValue({ count: 0 });

    const caller = invitationRouter.createCaller(
      makeCtx({ role: "ADMIN" }) as never
    );
    await expect(
      caller.revokeInvitation({
        workspaceId: WS_ID,
        invitationId: "inv-belongs-to-ws-2",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns NOT_FOUND when invitation has already been accepted (not PENDING)", async () => {
    // updateMany over (id, workspaceId, status=PENDING) returns 0 for an accepted row
    mockInvitationUpdateMany.mockResolvedValue({ count: 0 });

    const caller = invitationRouter.createCaller(
      makeCtx({ role: "ADMIN" }) as never
    );
    await expect(
      caller.revokeInvitation({
        workspaceId: WS_ID,
        invitationId: "inv-already-accepted",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("MEMBER cannot call revokeInvitation (workspaceAdminProcedure guard)", async () => {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("MEMBER"));
    const caller = invitationRouter.createCaller(
      makeCtx({ role: "MEMBER" }) as never
    );
    await expect(
      caller.revokeInvitation({ workspaceId: WS_ID, invitationId: "inv-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    // updateMany must not have been called — membership was rejected first
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it("READONLY cannot call revokeInvitation (workspaceAdminProcedure guard)", async () => {
    mockMemberFindFirst.mockResolvedValue(memberRowForRole("READONLY"));
    const caller = invitationRouter.createCaller(
      makeCtx({ role: "READONLY" }) as never
    );
    await expect(
      caller.revokeInvitation({ workspaceId: WS_ID, invitationId: "inv-2" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });
});
