import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { EnhancedTeamTab, InviteFormState } from "@/components/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useProfile } from "@/hooks/queries/useProfile";
import {
  useInvitations,
  useRemoveUserFromWorkspace,
  useRevokeInvitation,
  useSendInvitation,
  useWorkspaceUsers,
} from "@/hooks/queries/useWorkspaceApi";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { extractErrorMessage } from "./utils";

const TeamSection = () => {
  const { t } = useTranslation("profile");
  const { planData, userPlan } = useUser();
  const { workspace } = useWorkspace();
  const { data: profileData } = useProfile();
  const { data: workspaceUsersData, isLoading: usersLoading } =
    useWorkspaceUsers();
  const { data: invitationsData, isLoading: invitationsLoading } =
    useInvitations();
  const sendInvitationMutation = useSendInvitation();
  const revokeInvitationMutation = useRevokeInvitation();
  const removeUserMutation = useRemoveUserFromWorkspace();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: "",
    role: "MEMBER",
  });

  const profile = profileData?.user;
  const isAdmin = profile?.role === "ADMIN";
  const workspaceUsers = workspaceUsersData?.users || [];
  const invitations = invitationsData?.invitations || [];

  const planFeatures = planData?.planFeatures;
  const currentUserCount = workspaceUsers.length;
  const pendingInvitationCount = invitations.length;

  const canInviteMoreUsers = () => {
    if (!planFeatures?.maxUsers) return true;
    return currentUserCount + pendingInvitationCount < planFeatures.maxUsers;
  };

  if (!isAdmin) {
    return (
      <Alert>
        <AlertDescription>
          {t("tabs.team")} — Admin access required
        </AlertDescription>
      </Alert>
    );
  }

  const handleInviteUser = async () => {
    if (!workspace?.id) {
      toast.error(t("toast.noWorkspaceFound"));
      return;
    }

    if (!canInviteMoreUsers()) {
      const maxUsers = planFeatures.maxUsers;
      toast.error(
        t("toast.cannotInviteMoreUsers", {
          plan: userPlan,
          maxUsers,
          currentUsers: currentUserCount,
          pendingInvitations: pendingInvitationCount,
        })
      );
      return;
    }

    try {
      const result = await sendInvitationMutation.mutateAsync({
        email: inviteForm.email,
        role: inviteForm.role,
      });

      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "MEMBER" });

      if (result.emailSent) {
        toast.success(t("toast.invitationSent", { email: inviteForm.email }));
      } else {
        const inviteUrl =
          result.inviteUrl ||
          `${window.location.origin}/invite/${result.invitation.token}`;
        toast.success(t("toast.invitationSent", { email: inviteForm.email }), {
          description: t("toast.copyInviteLink"),
          action: {
            label: t("toast.copyLink"),
            onClick: () => navigator.clipboard.writeText(inviteUrl),
          },
          duration: 10000,
        });
      }
    } catch (error) {
      logger.error("Invitation error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const handleRevokeInvitation = async (
    invitationId: string,
    email: string
  ) => {
    try {
      await revokeInvitationMutation.mutateAsync(invitationId);
      toast.success(t("toast.invitationRevoked", { email }));
    } catch (error) {
      logger.error("Revoke invitation error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!workspace?.id) {
      toast.error(t("toast.noWorkspaceFound"));
      return;
    }
    try {
      await removeUserMutation.mutateAsync({
        workspaceId: workspace.id,
        userId,
      });
      toast.success(t("toast.userRemoved", { name: userName }));
    } catch (error) {
      logger.error("Remove user error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <EnhancedTeamTab
        isAdmin={isAdmin}
        workspaceUsers={workspaceUsers}
        invitations={invitations}
        usersLoading={usersLoading}
        invitationsLoading={invitationsLoading}
        inviteDialogOpen={inviteDialogOpen}
        setInviteDialogOpen={setInviteDialogOpen}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        onInviteUser={handleInviteUser}
        onRevokeInvitation={handleRevokeInvitation}
        onRemoveUser={handleRemoveUser}
        isInviting={sendInvitationMutation.isPending}
        isRevoking={revokeInvitationMutation.isPending}
        isRemoving={removeUserMutation.isPending}
        userPlan={userPlan}
        canInviteMoreUsers={canInviteMoreUsers()}
      />
    </div>
  );
};

export default TeamSection;
