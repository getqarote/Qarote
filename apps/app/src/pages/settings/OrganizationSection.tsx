import { useState } from "react";

import {
  Building2,
  Crown,
  Loader2,
  Mail,
  Pencil,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
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
  useCurrentOrganization,
  useInviteOrgMember,
  useOrgMembers,
  useRemoveOrgMember,
  useUpdateOrganization,
  useUpdateOrgMemberRole,
} from "@/hooks/queries/useOrganization";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
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

const OrganizationSection = () => {
  const { data: orgData, isLoading: orgLoading } = useCurrentOrganization();
  const { data: membersData, isLoading: membersLoading } = useOrgMembers();
  const updateOrgMutation = useUpdateOrganization();
  const inviteMemberMutation = useInviteOrgMember();
  const updateRoleMutation = useUpdateOrgMemberRole();
  const removeMemberMutation = useRemoveOrgMember();

  const [editing, setEditing] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: "",
    contactEmail: "",
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const org = orgData?.organization;
  const callerRole = orgData?.role;
  const isOrgAdmin = callerRole === "OWNER" || callerRole === "ADMIN";
  const members = membersData?.members ?? [];

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
      logger.error("Update org error:", error);
      toast.error("Failed to update organization");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    try {
      await inviteMemberMutation.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
      toast.success(`Invited ${inviteEmail} to organization`);
    } catch (error) {
      logger.error("Invite error:", error);
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
      logger.error("Role change error:", error);
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
      logger.error("Remove member error:", error);
      const msg =
        error instanceof Error ? error.message : "Failed to remove member";
      toast.error(msg);
    }
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
          <div className="flex items-center justify-between">
            <CardTitle>General</CardTitle>
            {isOrgAdmin && !editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
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
            <Button variant="outline" onClick={() => setEditing(false)}>
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Organization</DialogTitle>
            <DialogDescription>
              Add a member to your organization. They must have an existing
              account.
            </DialogDescription>
          </DialogHeader>
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
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "ADMIN" | "MEMBER")}
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
        </DialogContent>
      </Dialog>

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
