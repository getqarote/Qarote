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
export const useOrgMembers = () => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.members.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000,
  });
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
      utils.workspace.management.getUserWorkspaces.invalidate();
    },
  });
};

// List pending invitations for the organization (admin view)
// The server throws FORBIDDEN for non-admin users, so we avoid retrying
// and suppress error boundaries to prevent console noise.
export const usePendingOrgInvitations = () => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.members.listPendingInvitations.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000,
    retry: (failureCount, error) => {
      // Don't retry on FORBIDDEN — the user simply isn't an admin
      if (error.data?.code === "FORBIDDEN") return false;
      return failureCount < 3;
    },
    throwOnError: false,
  });
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
