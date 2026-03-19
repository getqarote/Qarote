import { useState } from "react";

import {
  Building2,
  Check,
  Clock,
  Copy,
  Crown,
  Loader2,
  Mail,
  Pencil,
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
  CardFooter,
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

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

const WS_ROLE_OPTIONS: Array<"ADMIN" | "MEMBER" | "READONLY"> = [
  "ADMIN",
  "MEMBER",
  "READONLY",
];

const WS_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
  READONLY: "Read-only",
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case "OWNER":
      return <Crown className="h-3.5 w-3.5 text-orange-500" />;
    case "ADMIN":
      return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return <User className="h-3.5 w-3.5 text-muted-foreground" />;
  }
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
  role: "ADMIN" | "MEMBER" | "READONLY";
  onToggle: () => void;
  onRoleChange: (role: "ADMIN" | "MEMBER" | "READONLY") => void;
  disabled?: boolean;
}) => (
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
        onValueChange={(v) =>
          onRoleChange(v as "ADMIN" | "MEMBER" | "READONLY")
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {WS_ROLE_OPTIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {WS_ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </div>
);

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
    memberships.map((m) => [
      m.workspaceId,
      m.role as "ADMIN" | "MEMBER" | "READONLY",
    ])
  );

  const handleToggle = async (wsId: string) => {
    if (currentMap.has(wsId)) {
      try {
        await removeMutation.mutateAsync({
          userId: member.userId,
          workspaceId: wsId,
        });
        toast.success("Removed from workspace");
      } catch (error) {
        logger.error({ error }, "Remove from workspace error");
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to remove from workspace"
        );
      }
    } else {
      try {
        await assignMutation.mutateAsync({
          userId: member.userId,
          workspaceId: wsId,
          role: "MEMBER",
        });
        toast.success("Assigned to workspace");
      } catch (error) {
        logger.error({ error }, "Assign to workspace error");
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to assign to workspace"
        );
      }
    }
  };

  const handleRoleChange = async (
    wsId: string,
    newRole: "ADMIN" | "MEMBER" | "READONLY"
  ) => {
    try {
      await updateRoleMutation.mutateAsync({
        userId: member.userId,
        workspaceId: wsId,
        role: newRole,
      });
      toast.success("Workspace role updated");
    } catch (error) {
      logger.error({ error }, "Role change error");
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update workspace role"
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
          <DialogTitle>Manage Workspaces</DialogTitle>
          <DialogDescription>
            Configure workspace access for {member.firstName} {member.lastName}.
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
              No workspaces found in the organization.
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
            Done
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
  const { data: orgData, isLoading: orgLoading } = useCurrentOrganization();
  const { data: membersData, isLoading: membersLoading } = useOrgMembers();
  const { data: pendingInvData } = usePendingOrgInvitations();
  const { data: myInvData } = useMyOrgInvitations();
  const { data: wsData, isLoading: wsLoading } = useOrgWorkspaces();
  const updateOrgMutation = useUpdateOrganization();
  const inviteMemberMutation = useInviteOrgMember();
  const updateRoleMutation = useUpdateOrgMemberRole();
  const removeMemberMutation = useRemoveOrgMember();
  const acceptInvitationMutation = useAcceptOrgInvitation();
  const declineInvitationMutation = useDeclineOrgInvitation();

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
    Map<string, "ADMIN" | "MEMBER" | "READONLY">
  >(new Map());

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
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
      toast.success("Organization updated");
    } catch (error) {
      logger.error({ error }, "Update org error");
      toast.error("Failed to update organization");
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
        toast.success(`Invited ${result.invitation.email} to organization`);
      } else {
        // Email not configured - show the invite URL for manual sharing
        setLastInviteUrl(result.inviteUrl);
        setLastEmailSent(false);
      }
    } catch (error) {
      logger.error({ error }, "Invite error");
      const msg =
        error instanceof Error ? error.message : "Failed to invite member";
      toast.error(msg);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({
        memberId,
        role: newRole as "OWNER" | "ADMIN" | "MEMBER",
      });
      toast.success("Role updated");
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
      toast.success("Member removed from organization");
    } catch (error) {
      logger.error({ error }, "Remove member error");
      const msg =
        error instanceof Error ? error.message : "Failed to remove member";
      toast.error(msg);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await acceptInvitationMutation.mutateAsync({ invitationId });
      toast.success("Invitation accepted");
    } catch (error) {
      logger.error({ error }, "Accept invitation error");
      const msg =
        error instanceof Error ? error.message : "Failed to accept invitation";
      toast.error(msg);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      await declineInvitationMutation.mutateAsync({ invitationId });
      toast.success("Invitation declined");
    } catch (error) {
      logger.error({ error }, "Decline invitation error");
      const msg =
        error instanceof Error ? error.message : "Failed to decline invitation";
      toast.error(msg);
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

  const updateWsAssignmentRole = (
    wsId: string,
    role: "ADMIN" | "MEMBER" | "READONLY"
  ) => {
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
            <h2 className="text-xl font-semibold">Organization</h2>
            <p className="text-sm text-muted-foreground">
              You are not part of an organization yet.
            </p>
          </div>
        </div>

        {/* Invitations the current user can accept */}
        {myInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                You have been invited to join the following organizations
              </CardDescription>
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
                        Invited by {inv.invitedBy.firstName}{" "}
                        {inv.invitedBy.lastName} as{" "}
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                        onClick={() => handleAcceptInvitation(inv.id)}
                        disabled={acceptInvitationMutation.isPending}
                      >
                        {acceptInvitationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineInvitation(inv.id)}
                        disabled={declineInvitationMutation.isPending}
                      >
                        {declineInvitationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Decline
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
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-semibold">Organization</h2>
          <p className="text-sm text-muted-foreground">
            Manage your organization settings and members
          </p>
        </div>
      </div>

      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            {editing ? (
              <Input
                id="org-name"
                value={orgForm.name}
                onChange={(e) =>
                  setOrgForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Organization name"
              />
            ) : (
              <p className="text-sm text-foreground">{org.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">Contact Email</Label>
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
                placeholder="contact@example.com"
              />
            ) : (
              <p className="text-sm text-foreground">
                {org.contactEmail || (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Your Role</Label>
            <div className="flex items-center gap-2">
              {getRoleIcon(callerRole ?? "MEMBER")}
              <span className="text-sm">
                {ROLE_LABELS[callerRole ?? "MEMBER"] ?? callerRole}
              </span>
            </div>
          </div>
          {isOrgAdmin && !editing && (
            <div className="flex justify-end">
              <Button className="btn-primary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Organization
              </Button>
            </div>
          )}
        </CardContent>
        {editing && (
          <CardFooter className="flex gap-2">
            <Button
              className="bg-gradient-button hover:bg-gradient-button-hover text-white"
              onClick={handleUpdateOrg}
              disabled={updateOrgMutation.isPending}
            >
              {updateOrgMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
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
              Cancel
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
              </CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? "s" : ""} in this
                organization
              </CardDescription>
            </div>
            {isOrgAdmin && (
              <Button
                size="sm"
                className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
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
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant={
                          member.role === "OWNER" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        <span className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {ROLE_LABELS[member.role]}
                        </span>
                      </Badge>
                    )}

                    {isOrgAdmin && member.role !== "OWNER" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Manage workspaces"
                          onClick={() =>
                            setManageWsMember({
                              id: member.id,
                              userId: member.userId,
                              firstName: member.firstName,
                              lastName: member.lastName,
                            })
                          }
                        >
                          <Settings className="h-4 w-4" />
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
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Card (admin view) */}
      {isOrgAdmin && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {pendingInvitations.length} pending invitation
              {pendingInvitations.length !== 1 ? "s" : ""}
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
                      Invited by {inv.invitedBy.firstName}{" "}
                      {inv.invitedBy.lastName} &middot; Expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {getRoleIcon(inv.role)}
                    <span className="ml-1">
                      {ROLE_LABELS[inv.role] ?? inv.role}
                    </span>
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invitations the current user can accept (when already in an org) */}
      {myInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Your Invitations
            </CardTitle>
            <CardDescription>
              You have been invited to other organizations
            </CardDescription>
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
                      Invited by {inv.invitedBy.firstName}{" "}
                      {inv.invitedBy.lastName} as{" "}
                      {ROLE_LABELS[inv.role] ?? inv.role}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                      onClick={() => handleAcceptInvitation(inv.id)}
                      disabled={acceptInvitationMutation.isPending}
                    >
                      {acceptInvitationMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineInvitation(inv.id)}
                      disabled={declineInvitationMutation.isPending}
                    >
                      {declineInvitationMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Decline
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
            <DialogTitle>Invite to Organization</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization. If email is not
              configured, you can copy the invite link to share manually.
            </DialogDescription>
          </DialogHeader>

          {lastInviteUrl && !lastEmailSent ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Email is not configured. Share this link with the invited
                  user:
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
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
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
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Organization role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) =>
                      setInviteRole(v as "ADMIN" | "MEMBER")
                    }
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Workspace access section */}
                <div className="space-y-2">
                  <Label>Workspace access</Label>
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
                    Grant access to all workspaces
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
                          No workspaces found.
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
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                  onClick={handleInvite}
                  disabled={inviteMemberMutation.isPending || !inviteEmail}
                >
                  {inviteMemberMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    "Invite"
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
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {memberToRemove?.email} from the organization? They will
              lose access to all organization workspaces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setMemberToRemove(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleRemoveMember}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrganizationSection;
