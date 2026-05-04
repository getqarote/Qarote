import { type ComponentType, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { Plus } from "lucide-react";

import { UserRole } from "@/lib/api";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { ServerManagement } from "@/components/ServerManagement";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PixelActivity } from "@/components/ui/pixel-activity";
import { PixelAlert } from "@/components/ui/pixel-alert";
import { PixelChart } from "@/components/ui/pixel-chart";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";
import { PixelClock } from "@/components/ui/pixel-clock";
import { PixelDatabase } from "@/components/ui/pixel-database";
import { PixelFlag } from "@/components/ui/pixel-flag";
import { PixelHelp } from "@/components/ui/pixel-help";
import { PixelKey } from "@/components/ui/pixel-key";
import { PixelLayers } from "@/components/ui/pixel-layers";
import { PixelLogout } from "@/components/ui/pixel-logout";
import { PixelMessage } from "@/components/ui/pixel-message";
import { PixelMonitor } from "@/components/ui/pixel-monitor";
import { PixelNetwork } from "@/components/ui/pixel-network";
import { PixelServer } from "@/components/ui/pixel-server";
import { PixelSettings } from "@/components/ui/pixel-settings";
import { PixelUser } from "@/components/ui/pixel-user";
import { PixelZap } from "@/components/ui/pixel-zap";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CreateVHostModal } from "@/components/vhosts/CreateVHostModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useDiagnosis } from "@/hooks/queries/useDiagnosis";
import { useOverview } from "@/hooks/queries/useRabbitMQ";
import { useServers } from "@/hooks/queries/useServer";
import { useLogout } from "@/hooks/ui/useAuth";
import { useUser } from "@/hooks/ui/useUser";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

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
  adminOnly?: boolean;
  /**
   * When set, the item renders a status badge fed from a live data source.
   * The actual count is computed in the `AppSidebar` body and threaded
   * through `<NavBadge>`. Items without a `badge` field render no badge.
   */
  badge?: "diagnosis";
};

/**
 * OVERVIEW — jobs-to-be-done. The killer features that define what Qarote
 * does that the RabbitMQ Management UI does not. Order matters: Home is
 * the calm landing surface, then Diagnosis (most likely incident-mode
 * entry point), Alerts, Messages, and the Qarote-original Topology.
 *
 * No plan / capability badges here on purpose: ADR-002 makes gating
 * multi-axis (Plan × License × Capability), and a static badge would lie
 * in 2 cases out of 3. The page's `<FeatureGate>` is the source of truth.
 */
const OVERVIEW_ITEMS: NavItem[] = [
  { titleKey: "sidebar:home", url: "/", icon: PixelChart },
  {
    titleKey: "sidebar:diagnosis",
    url: "/diagnosis",
    icon: PixelAlert,
    badge: "diagnosis",
  },
  { titleKey: "sidebar:alerts", url: "/alerts", icon: PixelFlag },
  { titleKey: "sidebar:messages", url: "/messages", icon: PixelMonitor },
  { titleKey: "sidebar:topology", url: "/topology", icon: PixelNetwork },
];

/**
 * BROWSE — RabbitMQ object views. Power-user surface for inspecting the
 * underlying broker primitives. Collapsible so the OVERVIEW section
 * always wins the first read; expanded by default until the user collapses
 * it (state persisted per-browser).
 */
const BROWSE_ITEMS: NavItem[] = [
  { titleKey: "sidebar:queues", url: "/queues", icon: PixelMessage },
  { titleKey: "sidebar:exchanges", url: "/exchanges", icon: PixelActivity },
  { titleKey: "sidebar:connections", url: "/connections", icon: PixelClock },
  { titleKey: "sidebar:channels", url: "/channels", icon: PixelZap },
  { titleKey: "sidebar:nodes", url: "/nodes", icon: PixelServer },
  { titleKey: "sidebar:policies", url: "/policies", icon: PixelKey },
  {
    titleKey: "sidebar:virtualHosts",
    url: "/vhosts",
    icon: PixelLayers,
    adminOnly: true,
  },
  {
    titleKey: "sidebar:users",
    url: "/users",
    icon: PixelUser,
    adminOnly: true,
  },
  {
    titleKey: "sidebar:definitions",
    url: "/definitions",
    icon: PixelDatabase,
    adminOnly: true,
  },
];

const BROWSE_STORAGE_KEY = "qarote.sidebar.browse.expanded";

/**
 * Persist the BROWSE collapse state across sessions. Default expanded so
 * users coming from the old flat menu don't lose discoverability — they
 * have to opt into the collapsed view.
 */
function useBrowseExpanded(): [boolean, (next: boolean) => void] {
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(BROWSE_STORAGE_KEY);
    return stored === null ? true : stored === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BROWSE_STORAGE_KEY, expanded ? "1" : "0");
  }, [expanded]);

  return [expanded, setExpanded];
}

/**
 * Diagnosis findings for the selected server, **post cascade-collapse**.
 * Returns `undefined` while loading or when feature/server are not
 * available so the badge stays hidden — never flashes "0" on its way to
 * the real value.
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

function NavMenuItem({
  item,
  isActive,
  badgeCount,
  badgeSeverity,
  badgeLabel,
  label,
}: {
  item: NavItem;
  isActive: boolean;
  badgeCount?: number;
  badgeSeverity?: "critical" | "warning";
  badgeLabel?: string;
  label: string;
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

// NOTE: Active-alerts badge intentionally not implemented in Phase 1.
// The existing `useRabbitMQAlerts` is a per-vhost websocket subscription;
// mounting it in the sidebar would open a workspace-wide subscription on
// every page load. A cheaper "active alert count" tRPC query is needed
// before we can wire this badge — tracked as an Open Question in
// docs/plans/sidebar-redesign.md.

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
  const { hasFeature } = useFeatureFlags();
  const logoutMutation = useLogout();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  // Plan checking
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Sidebar nav state
  const [browseExpanded, setBrowseExpanded] = useBrowseExpanded();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { count: diagnosisActiveCount, maxSeverity: diagnosisSeverity } =
    useDiagnosisActiveCount(selectedServerId, hasFeature("incident_diagnosis"));

  const renderItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;
    const isActive = location.pathname === item.url;
    const label = t(item.titleKey);
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
        badgeCount={badgeCount}
        badgeSeverity={badgeSeverity}
        badgeLabel={badgeLabel}
        label={label}
      />
    );
  };

  return (
    <Sidebar className="border-r-0 bg-sidebar backdrop-blur-xs">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <img src="/images/new_icon.svg" alt="Qarote" className="w-6 h-6" />
          <div>
            <h2 className="font-normal text-[1.2rem] text-sidebar-foreground">
              Qarote
            </h2>
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
                                <span className="truncate font-medium leading-tight">
                                  {s.name}
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
                      {user?.role === UserRole.ADMIN && canAddServer && (
                        <>
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
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {user?.role === UserRole.ADMIN && (
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
                            <span className="truncate font-medium">
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
                            <span className="font-medium">
                              {vhost.name === "/"
                                ? t("common:default")
                                : vhost.name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {user?.role === UserRole.ADMIN && (
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
                  {user?.role === UserRole.ADMIN && (
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

      <SidebarContent className="px-4 gap-6">
        {/* OVERVIEW — killer features, jobs-to-be-done */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">
            {t("overview")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{OVERVIEW_ITEMS.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* BROWSE — RabbitMQ object views, collapsible secondary surface */}
        <SidebarGroup>
          <Collapsible
            open={browseExpanded}
            onOpenChange={setBrowseExpanded}
            className="group/browse"
          >
            <CollapsibleTrigger
              // No manual aria-label: Radix sets `aria-expanded` on
              // the trigger automatically. Screen readers read the
              // visible "Browse" label + the expanded/collapsed state
              // (e.g. "Browse, expanded, button") — strictly more
              // useful than a swap-on-toggle label that loses the
              // section name.
              className="group/trigger mb-2 flex w-full items-center justify-between rounded px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/50"
            >
              <span>{t("browse")}</span>
              <PixelChevronDown
                aria-hidden="true"
                className={`h-3 w-auto shrink-0 transition-transform duration-200 ${
                  browseExpanded ? "rotate-0" : "-rotate-90"
                }`}
              />
            </CollapsibleTrigger>
            {/*
              Reuse the project's existing accordion keyframes
              (`--animate-accordion-{down,up}` declared in
              `apps/app/src/styles/index.css`). `tailwindcss-animate`
              v4 does not auto-register `collapsible-*` aliases, so
              referencing them silently produced no animation.
            */}
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <SidebarGroupContent>
                <SidebarMenu>{BROWSE_ITEMS.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
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
