import { describe, expect, it } from "vitest";

import {
  canAssignRole,
  hasMinimumWorkspaceRole,
  INVITABLE_ROLES,
  WORKSPACE_ROLE_LEVELS,
} from "../workspace-roles";

import { WorkspaceRole } from "@/generated/prisma/client";

describe("workspace-roles", () => {
  describe("WORKSPACE_ROLE_LEVELS", () => {
    it("defines correct hierarchy order", () => {
      expect(WORKSPACE_ROLE_LEVELS[WorkspaceRole.READONLY]).toBeLessThan(
        WORKSPACE_ROLE_LEVELS[WorkspaceRole.MEMBER]
      );
      expect(WORKSPACE_ROLE_LEVELS[WorkspaceRole.MEMBER]).toBeLessThan(
        WORKSPACE_ROLE_LEVELS[WorkspaceRole.ADMIN]
      );
      expect(WORKSPACE_ROLE_LEVELS[WorkspaceRole.ADMIN]).toBeLessThan(
        WORKSPACE_ROLE_LEVELS[WorkspaceRole.OWNER]
      );
    });
  });

  describe("hasMinimumWorkspaceRole", () => {
    it("OWNER has at least ADMIN", () => {
      expect(
        hasMinimumWorkspaceRole(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
      ).toBe(true);
    });

    it("ADMIN has at least ADMIN", () => {
      expect(
        hasMinimumWorkspaceRole(WorkspaceRole.ADMIN, WorkspaceRole.ADMIN)
      ).toBe(true);
    });

    it("MEMBER does not have at least ADMIN", () => {
      expect(
        hasMinimumWorkspaceRole(WorkspaceRole.MEMBER, WorkspaceRole.ADMIN)
      ).toBe(false);
    });

    it("READONLY does not have at least MEMBER", () => {
      expect(
        hasMinimumWorkspaceRole(WorkspaceRole.READONLY, WorkspaceRole.MEMBER)
      ).toBe(false);
    });

    it("every role has at least READONLY", () => {
      for (const role of Object.values(WorkspaceRole)) {
        expect(hasMinimumWorkspaceRole(role, WorkspaceRole.READONLY)).toBe(
          true
        );
      }
    });
  });

  describe("canAssignRole", () => {
    it("OWNER can assign any role", () => {
      for (const target of Object.values(WorkspaceRole)) {
        expect(canAssignRole(WorkspaceRole.OWNER, target)).toBe(true);
      }
    });

    it("ADMIN can assign ADMIN, MEMBER, READONLY", () => {
      expect(canAssignRole(WorkspaceRole.ADMIN, WorkspaceRole.ADMIN)).toBe(
        true
      );
      expect(canAssignRole(WorkspaceRole.ADMIN, WorkspaceRole.MEMBER)).toBe(
        true
      );
      expect(canAssignRole(WorkspaceRole.ADMIN, WorkspaceRole.READONLY)).toBe(
        true
      );
    });

    it("ADMIN cannot assign OWNER", () => {
      expect(canAssignRole(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)).toBe(
        false
      );
    });

    it("MEMBER cannot assign ADMIN", () => {
      expect(canAssignRole(WorkspaceRole.MEMBER, WorkspaceRole.ADMIN)).toBe(
        false
      );
    });

    it("READONLY cannot assign MEMBER", () => {
      expect(canAssignRole(WorkspaceRole.READONLY, WorkspaceRole.MEMBER)).toBe(
        false
      );
    });
  });

  describe("INVITABLE_ROLES", () => {
    it("excludes OWNER", () => {
      expect(INVITABLE_ROLES).not.toContain(WorkspaceRole.OWNER);
    });

    it("includes ADMIN, MEMBER, READONLY", () => {
      expect(INVITABLE_ROLES).toContain(WorkspaceRole.ADMIN);
      expect(INVITABLE_ROLES).toContain(WorkspaceRole.MEMBER);
      expect(INVITABLE_ROLES).toContain(WorkspaceRole.READONLY);
    });
  });
});
