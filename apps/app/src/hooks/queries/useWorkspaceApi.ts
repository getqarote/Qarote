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
      enabled: !!effectiveId,
      staleTime: 60000, // 1 minute
    }
  );

  return query;
};

// New invitation hooks
export const useInvitations = (options?: { page?: number; limit?: number }) => {
  const { isAuthenticated } = useAuth();

  return trpc.workspace.invitation.getInvitations.useQuery(
    { page: options?.page ?? 1, limit: options?.limit ?? 20 },
    {
      enabled: isAuthenticated,
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
