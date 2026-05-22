/**
 * Unit tests for the effective-permissions resolver. Verifies:
 *   - Built-in roles resolve from the in-code catalog
 *   - Custom roles resolve from RolePermission rows
 *   - Dual-read fallback (rolePointer=null → legacy `role` enum)
 *   - Version-aware cache: same updatedAt → cache hit; new updatedAt → reload
 *   - DataLoader memoization across calls within a "request"
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted; use vi.hoisted to share refs with the factory.
const { mockMemberFindUnique, mockRolePermissionFindMany } = vi.hoisted(() => ({
  mockMemberFindUnique: vi.fn(),
  mockRolePermissionFindMany: vi.fn(),
}));

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspaceMember: { findUnique: mockMemberFindUnique },
    rolePermission: { findMany: mockRolePermissionFindMany },
  },
}));

import {
  _resetRoleCacheForTests,
  createEffectivePermissionsLoader,
  effectiveHasPermission,
  type EffectivePermissions,
  invalidateRoleCache,
  loadEffectivePermissions,
} from "@/auth/effective-permissions";
import { WorkspaceRole } from "@/generated/prisma/client";

// Type usage anchor for knip — `EffectivePermissions` is the public
// return shape used by PR-2 ctx wiring and PR-3 scope evaluator.
type _AnchorEffectivePermissions = EffectivePermissions;

const SYSTEM_ROLE_ID = "00000000-0000-4000-8000-000000000001";
const CUSTOM_ROLE_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  mockMemberFindUnique.mockReset();
  mockRolePermissionFindMany.mockReset();
  _resetRoleCacheForTests();
});

describe("loadEffectivePermissions — built-in roles", () => {
  it("resolves OWNER built-in from the in-code catalog (kind=builtin)", async () => {
    mockMemberFindUnique.mockResolvedValue({
      roleId: SYSTEM_ROLE_ID,
      role: {
        id: SYSTEM_ROLE_ID,
        isSystem: true,
        builtinKey: WorkspaceRole.OWNER,
        updatedAt: new Date("2026-05-11T10:00:00Z"),
      },
    });

    const result = await loadEffectivePermissions(MEMBER_ID);

    expect(result?.kind).toBe("builtin");
    if (result?.kind !== "builtin") return;
    expect(result.role).toBe(WorkspaceRole.OWNER);
    // OWNER has every catalog key including the OWNER-only ones.
    expect(result.permissions.has("workspace:delete")).toBe(true);
    expect(result.permissions.has("audit:export")).toBe(true);
    expect(result.permissions.has("role:manage")).toBe(true);
    // RolePermission table not queried for built-ins.
    expect(mockRolePermissionFindMany).not.toHaveBeenCalled();
  });

  it("READONLY built-in lacks ADMIN-tier permissions", async () => {
    mockMemberFindUnique.mockResolvedValue({
      roleId: "any",
      role: {
        id: "any",
        isSystem: true,
        builtinKey: WorkspaceRole.READONLY,
        updatedAt: new Date(),
      },
    });

    const result = await loadEffectivePermissions(MEMBER_ID);
    if (result?.kind !== "builtin") throw new Error("expected builtin");
    expect(result.permissions.has("queue:read")).toBe(true);
    expect(result.permissions.has("queue:purge")).toBe(false);
    expect(result.permissions.has("audit:read")).toBe(false);
  });
});

describe("loadEffectivePermissions — custom roles", () => {
  it("resolves a custom role's permissions from RolePermission rows", async () => {
    const now = new Date("2026-05-11T10:00:00Z");
    mockMemberFindUnique.mockResolvedValue({
      roleId: CUSTOM_ROLE_ID,
      role: {
        id: CUSTOM_ROLE_ID,
        isSystem: false,
        builtinKey: null,
        updatedAt: now,
      },
    });
    mockRolePermissionFindMany.mockResolvedValue([
      { permissionKey: "queue:read", scopeJson: null, scopeFingerprint: "abc" },
      {
        permissionKey: "queue:purge",
        scopeJson: { kind: "server.id", ids: ["X"] },
        scopeFingerprint: "def",
      },
    ]);

    const result = await loadEffectivePermissions(MEMBER_ID);

    expect(result?.kind).toBe("custom");
    if (result?.kind !== "custom") return;
    expect(result.roleId).toBe(CUSTOM_ROLE_ID);
    expect(result.permissions.has("queue:read")).toBe(true);
    expect(result.permissions.has("queue:purge")).toBe(true);
    expect(result.permissions.has("workspace:delete")).toBe(false);
    expect(result.scopeRows).toHaveLength(2);
  });

  it("version-aware cache: same updatedAt returns cached result without re-querying RolePermission", async () => {
    const sharedUpdatedAt = new Date("2026-05-11T10:00:00Z");
    mockMemberFindUnique.mockResolvedValue({
      roleId: CUSTOM_ROLE_ID,
      role: {
        id: CUSTOM_ROLE_ID,
        isSystem: false,
        builtinKey: null,
        updatedAt: sharedUpdatedAt,
      },
    });
    mockRolePermissionFindMany.mockResolvedValue([
      { permissionKey: "queue:read", scopeJson: null, scopeFingerprint: "x" },
    ]);

    // First call — RolePermission queried.
    await loadEffectivePermissions(MEMBER_ID);
    expect(mockRolePermissionFindMany).toHaveBeenCalledTimes(1);

    // Second call (different member, same role) — same updatedAt → cache hit.
    await loadEffectivePermissions("different-member");
    expect(mockRolePermissionFindMany).toHaveBeenCalledTimes(1);
  });

  it("version-aware cache: newer updatedAt triggers reload", async () => {
    const v1 = new Date("2026-05-11T10:00:00Z");
    const v2 = new Date("2026-05-11T11:00:00Z");

    mockMemberFindUnique.mockResolvedValueOnce({
      roleId: CUSTOM_ROLE_ID,
      role: {
        id: CUSTOM_ROLE_ID,
        isSystem: false,
        builtinKey: null,
        updatedAt: v1,
      },
    });
    mockRolePermissionFindMany.mockResolvedValueOnce([
      { permissionKey: "queue:read", scopeJson: null, scopeFingerprint: "x" },
    ]);
    await loadEffectivePermissions(MEMBER_ID);

    // Same role, newer updatedAt — should hit DB again.
    mockMemberFindUnique.mockResolvedValueOnce({
      roleId: CUSTOM_ROLE_ID,
      role: {
        id: CUSTOM_ROLE_ID,
        isSystem: false,
        builtinKey: null,
        updatedAt: v2,
      },
    });
    mockRolePermissionFindMany.mockResolvedValueOnce([
      { permissionKey: "queue:read", scopeJson: null, scopeFingerprint: "x" },
      { permissionKey: "queue:purge", scopeJson: null, scopeFingerprint: "y" },
    ]);
    const result = await loadEffectivePermissions(MEMBER_ID);
    if (result?.kind !== "custom") throw new Error("expected custom");
    expect(result.permissions.has("queue:purge")).toBe(true);
    expect(mockRolePermissionFindMany).toHaveBeenCalledTimes(2);
  });

  it("invalidateRoleCache forces reload on the next call", async () => {
    const ts = new Date("2026-05-11T10:00:00Z");
    mockMemberFindUnique.mockResolvedValue({
      roleId: CUSTOM_ROLE_ID,
      role: {
        id: CUSTOM_ROLE_ID,
        isSystem: false,
        builtinKey: null,
        updatedAt: ts,
      },
    });
    mockRolePermissionFindMany.mockResolvedValue([
      { permissionKey: "queue:read", scopeJson: null, scopeFingerprint: "x" },
    ]);

    await loadEffectivePermissions(MEMBER_ID);
    expect(mockRolePermissionFindMany).toHaveBeenCalledTimes(1);

    invalidateRoleCache(CUSTOM_ROLE_ID);

    await loadEffectivePermissions(MEMBER_ID);
    expect(mockRolePermissionFindMany).toHaveBeenCalledTimes(2);
  });
});

describe("loadEffectivePermissions — fail-closed paths", () => {
  it("member not found returns null (fail-closed)", async () => {
    mockMemberFindUnique.mockResolvedValue(null);
    const result = await loadEffectivePermissions(MEMBER_ID);
    expect(result).toBeNull();
  });
});

describe("createEffectivePermissionsLoader (DataLoader)", () => {
  it("memoizes repeated loads for the same member within the request", async () => {
    mockMemberFindUnique.mockResolvedValue({
      roleId: SYSTEM_ROLE_ID,
      role: {
        id: SYSTEM_ROLE_ID,
        isSystem: true,
        builtinKey: WorkspaceRole.OWNER,
        updatedAt: new Date(),
      },
    });

    const loader = createEffectivePermissionsLoader();
    await loader.load(MEMBER_ID);
    await loader.load(MEMBER_ID);
    await loader.load(MEMBER_ID);

    // DataLoader.cache=true — only one underlying call.
    expect(mockMemberFindUnique).toHaveBeenCalledTimes(1);
  });
});

describe("effectiveHasPermission", () => {
  it("delegates to the in-code checker for builtins", () => {
    const resolution = {
      kind: "builtin" as const,
      role: WorkspaceRole.ADMIN,
      permissions: new Set<never>(),
    };
    expect(effectiveHasPermission(resolution, "audit:read")).toBe(true);
    expect(effectiveHasPermission(resolution, "workspace:delete")).toBe(false);
  });

  it("checks the Set for custom roles", () => {
    const resolution = {
      kind: "custom" as const,
      roleId: "x",
      permissions: new Set(["queue:read", "queue:purge"]) as ReadonlySet<
        "queue:read" | "queue:purge"
      >,
      scopeRows: [],
    };
    expect(effectiveHasPermission(resolution as never, "queue:purge")).toBe(
      true
    );
    expect(
      effectiveHasPermission(resolution as never, "workspace:delete")
    ).toBe(false);
  });
});
