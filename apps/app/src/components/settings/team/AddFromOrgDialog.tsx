import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Loader2, User } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useAssignToWorkspace,
  useOrgMembersNotInWorkspace,
} from "@/hooks/queries/useOrganization";

import { extractErrorMessage } from "../../../pages/settings/utils";

interface AddFromOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  /**
   * Seat-limit check from the caller. When it returns false, the
   * caller's plan doesn't have room for more members, so the dialog
   * surfaces an error toast instead of calling the mutation.
   */
  canInviteMoreUsers: () => boolean;
  onSeatLimitReached: () => void;
}

type AssignRole = "ADMIN" | "MEMBER" | "READONLY";

/**
 * Dialog for adding existing org members (who aren't yet in this
 * workspace) to the current workspace. Fetches the eligible list on
 * open, shows avatars + names + emails, and lets the admin pick a
 * role + click "Add" per row.
 *
 * Owns the assign-to-workspace mutation and the per-row pending
 * state so the operator sees a spinner on exactly the row they
 * clicked rather than a global disabled state.
 */
export function AddFromOrgDialog({
  open,
  onOpenChange,
  workspaceId,
  canInviteMoreUsers,
  onSeatLimitReached,
}: AddFromOrgDialogProps) {
  const { t } = useTranslation("profile");

  const { data: orgMembersNotInWs, isLoading } =
    useOrgMembersNotInWorkspace(workspaceId);
  const assignMutation = useAssignToWorkspace();

  const [selectedRole, setSelectedRole] = useState<AssignRole>("MEMBER");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const availableMembers = orgMembersNotInWs?.members ?? [];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedRole("MEMBER");
    }
    onOpenChange(nextOpen);
  };

  const handleAdd = async (userId: string, name: string) => {
    if (!canInviteMoreUsers()) {
      onSeatLimitReached();
      return;
    }

    setPendingUserId(userId);
    try {
      await assignMutation.mutateAsync({
        userId,
        workspaceId,
        role: selectedRole,
      });
      toast.success(
        t("toast.userAdded", {
          name,
          defaultValue: `${name} added to workspace`,
        })
      );
    } catch (error) {
      logger.error("Add from org error:", error);
      toast.error(t("team.toast.addFailed"), {
        description: extractErrorMessage(error),
      });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("team.addFromOrgTitle")}</DialogTitle>
          <DialogDescription>
            {t("team.addFromOrgDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">
              {t("team.addFromOrgRole")}
            </span>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as AssignRole)}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{t("team.roleAdmin")}</SelectItem>
                <SelectItem value="MEMBER">{t("team.roleMember")}</SelectItem>
                <SelectItem value="READONLY">
                  {t("team.roleReadonly")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("team.addFromOrgAllHaveAccess")}
              </p>
            ) : (
              availableMembers.map((member) => {
                const displayName =
                  `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
                  member.email;
                return (
                  <MemberRow
                    key={member.userId}
                    avatarUrl={member.image ?? null}
                    displayName={displayName}
                    email={member.email}
                    isPending={pendingUserId === member.userId}
                    isDisabled={pendingUserId !== null}
                    onAdd={() => handleAdd(member.userId, displayName)}
                  />
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("team.addFromOrgDone")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  avatarUrl,
  displayName,
  email,
  isPending,
  isDisabled,
  onAdd,
}: {
  avatarUrl: string | null;
  displayName: string;
  email: string;
  isPending: boolean;
  isDisabled: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation("profile");

  return (
    <div className="flex items-center justify-between p-2 rounded-md border">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex items-center justify-center h-7 w-7 rounded-full bg-muted shrink-0 overflow-hidden"
          aria-hidden="true"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{displayName}</div>
          <div className="text-xs text-muted-foreground truncate">{email}</div>
        </div>
      </div>
      <Button
        size="sm"
        className="shrink-0"
        onClick={onAdd}
        disabled={isDisabled}
        aria-label={`${t("team.addFromOrgAdd")}: ${displayName}`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          t("team.addFromOrgAdd")
        )}
      </Button>
    </div>
  );
}
