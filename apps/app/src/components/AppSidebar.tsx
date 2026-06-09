import { type ComponentType, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { Moon, Plus, Search, Sun } from "lucide-react";

import { commandKeyLabel } from "@/lib/shortcut";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { RequirePermission } from "@/components/rbac/RequirePermission";
import { ServerManagement } from "@/components/ServerManagement";
import { Button } from "@/components/ui/button";
import { PixelChart } from "@/components/ui/pixel-chart";
import { PixelFlag } from "@/components/ui/pixel-flag";
import { PixelHelp } from "@/components/ui/pixel-help";
import { PixelLayers } from "@/components/ui/pixel-layers";
import { PixelLogout } from "@/components/ui/pixel-logout";
import { PixelNetwork } from "@/components/ui/pixel-network";
import { PixelServer } from "@/components/ui/pixel-server";
import { PixelSettings } from "@/components/ui/pixel-settings";
import { PixelUser } from "@/components/ui/pixel-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CreateVHostModal } from "@/components/vhosts/CreateVHostModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useCommandPalette } from "@/contexts/CommandPaletteContext";
import { useServerContext } from "@/contexts/ServerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useDiagnosis } from "@/hooks/queries/useDiagnosis";
import { useOverview } from "@/hooks/queries/useRabbitMQ";
import { useServers } from "@/hooks/queries/useServer";
import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";
import { useLogout } from "@/hooks/ui/useAuth";
import { useUser } from "@/hooks/ui/useUser";

function ServerStatusDot({ serverId }: { serverId: string }) {
  const { data, isLoading, isError } = useOverview(serverId);
  if (isLoading)
    return (
      <span className="h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
    );
  if (isError || !data?.overview)
    return <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />;
  return <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />;
}

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type NavItem = {
  titleKey: string;
  url: string;
  icon: IconComponent;
  /**
   * When set, the item renders a live status badge. Currently only the
   * "diagnosis" source exists (active diagnosis findings for the selected
   * server) — surfaced on Notifications as the peripheral "something fired"
   * cue. The count source becomes the unified finding list once diagnostic
   * findings land in the Notifications worklist.
   */
  badge?: "diagnosis";
};

/**
 * The agent-first nav: three destinations only. Everything the agent can do
 * for itself (browse queues, inspect objects, admin CRUD) leaves the nav and
 * lives one ⌘K away (see docs/plans/agent-first-cockpit.md). What stays is
 * what the agent cannot do for itself: read its cockpit (Home), get paged
 * (Notifications), and see the map (Topology).
 *
 * The /diagnosis, /queues, /policies… routes still exist for deep-links and
 * Topology drill-down — they are just no longer surfaced in the nav.
 *
 * No plan / capability badges here on purpose: ADR-002 makes gating
 * multi-axis (Plan × License × Capability), and a static badge would lie
 * in 2 cases out of 3. The page's `<FeatureGate>` is the source of truth.
 */
const NAV_ITEMS: NavItem[] = [
  { titleKey: "sidebar:cockpit", url: "/", icon: PixelChart },
  {
    titleKey: "sidebar:notifications",
    url: "/alerts",
    icon: PixelFlag,
    badge: "diagnosis",
  },
  { titleKey: "sidebar:topology", url: "/topology", icon: PixelNetwork },
];

/**
 * Active diagnosis findings for the selected server, post cascade-collapse.
 * Returns `undefined` while loading / when no server so the badge stays
 * hidden — never flashes "0" on its way to the real value.
 */
function useDiagnosisActiveCount(
  serverId: string | null,
  hasDiagnosis: boolean
): {
  count: number | undefined;
  maxSeverity: "critical" | "warning" | undefined;
} {
  const { data, isFetched } = useDiagnosis(serverId, 120, {
    enabled: hasDiagnosis,
  });

  if (!hasDiagnosis || !serverId || !isFetched)
    return { count: undefined, maxSeverity: undefined };
  if (!data?.diagnoses) return { count: 0, maxSeverity: undefined };

  const roots = data.diagnoses.filter(
    (d: { supersededBy?: string | null }) => !d.supersededBy
  );
  const hasCritical = roots.some((d: { severity: string }) =>
    ["CRITICAL", "HIGH"].includes(d.severity)
  );
  const hasWarning = roots.some((d: { severity: string }) =>
    ["MEDIUM", "LOW"].includes(d.severity)
  );
  return {
    count: roots.length,
    maxSeverity: hasCritical ? "critical" : hasWarning ? "warning" : undefined,
  };
}

function NavBadge({
  count,
  ariaLabel,
  severity,
}: {
  count: number | undefined;
  ariaLabel: string;
  severity?: "critical" | "warning";
}) {
  if (count === undefined || count <= 0) return null;
  const colorClass =
    severity === "warning"
      ? "bg-warning/10 text-warning"
      : "bg-destructive/10 text-destructive";
  return (
    <span
      aria-label={ariaLabel}
      className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 font-mono text-xs font-medium leading-none tabular-nums ${colorClass}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Helper function to shorten hostnames
const shortenHost = (host: string, maxLength: number = 25) => {
  if (host.length <= maxLength) return host;

  // For CloudAMQP hosts, show the meaningful part
  if (host.includes(".cloudamqp.com")) {
    const parts = host.split(".");
    return `${parts[0]}...cloudamqp.com`;
  }

  // For other cloud providers
  if (host.includes(".amazonaws.com")) {
    const parts = host.split(".");
    return `${parts[0]}...aws`;
  }

  // For other hosts, truncate with ellipsis
  return `${host.substring(0, maxLength - 3)}...`;
};

function NavMenuItem({
  item,
  isActive,
  label,
  badgeCount,
  badgeSeverity,
  badgeLabel,
}: {
  item: NavItem;
  isActive: boolean;
  label: string;
  badgeCount?: number;
  badgeSeverity?: "critical" | "warning";
  badgeLabel?: string;
}) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={`w-full justify-start transition-colors duration-150 ${
          isActive
            ? "bg-sidebar-accent text-primary font-semibold"
            : "hover:bg-sidebar-accent text-sidebar-foreground"
        }`}
      >
        <Link
          to={item.url}
          className="flex items-center gap-3 px-3 py-2 rounded-lg"
        >
          <Icon className="h-4 w-auto shrink-0" aria-hidden="true" />
          <span className="font-medium truncate flex-1">{label}</span>
          {item.badge === "diagnosis" && badgeLabel && (
            <NavBadge
              count={badgeCount}
              ariaLabel={badgeLabel}
              severity={badgeSeverity}
            />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { t } = useTranslation("sidebar");
  const location = useLocation();
  const { selectedServerId, setSelectedServerId } = useServerContext();
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [showCreateVHostModal, setShowCreateVHostModal] = useState(false);
  const {
    selectedVHost,
    setSelectedVHost,
    availableVHosts,
    isLoading: vhostsLoading,
  } = useVHostContext();
  const { user } = useAuth();
  const { canAddServer } = useUser();
  const logoutMutation = useLogout();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];
  const isAdmin = useIsWorkspaceAdmin() === true;
  const { open: openCommandPalette } = useCommandPalette();
  const { resolvedTheme, setTheme } = useTheme();

  // Diagnosis detection is free on every plan (CE/EE split) — the badge
  // fetches whenever a server is selected.
  const { count: diagnosisActiveCount, maxSeverity: diagnosisSeverity } =
    useDiagnosisActiveCount(selectedServerId, !!selectedServerId);

  // Plan checking
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const renderItem = (item: NavItem) => {
    const isActive = location.pathname === item.url;
    const badgeCount =
      item.badge === "diagnosis" ? diagnosisActiveCount : undefined;
    const badgeLabel =
      item.badge === "diagnosis" && badgeCount !== undefined
        ? t("diagnosisActiveBadge", { count: badgeCount })
        : undefined;
    const badgeSeverity =
      item.badge === "diagnosis" ? diagnosisSeverity : undefined;
    return (
      <NavMenuItem
        key={item.titleKey}
        item={item}
        isActive={isActive}
        label={t(item.titleKey)}
        badgeCount={badgeCount}
        badgeSeverity={badgeSeverity}
        badgeLabel={badgeLabel}
      />
    );
  };

  return (
    <Sidebar className="border-r-0 bg-sidebar backdrop-blur-xs">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <img src="/images/new_icon.svg" alt="Qarote" className="w-6 h-6" />
          <div>
            {/* Brand mark — not a heading. Demoted from <h2> so the page <h1>
                stays the first heading in the document outline. */}
            <span className="font-normal text-[1.2rem] text-sidebar-foreground">
              Qarote
            </span>
          </div>
        </div>

        {/* Server Selection */}
        <div className="mt-4 space-y-3">
          {servers.length > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedServerId}
                    onValueChange={(value) => {
                      if (value === "__add_server__") {
                        setShowAddServerForm(true);
                        return;
                      }
                      setSelectedServerId(value);
                    }}
                  >
                    <SelectTrigger className="w-full text-sm text-left h-auto py-2">
                      <SelectValue placeholder={t("selectServer")}>
                        {(() => {
                          const s = servers.find(
                            (s) => s.id === selectedServerId
                          );
                          if (!s) return null;
                          return (
                            <div className="flex items-center gap-2.5 min-w-0">
                              <PixelServer className="h-4 text-primary shrink-0" />
                              <div className="flex flex-col min-w-0 text-left">
                                <span className="flex items-center gap-1.5 min-w-0">
                                  {selectedServerId && (
                                    <ServerStatusDot
                                      serverId={selectedServerId}
                                    />
                                  )}
                                  <span className="truncate font-medium leading-tight">
                                    {s.name}
                                  </span>
                                </span>
                                <span className="text-xs text-sidebar-foreground/60 truncate leading-tight">
                                  {shortenHost(s.host)}
                                  {s.useHttps ? " · TLS" : ""}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[280px]">
                      {servers.map((server) => (
                        <SelectItem
                          key={server.id}
                          value={server.id}
                          className="py-3"
                        >
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <PixelServer className="h-4 text-primary shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-foreground leading-tight">
                                  {server.name}
                                </span>
                                <span className="text-xs text-muted-foreground leading-tight">
                                  {shortenHost(server.host)}
                                  {server.useHttps ? " · TLS" : ""}
                                </span>
                              </div>
                            </div>
                            <ServerStatusDot serverId={server.id} />
                          </div>
                        </SelectItem>
                      ))}
                      {canAddServer && (
                        <RequirePermission permission="server:create">
                          <div className="-mx-1 my-1 h-px bg-muted" />
                          <SelectItem
                            value="__add_server__"
                            className="cursor-pointer py-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {t("addServer")}
                              </span>
                            </div>
                          </SelectItem>
                        </RequirePermission>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {isAdmin && (
                  <ServerManagement
                    trigger={
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 shrink-0"
                        title={t("common:manageServers")}
                        aria-label={t("common:manageServers")}
                      >
                        <PixelSettings className="h-3 w-auto" />
                      </Button>
                    }
                  />
                )}
              </div>
              {/* Add Server Form (controlled by select CTA) */}
              <AddServerForm
                isOpen={showAddServerForm}
                onOpenChange={setShowAddServerForm}
              />
            </>
          ) : (
            <div className="text-center p-3 bg-sidebar-accent rounded-lg border-2 border-dashed border-sidebar-border">
              <PixelServer className="h-8 text-sidebar-foreground/70 mx-auto mb-2" />
              <p className="text-xs text-sidebar-foreground/70 mb-2">
                {t("noServersConfigured")}
              </p>
              <AddServerForm
                isFirstServer={true}
                trigger={
                  <Button size="sm" variant="outline" className="text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    {t("addServer")}
                  </Button>
                }
              />
            </div>
          )}

          {/* VHost Selection */}
          {selectedServerId && (
            <div className="mt-1 space-y-2">
              {vhostsLoading ? (
                <div className="text-center p-3 bg-sidebar-accent rounded-lg">
                  <p className="text-xs text-sidebar-foreground/70">
                    {t("loadingVhosts")}
                  </p>
                </div>
              ) : availableVHosts.length > 0 ? (
                <>
                  <Select
                    value={selectedVHost || ""}
                    onValueChange={(value) => {
                      if (value === "__create_vhost__") {
                        setShowCreateVHostModal(true);
                        return;
                      }
                      setSelectedVHost(value);
                    }}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder={t("selectVhost")}>
                        {selectedVHost && (
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <PixelLayers className="h-3 shrink-0" />
                            <span className="truncate font-mono text-[0.8125rem]">
                              {selectedVHost === "/"
                                ? t("common:default")
                                : selectedVHost}
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[300px]">
                      {availableVHosts.map((vhost) => (
                        <SelectItem key={vhost.name} value={vhost.name}>
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <PixelLayers className="h-3 shrink-0" />
                            <span className="font-mono text-[0.8125rem]">
                              {vhost.name === "/"
                                ? t("common:default")
                                : vhost.name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {isAdmin && (
                        <>
                          <div className="-mx-1 my-1 h-px bg-muted" />
                          <SelectItem
                            value="__create_vhost__"
                            className="cursor-pointer py-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {t("createVirtualHost")}
                              </span>
                            </div>
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="text-center p-3 bg-sidebar-accent rounded-lg border-2 border-dashed border-sidebar-border">
                  <PixelLayers className="h-8 text-sidebar-foreground/70 mx-auto mb-2" />
                  <p className="text-xs text-sidebar-foreground/70 mb-2">
                    {t("noVhostsAvailable")}
                  </p>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setShowCreateVHostModal(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t("createVirtualHost")}
                    </Button>
                  )}
                </div>
              )}
              {selectedServerId && (
                <CreateVHostModal
                  isOpen={showCreateVHostModal}
                  onClose={() => setShowCreateVHostModal(false)}
                  serverId={selectedServerId}
                />
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 gap-4">
        {/* Primary navigation — three agent-first destinations. */}
        <nav aria-label="Primary" className="contents">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>{NAV_ITEMS.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>

        {/* ⌘K command palette — the escape hatch for everything off the nav
            (object views, admin CRUD, actions). */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/50"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">{t("command:trigger")}…</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[0.625rem] font-medium text-sidebar-foreground/60">
            {commandKeyLabel()}
          </kbd>
        </button>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-4">
        {/* Help & Support */}
        <Link
          to="/help"
          className={`flex items-center gap-2 text-sm rounded-md px-2 py-1.5 transition-colors ${
            location.pathname === "/help"
              ? "bg-sidebar-accent text-primary font-semibold"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <PixelHelp className="h-4 w-auto shrink-0" />
          {t("helpSupport")}
        </Link>

        {/* Settings */}
        <Link
          to="/settings"
          className={`flex items-center gap-2 text-sm rounded-md px-2 py-1.5 transition-colors ${
            location.pathname.startsWith("/settings")
              ? "bg-sidebar-accent text-primary font-semibold"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <PixelSettings className="h-4 w-auto shrink-0" />
          {t("settings")}
        </Link>

        {/* User section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {user?.image ? (
              <img
                src={user.image}
                alt=""
                aria-hidden="true"
                className="w-6 h-6 rounded-full object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <PixelUser
                className="h-4 w-auto text-sidebar-foreground/70 shrink-0"
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sidebar-foreground">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                {user?.email}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground p-1"
              title={t("toggleTheme")}
              aria-label={t("toggleTheme")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="text-sidebar-foreground/70 hover:text-destructive p-1"
              title={t("auth:signOut")}
            >
              <PixelLogout className="h-4 w-auto shrink-0" />
            </Button>
          </div>
        </div>
      </SidebarFooter>

      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="server management"
      />
    </Sidebar>
  );
}
