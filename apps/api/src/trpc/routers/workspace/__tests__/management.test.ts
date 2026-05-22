import { TRPCError } from "@trpc/server";
import DataLoader from "dataloader";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpdateWorkspaceSchema } from "@/schemas/workspace";

import { permissionsForRole } from "@/auth/permissions";
import type { WorkspaceRole } from "@/generated/prisma/client";

function memberRowForRole(role: WorkspaceRole) {
  return {
    id: `m-${String(role).toLowerCase()}`,
    roleId: `role-${String(role).toLowerCase()}`,
    role: {
      id: `role-${String(role).toLowerCase()}`,
      isSystem: true,
      builtinKey: role,
      updatedAt: new Date("2026-05-11T10:00:00Z"),
    },
    workspace: { organizationId: "org-1", licenseTier: "ENTERPRISE" },
  };
}

function makeFakePermissionsLoader(role: WorkspaceRole) {
  return new DataLoader<string, unknown>(async (ids) =>
    ids.map(() => ({
      kind: "builtin" as const,
      role,
      permissions: new Set(permissionsForRole(role)),
    }))
  );
}

// --- Mocks ---

const mockWorkspaceFindFirst = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockWorkspaceFindMany = vi.fn();
const mockWorkspaceUpdate = vi.fn();
const mockWorkspaceCount = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockTransaction = vi.fn();
const mockWorkspaceMemberFindFirst = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: {
      findFirst: (...a: unknown[]) => mockWorkspaceFindFirst(...a),
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
      findMany: (...a: unknown[]) => mockWorkspaceFindMany(...a),
      update: (...a: unknown[]) => mockWorkspaceUpdate(...a),
      count: (...a: unknown[]) => mockWorkspaceCount(...a),
    },
    workspaceMember: {
      findFirst: (...a: unknown[]) => mockWorkspaceMemberFindFirst(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      updateMany: (...a: unknown[]) => mockUserUpdateMany(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
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
  getPlanFeatures: vi.fn().mockReturnValue({ maxWorkspaces: 3 }),
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

// Import after mocks
const { managementRouter } = await import("../management");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      workspace: {
        findFirst: mockWorkspaceFindFirst,
        findUnique: mockWorkspaceFindUnique,
        findMany: mockWorkspaceFindMany,
        update: mockWorkspaceUpdate,
        count: mockWorkspaceCount,
      },
      user: {
        findUnique: mockUserFindUnique,
        updateMany: mockUserUpdateMany,
      },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    resolveOrg: vi.fn().mockResolvedValue({
      organizationId: "org-1",
      role: "OWNER",
    }),
    req: {},
    effectivePermissionsLoader: makeFakePermissionsLoader(
      "ADMIN" as WorkspaceRole
    ),
    ...overrides,
  };
}

const mockWorkspaceData = {
  id: "ws-1",
  name: "My Workspace",
  contactEmail: "owner@test.com",
  logoUrl: null,
  ownerId: "user-1",
  tags: [],
  emailNotificationsEnabled: false,
  notificationSeverities: [],
  browserNotificationsEnabled: false,
  browserNotificationSeverities: [],
  notificationServerIds: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  plan: "FREE",
  _count: { members: 1, servers: 0 },
};

// --- Schema tests ---

describe("UpdateWorkspaceSchema", () => {
  it("rejects empty string contactEmail", () => {
    const result = UpdateWorkspaceSchema.safeParse({
      name: "My Workspace",
      contactEmail: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid contactEmail", () => {
    const result = UpdateWorkspaceSchema.safeParse({
      name: "My Workspace",
      contactEmail: "valid@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts omitted contactEmail", () => {
    const result = UpdateWorkspaceSchema.safeParse({ name: "My Workspace" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty tags array", () => {
    const result = UpdateWorkspaceSchema.safeParse({
      name: "My Workspace",
      tags: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts tags array with items", () => {
    const result = UpdateWorkspaceSchema.safeParse({
      name: "My Workspace",
      tags: ["production", "eu-west"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects tags with more than 10 items", () => {
    const result = UpdateWorkspaceSchema.safeParse({
      name: "My Workspace",
      tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tag longer than 20 characters", () => {
    const result = UpdateWorkspaceSchema.safeParse({
      name: "My Workspace",
      tags: ["this-tag-is-way-too-long-for-schema"],
    });
    expect(result.success).toBe(false);
  });
});

// --- Router: update ---

describe("managementRouter.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // workspaceProcedure resolves membership + role from prisma — default
    // mock makes the caller a workspace ADMIN of ws-1 with org ws-org-1.
    mockWorkspaceMemberFindFirst.mockResolvedValue(
      memberRowForRole("ADMIN" as WorkspaceRole)
    );
  });

  it("rejects empty string contactEmail with BAD_REQUEST", async () => {
    const caller = managementRouter.createCaller(makeCtx() as never);

    const rejection = caller.update({
      workspaceId: "ws-1",
      name: "My Workspace",
      contactEmail: "",
    });

    await expect(rejection).rejects.toThrow(TRPCError);
    await expect(rejection).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Ensure the DB update was never reached
    expect(mockWorkspaceUpdate).not.toHaveBeenCalled();
  });

  it("updates workspace with valid contactEmail", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspaceData);
    mockWorkspaceUpdate.mockResolvedValue({
      ...mockWorkspaceData,
      contactEmail: "new@example.com",
    });

    const caller = managementRouter.createCaller(makeCtx() as never);
    const result = await caller.update({
      workspaceId: "ws-1",
      name: "My Workspace",
      contactEmail: "new@example.com",
    });

    expect(result.workspace.contactEmail).toBe("new@example.com");
  });

  it("updates workspace when contactEmail is omitted (undefined)", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspaceData);
    mockWorkspaceUpdate.mockResolvedValue(mockWorkspaceData);

    const caller = managementRouter.createCaller(makeCtx() as never);
    await expect(
      caller.update({ workspaceId: "ws-1", name: "My Workspace" })
    ).resolves.toBeDefined();

    const updateCall = mockWorkspaceUpdate.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "ws-1" });
    expect(updateCall.data.name).toBe("My Workspace");
    expect(updateCall.data).not.toHaveProperty("contactEmail");
  });

  it("updates workspace tags", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(mockWorkspaceData);
    mockWorkspaceUpdate.mockResolvedValue({
      ...mockWorkspaceData,
      tags: ["production", "eu-west"],
    });

    const caller = managementRouter.createCaller(makeCtx() as never);
    const result = await caller.update({
      workspaceId: "ws-1",
      name: "My Workspace",
      tags: ["production", "eu-west"],
    });

    expect(result.workspace.tags).toEqual(["production", "eu-west"]);
  });

  it("throws FORBIDDEN when caller is not a member of the workspace", async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValueOnce(null);

    const caller = managementRouter.createCaller(makeCtx() as never);
    await expect(
      caller.update({ workspaceId: "ws-other", name: "My Workspace" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mockWorkspaceUpdate).not.toHaveBeenCalled();
  });
});
