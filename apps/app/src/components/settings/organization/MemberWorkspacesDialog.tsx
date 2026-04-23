import { useTranslation } from "react-i18next";

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
import { Skeleton } from "@/components/ui/skeleton";

import {
  useAssignToWorkspace,
  useGetMemberWorkspaces,
  useOrgWorkspaces,
  useRemoveFromWorkspace,
  useUpdateWorkspaceRole,
} from "@/hooks/queries/useOrganization";

import { type WsRole } from "./roleUi";
import { WorkspaceRow } from "./WorkspaceRow";

interface MemberWorkspacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Dialog for managing which workspaces a member belongs to, and their
 * role in each. Shows the full list of org workspaces and marks the
 * ones the member is currently assigned to, with inline role editing.
 *
 * The dialog owns the mutations (assign / remove / update role) so the
 * parent doesn't have to coordinate them. The parent only supplies
 * which member is being managed — when null, the dialog renders
 * closed.
 */
export function MemberWorkspacesDialog({
  open,
  onOpenChange,
  member,
}: MemberWorkspacesDialogProps) {
  const { t } = useTranslation("profile");

  const { data: wsData, isLoading: wsLoading } = useOrgWorkspaces();
  const { data: memberWsData, isLoading: memberWsLoading } =
    useGetMemberWorkspaces(open && member ? member.userId : undefined);
  const assignMutation = useAssignToWorkspace();
  const removeMutation = useRemoveFromWorkspace();
  const updateRoleMutation = useUpdateWorkspaceRole();

  const workspaces = wsData?.workspaces ?? [];
  const memberships = memberWsData?.memberships ?? [];

  // workspaceId -> current role lookup, built once per render
  const currentMap = new Map<string, WsRole>(
    memberships.map((m) => [m.workspaceId, m.role as WsRole])
  );

  const handleToggle = async (wsId: string) => {
    if (!member) return;
    if (currentMap.has(wsId)) {
      try {
        await removeMutation.mutateAsync({
          userId: member.userId,
          workspaceId: wsId,
        });
        toast.success(t("org.toast.removedFromWs"));
      } catch (error) {
        logger.error({ error }, "Remove from workspace error");
        toast.error(
          error instanceof Error
            ? error.message
            : t("org.toast.removedFromWsFailed")
        );
      }
    } else {
      try {
        await assignMutation.mutateAsync({
          userId: member.userId,
          workspaceId: wsId,
          role: "MEMBER",
        });
        toast.success(t("org.toast.assignedToWs"));
      } catch (error) {
        logger.error({ error }, "Assign to workspace error");
        toast.error(
          error instanceof Error
            ? error.message
            : t("org.toast.assignedToWsFailed")
        );
      }
    }
  };

  const handleRoleChange = async (wsId: string, newRole: WsRole) => {
    if (!member) return;
    try {
      await updateRoleMutation.mutateAsync({
        userId: member.userId,
        workspaceId: wsId,
        role: newRole,
      });
      toast.success(t("org.toast.wsRoleUpdated"));
    } catch (error) {
      logger.error({ error }, "Role change error");
      toast.error(
        error instanceof Error
          ? error.message
          : t("org.toast.wsRoleUpdateFailed")
      );
    }
  };

  const loading = wsLoading || memberWsLoading;
  const mutating =
    assignMutation.isPending ||
    removeMutation.isPending ||
    updateRoleMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("org.manageWorkspacesTitle")}</DialogTitle>
          {member && (
            <DialogDescription>
              {t("org.manageWorkspacesDesc", {
                name: `${member.firstName} ${member.lastName}`,
              })}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-2 py-4 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("org.noWorkspacesInOrg")}
            </p>
          ) : (
            workspaces.map((ws) => (
              <WorkspaceRow
                key={ws.id}
                workspace={ws}
                selected={currentMap.has(ws.id)}
                role={currentMap.get(ws.id) ?? "MEMBER"}
                onToggle={() => handleToggle(ws.id)}
                onRoleChange={(r) => handleRoleChange(ws.id, r)}
                disabled={mutating}
              />
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("org.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
