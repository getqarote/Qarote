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
import { Users, Mail, UserPlus, X, Clock, Lock } from "lucide-react";
import { User } from "@/lib/api/authTypes";
import { InvitationWithInviter } from "@/lib/api/authTypes";
import { InviteFormState, formatDate, getRoleColor } from "./profileUtils";
import { InviteUserDialog } from "./InviteUserDialogEnhanced";
import { WorkspacePlan } from "@/types/plans";
import { useWorkspace } from "@/contexts/WorkspaceContext";

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
  isInviting: boolean;
  isRevoking: boolean;
  workspacePlan: WorkspacePlan;
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
  isInviting,
  isRevoking,
  workspacePlan,
  canInviteMoreUsers,
}: EnhancedTeamTabProps) => {
  const { planData } = useWorkspace();
  const planFeatures = planData?.planFeatures;
  const totalUsers = workspaceUsers.length;
  const pendingInvitations = invitations.length;
  const maxUsers = planFeatures?.maxUsers;

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
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
              <p className="text-sm text-blue-600">Active Users</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">
                {pendingInvitations}
              </p>
              <p className="text-sm text-amber-600">Pending Invitations</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {maxUsers ? maxUsers - totalUsers - pendingInvitations : "∞"}
              </p>
              <p className="text-sm text-green-600">Available Slots</p>
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
                <div
                  key={i}
                  className="h-12 bg-gray-200 rounded animate-pulse"
                />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaceUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.firstName?.[0]}
                            {user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
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
                    className="h-12 bg-gray-200 rounded animate-pulse"
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
              <strong>{workspacePlan} Plan:</strong>{" "}
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
    </div>
  );
};
