import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useWorkspace } from "../ui/useWorkspace";

/**
 * Workspace API hooks
 * Handles workspace management, invitations, and users
 * Note: Named useWorkspaceApi to avoid conflict with useWorkspace context hook
 */

// Workspace hooks (new workspace API)
export const useUpdateWorkspace = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.workspace.management.update.useMutation({
    onSuccess: () => {
      // Invalidate profile, workspace users, and workspace list (for selector)
      utils.auth.session.getSession.invalidate();
      utils.user.getWorkspaceUsers.invalidate();
      utils.workspace.management.getUserWorkspaces.invalidate();
      utils.workspace.core.getCurrent.invalidate();
    },
  });

  return mutation;
};

// Workspace users hook (new workspace API)
export const useWorkspaceUsers = (options?: {
  page?: number;
  limit?: number;
  workspaceId?: string;
  enabled?: boolean;
}) => {
  const { workspace } = useWorkspace();
  const effectiveId = options?.workspaceId || workspace?.id || "";

  const query = trpc.user.getWorkspaceUsers.useQuery(
    {
      workspaceId: effectiveId,
      page: options?.page ?? 1,
      limit: options?.limit ?? 20,
    },
    {
      enabled: (options?.enabled ?? true) && !!effectiveId,
      staleTime: 60000, // 1 minute
    }
  );

  return query;
};

// New invitation hooks
export const useInvitations = (options?: {
  page?: number;
  limit?: number;
  workspaceId?: string;
  enabled?: boolean;
}) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const effectiveId = options?.workspaceId || workspace?.id || "";

  return trpc.workspace.invitation.getInvitations.useQuery(
    {
      workspaceId: effectiveId,
      page: options?.page ?? 1,
      limit: options?.limit ?? 20,
    },
    {
      enabled: isAuthenticated && !!effectiveId && (options?.enabled ?? true),
      staleTime: 30000, // 30 seconds
    }
  );
};

export const useSendInvitation = () => {
  const utils = trpc.useUtils();

  return trpc.workspace.invitation.sendInvitation.useMutation({
    onSuccess: () => {
      utils.workspace.invitation.getInvitations.invalidate();
      utils.user.getWorkspaceUsers.invalidate();
    },
  });
};

export const useRemoveUserFromWorkspace = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.user.removeFromWorkspace.useMutation({
    onSuccess: () => {
      utils.user.getWorkspaceUsers.invalidate();
      utils.organization.members.listOrgMembersNotInWorkspace.invalidate();
    },
  });

  return mutation;
};

/**
 * Bulk-assign a target role to N workspace members.
 *
 * Single mutation path for both built-in and custom roles — the backend
 * branches on `targetRoleId`. Replaces the legacy `user.updateMemberRole`,
 * which only handled built-ins and was broken for custom-role actors.
 */
export const useAssignRole = () => {
  const utils = trpc.useUtils();

  return trpc.workspace.role.assignRole.useMutation({
    onSuccess: () => {
      utils.user.getWorkspaceUsers.invalidate();
      // The actor may have demoted themselves (last-OWNER guard
      // notwithstanding) — refresh `getMyRole` so the UI's permission
      // gates reflect the change immediately.
      utils.workspace.core.getMyRole.invalidate();
    },
  });
};

/**
 * List the workspace's custom roles. Returns at most 100 in one page;
 * Enterprise workspaces with more than that need to clean up roles
 * rather than have the dropdown paginate (see `docs/plans/rbac.md` §9.4).
 */
export const useWorkspaceRoles = (
  workspaceId: string,
  options?: { enabled?: boolean }
) => {
  return trpc.workspace.role.list.useQuery(
    { workspaceId, limit: 100 },
    {
      enabled: (options?.enabled ?? true) && !!workspaceId,
      staleTime: 60_000,
    }
  );
};

/**
 * Return the four system Role UUIDs (`OWNER`, `ADMIN`, `MEMBER`,
 * `READONLY`) so the team-page Select can address built-ins via
 * `assignRole.targetRoleId` just like custom roles.
 *
 * System roles are immutable — long stale time is safe.
 */
export const useBuiltinRoles = (
  workspaceId: string,
  options?: { enabled?: boolean }
) => {
  return trpc.workspace.role.builtins.useQuery(
    { workspaceId },
    {
      enabled: (options?.enabled ?? true) && !!workspaceId,
      staleTime: 24 * 60 * 60 * 1000,
    }
  );
};

// Get user's workspaces
export const useUserWorkspaces = () => {
  const { isAuthenticated } = useAuth();

  return trpc.workspace.management.getUserWorkspaces.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });
};

// Get current workspace
export const useCurrentWorkspace = () => {
  const { isAuthenticated } = useAuth();

  return trpc.workspace.core.getCurrent.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });
};

// Create workspace
export const useCreateWorkspace = () => {
  const utils = trpc.useUtils();

  return trpc.workspace.management.create.useMutation({
    onSuccess: () => {
      utils.workspace.management.getUserWorkspaces.invalidate();
      utils.workspace.core.getCurrent.invalidate();
      utils.organization.plan.getCurrentOrgPlan.invalidate();
      utils.auth.session.getSession.invalidate();
    },
  });
};

// Delete workspace
export const useDeleteWorkspace = () => {
  const utils = trpc.useUtils();

  return trpc.workspace.management.delete.useMutation({
    onSuccess: () => {
      // Reset workspace queries to clear cached data immediately (not just mark stale).
      // This prevents /workspace from seeing the deleted workspace in cache and
      // briefly redirecting to / before the refetch completes.
      utils.workspace.management.getUserWorkspaces.reset();
      utils.workspace.core.getCurrent.reset();
      // Invalidate all remaining queries so everything refetches
      utils.invalidate();
    },
  });
};

// Switch workspace
export const useSwitchWorkspace = () => {
  const utils = trpc.useUtils();

  return trpc.workspace.management.switch.useMutation({
    onSuccess: () => {
      utils.workspace.core.getCurrent.invalidate();
      utils.auth.session.getSession.invalidate();
    },
  });
};
