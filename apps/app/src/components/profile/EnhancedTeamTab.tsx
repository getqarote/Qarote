import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Info, Loader2, Search, Users, X } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  removingUserId: string | null;
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
  removingUserId,
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
  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaceUsers;
    return workspaceUsers.filter((u) => {
      const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      return (
        fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
  }, [query, workspaceUsers]);

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
              <span>{t("team.workspaceMembersTitle")}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalUsers}{" "}
                {totalUsers === 1 ? t("team.user") : t("team.users")}
                {pendingInvitations > 0 && (
                  <>
                    {" "}
                    <span title={t("team.pendingHelp")}>
                      · {pendingInvitations} {t("team.pending")}
                    </span>
                  </>
                )}
                {maxUsers && (
                  <>
                    {" "}
                    <span
                      className={
                        totalUsers + pendingInvitations >= maxUsers
                          ? "text-destructive"
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
            <CardDescription className="space-y-1">
              <div>{workspace.name}</div>
              <div>{t("team.scopeHelp")}</div>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                <div className="relative w-full sm:max-w-sm">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("team.searchPlaceholder")}
                    className="pl-9"
                  />
                </div>
                {query.trim() && (
                  <p className="text-sm text-muted-foreground">
                    {t("team.searchResults", {
                      shown: filteredUsers.length,
                      total: workspaceUsers.length,
                    })}
                  </p>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("team.tableUser")}</TableHead>
                    <TableHead>
                      <div className="inline-flex items-center gap-1">
                        <span>{t("team.tableRole")}</span>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={t("team.roleHelp")}
                              >
                                <Info
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {t("team.roleHelpTitle")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {t("org.roleAdmin")}:
                                  </span>{" "}
                                  {t("org.roleDescWsAdmin")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {t("org.roleMember")}:
                                  </span>{" "}
                                  {t("org.roleDescWsMember")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {t("org.roleReadonly")}:
                                  </span>{" "}
                                  {t("org.roleDescWsReadonly")}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead>{t("team.tableStatus")}</TableHead>
                    <TableHead>{t("team.tableActivity")}</TableHead>
                    <TableHead>{t("team.tableActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((workspaceUser) => {
                    const isRowRemoving = removingUserId === workspaceUser.id;
                    const removeDisabled =
                      isRemoving && removingUserId !== workspaceUser.id;
                    return (
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
                                {workspaceUser.firstName}{" "}
                                {workspaceUser.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {workspaceUser.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="soft-muted">
                            {workspaceUser.role.charAt(0) +
                              workspaceUser.role.slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              workspaceUser.isActive
                                ? "soft-success"
                                : "soft-muted"
                            }
                          >
                            {workspaceUser.isActive
                              ? t("team.active")
                              : t("team.inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="leading-tight">
                            <div>
                              {workspaceUser.lastLogin
                                ? formatDate(workspaceUser.lastLogin)
                                : t("team.never")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("team.joinedOn", {
                                date: formatDate(workspaceUser.createdAt),
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            {workspaceUser.id !== user?.id &&
                              (isWorkspaceOwner ||
                                workspaceUser.role !== UserRole.ADMIN) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveUserClick(workspaceUser)
                                  }
                                  disabled={removeDisabled || isRowRemoving}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 lg:min-w-24"
                                  title={t("team.removeUser")}
                                >
                                  {isRowRemoving ? (
                                    <Loader2
                                      className="h-4 w-4 animate-spin"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                  <span className="hidden lg:inline">
                                    {t("team.remove")}
                                  </span>
                                </Button>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
              className="bg-destructive hover:bg-destructive/90"
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
