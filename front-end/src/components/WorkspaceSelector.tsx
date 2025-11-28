import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Building2, ChevronDown, Crown, Lock, Plus, User } from "lucide-react";
import { toast } from "sonner";

import { apiClient, type WorkspaceInfo } from "@/lib/api";
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

import { useUser } from "@/hooks/useUser";
import { useWorkspace } from "@/hooks/useWorkspace";

import { UserPlan } from "@/types/plans";

import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

export function WorkspaceSelector() {
  const { canCreateWorkspace, userPlan } = useUser();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all user workspaces
  const { data: workspacesData, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiClient.getUserWorkspaces(),
    refetchOnWindowFocus: false,
  });

  // Switch workspace mutation
  const switchWorkspaceMutation = useMutation({
    mutationFn: (workspaceId: string) => apiClient.switchWorkspace(workspaceId),
    onSuccess: () => {
      // Invalidate all workspace-related queries
      // TODO: fix this shit - too many queries
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["current-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["plan"] });

      toast.success("Workspace switched successfully!");

      // Refresh the page to ensure all components reload with new workspace context
      window.location.reload();
    },
    onError: (error) => {
      logger.error("Failed to switch workspace:", error);
      toast.error("Failed to switch workspace. Please try again.");
    },
  });

  const workspaces = workspacesData?.workspaces || [];
  const currentWorkspace =
    workspaces.find((w) => w.id === workspace?.id) || workspaces[0];

  const handleWorkspaceSwitch = (workspaceId: string) => {
    if (workspaceId === workspace?.id) {
      setIsOpen(false);
      return;
    }

    switchWorkspaceMutation.mutate(workspaceId);
    setIsOpen(false);
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    if (canCreateWorkspace) {
      setShowCreateModal(true);
    } else {
      // Navigate to upgrade page or show upgrade modal
      navigate("/plans");
    }
  };

  const getCreateWorkspaceButtonConfig = () => {
    if (canCreateWorkspace) return null;

    switch (userPlan) {
      case UserPlan.FREE:
        return {
          text: "Create New Workspace",
          badge: "Upgrade",
          badgeColor: "bg-orange-500",
          title: "Upgrade to create multiple workspaces",
        };
      case UserPlan.DEVELOPER:
        return {
          text: "Create New Workspace",
          badge: "Upgrade",
          badgeColor: "bg-blue-500",
          title: "Multiple workspaces available with Developer plan",
        };
      case UserPlan.ENTERPRISE:
        return {
          text: "Create New Workspace",
          badge: "Upgrade",
          badgeColor: "bg-purple-500",
          title: "Multiple workspaces available with Enterprise plan",
        };
      default:
        return {
          text: "Create New Workspace",
          badge: "Upgrade",
          badgeColor: "bg-orange-500",
          title: "Upgrade to create multiple workspaces",
        };
    }
  };
  const getRoleIcon = (workspace: WorkspaceInfo) => {
    if (workspace.isOwner) {
      return <Crown className="w-3 h-3 text-yellow-600" />;
    }
    return <User className="w-3 h-3 text-muted-foreground" />;
  };

  const getRoleLabel = (workspace: WorkspaceInfo) => {
    return workspace.isOwner ? "Owner" : workspace.userRole || "Member";
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
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate font-medium text-foreground">
                {currentWorkspace?.name || workspace?.name}
              </span>
              {currentWorkspace && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getRoleIcon(currentWorkspace)}
                </div>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Switch Workspace
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {isLoading ? (
            <DropdownMenuItem disabled>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin"></div>
                Loading workspaces...
              </div>
            </DropdownMenuItem>
          ) : (
            <>
              {workspaces.map((ws) => (
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
                      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
                          <span>{ws._count.servers} servers</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ws.id === workspace?.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
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
                      Create New Workspace
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
