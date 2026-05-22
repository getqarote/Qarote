/**
 * Permission catalog invariants (RBAC Phase 2).
 *
 * The catalog is the single source of truth for who-can-do-what. These
 * tests pin the role-tier semantics so accidental edits to the map can't
 * silently widen or narrow access without a failing test.
 */

import { describe, expect, it } from "vitest";

import {
  hasPermission,
  permissionsForRole,
  WORKSPACE_PERMISSION_REQUIREMENTS,
  type WorkspacePermission,
} from "../permissions";

import { WorkspaceRole } from "@/generated/prisma/client";

const ALL_KEYS = Object.keys(
  WORKSPACE_PERMISSION_REQUIREMENTS
) as WorkspacePermission[];

describe("hasPermission", () => {
  it("OWNER holds every permission in the catalog", () => {
    for (const perm of ALL_KEYS) {
      expect(hasPermission(WorkspaceRole.OWNER, perm)).toBe(true);
    }
  });

  it("READONLY holds exactly the :read permissions plus workspace:read", () => {
    // Spread before sort: permissionsForRole returns a frozen array.
    const readonly = [...permissionsForRole(WorkspaceRole.READONLY)].sort();
    // Snapshot of the readonly bundle. Adding a new READONLY-tier permission
    // requires updating this list explicitly — the test fails loud if a key
    // accidentally drifts down to READONLY.
    expect(readonly).toEqual(
      [
        "alerting:read",
        "binding:read",
        "broker:connections:read",
        "broker:read",
        "exchange:read",
        "incident:read",
        "llm_config:read",
        "member:read",
        "metric:read",
        "policy:read",
        "queue:read",
        "scan:read",
        "server:read",
        "slack_config:read",
        "topology:read",
        "vhost:read",
        "webhook:read",
        "workspace:read",
      ].sort()
    );
  });

  it("MEMBER additionally holds queue:write but not admin ops", () => {
    expect(hasPermission(WorkspaceRole.MEMBER, "queue:write")).toBe(true);
    expect(hasPermission(WorkspaceRole.MEMBER, "queue:purge")).toBe(false);
    expect(hasPermission(WorkspaceRole.MEMBER, "member:invite")).toBe(false);
    expect(hasPermission(WorkspaceRole.MEMBER, "server:create")).toBe(false);
    expect(hasPermission(WorkspaceRole.MEMBER, "alerting:write")).toBe(false);
    expect(hasPermission(WorkspaceRole.MEMBER, "message:publish")).toBe(false);
  });

  it("ADMIN holds every permission except OWNER-only ones", () => {
    const adminPerms = new Set(permissionsForRole(WorkspaceRole.ADMIN));
    // OWNER-only:
    expect(adminPerms.has("workspace:delete")).toBe(false);
    expect(adminPerms.has("definitions:export")).toBe(false);
    expect(adminPerms.has("definitions:import")).toBe(false);
    // ADMIN holds:
    expect(adminPerms.has("queue:purge")).toBe(true);
    expect(adminPerms.has("queue:pause")).toBe(true);
    expect(adminPerms.has("member:update_role")).toBe(true);
    expect(adminPerms.has("server:delete")).toBe(true);
    expect(adminPerms.has("server:test_connection")).toBe(true);
    expect(adminPerms.has("workspace:export")).toBe(true);
    expect(adminPerms.has("scan:run")).toBe(true);
    expect(adminPerms.has("alerting:write")).toBe(true);
    expect(adminPerms.has("alerting:delete")).toBe(true);
    expect(adminPerms.has("message:publish")).toBe(true);
    expect(adminPerms.has("message:tap")).toBe(true);
    expect(adminPerms.has("message:record:read")).toBe(true);
    expect(adminPerms.has("broker_user:permissions:write")).toBe(true);
    expect(adminPerms.has("digest:write")).toBe(true);
  });

  it("workspace:delete remains OWNER-only", () => {
    expect(hasPermission(WorkspaceRole.OWNER, "workspace:delete")).toBe(true);
    expect(hasPermission(WorkspaceRole.ADMIN, "workspace:delete")).toBe(false);
    expect(hasPermission(WorkspaceRole.MEMBER, "workspace:delete")).toBe(false);
    expect(hasPermission(WorkspaceRole.READONLY, "workspace:delete")).toBe(
      false
    );
  });

  it("definitions:export and :import remain OWNER-only", () => {
    for (const key of ["definitions:export", "definitions:import"] as const) {
      expect(hasPermission(WorkspaceRole.OWNER, key)).toBe(true);
      expect(hasPermission(WorkspaceRole.ADMIN, key)).toBe(false);
      expect(hasPermission(WorkspaceRole.MEMBER, key)).toBe(false);
      expect(hasPermission(WorkspaceRole.READONLY, key)).toBe(false);
    }
  });

  it("message:tap and message:record:read are ADMIN, NOT READONLY", () => {
    // Live broker payloads expose PII / secrets — READONLY must not see them.
    for (const key of ["message:tap", "message:record:read"] as const) {
      expect(hasPermission(WorkspaceRole.READONLY, key)).toBe(false);
      expect(hasPermission(WorkspaceRole.MEMBER, key)).toBe(false);
      expect(hasPermission(WorkspaceRole.ADMIN, key)).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, key)).toBe(true);
    }
  });

  it("alerting mutations require ADMIN (closes pre-PR-B silent gap)", () => {
    // Pre-PR-B, these were gated by workspaceProcedure (any member) — a
    // READONLY user could create/delete alert rules and notification configs.
    for (const key of [
      "alerting:write",
      "alerting:delete",
      "slack_config:write",
      "slack_config:delete",
      "webhook:write",
      "webhook:delete",
    ] as const) {
      expect(hasPermission(WorkspaceRole.READONLY, key)).toBe(false);
      expect(hasPermission(WorkspaceRole.MEMBER, key)).toBe(false);
      expect(hasPermission(WorkspaceRole.ADMIN, key)).toBe(true);
    }
  });
});

describe("permissionsForRole", () => {
  it("returns a list whose every entry is held by the role", () => {
    for (const role of [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.READONLY,
    ]) {
      const list = permissionsForRole(role);
      for (const perm of list) {
        expect(hasPermission(role, perm)).toBe(true);
      }
    }
  });

  it("higher rank includes everything held by lower rank (monotonic)", () => {
    const ranks = [
      WorkspaceRole.READONLY,
      WorkspaceRole.MEMBER,
      WorkspaceRole.ADMIN,
      WorkspaceRole.OWNER,
    ];
    for (let i = 0; i < ranks.length - 1; i++) {
      const lower = new Set(permissionsForRole(ranks[i]));
      const higher = new Set(permissionsForRole(ranks[i + 1]));
      for (const perm of lower) {
        expect(higher.has(perm)).toBe(true);
      }
    }
  });

  it("is stable across calls (caching does not mutate)", () => {
    const a = permissionsForRole(WorkspaceRole.ADMIN);
    const b = permissionsForRole(WorkspaceRole.ADMIN);
    expect(a).toEqual(b);
  });

  it("returns a frozen array — caller cannot poison the cache", () => {
    const a = permissionsForRole(WorkspaceRole.ADMIN);
    expect(Object.isFrozen(a)).toBe(true);
    // Strict-mode mutation throws; sloppy-mode silently no-ops. Either way,
    // the second call must return the original contents.
    const before = [...a];
    expect(() => (a as WorkspacePermission[]).push("queue:read")).toThrow();
    const b = permissionsForRole(WorkspaceRole.ADMIN);
    expect([...b]).toEqual(before);
  });
});

describe("catalog completeness", () => {
  // The "every key has a requirement entry" check would be tautological
  // here — ALL_KEYS is derived from Object.keys(WORKSPACE_PERMISSION_REQUIREMENTS),
  // so the assertion would always pass. The same invariant ("every
  // WorkspacePermission union member has a requirement entry") IS meaningful
  // and is enforced by TypeScript at compile time via the type
  // `Record<WorkspacePermission, WorkspaceRole>` on the requirements
  // declaration — adding a union member without an entry fails tsc.
  it("every requirement is a valid WorkspaceRole at runtime", () => {
    // This one is NOT tautological: the requirements record is typed
    // `Record<WorkspacePermission, WorkspaceRole>`, but a runtime cast
    // (e.g. via a DB migration that drifted, or a manual `as` somewhere
    // upstream) could put a non-WorkspaceRole value in. The test catches
    // that.
    const validRoles = new Set([
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.READONLY,
    ]);
    for (const perm of ALL_KEYS) {
      expect(validRoles.has(WORKSPACE_PERMISSION_REQUIREMENTS[perm])).toBe(
        true
      );
    }
  });
});
