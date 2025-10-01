import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Mail, UserPlus, X, Clock, Lock } from "lucide-react";
import { User } from "@/lib/api/authTypes";
import { InvitationWithInviter } from "@/lib/api/authTypes";
import { UserPlan } from "@/types/plans";
import { useUser } from "@/hooks/useUser";
import { useWorkspace } from "@/hooks/useWorkspace";
import { InviteFormState, formatDate, getRoleColor } from "./profileUtils";
import { InviteUserDialog } from "./InviteUserDialogEnhanced";
import { useState } from "react";

interface EnhancedTeamTabProps {
  isAdmin: boolean;
  workspaceUsers: User[];
  invitations: InvitationWithInviter[];
  usersLoading: boolean;
  invitationsLoading: boolean;
  inviteDialogOpen: boolean;
  setInviteDialogOpen: (open: boolean) => void;
  inviteForm: InviteFormState;
  setInviteForm: (form: InviteFormState) => void;
  onInviteUser: () => void;
  onRevokeInvitation: (invitationId: string, email: string) => void;
  onRemoveUser: (userId: string, userName: string) => void;
  isInviting: boolean;
  isRevoking: boolean;
  isRemoving: boolean;
  userPlan: UserPlan;
  canInviteMoreUsers: boolean;
}

export const EnhancedTeamTab = ({
  isAdmin,
  workspaceUsers,
  invitations,
  usersLoading,
  invitationsLoading,
  inviteDialogOpen,
  setInviteDialogOpen,
  inviteForm,
  setInviteForm,
  onInviteUser,
  onRevokeInvitation,
  onRemoveUser,
  isInviting,
  isRevoking,
  isRemoving,
  userPlan,
  canInviteMoreUsers,
}: EnhancedTeamTabProps) => {
  const { planData, user } = useUser();
  const { workspace } = useWorkspace();
  const planFeatures = planData?.planFeatures;
  const totalUsers = workspaceUsers.length;
  const pendingInvitations = invitations.length;
  const maxUsers = planFeatures?.maxUsers;

  // Check if current user is the workspace owner
  const isWorkspaceOwner = workspace?.ownerId === user?.id;

  // State for confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // Handler for opening confirmation dialog
  const handleRemoveUserClick = (workspaceUser: User) => {
    setUserToRemove({
      id: workspaceUser.id,
      name: `${workspaceUser.firstName} ${workspaceUser.lastName}`,
      email: workspaceUser.email,
    });
    setConfirmDialogOpen(true);
  };

  // Handler for confirming user removal
  const handleConfirmRemove = () => {
    if (userToRemove) {
      onRemoveUser(userToRemove.id, userToRemove.name);
      setConfirmDialogOpen(false);
      setUserToRemove(null);
    }
  };

  // Handler for canceling user removal
  const handleCancelRemove = () => {
    setConfirmDialogOpen(false);
    setUserToRemove(null);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Only workspace administrators can view and manage team members.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <span>Team Overview</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {totalUsers} {totalUsers === 1 ? "user" : "users"}
              </Badge>
              {pendingInvitations > 0 && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {pendingInvitations} pending
                </Badge>
              )}
              {maxUsers && (
                <Badge
                  variant={
                    totalUsers + pendingInvitations >= maxUsers
                      ? "destructive"
                      : "outline"
                  }
                >
                  {totalUsers + pendingInvitations}/{maxUsers} limit
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalUsers}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Active Users
              </p>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {pendingInvitations}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Pending Invitations
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {maxUsers ? maxUsers - totalUsers - pendingInvitations : "∞"}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Available Slots
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Active Members</span>
            </div>
            {canInviteMoreUsers ? (
              <Button
                onClick={() => setInviteDialogOpen(true)}
                size="sm"
                className="btn-primary"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            ) : (
              <Button
                onClick={() => setInviteDialogOpen(true)}
                disabled={true}
                size="sm"
                className="bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
                title="Upgrade to invite more users"
              >
                <Lock className="w-4 h-4" />
                Invite User
                <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                  Pro
                </span>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : workspaceUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaceUsers.map((workspaceUser) => (
                  <TableRow key={workspaceUser.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {workspaceUser.firstName?.[0]}
                            {workspaceUser.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {workspaceUser.firstName} {workspaceUser.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {workspaceUser.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(workspaceUser.role)}>
                        {workspaceUser.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          workspaceUser.isActive ? "default" : "secondary"
                        }
                      >
                        {workspaceUser.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {workspaceUser.lastLogin
                        ? formatDate(workspaceUser.lastLogin)
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(workspaceUser.createdAt)}
                    </TableCell>
                    <TableCell>
                      {workspaceUser.id !== user?.id &&
                        (isWorkspaceOwner ||
                          workspaceUser.role !== "ADMIN") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUserClick(workspaceUser)}
                            disabled={isRemoving}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Remove user from workspace"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No team members found. Invite users to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {(invitations.length > 0 || invitationsLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <span>Pending Invitations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitationsLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            ) : invitations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">
                            {invitation.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(invitation.role)}>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">
                            {invitation.invitedBy.displayName}
                          </p>
                          <p className="text-muted-foreground">
                            {invitation.invitedBy.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invitation.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invitation.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onRevokeInvitation(invitation.id, invitation.email)
                          }
                          disabled={isRevoking}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No pending invitations.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Limits Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>{userPlan} Plan:</strong>{" "}
              {maxUsers ? `Up to ${maxUsers} users allowed` : "Unlimited users"}
            </p>
            {!canInviteMoreUsers && maxUsers && (
              <p className="text-amber-600 mt-1">
                You've reached your user limit. Upgrade your plan to invite more
                users.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        onInviteUser={onInviteUser}
        isInviting={isInviting}
        canInvite={canInviteMoreUsers}
        maxUsers={maxUsers}
        currentCount={totalUsers + pendingInvitations}
      />

      {/* Confirmation Dialog for User Removal */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User from Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{userToRemove?.name}</strong> ({userToRemove?.email}) from
              this workspace?
              <br />
              <br />
              This action cannot be undone. The user will lose access to all
              workspace resources and will need to be re-invited to regain
              access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRemove}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRemove}
              className="bg-red-600 hover:bg-red-700"
              disabled={isRemoving}
            >
              {isRemoving ? "Removing..." : "Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
