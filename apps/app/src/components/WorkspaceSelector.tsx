import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Carrot, ChevronLeft, User } from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { getUpgradePath } from "@/lib/featureFlags";
import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import { PixelCheck } from "@/components/ui/pixel-check";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";
import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useMyOrganizations } from "@/hooks/queries/useMyOrganizations";
import {
  useSwitchWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";
import { SESSION_TOAST_KEY, useSessionToast } from "@/hooks/ui/useSessionToast";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { UserPlan } from "@/types/plans";

import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

export function WorkspaceSelector() {
  const { t } = useTranslation("sidebar");
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { canCreateWorkspace, userPlan } = useUser();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState<"workspaces" | "organizations">(
    "workspaces"
  );

  // Refs for focus management during panel transitions
  const orgHeaderRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus to the new panel's entry point after the CSS transition
  useEffect(() => {
    const target = view === "organizations" ? backButtonRef : orgHeaderRef;
    // Wait for the 200ms translateX transition to complete
    const timer = setTimeout(() => target.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, [view]);

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

  type WorkspaceInfo = (typeof workspaces)[number];

  const currentWorkspace =
    workspaces.find((w) => w.id === workspace?.id) || workspaces[0];

  // Determine the current org from the current workspace
  const currentOrg = currentWorkspace?.organization ?? undefined;

  // Workspaces filtered to the current organization
  const currentOrgWorkspaces = currentOrg
    ? workspaces.filter((w) => w.organization?.id === currentOrg.id)
    : workspaces;

  // ---- Handlers ----

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setView("workspaces");
    }
  };

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
            SESSION_TOAST_KEY,
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
      (w) => w.organization?.id === orgId
    );

    if (!targetWorkspace) {
      toast.error(t("noWorkspaceInOrg"));
      setIsOpen(false);
      return;
    }

    const targetOrg = organizations.find((o) => o.id === orgId);

    switchWorkspaceMutation.mutate(
      { workspaceId: targetWorkspace.id },
      {
        onSuccess: () => {
          sessionStorage.setItem(
            SESSION_TOAST_KEY,
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

  const getCreateWorkspaceButtonConfig = (): {
    badge: string;
    badgeColor: string;
    badgeTextColor: string;
  } | null => {
    if (canCreateWorkspace) return null;

    switch (userPlan) {
      case UserPlan.FREE:
        return {
          badge: t("upgrade"),
          badgeColor: "bg-warning-muted",
          badgeTextColor: "text-warning-foreground",
        };
      case UserPlan.DEVELOPER:
        return {
          badge: t("upgrade"),
          badgeColor: "bg-info-muted",
          badgeTextColor: "text-info-foreground",
        };
      case UserPlan.ENTERPRISE:
        return {
          badge: t("upgrade"),
          badgeColor: "bg-muted",
          badgeTextColor: "text-muted-foreground",
        };
      default:
        return {
          badge: t("upgrade"),
          badgeColor: "bg-warning-muted",
          badgeTextColor: "text-warning-foreground",
        };
    }
  };

  const getRoleIcon = (ws: WorkspaceInfo) => {
    if (ws.isOwner) {
      // Carrot is the brand mascot — owner role uses brand color, not warning.
      return <Carrot className="w-3 h-3 text-primary" />;
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

  // Derived values — computed once, not inline in JSX
  const currentOrgRole = getOrgRoleLabel(
    organizations.find((o) => o.id === currentOrg?.id)?.role ?? "MEMBER"
  );
  const createConfig = isAdmin ? getCreateWorkspaceButtonConfig() : null;

  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 px-3 justify-between min-w-[200px] max-w-[480px] border border-border bg-background hover:bg-accent"
            disabled={switchWorkspaceMutation.isPending}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {currentOrg && (
                <>
                  <span className="max-w-[180px] truncate text-muted-foreground text-sm">
                    {currentOrg.name}
                  </span>
                  <PixelChevronRight className="h-3 w-auto shrink-0 text-muted-foreground/60" />
                </>
              )}
              <span className="flex-1 truncate font-medium text-foreground">
                {currentWorkspace?.name || workspace?.name}
              </span>
            </div>
            <PixelChevronDown className="h-4 w-auto shrink-0 text-muted-foreground ml-2" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[300px] p-0">
          {isLoading ? (
            <div className="flex items-center gap-2 p-3">
              <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
              {t("loadingWorkspaces")}
            </div>
          ) : (
            <div className="overflow-hidden">
              <div
                className={`flex transition-transform duration-200 ease-in-out ${
                  view === "organizations"
                    ? "-translate-x-full"
                    : "translate-x-0"
                }`}
              >
                {/* Workspace panel */}
                <div className="w-full shrink-0">
                  <div className="max-h-[400px] overflow-y-auto">
                    {/* Current organization header (clickable) */}
                    {currentOrg && (
                      <button
                        ref={orgHeaderRef}
                        type="button"
                        className="w-full px-3 py-2.5 border-b border-border hover:bg-accent transition-colors text-left"
                        onClick={() => setView("organizations")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground text-sm truncate">
                                {currentOrg.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {currentOrgRole}
                              </div>
                            </div>
                          </div>
                          <PixelChevronRight className="h-4 w-auto shrink-0 text-muted-foreground" />
                        </div>
                      </button>
                    )}

                    {/* Workspaces list */}
                    <div className="px-3 py-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        {t("workspaces")}
                      </span>
                    </div>

                    {currentOrgWorkspaces.map((ws) => (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => handleWorkspaceSwitch(ws.id)}
                        className={`w-full text-left p-3 rounded-md cursor-pointer transition-colors ${
                          ws.id === workspace?.id
                            ? "bg-accent hover:bg-accent"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 min-w-0">
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
                              <PixelCheck className="h-2.5 text-green-500" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}

                    <div className="border-t border-border my-1" />

                    {/* Create workspace button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleCreateWorkspace}
                        className={`w-full text-left p-3 hover:bg-accent rounded-md cursor-pointer transition-colors ${
                          !canCreateWorkspace ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
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
                          {createConfig && (
                            <span
                              className={`px-1.5 py-0.5 ${createConfig.badgeColor} ${createConfig.badgeTextColor} text-[10px] rounded-full font-semibold`}
                            >
                              {createConfig.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Organization panel */}
                <div className="w-full shrink-0">
                  <div className="max-h-[400px] overflow-y-auto">
                    {/* Back button */}
                    <button
                      ref={backButtonRef}
                      type="button"
                      className="w-full px-3 py-2.5 border-b border-border hover:bg-accent transition-colors text-left"
                      onClick={() => setView("workspaces")}
                    >
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ChevronLeft className="w-4 h-4" />
                        <span>{t("backToWorkspaces")}</span>
                      </div>
                    </button>

                    {/* Organizations list */}
                    <div className="px-3 py-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        {t("organizations")}
                      </span>
                    </div>

                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleOrgSwitch(org.id)}
                        className={`w-full text-left p-3 rounded-md cursor-pointer transition-colors ${
                          org.id === currentOrg?.id
                            ? "bg-accent hover:bg-accent"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {org.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getOrgRoleLabel(org.role)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {org.id === currentOrg?.id && (
                              <PixelCheck className="h-2.5 text-green-500" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

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
