import { useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { AlertTriangle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  WORKSPACE_ROLE_RANK,
  WorkspaceMember,
  WorkspaceRole,
} from "@/lib/api/authTypes";
import { displayName, initials } from "@/lib/userDisplay";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconClose } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useAssignRole,
  useBuiltinRoles,
  useWorkspaceRoles,
} from "@/hooks/queries/useWorkspaceApi";
import {
  useCanGrantRole,
  useCurrentWorkspaceRole,
  usePermission,
} from "@/hooks/queries/useWorkspaceRole";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { InviteUserDialog } from "./InviteUserDialogEnhanced";
import { InviteFormState } from "./profileUtils";

import { MemberRolePill } from "../settings/organization/MemberRolePill";
import { useRoleLabels } from "../settings/organization/roleUi";

interface EnhancedTeamTabProps {
  isAdmin: boolean;
  workspaceId: string;
  workspaceUsers: WorkspaceMember[];
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

type SelectRoleValue = `builtin:${string}` | `custom:${string}`;

/**
 * Workspace members (prototype): one row per member — avatar, name/email, role
 * (an inline role picker for members the actor can re-grant, a static pill
 * otherwise), and a remove action. Keeps a search box + pagination for large
 * workspaces; the last-owner guard and role-grant authority are preserved.
 */
export const EnhancedTeamTab = ({
  isAdmin,
  workspaceId,
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
  const roleLabels = useRoleLabels();
  const { planData, user } = useUser();
  const { workspace } = useWorkspace();

  const planFeatures = planData?.planFeatures;
  const maxUsers = planFeatures?.maxUsers;
  const pendingInvitations = invTotal;

  const canUpdateRole = usePermission("member:update_role");
  const { data: myRoleData } = useCurrentWorkspaceRole();
  const assignRoleMutation = useAssignRole();

  const builtinRolesQuery = useBuiltinRoles(workspaceId, {
    enabled: canUpdateRole === true,
  });
  const customRolesQuery = useWorkspaceRoles(workspaceId, {
    enabled: canUpdateRole === true,
  });

  const builtinRoleIdByKey = useMemo(() => {
    const map = new Map<WorkspaceRole, string>();
    for (const row of builtinRolesQuery.data?.items ?? []) {
      map.set(row.builtinKey as WorkspaceRole, row.id);
    }
    return map;
  }, [builtinRolesQuery.data]);

  const customRoles = customRolesQuery.data?.items ?? [];

  const myRoleRank = myRoleData?.role
    ? (WORKSPACE_ROLE_RANK[myRoleData.role as WorkspaceRole] ?? -1)
    : -1;

  const canGrantOwner = useCanGrantRole(WorkspaceRole.OWNER);
  const canGrantAdmin = useCanGrantRole(WorkspaceRole.ADMIN);
  const canGrantMember = useCanGrantRole(WorkspaceRole.MEMBER);
  const canGrantReadonly = useCanGrantRole(WorkspaceRole.READONLY);
  const grantableBuiltins: WorkspaceRole[] = useMemo(
    () =>
      [
        canGrantOwner === true ? WorkspaceRole.OWNER : null,
        canGrantAdmin === true ? WorkspaceRole.ADMIN : null,
        canGrantMember === true ? WorkspaceRole.MEMBER : null,
        canGrantReadonly === true ? WorkspaceRole.READONLY : null,
      ].filter((r): r is WorkspaceRole => r !== null),
    [canGrantOwner, canGrantAdmin, canGrantMember, canGrantReadonly]
  );

  const [lastOwnerDialogOpen, setLastOwnerDialogOpen] = useState(false);
  const pendingDialogAction = useRef<(() => void) | null>(null);
  const lastOwnerCancelRef = useRef<HTMLButtonElement>(null);

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
      return (
        displayName(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [query, workspaceUsers]);

  const isBusy = assignRoleMutation.isPending;
  const ownersOnPage = workspaceUsers.filter(
    (u) => u.role === WorkspaceRole.OWNER
  );

  const wouldRemoveLastOwnerOnPage = (
    memberId: string,
    targetRoleKey: WorkspaceRole | null
  ) => {
    if (targetRoleKey === WorkspaceRole.OWNER) return false;
    if (ownersOnPage.length === 0) return false;
    const affected = ownersOnPage.filter((o) => o.memberId === memberId);
    return affected.length === ownersOnPage.length;
  };

  const decodeRoleValue = (value: SelectRoleValue) => {
    if (value.startsWith("builtin:")) {
      const builtinKey = value.slice("builtin:".length) as WorkspaceRole;
      return {
        builtinKey,
        roleId: builtinRoleIdByKey.get(builtinKey) ?? null,
      };
    }
    return { builtinKey: null, roleId: value.slice("custom:".length) };
  };

  const performAssign = async (memberId: string, target: SelectRoleValue) => {
    const decoded = decodeRoleValue(target);
    if (!decoded.roleId) {
      toast.error(t("team.toast.roleUpdateFailed"));
      return;
    }
    try {
      await assignRoleMutation.mutateAsync({
        workspaceId,
        memberIds: [memberId],
        targetRoleId: decoded.roleId,
      });
    } catch {
      toast.error(t("team.toast.roleUpdateFailed"));
    }
  };

  const handleInlineRoleChange = (
    member: WorkspaceMember,
    value: SelectRoleValue
  ) => {
    const decoded = decodeRoleValue(value);
    if (wouldRemoveLastOwnerOnPage(member.memberId, decoded.builtinKey)) {
      pendingDialogAction.current = () => performAssign(member.memberId, value);
      setLastOwnerDialogOpen(true);
      return;
    }
    void performAssign(member.memberId, value);
  };

  const handleLastOwnerConfirm = () => {
    const action = pendingDialogAction.current;
    pendingDialogAction.current = null;
    setLastOwnerDialogOpen(false);
    action?.();
  };
  const handleLastOwnerCancel = () => {
    pendingDialogAction.current = null;
    setLastOwnerDialogOpen(false);
  };

  const handleRemoveUserClick = (m: WorkspaceMember) => {
    setUserToRemove({
      id: m.id,
      name: displayName(m),
      email: m.email,
    });
    setConfirmDialogOpen(true);
  };
  const handleConfirmRemove = () => {
    if (userToRemove) {
      onRemoveUser(userToRemove.id, userToRemove.name);
      setConfirmDialogOpen(false);
      setUserToRemove(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("team.adminOnly")}</p>
      </div>
    );
  }

  const rolesLoading =
    builtinRolesQuery.isLoading || customRolesQuery.isLoading;
  const renderRoleOptions = () => {
    if (rolesLoading) {
      return (
        <SelectGroup>
          <SelectLabel className="text-muted-foreground">
            {t("team.roleLoading")}
          </SelectLabel>
        </SelectGroup>
      );
    }
    return (
      <>
        {grantableBuiltins.length > 0 && (
          <SelectGroup>
            <SelectLabel>{t("team.roleGroupBuiltin")}</SelectLabel>
            {grantableBuiltins.map((r) => (
              <SelectItem
                key={`builtin:${r}`}
                value={`builtin:${r}` satisfies SelectRoleValue}
                className="text-xs"
                disabled={!builtinRoleIdByKey.has(r)}
              >
                {roleLabels[r] ?? r}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {customRoles.length > 0 && (
          <SelectGroup>
            <SelectLabel>{t("team.roleGroupCustom")}</SelectLabel>
            {customRoles.map((r) => (
              <SelectItem
                key={`custom:${r.id}`}
                value={`custom:${r.id}` satisfies SelectRoleValue}
                className="text-xs"
              >
                {r.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold">
        {t("team.workspaceMembersTitle")}
        {workspace?.name ? ` · ${workspace.name}` : ""}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t("team.scopeHelp")}
        {maxUsers ? ` · ${usersTotal + pendingInvitations}/${maxUsers}` : ""}
      </p>

      {usersLoading ? (
        <div className="mt-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="relative mt-4">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("team.searchPlaceholder")}
              className="pl-9"
              aria-label={t("team.searchPlaceholder")}
            />
          </div>

          {filteredUsers.length > 0 ? (
            <div className="mt-3 border-t border-border">
              {filteredUsers.map((m) => {
                const isRowRemoving = removingUserId === m.id;
                const removeDisabled = isRemoving && !isRowRemoving;
                const isSelf = m.id === user?.id;
                const memberRoleRank =
                  m.role === "CUSTOM"
                    ? -1
                    : (WORKSPACE_ROLE_RANK[m.role] ?? -1);
                const showInlineSelect =
                  canUpdateRole === true &&
                  !isSelf &&
                  m.role !== "CUSTOM" &&
                  memberRoleRank <= myRoleRank;
                const currentValue: SelectRoleValue | undefined =
                  m.role === "CUSTOM"
                    ? undefined
                    : (`builtin:${m.role}` satisfies SelectRoleValue);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 border-b border-border py-3.5"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs">
                        {initials(m)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {displayName(m)}
                      </div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {m.email}
                      </div>
                    </div>
                    {showInlineSelect && currentValue ? (
                      <Select
                        value={currentValue}
                        onValueChange={(v) =>
                          handleInlineRoleChange(m, v as SelectRoleValue)
                        }
                        disabled={isBusy}
                      >
                        <SelectTrigger className="h-8 w-32 shrink-0 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>{renderRoleOptions()}</SelectContent>
                      </Select>
                    ) : (
                      <MemberRolePill
                        role={m.role}
                        label={
                          m.role === "CUSTOM"
                            ? t("team.roleCustomBadge")
                            : (roleLabels[m.role] ?? m.role)
                        }
                      />
                    )}
                    <div className="hidden w-24 shrink-0 text-right font-mono text-xs text-muted-foreground sm:block">
                      {t("team.workspaceScopeLabel")}
                    </div>
                    {!isSelf && memberRoleRank <= myRoleRank ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUserClick(m)}
                        disabled={removeDisabled || isRowRemoving}
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title={t("team.removeUser")}
                      >
                        {isRowRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <IconClose className="h-4 w-auto shrink-0" />
                        )}
                      </Button>
                    ) : (
                      <span className="w-px shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("team.noTeamMembers")}
            </p>
          )}

          <PaginationControls
            total={usersTotal}
            page={usersPage}
            pageSize={usersPageSize}
            onPageChange={onUsersPageChange}
            onPageSizeChange={onUsersPageSizeChange}
            itemLabel="members"
          />
        </>
      )}

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        onInviteUser={onInviteUser}
        isInviting={isInviting}
        canInvite={canInviteMoreUsers}
        maxUsers={maxUsers}
        currentCount={usersTotal + pendingInvitations}
        emailEnabled={emailEnabled}
      />

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("team.removeDialogTitle")}</DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="profile:team.removeDialogDescription"
                values={{
                  name: userToRemove?.name,
                  email: userToRemove?.email,
                }}
                components={{ strong: <strong /> }}
              />
              <br />
              <br />
              {t("team.removeDialogWarning")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setUserToRemove(null);
              }}
            >
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

      <Dialog
        open={lastOwnerDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleLastOwnerCancel();
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            lastOwnerCancelRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 text-destructive"
                aria-hidden="true"
              />
              {t("team.bulkLastOwnerTitle")}
            </DialogTitle>
            <DialogDescription>{t("team.bulkLastOwnerBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              ref={lastOwnerCancelRef}
              variant="outline"
              onClick={handleLastOwnerCancel}
            >
              {t("team.bulkLastOwnerCancel")}
            </Button>
            <Button
              onClick={handleLastOwnerConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("team.bulkLastOwnerConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
