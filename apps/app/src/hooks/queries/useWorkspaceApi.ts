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
      // Invalidate profile and workspace users
      utils.auth.session.getSession.invalidate();
      utils.user.getWorkspaceUsers.invalidate();
    },
  });

  return mutation;
};

// Workspace users hook (new workspace API)
export const useWorkspaceUsers = () => {
  const { workspace } = useWorkspace();

  const query = trpc.user.getWorkspaceUsers.useQuery(
    {
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!workspace?.id,
      staleTime: 60000, // 1 minute
    }
  );

  return query;
};

// New invitation hooks
export const useInvitations = () => {
  const { isAuthenticated } = useAuth();

  return trpc.workspace.invitation.getInvitations.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });
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

export const useRevokeInvitation = () => {
  const utils = trpc.useUtils();

  return trpc.workspace.invitation.revokeInvitation.useMutation({
    onSuccess: () => {
      utils.workspace.invitation.getInvitations.invalidate();
    },
  });
};

export const useInvitationDetails = (token: string) => {
  return trpc.public.invitation.getDetails.useQuery(
    { token },
    {
      enabled: !!token,
      staleTime: 300000, // 5 minutes
    }
  );
};

export const useRemoveUserFromWorkspace = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.user.removeFromWorkspace.useMutation({
    onSuccess: () => {
      // Invalidate workspace users
      utils.user.getWorkspaceUsers.invalidate();
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
      utils.auth.session.getSession.invalidate();
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
