import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Users, X } from "lucide-react";

import { UserRole } from "@/lib/api";
import { User } from "@/lib/api/authTypes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { InviteUserDialog } from "./InviteUserDialogEnhanced";
import { formatDate, InviteFormState } from "./profileUtils";

interface EnhancedTeamTabProps {
  isAdmin: boolean;
  workspaceUsers: User[];
  usersLoading: boolean;
  inviteDialogOpen: boolean;
  setInviteDialogOpen: (open: boolean) => void;
  inviteForm: InviteFormState;
  setInviteForm: (form: InviteFormState) => void;
  onInviteUser: () => void;
  onRemoveUser: (userId: string, userName: string) => void;
  isInviting: boolean;
  isRemoving: boolean;
  canInviteMoreUsers: boolean;
  emailEnabled?: boolean;
  usersTotal: number;
  usersPage: number;
  usersPageSize: number;
  onUsersPageChange: (page: number) => void;
  onUsersPageSizeChange: (size: number) => void;
  invTotal: number;
}

export const EnhancedTeamTab = ({
  isAdmin,
  workspaceUsers,
  usersLoading,
  inviteDialogOpen,
  setInviteDialogOpen,
  inviteForm,
  setInviteForm,
  onInviteUser,
  onRemoveUser,
  isInviting,
  isRemoving,
  canInviteMoreUsers,
  emailEnabled,
  usersTotal,
  usersPage,
  usersPageSize,
  onUsersPageChange,
  onUsersPageSizeChange,
  invTotal,
}: EnhancedTeamTabProps) => {
  const { t } = useTranslation("profile");
  const { planData, user } = useUser();
  const { workspace } = useWorkspace();

  const planFeatures = planData?.planFeatures;
  const totalUsers = usersTotal;
  const pendingInvitations = invTotal;
  const maxUsers = planFeatures?.maxUsers;

  // Admins can manage all members
  const isWorkspaceOwner = isAdmin;

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
          <p className="text-muted-foreground">{t("team.adminOnly")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>{t("team.title")}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalUsers}{" "}
                {totalUsers === 1 ? t("team.user") : t("team.users")}
                {pendingInvitations > 0 && (
                  <>
                    {" "}
                    · {pendingInvitations} {t("team.pending")}
                  </>
                )}
                {maxUsers && (
                  <>
                    {" "}
                    <span
                      className={
                        totalUsers + pendingInvitations >= maxUsers
                          ? "text-red-500 dark:text-red-400"
                          : ""
                      }
                    >
                      ({totalUsers + pendingInvitations}/{maxUsers})
                    </span>
                  </>
                )}
              </span>
            </div>
            {/* Workspace-level invitations disabled — use org invitations instead */}
          </CardTitle>
          {workspace?.name && (
            <CardDescription>{workspace.name}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : workspaceUsers.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("team.tableUser")}</TableHead>
                    <TableHead>{t("team.tableRole")}</TableHead>
                    <TableHead>{t("team.tableStatus")}</TableHead>
                    <TableHead>{t("team.tableLastLogin")}</TableHead>
                    <TableHead>{t("team.tableJoined")}</TableHead>
                    <TableHead>{t("team.tableActions")}</TableHead>
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
                        <Badge variant="soft-orange">
                          {workspaceUser.role.charAt(0) +
                            workspaceUser.role.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            workspaceUser.isActive ? "soft-green" : "soft-gray"
                          }
                        >
                          {workspaceUser.isActive
                            ? t("team.active")
                            : t("team.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {workspaceUser.lastLogin
                          ? formatDate(workspaceUser.lastLogin)
                          : t("team.never")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(workspaceUser.createdAt)}
                      </TableCell>
                      <TableCell>
                        {workspaceUser.id !== user?.id &&
                          (isWorkspaceOwner ||
                            workspaceUser.role !== UserRole.ADMIN) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveUserClick(workspaceUser)
                              }
                              disabled={isRemoving}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title={t("team.removeUser")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                total={usersTotal}
                page={usersPage}
                pageSize={usersPageSize}
                onPageChange={onUsersPageChange}
                onPageSizeChange={onUsersPageSizeChange}
                itemLabel="members"
              />
            </>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {t("team.noTeamMembers")}
            </p>
          )}
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
        emailEnabled={emailEnabled}
      />

      {/* Confirmation Dialog for User Removal */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("team.removeDialogTitle")}</DialogTitle>
            <DialogDescription>
              <span
                dangerouslySetInnerHTML={{
                  __html: t("team.removeDialogDescription", {
                    name: userToRemove?.name,
                    email: userToRemove?.email,
                    interpolation: { escapeValue: false },
                  }),
                }}
              />
              <br />
              <br />
              {t("team.removeDialogWarning")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRemove}>
              {t("team.cancel")}
            </Button>
            <Button
              onClick={handleConfirmRemove}
              className="bg-red-600 hover:bg-red-700"
              disabled={isRemoving}
            >
              {isRemoving ? t("team.removing") : t("team.removeUserButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
