import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import {
  IconCheck,
  IconChevron,
  IconChevronRight,
  IconGrid,
  IconLock,
  IconPlus,
  IconSettings,
  IconStar,
  IconUser,
} from "@/components/ui/icons";
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
import { SESSION_TOAST_KEY, useSessionToast } from "@/hooks/ui/useSessionToast";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { CreateWorkspaceForm } from "./CreateWorkspaceForm";
import { BreadcrumbSkeleton } from "./skeletons/SidebarSkeletons";

// Ports the prototype `.crumb__seg`: borderless path segment, surface tint on
// hover/open, chevron rotates 180° when its popover is open.
const SEGMENT_TRIGGER =
  "group/seg inline-flex w-max shrink-0 items-center gap-[7px] rounded-md border border-transparent px-2 py-[5px] text-[13.5px] font-medium text-foreground transition-colors hover:bg-accent data-[state=open]:border-border data-[state=open]:bg-accent focus-visible:outline-none disabled:opacity-60";

const MENU_HEADING =
  "px-2.5 pb-1 pt-1.5 font-mono text-[9.5px] uppercase tracking-[0.09em] text-muted-foreground";

const SEGMENT_CHEV =
  "h-3 w-auto shrink-0 text-muted-foreground transition-transform group-data-[state=open]/seg:rotate-180";

/** Square gradient-free carrot avatar with the org initial (prototype `.crumb__avatar`). */
function OrgAvatar({ initial }: { initial: string }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] bg-primary font-heading text-[10.5px] font-semibold text-primary-foreground">
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
  const { canCreateWorkspace } = useUser();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();

  const [orgOpen, setOrgOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
      setShowUpgradeModal(true);
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
      <IconStar size={12} className="text-primary" />
    ) : (
      <IconUser size={12} className="text-muted-foreground" />
    );

  const getRoleLabel = (ws: WorkspaceInfo) =>
    ws.isOwner ? t("owner") : ws.userRole || t("member");

  if (isLoading) {
    return <BreadcrumbSkeleton />;
  }

  const orgInitial = currentOrg?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <nav
      className="flex min-w-0 items-center gap-[3px]"
      aria-label={t("contextNav")}
    >
      {/* Organization segment — always a dropdown (even single-org): the menu
          carries Create-organization + Organization-settings actions, so it's
          never a useless single-item switcher. */}
      {currentOrg && (
        <Popover open={orgOpen} onOpenChange={setOrgOpen}>
          <PopoverTrigger
            className={`${SEGMENT_TRIGGER} hidden sm:inline-flex`}
            aria-label={t("switchOrganization")}
            disabled={switchWorkspaceMutation.isPending}
          >
            <OrgAvatar initial={orgInitial} />
            <span className="max-w-[160px] truncate">{currentOrg.name}</span>
            <IconChevron size={14} className={SEGMENT_CHEV} />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[280px] min-w-[240px] p-1.5"
          >
            <div className={MENU_HEADING}>{t("organizations")}</div>
            <div className="max-h-[320px] overflow-y-auto">
              {organizations.map((org) => {
                const selected = org.id === currentOrg.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleOrgSwitch(org.id)}
                    role="option"
                    aria-selected={selected}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent ${
                      selected ? "bg-accent" : ""
                    }`}
                  >
                    <OrgAvatar initial={org.name.charAt(0).toUpperCase()} />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {org.name}
                    </span>
                    <IconCheck
                      size={15}
                      className={`ml-auto shrink-0 ${
                        selected ? "text-primary" : "text-transparent"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="mx-1 my-1.5 h-px bg-border" />
            <button
              type="button"
              onClick={() => goTo("/settings/organization")}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              <IconPlus size={15} className="text-muted-foreground" />
              {t("createOrganization")}
            </button>
            <button
              type="button"
              onClick={() => goTo("/settings/organization")}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-accent"
            >
              <IconSettings size={15} className="text-muted-foreground" />
              {t("settings")}
            </button>
          </PopoverContent>
        </Popover>
      )}

      <span
        className="hidden shrink-0 text-muted-foreground/55 sm:inline-flex"
        aria-hidden="true"
      >
        <IconChevronRight size={14} />
      </span>

      {/* Workspace segment */}
      <Popover open={wsOpen} onOpenChange={setWsOpen}>
        <PopoverTrigger
          className={SEGMENT_TRIGGER}
          aria-label={t("switchWorkspace")}
          disabled={switchWorkspaceMutation.isPending}
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] bg-accent text-muted-foreground">
            <IconGrid size={13} />
          </span>
          <span className="max-w-[180px] truncate">
            {currentWorkspace?.name || workspace?.name}
          </span>
          <IconChevron size={14} className={SEGMENT_CHEV} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] min-w-[240px] p-1.5">
          <div className={MENU_HEADING}>{t("workspaces")}</div>
          <div className="max-h-[320px] overflow-y-auto">
            {currentOrgWorkspaces.map((ws) => {
              const selected = ws.id === workspace?.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => handleWorkspaceSwitch(ws.id)}
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent ${
                    selected ? "bg-accent" : ""
                  }`}
                >
                  <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md bg-accent text-muted-foreground">
                    <IconGrid size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {ws.name}
                    </span>
                    <span className="flex items-center gap-1.5 truncate font-mono text-[10.5px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {getRoleIcon(ws)}
                        {getRoleLabel(ws)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{t("members", { count: ws._count.members })}</span>
                    </span>
                  </span>
                  <IconCheck
                    size={15}
                    className={`ml-auto shrink-0 ${
                      selected ? "text-primary" : "text-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <div className="mx-1 my-1.5 h-px bg-border" />
          <button
            type="button"
            onClick={handleCreateWorkspace}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
          >
            {canCreateWorkspace ? (
              <IconPlus size={15} className="text-muted-foreground" />
            ) : (
              <IconLock size={15} className="text-muted-foreground" />
            )}
            <span
              className={`flex-1 font-medium ${
                canCreateWorkspace
                  ? "text-foreground/80"
                  : "text-muted-foreground/60"
              }`}
            >
              {t("createNewWorkspace")}
            </span>
            {!canCreateWorkspace && (
              <span className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-1.5 py-px font-mono text-[9.5px] text-primary">
                {t("developerPlus")}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => goTo("/settings/workspace")}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-accent"
          >
            <IconSettings size={15} className="text-muted-foreground" />
            {t("settings")}
          </button>
        </PopoverContent>
      </Popover>

      {canCreateWorkspace && (
        <CreateWorkspaceForm
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="workspace_creation"
      />
    </nav>
  );
}
