import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Carrot, User } from "lucide-react";
import { toast } from "sonner";

import { getUpgradePath } from "@/lib/featureFlags";
import { logger } from "@/lib/logger";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PixelCheck } from "@/components/ui/pixel-check";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useMyOrganizations } from "@/hooks/queries/useMyOrganizations";
import {
  useSwitchWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";
import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";
import { SESSION_TOAST_KEY, useSessionToast } from "@/hooks/ui/useSessionToast";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

const SEGMENT_TRIGGER =
  "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60";

const MENU_HEADING =
  "px-3 py-2 text-xs uppercase tracking-wider font-medium text-muted-foreground";

function OrgAvatar({ initial }: { initial: string }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[0.625rem] font-semibold text-primary">
      {initial}
    </span>
  );
}

/**
 * Organization › Workspace as a peer breadcrumb path in the app bar. Org and
 * workspace are sibling switchers (not nested) — switching org moves you to
 * its first workspace, switching workspace stays within the current org. A
 * single-org account renders the org as a plain (non-interactive) segment.
 *
 * Replaces the former combined two-panel WorkspaceSelector popover; the
 * underlying queries and switch mutations are unchanged.
 */
export function ContextBreadcrumb() {
  const { t } = useTranslation("sidebar");
  const isAdmin = useIsWorkspaceAdmin() === true;
  const { canCreateWorkspace } = useUser();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();

  const [orgOpen, setOrgOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useSessionToast();

  const { data: workspacesData, isLoading: isLoadingWorkspaces } =
    useUserWorkspaces();
  const { data: orgsData, isLoading: isLoadingOrgs } = useMyOrganizations();
  const switchWorkspaceMutation = useSwitchWorkspace();

  const workspaces = workspacesData?.workspaces || [];
  const organizations = orgsData?.organizations || [];

  type WorkspaceInfo = (typeof workspaces)[number];

  const currentWorkspace =
    workspaces.find((w) => w.id === workspace?.id) || workspaces[0];
  const currentOrg = currentWorkspace?.organization ?? undefined;
  const currentOrgWorkspaces = currentOrg
    ? workspaces.filter((w) => w.organization?.id === currentOrg.id)
    : workspaces;

  const isLoading = isLoadingWorkspaces || isLoadingOrgs;
  const isMultiOrg = organizations.length > 1;

  // ---- Handlers ----

  const handleWorkspaceSwitch = (workspaceId: string) => {
    setWsOpen(false);
    if (workspaceId === workspace?.id) return;

    switchWorkspaceMutation.mutate(
      { workspaceId },
      {
        onSuccess: () => {
          sessionStorage.setItem(
            SESSION_TOAST_KEY,
            JSON.stringify({ title: t("workspaceSwitched") })
          );
          window.location.reload();
        },
        onError: (error) => {
          logger.error("Failed to switch workspace:", error);
          toast.error(t("workspaceSwitchFailed"));
        },
      }
    );
  };

  const handleOrgSwitch = (orgId: string) => {
    setOrgOpen(false);
    if (orgId === currentOrg?.id) return;

    const targetWorkspace = workspaces.find(
      (w) => w.organization?.id === orgId
    );
    if (!targetWorkspace) {
      toast.error(t("noWorkspaceInOrg"));
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
  };

  const handleCreateWorkspace = () => {
    setWsOpen(false);
    if (canCreateWorkspace) {
      setShowCreateModal(true);
    } else {
      navigate(getUpgradePath());
    }
  };

  const goTo = (path: string) => {
    setOrgOpen(false);
    setWsOpen(false);
    navigate(path);
  };

  // ---- Helpers ----

  const getRoleIcon = (ws: WorkspaceInfo) =>
    ws.isOwner ? (
      <Carrot className="w-3 h-3 text-primary" />
    ) : (
      <User className="w-3 h-3 text-muted-foreground" />
    );

  const getRoleLabel = (ws: WorkspaceInfo) =>
    ws.isOwner ? t("owner") : ws.userRole || t("member");

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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2" aria-busy="true">
        <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
        <PixelChevronDown className="h-3 w-auto text-muted-foreground/40 rotate-[-90deg]" />
        <div className="h-6 w-28 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  const orgInitial = currentOrg?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1 sm:gap-1.5">
        {/* Organization segment */}
        <BreadcrumbItem>
          {currentOrg && isMultiOrg ? (
            <Popover open={orgOpen} onOpenChange={setOrgOpen}>
              <PopoverTrigger
                className={SEGMENT_TRIGGER}
                aria-label={t("switchOrganization")}
                disabled={switchWorkspaceMutation.isPending}
              >
                <OrgAvatar initial={orgInitial} />
                <span className="max-w-[160px] truncate font-medium text-foreground">
                  {currentOrg.name}
                </span>
                <PixelChevronDown className="h-3 w-auto shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[280px] p-0">
                <div className={MENU_HEADING}>{t("organizations")}</div>
                <div className="max-h-[320px] overflow-y-auto pb-1">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleOrgSwitch(org.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {org.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getOrgRoleLabel(org.role)}
                        </div>
                      </div>
                      {org.id === currentOrg.id && (
                        <PixelCheck className="h-2.5 shrink-0 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border" />
                <button
                  type="button"
                  onClick={() => goTo("/settings/organization")}
                  className="w-full px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {t("settings")}
                </button>
              </PopoverContent>
            </Popover>
          ) : (
            currentOrg && (
              <span
                className="flex items-center gap-1.5 px-2 py-1 text-sm"
                aria-label={t("switchOrganization")}
              >
                <OrgAvatar initial={orgInitial} />
                <span className="max-w-[160px] truncate font-medium text-foreground">
                  {currentOrg.name}
                </span>
              </span>
            )
          )}
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        {/* Workspace segment */}
        <BreadcrumbItem>
          <Popover open={wsOpen} onOpenChange={setWsOpen}>
            <PopoverTrigger
              className={SEGMENT_TRIGGER}
              aria-label={t("switchWorkspace")}
              disabled={switchWorkspaceMutation.isPending}
            >
              <span className="max-w-[180px] truncate font-medium text-foreground">
                {currentWorkspace?.name || workspace?.name}
              </span>
              <PixelChevronDown className="h-3 w-auto shrink-0 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[300px] p-0">
              <div className={MENU_HEADING}>{t("workspaces")}</div>
              <div className="max-h-[320px] overflow-y-auto pb-1">
                {currentOrgWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => handleWorkspaceSwitch(ws.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">
                        {ws.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {getRoleIcon(ws)}
                          {getRoleLabel(ws)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {t("servers", { count: ws._count.servers })}
                        </span>
                      </div>
                    </div>
                    {ws.id === workspace?.id && (
                      <PixelCheck className="h-2.5 shrink-0 text-green-500" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-border" />
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleCreateWorkspace}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className={`font-medium ${
                      canCreateWorkspace
                        ? "text-foreground"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {t("createNewWorkspace")}
                  </span>
                  {!canCreateWorkspace && (
                    <span className="rounded-full bg-warning-muted px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground">
                      {t("upgrade")}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => goTo("/settings/workspace")}
                className="w-full px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t("settings")}
              </button>
            </PopoverContent>
          </Popover>
        </BreadcrumbItem>
      </BreadcrumbList>

      {canCreateWorkspace && (
        <CreateWorkspaceForm
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </Breadcrumb>
  );
}
