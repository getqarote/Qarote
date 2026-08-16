import { useState } from "react";
import { useTranslation } from "react-i18next";

import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { isLocalhostUrl } from "@/lib/url-utils";

import { InviteLinksDialog } from "@/components/InviteLinksDialog";
import { EnhancedTeamTab, InviteFormState } from "@/components/profile";
import { WorkspaceForbidden } from "@/components/rbac/WorkspaceForbidden";
import { AddFromOrgDialog } from "@/components/settings/team/AddFromOrgDialog";
import { Button } from "@/components/ui/button";
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
import { usePublicConfig } from "@/hooks/queries/usePublicConfig";
import {
  useInvitations,
  useRemoveUserFromWorkspace,
  useSendInvitation,
  useWorkspaceUsers,
} from "@/hooks/queries/useWorkspaceApi";
import {
  useCurrentWorkspaceRole,
  usePermission,
} from "@/hooks/queries/useWorkspaceRole";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";
import type { InviteLink } from "@/hooks/ui/useWorkspaceInvites";

import { extractErrorMessage } from "./utils";

const TeamSection = () => {
  const { t } = useTranslation("profile");
  const { planData, userPlan } = useUser();
  const { workspace } = useWorkspace();
  const { data: publicConfig } = usePublicConfig();
  const { data: orgWorkspacesData } = useOrgWorkspaces();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);
  // Default to active workspace once loaded
  const effectiveWorkspaceId = selectedWorkspaceId || workspace?.id || "";
  const orgWorkspaces = orgWorkspacesData?.workspaces ?? [];

  // Permission must be scoped to the workspace currently being managed,
  // not the user's *active* workspace — they may differ when an org admin
  // switches between workspaces via the selector.
  const canManageMembers = usePermission("member:invite", effectiveWorkspaceId);
  const { error: roleError } = useCurrentWorkspaceRole(effectiveWorkspaceId);
  const permitted = canManageMembers === true;

  const { data: workspaceUsersData, isLoading: usersLoading } =
    useWorkspaceUsers({
      page: usersPage,
      limit: usersPageSize,
      workspaceId: effectiveWorkspaceId,
      enabled: permitted,
    });
  const { data: invitationsData } = useInvitations({
    page: 1,
    limit: 1,
    workspaceId: effectiveWorkspaceId,
    enabled: permitted,
  });
  const sendInvitationMutation = useSendInvitation();
  const removeUserMutation = useRemoveUserFromWorkspace();
  const { data: orgMembersNotInWs } = useOrgMembersNotInWorkspace(
    effectiveWorkspaceId,
    { enabled: permitted }
  );

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    emails: [],
    role: "MEMBER",
  });
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [addFromOrgOpen, setAddFromOrgOpen] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const isAdmin = canManageMembers === true;
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

  if (canManageMembers === null) return null;
  // Distinguish a real 403 (role fetched, permission absent) from a
  // role-fetch error so we don't show "Forbidden" when the server is down.
  if (roleError && roleError.data?.code !== "FORBIDDEN") {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("team.toast.roleFetchFailed", {
            defaultValue: "Couldn't load your workspace permissions.",
          })}
        </p>
      </div>
    );
  }
  if (!canManageMembers) {
    return <WorkspaceForbidden cause={{ code: "WORKSPACE_PERMISSION" }} />;
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
        {
          email,
          role: inviteForm.role,
          workspaceId: effectiveWorkspaceId,
        },
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
    // Guard on the workspace the mutation actually targets — when an
    // org admin has switched workspaces via the selector, `workspace`
    // (the active workspace context) may not match `effectiveWorkspaceId`.
    if (!effectiveWorkspaceId) {
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
    <div className="space-y-4">
      {/* Workspace selector + add-from-org. The card below owns the title. */}
      {(orgWorkspaces.length > 1 ||
        (isAdmin && availableOrgMembers.length > 0)) && (
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {orgWorkspaces.length > 1 && (
            <Select
              value={effectiveWorkspaceId}
              onValueChange={(id) => {
                setSelectedWorkspaceId(id);
                setUsersPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[220px] text-sm font-medium">
                <SelectValue placeholder={selectedWorkspaceName} />
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
      )}

      <EnhancedTeamTab
        isAdmin={isAdmin}
        workspaceId={effectiveWorkspaceId}
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
