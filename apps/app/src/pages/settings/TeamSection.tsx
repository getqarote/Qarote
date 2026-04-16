import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { FolderOpen, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { logger } from "@/lib/logger";
import { isLocalhostUrl } from "@/lib/url-utils";

import { InviteLinksDialog } from "@/components/InviteLinksDialog";
import { EnhancedTeamTab, InviteFormState } from "@/components/profile";
import { AddFromOrgDialog } from "@/components/settings/team/AddFromOrgDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PixelUser } from "@/components/ui/pixel-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useOrgMembersNotInWorkspace,
  useOrgWorkspaces,
} from "@/hooks/queries/useOrganization";
import { useProfile } from "@/hooks/queries/useProfile";
import { usePublicConfig } from "@/hooks/queries/usePublicConfig";
import {
  useInvitations,
  useRemoveUserFromWorkspace,
  useSendInvitation,
  useWorkspaceUsers,
} from "@/hooks/queries/useWorkspaceApi";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";
import type { InviteLink } from "@/hooks/ui/useWorkspaceInvites";

import { extractErrorMessage } from "./utils";

const TeamSection = () => {
  const { t } = useTranslation("profile");
  const { planData, userPlan } = useUser();
  const { workspace } = useWorkspace();
  const { data: profileData } = useProfile();
  const { data: publicConfig } = usePublicConfig();
  const { data: orgWorkspacesData } = useOrgWorkspaces();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);
  // Default to active workspace once loaded
  const effectiveWorkspaceId = selectedWorkspaceId || workspace?.id || "";
  const orgWorkspaces = orgWorkspacesData?.workspaces ?? [];

  const { data: workspaceUsersData, isLoading: usersLoading } =
    useWorkspaceUsers({
      page: usersPage,
      limit: usersPageSize,
      workspaceId: effectiveWorkspaceId,
    });
  const { data: invitationsData } = useInvitations({ page: 1, limit: 1 });
  const sendInvitationMutation = useSendInvitation();
  const removeUserMutation = useRemoveUserFromWorkspace();
  const { data: orgMembersNotInWs } =
    useOrgMembersNotInWorkspace(effectiveWorkspaceId);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    emails: [],
    role: "MEMBER",
  });
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [addFromOrgOpen, setAddFromOrgOpen] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const profile = profileData?.user;
  const isAdmin = profile?.role === UserRole.ADMIN;
  const workspaceUsers = workspaceUsersData?.users || [];

  const planFeatures = planData?.planFeatures;
  const usersTotal =
    workspaceUsersData?.pagination?.total ?? workspaceUsers.length;
  const invTotal = invitationsData?.pagination?.total ?? 0;
  const currentUserCount = usersTotal;
  const pendingInvitationCount = invTotal;

  const canInviteMoreUsers = () => {
    if (!planFeatures?.maxUsers) return true;
    return currentUserCount + pendingInvitationCount < planFeatures.maxUsers;
  };

  if (!isAdmin) {
    return (
      <Alert>
        <AlertDescription>
          {t("team.workspaceMembersTitle")} — {t("team.adminOnly")}
        </AlertDescription>
      </Alert>
    );
  }

  const handleInviteUser = async () => {
    if (!effectiveWorkspaceId) {
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

    const emails = inviteForm.emails;
    if (emails.length === 0) return;

    setInviteDialogOpen(false);
    setInviteForm({ emails: [], role: "MEMBER" });

    const collectedLinks: InviteLink[] = [];
    let pendingCount = emails.length;

    emails.forEach((email) => {
      sendInvitationMutation.mutate(
        { email, role: inviteForm.role },
        {
          onSuccess: (result) => {
            if (result.emailSent) {
              toast.success(t("toast.invitationSent", { email }));
            } else {
              const backendUrl = result.inviteUrl;
              const inviteUrl =
                !backendUrl || isLocalhostUrl(backendUrl)
                  ? `${window.location.origin}/invite/${result.invitation.token}`
                  : backendUrl;
              collectedLinks.push({ email, inviteUrl });
              toast.success(t("toast.invitationCreated", { email }));
            }
            pendingCount--;
            if (pendingCount === 0 && collectedLinks.length > 0) {
              setInviteLinks(collectedLinks);
            }
          },
          onError: (error) => {
            logger.error("Invitation error:", error);
            const errorMessage = extractErrorMessage(error);
            toast.error(t("team.toast.inviteFailed"), {
              description: t("toast.invitationFailed", {
                email,
                error: errorMessage,
              }),
            });
            pendingCount--;
            if (pendingCount === 0 && collectedLinks.length > 0) {
              setInviteLinks(collectedLinks);
            }
          },
        }
      );
    });
  };

  const availableOrgMembers = orgMembersNotInWs?.members ?? [];

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!workspace?.id) {
      toast.error(t("toast.noWorkspaceFound"));
      return;
    }
    try {
      setRemovingUserId(userId);
      await removeUserMutation.mutateAsync({
        workspaceId: effectiveWorkspaceId,
        userId,
      });
      toast.success(t("toast.userRemoved", { name: userName }));
    } catch (error) {
      logger.error("Remove user error:", error);
      toast.error(t("team.toast.removeFailed"), {
        description: extractErrorMessage(error),
      });
    } finally {
      setRemovingUserId(null);
    }
  };

  const selectedWorkspaceName =
    orgWorkspaces.find((w) => w.id === effectiveWorkspaceId)?.name ??
    workspace?.name ??
    "";

  return (
    <div className="space-y-6">
      {/* Context header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0">
            <PixelUser className="h-5 w-auto shrink-0 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">
              {t("team.workspaceMembersTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("team.workspaceMembersSubtitle", {
                workspace: selectedWorkspaceName,
              })}{" "}
              <Link
                to="/settings/organization"
                className="underline underline-offset-4 decoration-border hover:decoration-foreground hover:text-foreground"
              >
                {t("team.manageOrgMembersLink")}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {orgWorkspaces.length > 0 && (
            <Select
              value={effectiveWorkspaceId}
              onValueChange={(id) => {
                setSelectedWorkspaceId(id);
                setUsersPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[220px] text-sm font-medium">
                <div className="flex items-center gap-2 truncate">
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder={selectedWorkspaceName} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {orgWorkspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isAdmin && availableOrgMembers.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => setAddFromOrgOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              {t("team.addFromOrg")}
            </Button>
          )}
        </div>
      </div>

      <EnhancedTeamTab
        isAdmin={isAdmin}
        workspaceUsers={workspaceUsers}
        usersLoading={usersLoading}
        inviteDialogOpen={inviteDialogOpen}
        setInviteDialogOpen={setInviteDialogOpen}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        onInviteUser={handleInviteUser}
        onRemoveUser={handleRemoveUser}
        isInviting={sendInvitationMutation.isPending}
        isRemoving={removeUserMutation.isPending}
        removingUserId={removingUserId}
        canInviteMoreUsers={canInviteMoreUsers()}
        emailEnabled={publicConfig?.emailEnabled ?? true}
        usersTotal={usersTotal}
        usersPage={usersPage}
        usersPageSize={usersPageSize}
        onUsersPageChange={setUsersPage}
        onUsersPageSizeChange={(size) => {
          setUsersPageSize(size);
          setUsersPage(1);
        }}
        invTotal={invTotal}
      />

      <InviteLinksDialog
        inviteLinks={inviteLinks}
        onClose={() => setInviteLinks([])}
      />

      <AddFromOrgDialog
        open={addFromOrgOpen}
        onOpenChange={setAddFromOrgOpen}
        workspaceId={effectiveWorkspaceId}
        canInviteMoreUsers={canInviteMoreUsers}
        onSeatLimitReached={() =>
          toast.error(
            t("toast.cannotInviteMoreUsers", {
              plan: userPlan,
              maxUsers: planFeatures?.maxUsers,
              currentUsers: currentUserCount,
              pendingInvitations: pendingInvitationCount,
            })
          )
        }
      />
    </div>
  );
};

export default TeamSection;
