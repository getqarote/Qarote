import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

/**
 * Organization API hooks
 * Handles organization management and member operations
 */

// Get current user's organization
export const useCurrentOrganization = () => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.management.getCurrent.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
};

// Update organization
export const useUpdateOrganization = () => {
  const utils = trpc.useUtils();

  return trpc.organization.management.update.useMutation({
    onSuccess: () => {
      utils.organization.management.getCurrent.invalidate();
    },
  });
};

// Get organization billing info
export const useOrgBillingInfo = () => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.management.getBillingInfo.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60000,
  });
};

// List organization members
export const useOrgMembers = (options?: { page?: number; limit?: number }) => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.members.list.useQuery(
    { page: options?.page ?? 1, limit: options?.limit ?? 20 },
    {
      enabled: isAuthenticated,
      staleTime: 30000,
    }
  );
};

// Invite member to organization
export const useInviteOrgMember = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.invite.useMutation({
    onSuccess: () => {
      utils.organization.members.list.invalidate();
      utils.organization.members.listPendingInvitations.invalidate();
      utils.organization.management.getCurrent.invalidate();
    },
  });
};

// Update member role
export const useUpdateOrgMemberRole = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.updateRole.useMutation({
    onSuccess: () => {
      utils.organization.members.list.invalidate();
      utils.organization.management.getCurrent.invalidate();
    },
  });
};

// Remove member from organization
export const useRemoveOrgMember = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.remove.useMutation({
    onSuccess: () => {
      utils.organization.members.list.invalidate();
      utils.organization.management.getCurrent.invalidate();
    },
  });
};

// Assign org member to workspace
export const useAssignToWorkspace = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.assignToWorkspace.useMutation({
    onSuccess: () => {
      utils.organization.members.list.invalidate();
      utils.organization.members.listOrgMembersNotInWorkspace.invalidate();
      utils.workspace.management.getUserWorkspaces.invalidate();
    },
  });
};

// List pending invitations for the organization (admin view)
// The server throws FORBIDDEN for non-admin users, so we avoid retrying
// and suppress error boundaries to prevent console noise.
export const usePendingOrgInvitations = (options?: {
  page?: number;
  limit?: number;
}) => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.members.listPendingInvitations.useQuery(
    { page: options?.page ?? 1, limit: options?.limit ?? 20 },
    {
      enabled: isAuthenticated,
      staleTime: 30000,
      retry: (failureCount, error) => {
        // Don't retry on FORBIDDEN — the user simply isn't an admin
        if (error.data?.code === "FORBIDDEN") return false;
        return failureCount < 3;
      },
      throwOnError: false,
    }
  );
};

// List invitations for the current user (invitations they can accept)
export const useMyOrgInvitations = () => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.members.listMyInvitations.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000,
  });
};

// Accept an organization invitation
export const useAcceptOrgInvitation = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.acceptInvitation.useMutation({
    onSuccess: () => {
      utils.organization.members.listMyInvitations.invalidate();
      utils.organization.members.list.invalidate();
      utils.organization.management.getCurrent.invalidate();
    },
  });
};

// Decline an organization invitation
export const useDeclineOrgInvitation = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.declineInvitation.useMutation({
    onSuccess: () => {
      utils.organization.members.listMyInvitations.invalidate();
    },
  });
};

// Cancel a pending invitation (admin)
export const useCancelOrgInvitation = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.cancelInvitation.useMutation({
    onSuccess: () => {
      utils.organization.members.listPendingInvitations.invalidate();
    },
  });
};

// List all workspaces in the organization (for invite dialog + member management)
export const useOrgWorkspaces = () => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.members.listOrgWorkspaces.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000,
    gcTime: 60000,
    retry: (failureCount, error) => {
      if (error.data?.code === "FORBIDDEN") return false;
      return failureCount < 3;
    },
    throwOnError: false,
  });
};

// Get a specific member's workspace access within the org
export const useGetMemberWorkspaces = (userId: string | undefined) => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.members.getMemberWorkspaces.useQuery(
    { userId: userId! },
    {
      enabled: isAuthenticated && !!userId,
      staleTime: 0,
      gcTime: 60000,
    }
  );
};

// Remove an org member from a specific workspace
export const useRemoveFromWorkspace = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.removeFromWorkspace.useMutation({
    onSuccess: () => {
      utils.organization.members.list.invalidate();
      utils.organization.members.getMemberWorkspaces.invalidate();
      utils.organization.members.listOrgMembersNotInWorkspace.invalidate();
      utils.workspace.management.getUserWorkspaces.invalidate();
    },
  });
};

// Update an org member's role in a specific workspace (atomic)
export const useUpdateWorkspaceRole = () => {
  const utils = trpc.useUtils();

  return trpc.organization.members.updateWorkspaceRole.useMutation({
    onSuccess: () => {
      utils.organization.members.getMemberWorkspaces.invalidate();
      utils.workspace.management.getUserWorkspaces.invalidate();
    },
  });
};

// List org members who don't have access to a specific workspace
export const useOrgMembersNotInWorkspace = (
  workspaceId: string | undefined
) => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.members.listOrgMembersNotInWorkspace.useQuery(
    { workspaceId: workspaceId! },
    {
      enabled: isAuthenticated && !!workspaceId,
      staleTime: 0,
      gcTime: 60000,
      retry: (failureCount, error) => {
        if (error.data?.code === "FORBIDDEN") return false;
        return failureCount < 3;
      },
      throwOnError: false,
    }
  );
};
