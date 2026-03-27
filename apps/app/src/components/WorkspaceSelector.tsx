import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  Building2,
  Carrot,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  Plus,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
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

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useMyOrganizations } from "@/hooks/queries/useMyOrganizations";
import {
  useSwitchWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { UserPlan } from "@/types/plans";

import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

const TOAST_STORAGE_KEY = "toast";

/**
 * Read and display any pending toast stored in sessionStorage.
 * Used after page navigation (org/workspace switch) to show feedback.
 */
function useSessionToast() {
  useEffect(() => {
    const raw = sessionStorage.getItem(TOAST_STORAGE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(TOAST_STORAGE_KEY);
    try {
      const data = JSON.parse(raw) as {
        title: string;
        description?: string;
      };
      toast.success(data.title, {
        description: data.description,
      });
    } catch {
      // Malformed toast data -- ignore silently
    }
  }, []);
}

export function WorkspaceSelector() {
  const { t } = useTranslation("sidebar");
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { canCreateWorkspace, userPlan } = useUser();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Show any pending toast from a prior org/workspace switch
  useSessionToast();

  // Fetch all user workspaces
  const { data: workspacesData, isLoading: isLoadingWorkspaces } =
    useUserWorkspaces();

  // Fetch all user organizations
  const { data: orgsData, isLoading: isLoadingOrgs } = useMyOrganizations();

  // Switch workspace mutation
  const switchWorkspaceMutation = useSwitchWorkspace();

  const workspaces = workspacesData?.workspaces || [];
  const organizations = orgsData?.organizations || [];
  const isMultiOrg = organizations.length > 1;

  interface Organization {
    id: string;
    name: string;
    slug: string;
  }
  type WorkspaceInfo = (typeof workspaces)[number];

  const currentWorkspace =
    workspaces.find((w) => w.id === workspace?.id) || workspaces[0];

  // Determine the current org from the current workspace
  const currentOrg = currentWorkspace?.organization as Organization | undefined;

  // Workspaces filtered to the current organization
  const currentOrgWorkspaces = currentOrg
    ? workspaces.filter(
        (w) =>
          (w.organization as Organization | undefined)?.id === currentOrg.id
      )
    : workspaces;

  // ---- Handlers ----

  const handleWorkspaceSwitch = (workspaceId: string) => {
    if (workspaceId === workspace?.id) {
      setIsOpen(false);
      return;
    }

    switchWorkspaceMutation.mutate(
      { workspaceId },
      {
        onSuccess: () => {
          sessionStorage.setItem(
            TOAST_STORAGE_KEY,
            JSON.stringify({
              title: t("workspaceSwitched"),
            })
          );
          window.location.reload();
        },
        onError: (error) => {
          logger.error("Failed to switch workspace:", error);
          toast.error(t("workspaceSwitchFailed"));
        },
      }
    );
    setIsOpen(false);
  };

  const handleOrgSwitch = (orgId: string) => {
    if (orgId === currentOrg?.id) {
      setIsOpen(false);
      return;
    }

    // Find the first workspace in the target org
    const targetWorkspace = workspaces.find(
      (w) => (w.organization as Organization | undefined)?.id === orgId
    );

    if (!targetWorkspace) {
      toast.error(t("workspaceSwitchFailed"));
      setIsOpen(false);
      return;
    }

    const targetOrg = organizations.find((o) => o.id === orgId);

    switchWorkspaceMutation.mutate(
      { workspaceId: targetWorkspace.id },
      {
        onSuccess: () => {
          sessionStorage.setItem(
            TOAST_STORAGE_KEY,
            JSON.stringify({
              title: t("orgSwitched"),
              description: t("orgSwitchedDescription", {
                orgName: targetOrg?.name ?? "",
              }),
            })
          );
          window.location.href = "/";
        },
        onError: (error) => {
          logger.error("Failed to switch organization:", error);
          toast.error(t("workspaceSwitchFailed"));
        },
      }
    );
    setIsOpen(false);
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    if (canCreateWorkspace) {
      setShowCreateModal(true);
    } else {
      navigate(getUpgradePath());
    }
  };

  // ---- Helpers ----

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

  const getRoleIcon = (ws: WorkspaceInfo) => {
    if (ws.isOwner) {
      return <Carrot className="w-3 h-3 text-orange-500" />;
    }
    return <User className="w-3 h-3 text-muted-foreground" />;
  };

  const getRoleLabel = (ws: WorkspaceInfo) => {
    return ws.isOwner ? t("owner") : ws.userRole || t("member");
  };

  const getOrgRoleLabel = (role: string) => {
    switch (role) {
      case "OWNER":
        return t("owner");
      case "ADMIN":
        return t("admin");
      default:
        return t("member");
    }
  };

  const isLoading = isLoadingWorkspaces || isLoadingOrgs;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 px-3 justify-between min-w-[200px] max-w-[340px] border border-border bg-background hover:bg-accent"
            disabled={switchWorkspaceMutation.isPending}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              {currentOrg && (
                <>
                  <span className="truncate text-muted-foreground text-sm">
                    {currentOrg.name}
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                </>
              )}
              <span className="truncate font-medium text-foreground">
                {currentWorkspace?.name || workspace?.name}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[300px]">
          {isLoading ? (
            <DropdownMenuItem disabled>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                {t("loadingWorkspaces")}
              </div>
            </DropdownMenuItem>
          ) : (
            <>
              {/* Organizations section */}
              {organizations.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                    {t("organizations")}
                  </DropdownMenuLabel>

                  {organizations.map((org) => {
                    const isActive = org.id === currentOrg?.id;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleOrgSwitch(org.id)}
                        disabled={isActive && !isMultiOrg}
                        className={`p-3 cursor-pointer ${
                          isActive
                            ? "bg-primary/10 border-l-2 border-l-primary"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 min-w-0">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {org.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getOrgRoleLabel(org.role)}
                              </div>
                            </div>
                          </div>
                          {isActive && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}

                  <DropdownMenuSeparator />
                </>
              )}

              {/* Workspaces section (filtered to current org) */}
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                {t("workspaces")}
              </DropdownMenuLabel>

              {currentOrgWorkspaces.map((ws) => (
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
                          <span>-</span>
                          <span>
                            {t("servers", { count: ws._count.servers })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ws.id === workspace?.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}

              {/* Create workspace button */}
              {isAdmin && (
                <>
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
