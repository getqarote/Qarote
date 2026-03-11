import { WorkspaceRole } from "@/generated/prisma/client";

export const WORKSPACE_ROLE_LEVELS: Record<WorkspaceRole, number> = {
  [WorkspaceRole.READONLY]: 0,
  [WorkspaceRole.MEMBER]: 1,
  [WorkspaceRole.ADMIN]: 2,
  [WorkspaceRole.OWNER]: 3,
};

/** True when `role` is at least `minimumRole` in the hierarchy. */
export function hasMinimumWorkspaceRole(
  role: WorkspaceRole,
  minimumRole: WorkspaceRole
): boolean {
  return WORKSPACE_ROLE_LEVELS[role] >= WORKSPACE_ROLE_LEVELS[minimumRole];
}

/** True when `callerRole` can assign/invite `targetRole` (at or below own level). */
export function canAssignRole(
  callerRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean {
  return WORKSPACE_ROLE_LEVELS[targetRole] <= WORKSPACE_ROLE_LEVELS[callerRole];
}

/** Roles that may be assigned via invitation or admin update (excludes OWNER). */
export const INVITABLE_ROLES = [
  WorkspaceRole.READONLY,
  WorkspaceRole.MEMBER,
  WorkspaceRole.ADMIN,
] as const;
