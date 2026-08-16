import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Info, Loader2, MoreHorizontal, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { displayName, initials } from "@/lib/userDisplay";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";
import { IconUser } from "@/components/ui/icons";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useCancelOrgInvitation,
  useCurrentOrganization,
  useInviteOrgMember,
  useOrgMembers,
  useOrgWorkspaces,
  usePendingOrgInvitations,
  useUpdateOrgMemberRole,
} from "@/hooks/queries/useOrganization";

import { MemberRolePill } from "./MemberRolePill";
import { MemberWorkspacesDialog } from "./MemberWorkspacesDialog";
import { useRoleLabels } from "./roleUi";
import type { OrgMember, PendingOrgInvitation } from "./types";

interface OrgMembersCardProps {
  isOrgAdmin: boolean;
  onRemoveMember: (member: { id: string; email: string }) => void;
}

/**
 * Organization members (prototype): one row per member — avatar, name/email,
 * role pill, the workspaces they belong to, and a Manage menu (change role,
 * manage workspaces, remove). Below the list: an inline invite row and the
 * pending invitations. Owner rows are read-only (exactly one owner, can't be
 * demoted from here).
 */
export function OrgMembersCard({
  isOrgAdmin,
  onRemoveMember,
}: OrgMembersCardProps) {
  const { t } = useTranslation("profile");
  const roleLabels = useRoleLabels();
  const { data: orgData } = useCurrentOrganization();
  const orgName = orgData?.organization?.name ?? "";

  const { data, isLoading } = useOrgMembers({ page: 1, limit: 50 });
  const members = (data?.members ?? []) as OrgMember[];

  const updateRole = useUpdateOrgMemberRole();
  const [manageWs, setManageWs] = useState<{
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  // Invite
  const { data: wsData } = useOrgWorkspaces();
  const orgWorkspaces = wsData?.workspaces ?? [];
  const invite = useInviteOrgMember();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [inviteWs, setInviteWs] = useState("all");

  // Pending
  const { data: pendingData } = usePendingOrgInvitations({
    page: 1,
    limit: 50,
  });
  const pending = (pendingData?.invitations ?? []) as PendingOrgInvitation[];
  const cancelInvite = useCancelOrgInvitation();

  const handleRoleChange = (memberId: string, role: "ADMIN" | "MEMBER") => {
    updateRole.mutate(
      { memberId, role },
      {
        onSuccess: () => toast.success(t("toast.roleUpdated")),
        onError: (err) =>
          toast.error(t("toast.roleUpdateFailed"), {
            description: err instanceof Error ? err.message : undefined,
          }),
      }
    );
  };

  const handleInvite = async () => {
    if (!email.trim() || invite.isPending) return;
    try {
      const result = await invite.mutateAsync({
        email: email.trim(),
        role: inviteRole,
        workspaceAssignments:
          inviteWs === "all"
            ? []
            : [{ workspaceId: inviteWs, role: inviteRole }],
      });
      setEmail("");
      toast.success(
        result.emailSent
          ? t("org.toast.invitedToOrg", { email: result.invitation.email })
          : t("toast.invitationCreated", { email: result.invitation.email })
      );
    } catch (error) {
      logger.error({ error }, "Org invite error");
      toast.error(
        error instanceof Error ? error.message : t("org.toast.inviteFailed")
      );
    }
  };

  const handleCancel = (invitationId: string, inviteEmail: string) => {
    cancelInvite.mutate(
      { invitationId },
      {
        onSuccess: () =>
          toast.success(t("toast.invitationRevoked", { email: inviteEmail })),
        onError: (err) =>
          toast.error(err.message || t("org.toast.inviteFailed")),
      }
    );
  };

  const workspacesText = (m: OrgMember) =>
    m.role === "OWNER"
      ? t("org.allWorkspaces")
      : m.workspaces && m.workspaces.length > 0
        ? m.workspaces.join(", ")
        : "—";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {t("org.orgMembersTitle")}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground"
              aria-label={t("org.roleHelp")}
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p>
              <b>{roleLabels.OWNER}</b> — {t("org.roleDescOwner")}
            </p>
            <p>
              <b>{roleLabels.ADMIN}</b> — {t("org.roleDescOrgAdmin")}
            </p>
            <p>
              <b>{roleLabels.MEMBER}</b> — {t("org.roleDescOrgMember")}
            </p>
          </TooltipContent>
        </Tooltip>
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t("org.orgMembersSubtitle", { org: orgName })}
      </p>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="mt-4 border-t border-border">
          {members.map((m) => {
            const canManage = isOrgAdmin && m.role !== "OWNER";
            const fullName = displayName(m);
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 border-b border-border py-3.5"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={m.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {initials(m)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{fullName}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {m.email}
                  </div>
                </div>
                <MemberRolePill
                  role={m.role}
                  label={roleLabels[m.role] ?? m.role}
                />
                <div className="hidden w-44 shrink-0 text-right font-mono text-xs text-muted-foreground sm:block">
                  {workspacesText(m)}
                </div>
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0">
                        {t("org.manage")}
                        <MoreHorizontal
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>{t("org.orgRole")}</DropdownMenuLabel>
                      <DropdownMenuItem
                        disabled={m.role === "ADMIN" || updateRole.isPending}
                        onClick={() => handleRoleChange(m.id, "ADMIN")}
                      >
                        {roleLabels.ADMIN}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={m.role === "MEMBER" || updateRole.isPending}
                        onClick={() => handleRoleChange(m.id, "MEMBER")}
                      >
                        {roleLabels.MEMBER}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setManageWs({
                            id: m.id,
                            userId: m.userId,
                            firstName: m.firstName,
                            lastName: m.lastName,
                          })
                        }
                      >
                        {t("org.workspaces")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          onRemoveMember({ id: m.id, email: m.email })
                        }
                      >
                        {t("org.remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="w-px shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inline invite */}
      {isOrgAdmin && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="org-invite-email">{t("org.inviteByEmail")}</Label>
            <Input
              id="org-invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("org.inviteEmailPlaceholder")}
            />
          </div>
          <div className="space-y-1.5 sm:w-36">
            <Label>{t("org.inviteRole")}</Label>
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as "MEMBER" | "ADMIN")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">{roleLabels.MEMBER}</SelectItem>
                <SelectItem value="ADMIN">{roleLabels.ADMIN}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:w-44">
            <Label>{t("org.inviteWorkspaces")}</Label>
            <Select value={inviteWs} onValueChange={setInviteWs}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("org.allWorkspaces")}</SelectItem>
                {orgWorkspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleInvite}
            disabled={!email.trim() || invite.isPending}
          >
            {invite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {t("org.sendInvite")}
          </Button>
        </div>
      )}

      {/* Pending invitations */}
      {pending.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("org.pendingInvitations")}
          </p>
          <div className="mt-2 border-t border-border">
            {pending.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 border-b border-border py-3.5"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground"
                  aria-hidden="true"
                >
                  <IconUser className="h-4 w-auto shrink-0" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {inv.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("org.awaitingAcceptance")}
                  </div>
                </div>
                <MemberRolePill
                  role={inv.role}
                  label={roleLabels[inv.role] ?? inv.role}
                />
                {isOrgAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    disabled={cancelInvite.isPending}
                    onClick={() => handleCancel(inv.id, inv.email)}
                  >
                    {t("org.cancelInvite")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <MemberWorkspacesDialog
        open={manageWs !== null}
        onOpenChange={(open) => {
          if (!open) setManageWs(null);
        }}
        member={manageWs}
      />
    </div>
  );
}
