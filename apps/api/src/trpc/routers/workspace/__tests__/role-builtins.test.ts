/**
 * Unit test for `workspace.role.builtins` — the endpoint that exposes the
 * four system role UUIDs to the frontend so it can call `assignRole` with
 * a `targetRoleId` rather than maintaining a parallel enum→UUID map.
 */
import DataLoader from "dataloader";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRoleFindMany = vi.fn();
const mockMemberFindFirst = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    role: { findMany: (...a: unknown[]) => mockRoleFindMany(...a) },
    workspaceMember: {
      findFirst: (...a: unknown[]) => mockMemberFindFirst(...a),
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

vi.mock("@/trpc/middlewares/demoGuard", () => ({
  assertNotDemoBlocked: vi.fn(),
}));

vi.mock("@/middlewares/workspace", () => ({ hasWorkspaceAccess: vi.fn() }));
vi.mock("@/core/workspace-access", () => ({ getUserWorkspaceRole: vi.fn() }));

const { roleRouter } = await import("../role");
const { WorkspaceRole } = await import("@/generated/prisma/client");
const { permissionsForRole } = await import("@/auth/permissions");

function adminPermissionsLoader() {
  return new DataLoader<string, unknown>(async (ids) =>
    ids.map(() => ({
      kind: "builtin" as const,
      role: WorkspaceRole.ADMIN,
      permissions: new Set(permissionsForRole(WorkspaceRole.ADMIN)),
    }))
  );
}

function makeCtx() {
  // workspacePermissionProcedure resolves the caller membership via the
  // prisma singleton — return any ADMIN row so the gate lets the request
  // through.
  mockMemberFindFirst.mockResolvedValue({
    id: "m-admin",
    roleId: "role-admin",
    role: {
      id: "role-admin",
      isSystem: true,
      builtinKey: WorkspaceRole.ADMIN,
      updatedAt: new Date("2026-05-12T00:00:00Z"),
    },
    workspace: { organizationId: "org-1", licenseTier: "ENTERPRISE" },
  });
  return {
    prisma: {
      role: { findMany: mockRoleFindMany },
      workspaceMember: { findFirst: mockMemberFindFirst },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "u-admin",
      role: "ADMIN",
      isActive: true,
      email: "a@test.com",
      workspaceId: "00000000-0000-4000-8000-000000000001",
    },
    workspaceId: "00000000-0000-4000-8000-000000000001",
    locale: "en",
    organizationId: "org-1",
    effectivePermissionsLoader: adminPermissionsLoader(),
  };
}

describe("workspace.role.builtins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the four system role rows with their UUIDs", async () => {
    mockRoleFindMany.mockResolvedValue([
      { id: "uuid-admin", builtinKey: WorkspaceRole.ADMIN, name: "Admin" },
      { id: "uuid-member", builtinKey: WorkspaceRole.MEMBER, name: "Member" },
      { id: "uuid-owner", builtinKey: WorkspaceRole.OWNER, name: "Owner" },
      {
        id: "uuid-readonly",
        builtinKey: WorkspaceRole.READONLY,
        name: "Read-only",
      },
    ]);

    const caller = roleRouter.createCaller(makeCtx() as never);
    const result = await caller.builtins({
      workspaceId: "00000000-0000-4000-8000-000000000001",
    });

    expect(result.items).toHaveLength(4);
    expect(result.items.map((r) => r.builtinKey).sort()).toEqual([
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.OWNER,
      WorkspaceRole.READONLY,
    ]);
    expect(mockRoleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: null, isSystem: true },
      })
    );
  });
});
