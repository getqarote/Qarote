import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { Building2, Carrot, ChevronDown, Lock, Plus, User } from "lucide-react";
import { toast } from "sonner";

import { getUpgradePath } from "@/lib/featureFlags";
import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";

import {
  useSwitchWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { UserPlan } from "@/types/plans";

import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

export function WorkspaceSelector() {
  const { t } = useTranslation("sidebar");
  const { canCreateWorkspace, userPlan } = useUser();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all user workspaces
  const { data: workspacesData, isLoading } = useUserWorkspaces();

  // Switch workspace mutation
  const switchWorkspaceMutation = useSwitchWorkspace();

  // Handle success/error
  useEffect(() => {
    if (switchWorkspaceMutation.isSuccess) {
      // Invalidate all workspace-related queries
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["current-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["plan"] });

      toast.success(t("workspaceSwitched"));

      // Refresh the page to ensure all components reload with new workspace context
      window.location.reload();
    }
    if (switchWorkspaceMutation.isError) {
      logger.error(
        "Failed to switch workspace:",
        switchWorkspaceMutation.error
      );
      toast.error(t("workspaceSwitchFailed"));
    }
  }, [
    switchWorkspaceMutation.isSuccess,
    switchWorkspaceMutation.isError,
    switchWorkspaceMutation.error,
    queryClient,
  ]);

  const workspaces = workspacesData?.workspaces || [];
  type WorkspaceInfo = (typeof workspaces)[number];

  const currentWorkspace =
    workspaces.find((w) => w.id === workspace?.id) || workspaces[0];

  // Group workspaces by organization
  const groupedWorkspaces = workspaces.reduce<
    Map<string, { orgName: string; workspaces: WorkspaceInfo[] }>
  >((groups, ws) => {
    const org = ws.organization as
      | { id: string; name: string; slug: string }
      | undefined;
    const orgId = org?.id ?? "ungrouped";
    const orgName = org?.name ?? "";
    if (!groups.has(orgId)) {
      groups.set(orgId, { orgName, workspaces: [] });
    }
    groups.get(orgId)!.workspaces.push(ws);
    return groups;
  }, new Map());
  const orgGroups = Array.from(groupedWorkspaces.entries());
  const hasMultipleOrgs = orgGroups.length > 1;

  const handleWorkspaceSwitch = (workspaceId: string) => {
    if (workspaceId === workspace?.id) {
      setIsOpen(false);
      return;
    }

    switchWorkspaceMutation.mutate({ workspaceId });
    setIsOpen(false);
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    if (canCreateWorkspace) {
      setShowCreateModal(true);
    } else {
      // Navigate to upgrade/license page
      navigate(getUpgradePath());
    }
  };

  const getCreateWorkspaceButtonConfig = () => {
    if (canCreateWorkspace) return null;

    switch (userPlan) {
      case UserPlan.FREE:
        return {
          text: t("createNewWorkspace"),
          badge: t("upgrade"),
          badgeColor: "bg-orange-500",
          title: t("upgradeToCreate"),
        };
      case UserPlan.DEVELOPER:
        return {
          text: t("createNewWorkspace"),
          badge: t("upgrade"),
          badgeColor: "bg-blue-500",
          title: t("multipleWorkspacesDeveloper"),
        };
      case UserPlan.ENTERPRISE:
        return {
          text: t("createNewWorkspace"),
          badge: t("upgrade"),
          badgeColor: "bg-purple-500",
          title: t("multipleWorkspacesEnterprise"),
        };
      default:
        return {
          text: t("createNewWorkspace"),
          badge: t("upgrade"),
          badgeColor: "bg-orange-500",
          title: t("upgradeToCreate"),
        };
    }
  };

  const getRoleIcon = (workspace: WorkspaceInfo) => {
    if (workspace.isOwner) {
      return <Carrot className="w-3 h-3 text-orange-500" />;
    }
    return <User className="w-3 h-3 text-muted-foreground" />;
  };

  const getRoleLabel = (workspace: WorkspaceInfo) => {
    return workspace.isOwner ? t("owner") : workspace.userRole || t("member");
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 px-3 justify-between min-w-[200px] max-w-[300px] border border-border bg-background hover:bg-accent"
            disabled={switchWorkspaceMutation.isPending}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate font-medium text-foreground">
                {currentWorkspace?.name || workspace?.name}
              </span>
              {currentWorkspace && (
                <div className="flex items-center gap-1 shrink-0">
                  {getRoleIcon(currentWorkspace)}
                </div>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("switchWorkspace")}
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {isLoading ? (
            <DropdownMenuItem disabled>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin"></div>
                {t("loadingWorkspaces")}
              </div>
            </DropdownMenuItem>
          ) : (
            <>
              {orgGroups.map(([orgId, group], groupIdx) => (
                <div key={orgId}>
                  {hasMultipleOrgs && group.orgName && (
                    <>
                      {groupIdx > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
                        {group.orgName}
                      </DropdownMenuLabel>
                    </>
                  )}
                  {group.workspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => handleWorkspaceSwitch(ws.id)}
                      className={`p-3 cursor-pointer ${
                        ws.id === workspace?.id
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 min-w-0">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {ws.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                {getRoleIcon(ws)}
                                {getRoleLabel(ws)}
                              </span>
                              <span>•</span>
                              <span>
                                {t("servers", { count: ws._count.servers })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ws.id === workspace?.id && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleCreateWorkspace}
                className={`p-3 ${canCreateWorkspace ? "cursor-pointer" : "cursor-pointer opacity-60"}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    {canCreateWorkspace ? (
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground/60" />
                    )}
                    <span
                      className={`font-medium ${
                        canCreateWorkspace
                          ? "text-foreground"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {t("createNewWorkspace")}
                    </span>
                  </div>
                  {!canCreateWorkspace &&
                    (() => {
                      const buttonConfig = getCreateWorkspaceButtonConfig();
                      return buttonConfig ? (
                        <span
                          className={`px-1.5 py-0.5 ${buttonConfig.badgeColor} text-white text-[10px] rounded-full font-semibold`}
                        >
                          {buttonConfig.badge}
                        </span>
                      ) : null;
                    })()}
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Modal */}
      {canCreateWorkspace && (
        <CreateWorkspaceForm
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
