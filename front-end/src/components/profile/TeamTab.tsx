import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { User } from "@/lib/api/authTypes";
import { InviteFormState, formatDate, getRoleColor } from "./profileUtils";
import { InviteUserDialog } from "./InviteUserDialog";

interface TeamTabProps {
  isAdmin: boolean;
  companyUsers?: User[]; // Made optional for backwards compatibility
  workspaceUsers?: User[]; // New workspace users prop
  usersLoading: boolean;
  inviteDialogOpen: boolean;
  setInviteDialogOpen: (open: boolean) => void;
  inviteForm: InviteFormState;
  setInviteForm: (form: InviteFormState) => void;
  onInviteUser: () => void;
  isInviting: boolean;
}

export const TeamTab = ({
  isAdmin,
  companyUsers,
  workspaceUsers,
  usersLoading,
  inviteDialogOpen,
  setInviteDialogOpen,
  inviteForm,
  setInviteForm,
  onInviteUser,
  isInviting,
}: TeamTabProps) => {
  // Use workspace users if available, fallback to company users for backwards compatibility
  const users = workspaceUsers || companyUsers || [];

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <span>Team Members</span>
          </div>
          <InviteUserDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            inviteForm={inviteForm}
            setInviteForm={setInviteForm}
            onInviteUser={onInviteUser}
            isInviting={isInviting}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {usersLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : users.length > 0 ? (
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
              {users.map((teamUser) => (
                <TableRow key={teamUser.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {teamUser.firstName?.[0]}
                          {teamUser.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {teamUser.firstName} {teamUser.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {teamUser.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(teamUser.role)}>
                      {teamUser.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={teamUser.isActive ? "default" : "secondary"}
                    >
                      {teamUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {teamUser.lastLogin
                      ? formatDate(teamUser.lastLogin)
                      : "Never"}
                  </TableCell>
                  <TableCell>{formatDate(teamUser.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium">No team members</p>
            <p className="text-sm text-muted-foreground">
              Invite team members to get started.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
