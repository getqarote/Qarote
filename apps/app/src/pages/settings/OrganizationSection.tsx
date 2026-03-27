import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Building2,
  Calendar,
  Check,
  Clock,
  Copy,
  Loader2,
  Mail,
  Pencil,
  Save,
  Settings,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useAcceptOrgInvitation,
  useAssignToWorkspace,
  useCancelOrgInvitation,
  useCurrentOrganization,
  useDeclineOrgInvitation,
  useGetMemberWorkspaces,
  useInviteOrgMember,
  useMyOrgInvitations,
  useOrgMembers,
  useOrgWorkspaces,
  usePendingOrgInvitations,
  useRemoveFromWorkspace,
  useRemoveOrgMember,
  useUpdateOrganization,
  useUpdateOrgMemberRole,
  useUpdateWorkspaceRole,
} from "@/hooks/queries/useOrganization";

const WS_ROLE_OPTIONS: Array<"ADMIN" | "MEMBER"> = ["ADMIN", "MEMBER"];

const getRoleIcon = (role: string) => {
  switch (role) {
    case "OWNER":
      return null;
    case "ADMIN":
      return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return <User className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const useRoleLabels = () => {
  const { t } = useTranslation("profile");
  return {
    OWNER: t("org.roleOwner"),
    ADMIN: t("org.roleAdmin"),
    MEMBER: t("org.roleMember"),
    READONLY: t("org.roleReadonly"),
  } as Record<string, string>;
};

// ---------------------------------------------------------------------------
// Workspace picker row used in both invite and manage dialogs
// ---------------------------------------------------------------------------
const WorkspaceRow = ({
  workspace,
  selected,
  role,
  onToggle,
  onRoleChange,
  disabled,
}: {
  workspace: { id: string; name: string };
  selected: boolean;
  role: "ADMIN" | "MEMBER";
  onToggle: () => void;
  onRoleChange: (role: "ADMIN" | "MEMBER") => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation("profile");
  const roleLabels = useRoleLabels();

  const wsRoleDescKeys: Record<string, string> = {
    ADMIN: "org.roleDescWsAdmin",
    MEMBER: "org.roleDescWsMember",
    READONLY: "org.roleDescWsReadonly",
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-2">
      <Button
        type="button"
        size="sm"
        variant={selected ? "default" : "outline"}
        className="shrink-0"
        onClick={onToggle}
        disabled={disabled}
      >
        {selected ? (
          <Check className="h-4 w-4 mr-1" />
        ) : (
          <X className="h-4 w-4 mr-1 opacity-40" />
        )}
        {workspace.name}
      </Button>
      {selected && (
        <Select
          value={role}
          onValueChange={(v) => onRoleChange(v as "ADMIN" | "MEMBER")}
          disabled={disabled}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-56">
            {WS_ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r} className="py-2">
                <div>
                  <span>{roleLabels[r]}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                    {t(wsRoleDescKeys[r])}
                  </p>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Member workspace management dialog (Feature 2 / Step 8)
// ---------------------------------------------------------------------------
const MemberWorkspacesDialog = ({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { id: string; userId: string; firstName: string; lastName: string };
}) => {
  const { t } = useTranslation("profile");
  const { data: wsData, isLoading: wsLoading } = useOrgWorkspaces();
  const { data: memberWsData, isLoading: memberWsLoading } =
    useGetMemberWorkspaces(open ? member.userId : undefined);
  const assignMutation = useAssignToWorkspace();
  const removeMutation = useRemoveFromWorkspace();
  const updateRoleMutation = useUpdateWorkspaceRole();

  const workspaces = wsData?.workspaces ?? [];
  const memberships = memberWsData?.memberships ?? [];

  // Build a quick lookup: workspaceId -> current role
  const currentMap = new Map(
    memberships.map((m) => [m.workspaceId, m.role as "ADMIN" | "MEMBER"])
  );

  const handleToggle = async (wsId: string) => {
    if (currentMap.has(wsId)) {
      try {
        await removeMutation.mutateAsync({
          userId: member.userId,
          workspaceId: wsId,
        });
        toast.success(t("org.toast.removedFromWs"));
      } catch (error) {
        logger.error({ error }, "Remove from workspace error");
        toast.error(
          error instanceof Error
            ? error.message
            : t("org.toast.removedFromWsFailed")
        );
      }
    } else {
      try {
        await assignMutation.mutateAsync({
          userId: member.userId,
          workspaceId: wsId,
          role: "MEMBER",
        });
        toast.success(t("org.toast.assignedToWs"));
      } catch (error) {
        logger.error({ error }, "Assign to workspace error");
        toast.error(
          error instanceof Error
            ? error.message
            : t("org.toast.assignedToWsFailed")
        );
      }
    }
  };

  const handleRoleChange = async (
    wsId: string,
    newRole: "ADMIN" | "MEMBER"
  ) => {
    try {
      await updateRoleMutation.mutateAsync({
        userId: member.userId,
        workspaceId: wsId,
        role: newRole,
      });
      toast.success(t("org.toast.wsRoleUpdated"));
    } catch (error) {
      logger.error({ error }, "Role change error");
      toast.error(
        error instanceof Error
          ? error.message
          : t("org.toast.wsRoleUpdateFailed")
      );
    }
  };

  const loading = wsLoading || memberWsLoading;
  const mutating =
    assignMutation.isPending ||
    removeMutation.isPending ||
    updateRoleMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("org.manageWorkspacesTitle")}</DialogTitle>
          <DialogDescription>
            {t("org.manageWorkspacesDesc", {
              name: `${member.firstName} ${member.lastName}`,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("org.noWorkspacesInOrg")}
            </p>
          ) : (
            workspaces.map((ws) => (
              <WorkspaceRow
                key={ws.id}
                workspace={ws}
                selected={currentMap.has(ws.id)}
                role={currentMap.get(ws.id) ?? "MEMBER"}
                onToggle={() => handleToggle(ws.id)}
                onRoleChange={(r) => handleRoleChange(ws.id, r)}
                disabled={mutating}
              />
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("org.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const OrganizationSection = () => {
  const { t } = useTranslation("profile");
  const roleLabels = useRoleLabels();
  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = useState(10);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [invitationsPageSize, setInvitationsPageSize] = useState(10);

  const { data: orgData, isLoading: orgLoading } = useCurrentOrganization();
  const { data: membersData, isLoading: membersLoading } = useOrgMembers({
    page: membersPage,
    limit: membersPageSize,
  });
  const { data: pendingInvData } = usePendingOrgInvitations({
    page: invitationsPage,
    limit: invitationsPageSize,
  });
  const { data: myInvData } = useMyOrgInvitations();
  const { data: wsData, isLoading: wsLoading } = useOrgWorkspaces();
  const updateOrgMutation = useUpdateOrganization();
  const inviteMemberMutation = useInviteOrgMember();
  const updateRoleMutation = useUpdateOrgMemberRole();
  const removeMemberMutation = useRemoveOrgMember();
  const acceptInvitationMutation = useAcceptOrgInvitation();
  const declineInvitationMutation = useDeclineOrgInvitation();
  const cancelInvitationMutation = useCancelOrgInvitation();

  const [editing, setEditing] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: "",
    contactEmail: "",
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteAllWorkspaces, setInviteAllWorkspaces] = useState(true);
  const [wsAssignments, setWsAssignments] = useState<
    Map<string, "ADMIN" | "MEMBER">
  >(new Map());

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [pendingInvitationAction, setPendingInvitationAction] = useState<{
    id: string;
    action: "accept" | "decline";
  } | null>(null);
  const [lastEmailSent, setLastEmailSent] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Member workspace management dialog state
  const [manageWsMember, setManageWsMember] = useState<{
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  const org = orgData?.organization;
  const callerRole = orgData?.role;
  const isOrgAdmin = callerRole === "OWNER" || callerRole === "ADMIN";
  const members = membersData?.members ?? [];
  const pendingInvitations = pendingInvData?.invitations ?? [];
  const myInvitations = myInvData?.invitations ?? [];
  const orgWorkspaces = wsData?.workspaces ?? [];
  const membersTotal = membersData?.pagination?.total ?? members.length;
  const invitationsTotal =
    pendingInvData?.pagination?.total ?? pendingInvitations.length;

  // Initialize form when org data loads
  const [prevOrgId, setPrevOrgId] = useState<string | null>(null);
  if (org?.id && org.id !== prevOrgId) {
    setPrevOrgId(org.id);
    setOrgForm({
      name: org.name || "",
      contactEmail: org.contactEmail || "",
    });
  }

  const handleUpdateOrg = async () => {
    try {
      await updateOrgMutation.mutateAsync({
        name: orgForm.name || undefined,
        contactEmail: orgForm.contactEmail || null,
      });
      setEditing(false);
      toast.success(t("org.toast.orgUpdated"));
    } catch (error) {
      logger.error({ error }, "Update org error");
      toast.error(t("org.toast.orgUpdateFailed"));
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    try {
      const result = await inviteMemberMutation.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
        workspaceAssignments: inviteAllWorkspaces
          ? []
          : Array.from(wsAssignments.entries()).map(([workspaceId, role]) => ({
              workspaceId,
              role,
            })),
      });
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteAllWorkspaces(true);
      setWsAssignments(new Map());

      if (result.emailSent) {
        setInviteOpen(false);
        setLastInviteUrl(null);
        setLastEmailSent(true);
        toast.success(
          t("org.toast.invitedToOrg", { email: result.invitation.email })
        );
      } else {
        // Email not configured - show the invite URL for manual sharing
        setLastInviteUrl(result.inviteUrl);
        setLastEmailSent(false);
      }
    } catch (error) {
      logger.error({ error }, "Invite error");
      const msg =
        error instanceof Error ? error.message : t("org.toast.inviteFailed");
      toast.error(msg);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({
        memberId,
        role: newRole as "OWNER" | "ADMIN" | "MEMBER",
      });
      toast.success(t("toast.roleUpdated"));
    } catch (error) {
      logger.error({ error }, "Role change error");
      const msg =
        error instanceof Error ? error.message : "Failed to update role";
      toast.error(msg);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeMemberMutation.mutateAsync({
        memberId: memberToRemove.id,
      });
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
      toast.success(t("org.toast.memberRemoved"));
    } catch (error) {
      logger.error({ error }, "Remove member error");
      const msg =
        error instanceof Error
          ? error.message
          : t("org.toast.memberRemoveFailed");
      toast.error(msg);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    setPendingInvitationAction({ id: invitationId, action: "accept" });
    try {
      await acceptInvitationMutation.mutateAsync({ invitationId });
      toast.success(t("org.toast.invitationAccepted"));
    } catch (error) {
      logger.error({ error }, "Accept invitation error");
      const msg =
        error instanceof Error
          ? error.message
          : t("org.toast.invitationAcceptFailed");
      toast.error(msg);
    } finally {
      setPendingInvitationAction(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setPendingInvitationAction({ id: invitationId, action: "decline" });
    try {
      await declineInvitationMutation.mutateAsync({ invitationId });
      toast.success(t("org.toast.invitationDeclined"));
    } catch (error) {
      logger.error({ error }, "Decline invitation error");
      const msg =
        error instanceof Error
          ? error.message
          : t("org.toast.invitationDeclineFailed");
      toast.error(msg);
    } finally {
      setPendingInvitationAction(null);
    }
  };

  // Workspace assignment helpers for invite dialog
  const toggleWsAssignment = (wsId: string) => {
    setWsAssignments((prev) => {
      const next = new Map(prev);
      if (next.has(wsId)) {
        next.delete(wsId);
      } else {
        next.set(wsId, "MEMBER");
      }
      return next;
    });
  };

  const updateWsAssignmentRole = (wsId: string, role: "ADMIN" | "MEMBER") => {
    setWsAssignments((prev) => {
      const next = new Map(prev);
      next.set(wsId, role);
      return next;
    });
  };

  if (orgLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">{t("org.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("org.notInOrg")}</p>
          </div>
        </div>

        {/* Invitations the current user can accept */}
        {myInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t("org.pendingInvitations")}
              </CardTitle>
              <CardDescription>{t("org.yourInvitationsNoOrg")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm">
                        {inv.organization.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("org.invitedByAs", {
                          name: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
                          role: roleLabels[inv.role] ?? inv.role,
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                        onClick={() => handleAcceptInvitation(inv.id)}
                        disabled={pendingInvitationAction !== null}
                      >
                        {pendingInvitationAction?.id === inv.id &&
                        pendingInvitationAction.action === "accept" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            {t("org.accept")}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineInvitation(inv.id)}
                        disabled={pendingInvitationAction !== null}
                      >
                        {pendingInvitationAction?.id === inv.id &&
                        pendingInvitationAction.action === "decline" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            {t("org.decline")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">{t("org.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("org.subtitle")}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
          role="status"
          aria-label={t("org.yourRole", {
            role: roleLabels[callerRole ?? "MEMBER"] ?? callerRole,
          })}
        >
          {roleLabels[callerRole ?? "MEMBER"] ?? callerRole}
        </Badge>
      </div>

      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("org.general")}</CardTitle>
          <CardDescription>{t("org.generalDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">{t("org.name")}</Label>
              {editing ? (
                <Input
                  id="org-name"
                  value={orgForm.name}
                  onChange={(e) =>
                    setOrgForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t("org.namePlaceholder")}
                />
              ) : (
                <p className="text-sm text-foreground">{org.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-email">{t("org.billingEmail")}</Label>
              {editing ? (
                <Input
                  id="org-email"
                  type="email"
                  value={orgForm.contactEmail}
                  onChange={(e) =>
                    setOrgForm((prev) => ({
                      ...prev,
                      contactEmail: e.target.value,
                    }))
                  }
                  placeholder={t("org.billingEmailPlaceholder")}
                />
              ) : (
                <p className="text-sm text-foreground">
                  {org.contactEmail || (
                    <span className="text-muted-foreground">
                      {t("org.billingEmailNotSet")}
                    </span>
                  )}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t("org.billingEmailDesc")}
              </p>
            </div>
          </div>
          {!editing && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {t("org.members")}: {org._count?.members ?? 0}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Settings className="h-4 w-4" />
                {t("org.workspaces")}: {org._count?.workspaces ?? 0}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {t("org.created")}:{" "}
                {new Date(org.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {isOrgAdmin && (
            <div className="flex justify-end gap-2">
              {editing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOrgForm({
                        name: org?.name || "",
                        contactEmail: org?.contactEmail || "",
                      });
                      setEditing(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t("org.cancel")}
                  </Button>
                  <Button
                    onClick={handleUpdateOrg}
                    disabled={updateOrgMutation.isPending}
                    className="btn-primary"
                  >
                    {updateOrgMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {updateOrgMutation.isPending
                      ? t("org.saving")
                      : t("org.saveChanges")}
                  </Button>
                </>
              ) : (
                <Button
                  className="btn-primary"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("org.editOrganization")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("org.members")}
              </CardTitle>
              <CardDescription>
                {t("org.membersCount", { count: membersTotal })}
              </CardDescription>
            </div>
            {isOrgAdmin && (
              <Button
                size="sm"
                className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t("org.invite")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted shrink-0">
                        {member.image ? (
                          <img
                            src={member.image}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOrgAdmin && member.role !== "OWNER" ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleRoleChange(member.id, value)
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger
                            className="w-32 h-8 text-xs"
                            aria-label={t("org.orgRole")}
                          >
                            <span className="flex! items-center gap-1.5">
                              {getRoleIcon(member.role)}
                              {roleLabels[member.role]}
                            </span>
                          </SelectTrigger>
                          <SelectContent className="min-w-56">
                            <SelectItem value="ADMIN" className="py-2">
                              <div>
                                <span className="flex items-center gap-1.5">
                                  {getRoleIcon("ADMIN")}
                                  {roleLabels["ADMIN"]}
                                </span>
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                                  {t("org.roleDescOrgAdmin")}
                                </p>
                              </div>
                            </SelectItem>
                            <SelectItem value="MEMBER" className="py-2">
                              <div>
                                <span className="flex items-center gap-1.5">
                                  {getRoleIcon("MEMBER")}
                                  {roleLabels["MEMBER"]}
                                </span>
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                                  {t("org.roleDescOrgMember")}
                                </p>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
                        >
                          {roleLabels[member.role]}
                        </Badge>
                      )}

                      {isOrgAdmin && member.role !== "OWNER" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() =>
                              setManageWsMember({
                                id: member.id,
                                userId: member.userId,
                                firstName: member.firstName,
                                lastName: member.lastName,
                              })
                            }
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">
                              {t("org.workspaces")}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setMemberToRemove({
                                id: member.id,
                                email: member.email,
                              });
                              setRemoveDialogOpen(true);
                            }}
                            disabled={removeMemberMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <PaginationControls
                total={membersTotal}
                page={membersPage}
                pageSize={membersPageSize}
                onPageChange={setMembersPage}
                onPageSizeChange={(size) => {
                  setMembersPageSize(size);
                  setMembersPage(1);
                }}
                itemLabel="members"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Card (admin view) */}
      {isOrgAdmin && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("org.pendingInvitations")}
            </CardTitle>
            <CardDescription>
              {t("org.pendingInvitationsCount", { count: invitationsTotal })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("org.invitedBy", {
                        name: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
                      })}{" "}
                      &middot;{" "}
                      {t("org.expires", {
                        date: new Date(inv.expiresAt).toLocaleDateString(),
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {getRoleIcon(inv.role)}
                      <span className="ml-1">
                        {roleLabels[inv.role] ?? inv.role}
                      </span>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={cancelInvitationMutation.isPending}
                      onClick={() => {
                        cancelInvitationMutation.mutate(
                          { invitationId: inv.id },
                          {
                            onSuccess: () => {
                              toast.success(
                                t("toast.invitationRevoked", {
                                  email: inv.email,
                                })
                              );
                            },
                            onError: (err) => {
                              toast.error(
                                err.message ||
                                  t("toast.invitationFailed", {
                                    email: inv.email,
                                    error: "",
                                  })
                              );
                            },
                          }
                        );
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              total={invitationsTotal}
              page={invitationsPage}
              pageSize={invitationsPageSize}
              onPageChange={setInvitationsPage}
              onPageSizeChange={(size) => {
                setInvitationsPageSize(size);
                setInvitationsPage(1);
              }}
              itemLabel="invitations"
            />
          </CardContent>
        </Card>
      )}

      {/* Invitations the current user can accept (when already in an org) */}
      {myInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("org.yourInvitations")}
            </CardTitle>
            <CardDescription>{t("org.yourInvitationsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm">
                      {inv.organization.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("org.invitedByAs", {
                        name: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
                        role: roleLabels[inv.role] ?? inv.role,
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                      onClick={() => handleAcceptInvitation(inv.id)}
                      disabled={pendingInvitationAction !== null}
                    >
                      {pendingInvitationAction?.id === inv.id &&
                      pendingInvitationAction.action === "accept" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          {t("org.accept")}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineInvitation(inv.id)}
                      disabled={pendingInvitationAction !== null}
                    >
                      {pendingInvitationAction?.id === inv.id &&
                      pendingInvitationAction.action === "decline" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          {t("org.decline")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setLastInviteUrl(null);
            setLastEmailSent(true);
            setCopiedUrl(false);
            setInviteEmail("");
            setInviteRole("MEMBER");
            setInviteAllWorkspaces(true);
            setWsAssignments(new Map());
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("org.inviteToOrgTitle")}</DialogTitle>
            <DialogDescription>{t("org.inviteToOrgDesc")}</DialogDescription>
          </DialogHeader>

          {lastInviteUrl && !lastEmailSent ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {t("org.emailNotConfigured")}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={lastInviteUrl}
                    readOnly
                    className="text-xs bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(lastInviteUrl);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      } catch {
                        // Clipboard write failed
                      }
                    }}
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        {t("org.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        {t("org.copy")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteOpen(false);
                    setLastInviteUrl(null);
                    setLastEmailSent(true);
                    setCopiedUrl(false);
                  }}
                >
                  {t("org.done")}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">{t("org.email")}</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">{t("org.orgRole")}</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) =>
                      setInviteRole(v as "ADMIN" | "MEMBER")
                    }
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-56">
                      <SelectItem value="ADMIN" className="py-2">
                        <div>
                          <span className="flex items-center gap-1.5">
                            {getRoleIcon("ADMIN")}
                            {roleLabels["ADMIN"]}
                          </span>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                            {t("org.roleDescOrgAdmin")}
                          </p>
                        </div>
                      </SelectItem>
                      <SelectItem value="MEMBER" className="py-2">
                        <div>
                          <span className="flex items-center gap-1.5">
                            {getRoleIcon("MEMBER")}
                            {roleLabels["MEMBER"]}
                          </span>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                            {t("org.roleDescOrgMember")}
                          </p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Workspace access section */}
                <div className="space-y-2">
                  <Label>{t("org.workspaceAccess")}</Label>
                  <Button
                    type="button"
                    variant={inviteAllWorkspaces ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setInviteAllWorkspaces((prev) => !prev);
                      if (!inviteAllWorkspaces) {
                        setWsAssignments(new Map());
                      }
                    }}
                  >
                    {inviteAllWorkspaces ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2 opacity-40" />
                    )}
                    {t("org.grantAllWorkspaces")}
                  </Button>

                  {!inviteAllWorkspaces && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
                      {wsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : orgWorkspaces.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("org.noWorkspacesFound")}
                        </p>
                      ) : (
                        orgWorkspaces.map((ws) => (
                          <WorkspaceRow
                            key={ws.id}
                            workspace={ws}
                            selected={wsAssignments.has(ws.id)}
                            role={wsAssignments.get(ws.id) ?? "MEMBER"}
                            onToggle={() => toggleWsAssignment(ws.id)}
                            onRoleChange={(r) =>
                              updateWsAssignmentRole(ws.id, r)
                            }
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  {t("org.cancel")}
                </Button>
                <Button
                  className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                  onClick={handleInvite}
                  disabled={inviteMemberMutation.isPending || !inviteEmail}
                >
                  {inviteMemberMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("org.inviting")}
                    </>
                  ) : (
                    t("org.inviteButton")
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Member Workspace Management Dialog */}
      {manageWsMember && (
        <MemberWorkspacesDialog
          open={!!manageWsMember}
          onOpenChange={(open) => {
            if (!open) setManageWsMember(null);
          }}
          member={manageWsMember}
        />
      )}

      {/* Remove Member Confirm Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("org.removeMemberTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("org.removeMemberDesc", {
                email: memberToRemove?.email,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setMemberToRemove(null);
              }}
            >
              {t("org.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={removeMemberMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleRemoveMember();
              }}
            >
              {removeMemberMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t("org.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrganizationSection;
