/**
 * Workspace RBAC hooks (Task #15, rbac.md §3)
 *
 * Three composable hooks:
 *   useCurrentWorkspaceRole  — fetches the caller's role for a workspace
 *   usePermission            — derives a boolean from role × permission catalog
 *   useCanGrantRole          — mirrors the backend assertCanGrantRole rule
 *
 * Return value convention:
 *   null   — still loading (do not hide UI yet — use a skeleton instead)
 *   true   — allowed
 *   false  — explicitly denied
 *
 * This 3-state pattern prevents the "flash-hide" problem where loading and
 * no-permission are indistinguishable, causing layout shifts or lost focus.
 */

import {
  ROLE_PERMISSIONS,
  WORKSPACE_ROLE_RANK,
  WorkspacePermission,
  WorkspaceRole,
} from "@/lib/api/authTypes";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useWorkspace } from "../ui/useWorkspace";

/** Runtime guard — rejects unknown values that could appear after a schema migration. */
function isWorkspaceRole(r: string): r is WorkspaceRole {
  return r in WORKSPACE_ROLE_RANK;
}

/**
 * Fetch the current user's WorkspaceRole for the given (or active) workspace.
 *
 * Backed by `workspace.core.getMyRole` which is gated by `workspaceProcedure`,
 * so non-members get a FORBIDDEN tRPC error (the query will be in error state).
 */
export function useCurrentWorkspaceRole(workspaceId?: string) {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const effectiveId = workspaceId ?? workspace?.id ?? "";

  return trpc.workspace.core.getMyRole.useQuery(
    { workspaceId: effectiveId },
    {
      enabled: isAuthenticated && !!effectiveId,
      staleTime: 60_000, // role changes are infrequent; mutations should invalidate
    }
  );
}

/**
 * Returns `true` when the current user holds a role that includes `permission`,
 * `null` while loading, or `false` on error / no permission.
 *
 * @example
 *   const canInvite = usePermission("member:invite");
 *   if (canInvite === null) return <Skeleton />;
 */
export function usePermission(
  permission: WorkspacePermission,
  workspaceId?: string
): boolean | null {
  const { data, isLoading } = useCurrentWorkspaceRole(workspaceId);
  if (isLoading) return null;
  if (!data?.role || !isWorkspaceRole(data.role)) return false;
  return ROLE_PERMISSIONS[data.role].has(permission);
}

/**
 * Returns `true` if the current user is OWNER or ADMIN of the workspace,
 * `null` while loading, `false` otherwise.
 *
 * Use this for UI gating ("show admin section / add-server button / etc.").
 * For capability checks (can I do action X?) prefer `usePermission(key)`.
 */
export function useIsWorkspaceAdmin(workspaceId?: string): boolean | null {
  const { data, isLoading } = useCurrentWorkspaceRole(workspaceId);
  if (isLoading) return null;
  if (!data?.role || !isWorkspaceRole(data.role)) return false;
  return data.role === WorkspaceRole.OWNER || data.role === WorkspaceRole.ADMIN;
}

/**
 * Returns `true` if the current user can grant `targetRole` to another user,
 * `null` while loading, or `false` if they cannot.
 *
 * Mirrors `assertCanGrantRole` on the backend (R-AUTHZ-3):
 *   OWNER  → can grant any role (including OWNER for co-ownership)
 *   ADMIN  → can grant ADMIN and below (not OWNER)
 *   MEMBER / READONLY → cannot grant any role
 */
export function useCanGrantRole(targetRole: WorkspaceRole): boolean | null {
  const { data, isLoading } = useCurrentWorkspaceRole();
  if (isLoading) return null;
  if (!data?.role || !isWorkspaceRole(data.role)) return false;

  const grantorRole = data.role;
  const grantorRank = WORKSPACE_ROLE_RANK[grantorRole];
  const targetRank = WORKSPACE_ROLE_RANK[targetRole];

  if (grantorRank < WORKSPACE_ROLE_RANK[WorkspaceRole.ADMIN]) return false;
  if (grantorRole === WorkspaceRole.OWNER) return true;
  return targetRank <= grantorRank;
}
