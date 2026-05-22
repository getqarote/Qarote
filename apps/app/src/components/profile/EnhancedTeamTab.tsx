import { useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { AlertTriangle, Info, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  WORKSPACE_ROLE_RANK,
  WorkspaceMember,
  WorkspaceRole,
} from "@/lib/api/authTypes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PixelX } from "@/components/ui/pixel-x";
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
import { formatDate, InviteFormState } from "./profileUtils";

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

/**
 * Stable string discriminator for the role Select. Built-ins and custom
 * roles share the same dropdown but live in disjoint UUID spaces — the
 * `builtin:` / `custom:` prefix makes the branch in `onValueChange`
 * purely syntactic (no UUID-string heuristics).
 */
type SelectRoleValue = `builtin:${string}` | `custom:${string}`;

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
  const totalUsers = usersTotal;
  const pendingInvitations = invTotal;
  const maxUsers = planFeatures?.maxUsers;

  const canUpdateRole = usePermission("member:update_role");
  const { data: myRoleData } = useCurrentWorkspaceRole();
  const assignRoleMutation = useAssignRole();

  // Built-ins are addressed by their stable system Role UUID via
  // `assignRole.targetRoleId` — see apps/api/.../workspace/role.ts.
  // Custom roles ride the same path; only the source query differs.
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

  // Selection state. memberIds here are WorkspaceMember UUIDs — that
  // is what `assignRole.memberIds` expects.
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkRoleValue, setBulkRoleValue] = useState<SelectRoleValue | "">("");
  const [lastOwnerDialogOpen, setLastOwnerDialogOpen] = useState(false);
  // Action to run when the last-OWNER dialog is confirmed. Set
  // synchronously alongside `setLastOwnerDialogOpen(true)` in event
  // handlers — never read from an effect (the ref will be null on the
  // second pass under React 19 Strict Mode dev double-invocation).
  const pendingDialogAction = useRef<(() => void) | null>(null);
  const lastOwnerCancelRef = useRef<HTMLButtonElement>(null);

  // Member-removal dialog (unchanged from pre-PR-4.1).
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

  // Effective selection is derived from `selectedMemberIds` filtered to
  // members visible on the current page. Computed at render-time rather
  // than synced via an effect so a page change doesn't trigger a
  // cascading render — and so the bulk count always matches what the
  // user actually sees.
  const effectiveSelectedIds = useMemo(() => {
    const visible = new Set(workspaceUsers.map((u) => u.memberId));
    const out = new Set<string>();
    for (const id of selectedMemberIds) if (visible.has(id)) out.add(id);
    return out;
  }, [selectedMemberIds, workspaceUsers]);

  const isBusy = assignRoleMutation.isPending;
  const ownersOnPage = workspaceUsers.filter(
    (u) => u.role === WorkspaceRole.OWNER
  );

  // Page-scoped last-OWNER pre-check. Backend enforces the invariant
  // unconditionally; this avoids a wasted round-trip when the page
  // already exposes the full owner set.
  const wouldRemoveLastOwnerOnPage = (
    memberIds: Iterable<string>,
    targetRoleKey: WorkspaceRole | null
  ) => {
    if (targetRoleKey === WorkspaceRole.OWNER) return false;
    if (ownersOnPage.length === 0) return false;
    const set = new Set(memberIds);
    const affectedOwners = ownersOnPage.filter((o) => set.has(o.memberId));
    return affectedOwners.length === ownersOnPage.length;
  };

  const decodeRoleValue = (value: SelectRoleValue) => {
    if (value.startsWith("builtin:")) {
      const builtinKey = value.slice("builtin:".length) as WorkspaceRole;
      const roleId = builtinRoleIdByKey.get(builtinKey) ?? null;
      return { kind: "builtin" as const, builtinKey, roleId };
    }
    return {
      kind: "custom" as const,
      builtinKey: null,
      roleId: value.slice("custom:".length),
    };
  };

  const performAssign = async (
    memberIds: string[],
    target: SelectRoleValue,
    options: { isBulk: boolean }
  ) => {
    const decoded = decodeRoleValue(target);
    if (!decoded.roleId) {
      toast.error(t("team.toast.bulkRoleUpdateFailed"));
      return;
    }
    try {
      await assignRoleMutation.mutateAsync({
        workspaceId,
        memberIds,
        targetRoleId: decoded.roleId,
      });
      if (options.isBulk) {
        toast.success(
          t("team.toast.bulkRoleUpdated", { count: memberIds.length })
        );
        setSelectedMemberIds(new Set());
        setBulkRoleValue("");
      }
    } catch {
      // WORKSPACE_PERMISSION denials are surfaced by the global
      // scope-denied toast listener. Everything else (last-OWNER,
      // plan gate, privilege escalation) shows a domain message.
      toast.error(
        options.isBulk
          ? t("team.toast.bulkRoleUpdateFailed")
          : t("team.toast.roleUpdateFailed")
      );
    }
  };

  const handleInlineRoleChange = (
    member: WorkspaceMember,
    value: SelectRoleValue
  ) => {
    // PR-4.1 UX rule: an inline change on a selected row clears its
    // membership in the bulk selection so the toolbar can't reassign
    // it again silently on Apply.
    if (effectiveSelectedIds.has(member.memberId)) {
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(member.memberId);
        return next;
      });
    }
    const decoded = decodeRoleValue(value);
    if (wouldRemoveLastOwnerOnPage([member.memberId], decoded.builtinKey)) {
      pendingDialogAction.current = () =>
        performAssign([member.memberId], value, { isBulk: false });
      setLastOwnerDialogOpen(true);
      return;
    }
    void performAssign([member.memberId], value, { isBulk: false });
  };

  const handleBulkApply = () => {
    if (!bulkRoleValue || effectiveSelectedIds.size === 0) return;
    const memberIds = Array.from(effectiveSelectedIds);
    const decoded = decodeRoleValue(bulkRoleValue);
    if (wouldRemoveLastOwnerOnPage(memberIds, decoded.builtinKey)) {
      pendingDialogAction.current = () =>
        performAssign(memberIds, bulkRoleValue, { isBulk: true });
      setLastOwnerDialogOpen(true);
      return;
    }
    void performAssign(memberIds, bulkRoleValue, { isBulk: true });
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

  const handleRemoveUserClick = (workspaceUser: WorkspaceMember) => {
    setUserToRemove({
      id: workspaceUser.id,
      name: `${workspaceUser.firstName ?? ""} ${
        workspaceUser.lastName ?? ""
      }`.trim(),
      email: workspaceUser.email,
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
  const handleCancelRemove = () => {
    setConfirmDialogOpen(false);
    setUserToRemove(null);
  };

  const headerCheckboxState: boolean | "indeterminate" = (() => {
    if (filteredUsers.length === 0) return false;
    const selectedOnPage = filteredUsers.filter((u) =>
      effectiveSelectedIds.has(u.memberId)
    ).length;
    if (selectedOnPage === 0) return false;
    if (selectedOnPage === filteredUsers.length) return true;
    return "indeterminate";
  })();

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="p-4">
          <p className="text-muted-foreground">{t("team.adminOnly")}</p>
        </div>
      </div>
    );
  }

  // While the builtins query is in flight, every SelectItem for a
  // built-in would otherwise render `disabled` (because
  // `builtinRoleIdByKey` has no entry yet). That looks identical to a
  // permanent "you can't grant any role" state and is confusing UX.
  // Show a single non-interactive "Loading…" label instead until the
  // UUIDs arrive.
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
    <div className="space-y-6">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="title-section">
                {t("team.workspaceMembersTitle")}
              </h2>
              <Badge
                variant="outline"
                className="font-mono tabular-nums text-xs"
              >
                {totalUsers}
              </Badge>
              {pendingInvitations > 0 && (
                <span
                  className="text-sm text-muted-foreground"
                  title={t("team.pendingHelp")}
                >
                  · {pendingInvitations} {t("team.pending")}
                </span>
              )}
              {maxUsers && (
                <span
                  className={`text-sm ${
                    totalUsers + pendingInvitations >= maxUsers
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  ({totalUsers + pendingInvitations}/{maxUsers})
                </span>
              )}
            </div>
          </div>
          {workspace?.name && (
            <div className="space-y-1 text-sm text-muted-foreground mt-1">
              <div>{workspace.name}</div>
              <div>{t("team.scopeHelp")}</div>
            </div>
          )}
        </div>
        <div className="p-4">
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
                    aria-label={t("team.searchPlaceholder")}
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

              {/* aria-live is on the count span (not the region) so the
                  selection count is announced when the toolbar appears
                  and again as the user adds/removes members. The
                  toolbar uses `bg-muted` (no alpha) so the surface is
                  visible against the page background in both themes. */}
              {/* Toolbar styled as a contextual action surface, not
                  another filter row: solid `bg-muted` + a primary
                  left-border accent, slightly more vertical padding
                  than the search row above. The count text uses
                  tabular numerals so resizing the page doesn't reflow
                  the row mid-action. */}
              {effectiveSelectedIds.size > 0 && (
                <div
                  role="region"
                  aria-label={t("team.bulkSelected", {
                    count: effectiveSelectedIds.size,
                  })}
                  className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border border-border border-l-4 border-l-primary bg-muted px-3 py-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-150"
                >
                  <p className="text-sm" aria-live="polite" aria-atomic="true">
                    <Trans
                      i18nKey="profile:team.bulkSelected"
                      values={{ count: effectiveSelectedIds.size }}
                      components={{
                        strong: <span className="font-semibold tabular-nums" />,
                      }}
                    />
                  </p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={bulkRoleValue || undefined}
                      onValueChange={(v) =>
                        setBulkRoleValue(v as SelectRoleValue)
                      }
                      disabled={isBusy}
                    >
                      <SelectTrigger className="h-8 w-52 text-xs">
                        <SelectValue
                          placeholder={t("team.bulkSelectRolePlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>{renderRoleOptions()}</SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleBulkApply}
                      disabled={!bulkRoleValue || isBusy}
                      aria-busy={isBusy}
                    >
                      {isBusy ? (
                        <>
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin mr-1.5"
                            aria-hidden="true"
                          />
                          {t("team.bulkApplying")}
                        </>
                      ) : (
                        t("team.bulkApply", {
                          count: effectiveSelectedIds.size,
                        })
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedMemberIds(new Set())}
                      disabled={isBusy}
                    >
                      {t("team.bulkDeselectAll")}
                    </Button>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={headerCheckboxState}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedMemberIds(
                              new Set(filteredUsers.map((u) => u.memberId))
                            );
                          } else {
                            setSelectedMemberIds(new Set());
                          }
                        }}
                        aria-label={t("team.selectAllNamed", {
                          count: filteredUsers.length,
                        })}
                        disabled={isBusy}
                      />
                    </TableHead>
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
                    const isSelf = workspaceUser.id === user?.id;
                    const memberRoleRank =
                      workspaceUser.role === "CUSTOM"
                        ? -1
                        : (WORKSPACE_ROLE_RANK[workspaceUser.role] ?? -1);
                    // Show the inline Select when the actor can grant
                    // roles AND has authority over this member's
                    // current role. Custom-role members fall through
                    // to the Badge — rank-based comparison doesn't
                    // apply; the backend enforces authority anyway.
                    const showInlineSelect =
                      canUpdateRole === true &&
                      !isSelf &&
                      workspaceUser.role !== "CUSTOM" &&
                      memberRoleRank <= myRoleRank;
                    const currentValue: SelectRoleValue | undefined =
                      workspaceUser.role === "CUSTOM"
                        ? undefined
                        : (`builtin:${workspaceUser.role}` satisfies SelectRoleValue);
                    return (
                      <TableRow key={workspaceUser.id}>
                        <TableCell>
                          {/* Omit the checkbox entirely (rather than render
                              it disabled) for rows the actor can't touch.
                              A disabled checkbox is announced "dimmed"
                              with no explanation — empty cells are clearer
                              and the action surfaces (Select / Remove) are
                              already hidden on the same rows. */}
                          {!isSelf && showInlineSelect && (
                            <Checkbox
                              checked={effectiveSelectedIds.has(
                                workspaceUser.memberId
                              )}
                              onCheckedChange={(checked) => {
                                setSelectedMemberIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked === true)
                                    next.add(workspaceUser.memberId);
                                  else next.delete(workspaceUser.memberId);
                                  return next;
                                });
                              }}
                              aria-label={t("team.selectRowNamed", {
                                name:
                                  `${workspaceUser.firstName ?? ""} ${
                                    workspaceUser.lastName ?? ""
                                  }`.trim() || workspaceUser.email,
                              })}
                              disabled={isBusy}
                            />
                          )}
                        </TableCell>
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
                          {showInlineSelect && currentValue ? (
                            <Select
                              value={currentValue}
                              onValueChange={(v) =>
                                handleInlineRoleChange(
                                  workspaceUser,
                                  v as SelectRoleValue
                                )
                              }
                              disabled={isBusy}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {renderRoleOptions()}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="soft-primary"
                              data-testid="member-role-badge"
                            >
                              {workspaceUser.role === "CUSTOM"
                                ? t("team.roleCustomBadge")
                                : (roleLabels[workspaceUser.role] ??
                                  workspaceUser.role)}
                            </Badge>
                          )}
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
                            {!isSelf && memberRoleRank <= myRoleRank && (
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
                                  <PixelX className="h-4 w-auto shrink-0" />
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
        </div>
      </div>

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

      <Dialog
        open={lastOwnerDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleLastOwnerCancel();
        }}
      >
        <DialogContent
          // Default focus on Cancel rather than the close "X". The
          // destructive action shouldn't be one Enter-press away.
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
