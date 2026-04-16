import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Info, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { PixelEmail } from "@/components/ui/pixel-email";
import { PixelSettings } from "@/components/ui/pixel-settings";
import { PixelUser } from "@/components/ui/pixel-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useOrgMembers,
  useUpdateOrgMemberRole,
} from "@/hooks/queries/useOrganization";

import { MemberWorkspacesDialog } from "./MemberWorkspacesDialog";
import { getRoleBadgeVariant, getRoleIcon, useRoleLabels } from "./roleUi";
import type { OrgMember } from "./types";

interface OrgMembersCardProps {
  isOrgAdmin: boolean;
  onInviteClick: () => void;
  onRemoveMember: (member: { id: string; email: string }) => void;
}

/**
 * Lists organization members with pagination, inline role editing,
 * a "manage workspaces" action per member, and a remove button.
 *
 * Owns its own pagination state and the "manage workspaces" dialog
 * open state. The parent supplies the remove-member callback because
 * the confirm dialog lives at the page level (shared with other
 * destructive actions and centralized for consistency).
 *
 * Owner rows are read-only — the role picker is replaced by a badge
 * and the action buttons are hidden, because there's always exactly
 * one owner and they can't be demoted from the UI.
 */
export function OrgMembersCard({
  isOrgAdmin,
  onInviteClick,
  onRemoveMember,
}: OrgMembersCardProps) {
  const { t } = useTranslation("profile");
  const roleLabels = useRoleLabels();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [manageWsMember, setManageWsMember] = useState<{
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  const { data, isLoading } = useOrgMembers({ page, limit: pageSize });
  const updateRoleMutation = useUpdateOrgMemberRole();

  const members = (data?.members ?? []) as OrgMember[];
  const total = data?.pagination?.total ?? members.length;

  const q = query.trim().toLowerCase();
  const filteredMembers = q
    ? members.filter((m) => {
        const fullName = `${m.firstName} ${m.lastName}`.trim().toLowerCase();
        return (
          fullName.includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
        );
      })
    : members;

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({
        memberId,
        role: newRole as "OWNER" | "ADMIN" | "MEMBER",
      });
      toast.success(t("toast.roleUpdated"));
    } catch (error) {
      logger.error({ error }, "Role change error");
      toast.error(t("toast.roleUpdateFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <div>
            <h2 className="title-section flex items-center gap-2">
              {t("org.members")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    aria-label={t("org.roleHelp")}
                  >
                    <Info className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-2 max-w-xs">
                    <p className="font-medium text-sm">
                      {t("org.roleHelpTitle")}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium text-foreground">
                          {roleLabels["OWNER"] ?? t("org.roleOwner")}
                        </span>
                        {" — "}
                        {t("org.roleDescOwner")}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          {roleLabels["ADMIN"] ?? t("org.roleAdmin")}
                        </span>
                        {" — "}
                        {t("org.roleDescOrgAdmin")}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          {roleLabels["MEMBER"] ?? t("org.roleMember")}
                        </span>
                        {" — "}
                        {t("org.roleDescOrgMember")}
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("org.membersCount", { count: total })}
            </p>
          </div>
          {isOrgAdmin && (
            <Button size="sm" onClick={onInviteClick} className="rounded-none">
              {t("org.invite")}
            </Button>
          )}
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  {query.trim()
                    ? t("org.searchResults", {
                        shown: filteredMembers.length,
                        total: members.length,
                      })
                    : null}
                </div>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("org.searchPlaceholder")}
                  className="w-full sm:w-72"
                />
              </div>

              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isOrgAdmin={isOrgAdmin}
                    roleLabels={roleLabels}
                    isRoleUpdating={updateRoleMutation.isPending}
                    onRoleChange={(role) => handleRoleChange(member.id, role)}
                    onManageWorkspaces={() =>
                      setManageWsMember({
                        id: member.id,
                        userId: member.userId,
                        firstName: member.firstName,
                        lastName: member.lastName,
                      })
                    }
                    onRemove={() =>
                      onRemoveMember({ id: member.id, email: member.email })
                    }
                  />
                ))}
              </div>
              {total > pageSize && (
                <PaginationControls
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="members"
                />
              )}
            </>
          )}
        </div>
      </div>

      <MemberWorkspacesDialog
        open={manageWsMember !== null}
        onOpenChange={(open) => {
          if (!open) setManageWsMember(null);
        }}
        member={manageWsMember}
      />
    </>
  );
}

/**
 * A single row in the members list. Extracted inline because the
 * role-picker / badge / action cluster is ~80 lines on its own and
 * repeats three-deep inside the map if inlined.
 */
function MemberRow({
  member,
  isOrgAdmin,
  roleLabels,
  isRoleUpdating,
  onRoleChange,
  onManageWorkspaces,
  onRemove,
}: {
  member: OrgMember;
  isOrgAdmin: boolean;
  roleLabels: Record<string, string>;
  isRoleUpdating: boolean;
  onRoleChange: (role: string) => void;
  onManageWorkspaces: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("profile");
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  const canMutate = isOrgAdmin && member.role !== "OWNER";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex items-center justify-center h-8 w-8 rounded-full bg-muted shrink-0 overflow-hidden"
          aria-hidden="true"
        >
          {member.image ? (
            <img
              src={member.image}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <PixelUser className="h-4 w-auto shrink-0 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{fullName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
            <PixelEmail className="h-3 w-auto shrink-0" aria-hidden="true" />
            <span className="truncate">{member.email}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canMutate ? (
          <Select
            value={member.role}
            onValueChange={onRoleChange}
            disabled={isRoleUpdating}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={getRoleBadgeVariant()}>
                {roleLabels[member.role]}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {member.role === "OWNER"
                ? t("org.roleDescOwner")
                : t("org.roleDescOrgMember")}
            </TooltipContent>
          </Tooltip>
        )}

        {canMutate && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={onManageWorkspaces}
              aria-label={`${t("org.workspaces")}: ${fullName}`}
            >
              <PixelSettings
                className="h-3.5 w-auto shrink-0"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{t("org.workspaces")}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
              aria-label={`${t("org.remove")}: ${fullName}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
