import { useState } from "react";
import { useTranslation } from "react-i18next";

import { FolderOpen, Loader2, User, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { logger } from "@/lib/logger";
import { isLocalhostUrl } from "@/lib/url-utils";

import { InviteLinksDialog } from "@/components/InviteLinksDialog";
import { EnhancedTeamTab, InviteFormState } from "@/components/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useAssignToWorkspace,
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
  const assignToWorkspaceMutation = useAssignToWorkspace();
  const { data: orgMembersNotInWs, isLoading: orgMembersLoading } =
    useOrgMembersNotInWorkspace(effectiveWorkspaceId);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    emails: [],
    role: "MEMBER",
  });
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [addFromOrgOpen, setAddFromOrgOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    "ADMIN" | "MEMBER" | "READONLY"
  >("MEMBER");

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
          {t("tabs.team")} — Admin access required
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
            toast.error(
              t("toast.invitationFailed", { email, error: errorMessage })
            );
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

  const handleAddFromOrg = async (userId: string, name: string) => {
    if (!workspace?.id) {
      toast.error(t("toast.noWorkspaceFound"));
      return;
    }

    if (!canInviteMoreUsers()) {
      toast.error(
        t("toast.cannotInviteMoreUsers", {
          plan: userPlan,
          maxUsers: planFeatures.maxUsers,
          currentUsers: currentUserCount,
          pendingInvitations: pendingInvitationCount,
        })
      );
      return;
    }

    setPendingUserId(userId);
    try {
      await assignToWorkspaceMutation.mutateAsync({
        userId,
        workspaceId: effectiveWorkspaceId,
        role: selectedRole,
      });
      toast.success(
        t("toast.userAdded", {
          name,
          defaultValue: `${name} added to workspace`,
        })
      );
    } catch (error) {
      logger.error("Add from org error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!workspace?.id) {
      toast.error(t("toast.noWorkspaceFound"));
      return;
    }
    try {
      await removeUserMutation.mutateAsync({
        workspaceId: effectiveWorkspaceId,
        userId,
      });
      toast.success(t("toast.userRemoved", { name: userName }));
    } catch (error) {
      logger.error("Remove user error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
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
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">
              {t("tabs.team")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedWorkspaceName}
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

      {/* Add from Organization Dialog */}
      <Dialog
        open={addFromOrgOpen}
        onOpenChange={(open) => {
          setAddFromOrgOpen(open);
          if (!open) setSelectedRole("MEMBER");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("team.addFromOrgTitle")}</DialogTitle>
            <DialogDescription>
              {t("team.addFromOrgDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">
                {t("team.addFromOrgRole")}
              </span>
              <Select
                value={selectedRole}
                onValueChange={(v) =>
                  setSelectedRole(v as "ADMIN" | "MEMBER" | "READONLY")
                }
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t("team.roleAdmin")}</SelectItem>
                  <SelectItem value="MEMBER">{t("team.roleMember")}</SelectItem>
                  <SelectItem value="READONLY">
                    {t("team.roleReadonly")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {orgMembersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : availableOrgMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("team.addFromOrgAllHaveAccess")}
                </p>
              ) : (
                availableOrgMembers.map((member) => {
                  const displayName =
                    `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
                    member.email;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-2 rounded-md border"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted shrink-0">
                          {member.image ? (
                            <img
                              src={member.image}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {displayName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() =>
                          handleAddFromOrg(member.userId, displayName)
                        }
                        disabled={pendingUserId !== null}
                      >
                        {pendingUserId === member.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t("team.addFromOrgAdd")
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFromOrgOpen(false)}>
              {t("team.addFromOrgDone")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamSection;
