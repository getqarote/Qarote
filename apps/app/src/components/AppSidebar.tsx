import { type ComponentType, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { commandKeyLabel } from "@/lib/shortcut";
import { displayName, initials } from "@/lib/userDisplay";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { RequirePermission } from "@/components/rbac/RequirePermission";
import { SelectTileSkeleton } from "@/components/skeletons/SidebarSkeletons";
import {
  Icon,
  IconBell,
  IconChevron,
  IconFolder,
  IconHelp,
  IconHome,
  IconLogout,
  IconMoon,
  IconPlus,
  IconSearch,
  IconServer,
  IconSettings,
  IconSun,
  IconTopo,
} from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
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

/**
 * Broker health → status dot tone. Mirrors the prototype's `<Dot tone>`:
 * green when the overview resolves, red on error/empty, neutral while loading.
 */
type StatusTone = "good" | "loading" | "down";

function useServerStatusTone(serverId: string | null): StatusTone {
  const { data, isLoading, isError } = useOverview(serverId);
  if (!serverId || isLoading) return "loading";
  if (isError || !data?.overview) return "down";
  return "good";
}

function StatusDot({ tone }: { tone: StatusTone }) {
  const cls =
    tone === "good"
      ? "bg-success"
      : tone === "down"
        ? "bg-destructive"
        : "bg-muted-foreground/30";
  return <span className={`h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

/** Standalone dot fetcher for a non-selected server row in the menu. */
function ServerRowDot({ serverId }: { serverId: string }) {
  const tone = useServerStatusTone(serverId);
  return <StatusDot tone={tone} />;
}

type IconComponent = ComponentType<{
  size?: number;
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
  { titleKey: "sidebar:cockpit", url: "/", icon: IconHome },
  {
    titleKey: "sidebar:notifications",
    url: "/alerts",
    icon: IconBell,
    badge: "diagnosis",
  },
  { titleKey: "sidebar:topology", url: "/topology", icon: IconTopo },
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
}: {
  count: number | undefined;
  ariaLabel: string;
  /** Severity is computed but the prototype renders a single red pill. */
  severity?: "critical" | "warning";
}) {
  if (count === undefined || count <= 0) return null;
  return (
    <span
      aria-label={ariaLabel}
      className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 font-mono text-[11px] leading-none text-white tabular-nums group-data-[active=true]/nav:bg-primary"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Middle-truncate a hostname, keeping the head + tail so both the broker
 * prefix and the meaningful suffix stay legible — `b-73d8…aws` rather than
 * the end-truncated `b-73d862a3-8128…`. The scheme/TLS suffix is appended by
 * the caller OUTSIDE this helper so it is never eaten by the ellipsis.
 */
const middleTruncateHost = (
  host: string,
  head: number = 6,
  tail: number = 4
): string => {
  if (host.length <= head + tail + 1) return host;
  return `${host.slice(0, head)}…${host.slice(-tail)}`;
};

const MENU_HEAD =
  "px-2.5 pb-1 pt-1.5 font-mono text-[9.5px] uppercase tracking-[0.09em] text-muted-foreground";

/**
 * Shared context-card trigger styling (SERVER / VHOST cards in the sidebar).
 * Ports the prototype `.selx__trigger`: full-width card, carrot ring +
 * border on open, 26px NEUTRAL icon tile, label/value/host stack, chevron
 * that rotates 180° when expanded. `min-h-[44px]` keeps both triggers the
 * same height (prototype `.selx__trigger { min-height: 44px }`) even when the
 * VHOST card has no host line.
 */
const SELX_TRIGGER =
  "flex min-h-[44px] w-full items-center gap-2.5 rounded-md border border-sidebar-border bg-sidebar px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none data-[state=open]:border-primary data-[state=open]:ring-[3px] data-[state=open]:ring-primary/15";

// Neutral greige tile — prototype `.selx__ic` is surface-2 bg + ink-2 icon.
// Carrot is reserved for the active nav item and actions, never select icons.
const SELX_TILE =
  "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md bg-muted text-muted-foreground";

const SELX_LABEL =
  "font-mono text-[9.5px] uppercase leading-[1.3] tracking-[0.09em] text-muted-foreground";

const SELX_CHEV =
  "shrink-0 text-muted-foreground transition-transform group-data-[state=open]/selx:rotate-180";

const SELX_ITEM =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent";

const SELX_ACTION =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-sidebar-accent";

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
  const ItemIcon = item.icon;
  return (
    <Link
      to={item.url}
      data-active={isActive}
      className={`group/nav flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-sidebar-accent text-primary"
          : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <ItemIcon
        size={18}
        className={
          isActive
            ? "text-primary"
            : "text-muted-foreground group-hover/nav:text-foreground/70"
        }
        aria-hidden="true"
      />
      <span className="flex-1 truncate">{label}</span>
      {item.badge === "diagnosis" && badgeLabel && (
        <NavBadge
          count={badgeCount}
          ariaLabel={badgeLabel}
          severity={badgeSeverity}
        />
      )}
    </Link>
  );
}

export function AppSidebar() {
  const { t } = useTranslation("sidebar");
  const location = useLocation();
  const { selectedServerId, setSelectedServerId } = useServerContext();
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [showManageServer, setShowManageServer] = useState(false);
  const [showCreateVHostModal, setShowCreateVHostModal] = useState(false);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [vhostMenuOpen, setVhostMenuOpen] = useState(false);
  const {
    selectedVHost,
    setSelectedVHost,
    availableVHosts,
    isLoading: vhostsLoading,
  } = useVHostContext();
  const { user } = useAuth();
  const { canAddServer } = useUser();
  const logoutMutation = useLogout();
  const { data: serversData, isLoading: serversLoading } = useServers();
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

  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const selectedTone = useServerStatusTone(selectedServerId);

  const handleSelectServer = (id: string) => {
    setServerMenuOpen(false);
    setSelectedServerId(id);
  };

  const handleSelectVHost = (name: string) => {
    setVhostMenuOpen(false);
    setSelectedVHost(name);
  };

  const renderNav = (item: NavItem) => {
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
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* ── Brand + context cards (SERVER / VHOST) ───────────────────── */}
      <SidebarHeader className="gap-0 p-0">
        <div className="flex items-center gap-2 px-[18px] pb-3.5 pt-[18px]">
          {/* Carrot-cursor brand mark. */}
          <img
            src="/images/new_icon.svg"
            alt=""
            aria-hidden="true"
            width={15}
            height={20}
            className="h-5 w-auto shrink-0"
          />
          {/* Brand mark — not a heading. The page <h1> stays first in the outline. */}
          <span className="font-heading text-[18px] font-semibold text-sidebar-foreground">
            Qarote
          </span>
        </div>

        <div className="flex flex-col gap-[7px] px-3 pb-2.5 pt-1">
          {/* SERVER context card */}
          {serversLoading && servers.length === 0 ? (
            // Initial fetch: hold the tile footprint with a loading-tone dot so
            // we never flash the "no servers configured" empty state on the way
            // to the real list.
            <SelectTileSkeleton dot />
          ) : servers.length > 0 ? (
            <div className="min-w-0">
              <div className="min-w-0 flex-1">
                <Popover open={serverMenuOpen} onOpenChange={setServerMenuOpen}>
                  <PopoverTrigger
                    className={`group/selx ${SELX_TRIGGER}`}
                    aria-label={t("selectServer")}
                  >
                    <span className={SELX_TILE}>
                      <IconServer size={15} className="text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block ${SELX_LABEL}`}>
                        {t("serverLabel")}
                      </span>
                      <span className="flex items-center gap-[7px] truncate text-[13.5px] font-medium leading-tight">
                        {selectedServer && <StatusDot tone={selectedTone} />}
                        <span className="truncate">
                          {selectedServer?.name ?? t("selectServer")}
                        </span>
                      </span>
                      {selectedServer && (
                        <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                          {middleTruncateHost(selectedServer.host)}
                          {selectedServer.useHttps ? " · TLS" : ""}
                        </span>
                      )}
                    </span>
                    <IconChevron size={14} className={SELX_CHEV} />
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-1.5"
                  >
                    <div className={MENU_HEAD}>{t("serversInWorkspace")}</div>
                    {servers.map((server) => {
                      const selected = server.id === selectedServerId;
                      return (
                        <button
                          key={server.id}
                          type="button"
                          onClick={() => handleSelectServer(server.id)}
                          role="option"
                          aria-selected={selected}
                          className={`${SELX_ITEM} ${
                            selected ? "bg-sidebar-accent" : ""
                          }`}
                        >
                          <span className={SELX_TILE}>
                            <IconServer
                              size={14}
                              className="text-muted-foreground"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-[7px] truncate font-medium">
                              <ServerRowDot serverId={server.id} />
                              <span className="truncate">{server.name}</span>
                            </span>
                            <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                              {middleTruncateHost(server.host)}
                              {server.useHttps ? " · TLS" : ""}
                            </span>
                          </span>
                          <Icon
                            name="check"
                            size={15}
                            className={`ml-auto shrink-0 ${
                              selected ? "text-primary" : "text-transparent"
                            }`}
                          />
                        </button>
                      );
                    })}
                    {(isAdmin || canAddServer) && (
                      <div className="mx-1 my-1.5 h-px bg-sidebar-border" />
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setServerMenuOpen(false);
                          setShowManageServer(true);
                        }}
                        className={SELX_ACTION}
                      >
                        <IconSettings
                          size={15}
                          className="text-muted-foreground"
                        />
                        {t("manageCurrentServer")}
                      </button>
                    )}
                    {canAddServer && (
                      <RequirePermission permission="server:create">
                        <button
                          type="button"
                          onClick={() => {
                            setServerMenuOpen(false);
                            setShowAddServerForm(true);
                          }}
                          className={SELX_ACTION}
                        >
                          <IconPlus
                            size={15}
                            className="text-muted-foreground"
                          />
                          {t("addServer")}
                        </button>
                      </RequirePermission>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-sidebar-border bg-sidebar-accent/50 p-4 text-center">
              <IconServer
                size={22}
                className="mx-auto mb-2 text-muted-foreground"
              />
              <p className="mb-2.5 text-xs text-muted-foreground">
                {t("noServersConfigured")}
              </p>
              <AddServerForm
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <IconPlus size={13} />
                    {t("addServer")}
                  </button>
                }
              />
            </div>
          )}

          {/* Add Server Form (controlled by the server menu CTA) */}
          {servers.length > 0 && (
            <AddServerForm
              isOpen={showAddServerForm}
              onOpenChange={setShowAddServerForm}
            />
          )}
          {selectedServer && (
            <AddServerForm
              mode="edit"
              server={selectedServer}
              isOpen={showManageServer}
              onOpenChange={setShowManageServer}
              onServerRemoved={() => {
                setShowManageServer(false);
                setSelectedServerId(null);
              }}
            />
          )}

          {/* VHOST context card */}
          {selectedServerId && (
            <>
              {vhostsLoading ? (
                <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-2.5 font-mono text-xs text-muted-foreground">
                  <Icon name="refresh" size={14} className="animate-spin" />
                  {t("loadingVhosts")}
                </div>
              ) : availableVHosts.length > 0 ? (
                <Popover open={vhostMenuOpen} onOpenChange={setVhostMenuOpen}>
                  <PopoverTrigger
                    className={`group/selx ${SELX_TRIGGER}`}
                    aria-label={t("selectVhost")}
                  >
                    <span className={SELX_TILE}>
                      <IconFolder size={15} className="text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block ${SELX_LABEL}`}>
                        {t("vhostLabel")}
                      </span>
                      <span className="block truncate font-mono text-[12.5px] font-medium leading-tight">
                        {selectedVHost === "/"
                          ? t("common:default")
                          : selectedVHost || t("selectVhost")}
                      </span>
                    </span>
                    <IconChevron size={14} className={SELX_CHEV} />
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-1.5"
                  >
                    <div className={MENU_HEAD}>{t("virtualHosts")}</div>
                    {availableVHosts.map((vhost) => {
                      const selected = vhost.name === selectedVHost;
                      return (
                        <button
                          key={vhost.name}
                          type="button"
                          onClick={() => handleSelectVHost(vhost.name)}
                          role="option"
                          aria-selected={selected}
                          className={`${SELX_ITEM} ${
                            selected ? "bg-sidebar-accent" : ""
                          }`}
                        >
                          <span className={SELX_TILE}>
                            <IconFolder
                              size={14}
                              className="text-muted-foreground"
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium">
                            {vhost.name === "/"
                              ? t("common:default")
                              : vhost.name}
                          </span>
                          <Icon
                            name="check"
                            size={15}
                            className={`ml-auto shrink-0 ${
                              selected ? "text-primary" : "text-transparent"
                            }`}
                          />
                        </button>
                      );
                    })}
                    {isAdmin && (
                      <>
                        <div className="mx-1 my-1.5 h-px bg-sidebar-border" />
                        <button
                          type="button"
                          onClick={() => {
                            setVhostMenuOpen(false);
                            setShowCreateVHostModal(true);
                          }}
                          className={SELX_ACTION}
                        >
                          <IconPlus
                            size={15}
                            className="text-muted-foreground"
                          />
                          {t("createVirtualHost")}
                        </button>
                      </>
                    )}
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="rounded-md border border-dashed border-sidebar-border bg-sidebar-accent/50 p-4 text-center">
                  <IconFolder
                    size={22}
                    className="mx-auto mb-2 text-muted-foreground"
                  />
                  <p className="mb-2.5 text-xs text-muted-foreground">
                    {t("noVhostsAvailable")}
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowCreateVHostModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-sidebar-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-sidebar-accent"
                    >
                      <IconPlus size={13} />
                      {t("createVirtualHost")}
                    </button>
                  )}
                </div>
              )}
              <CreateVHostModal
                isOpen={showCreateVHostModal}
                onClose={() => setShowCreateVHostModal(false)}
                serverId={selectedServerId}
              />
            </>
          )}
        </div>
      </SidebarHeader>

      {/* ── Primary nav + ⌘K ─────────────────────────────────────────── */}
      <SidebarContent className="gap-0 px-3 py-2">
        <nav aria-label="Primary" className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(renderNav)}
        </nav>

        {/* ⌘K command palette — the escape hatch for everything off the nav
            (object views, admin CRUD, actions). */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="mt-2.5 flex w-full items-center gap-2.5 rounded-md border border-sidebar-border bg-sidebar px-2.5 py-2 text-[13.5px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground/70 focus-visible:outline-none"
        >
          <IconSearch size={15} className="shrink-0" />
          <span className="flex-1 text-left">{t("command:trigger")}…</span>
          <kbd className="pointer-events-none ml-auto rounded-[5px] border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {commandKeyLabel()}
          </kbd>
        </button>
      </SidebarContent>

      {/* ── Footer: Settings, Help, theme, user, logout ──────────────── */}
      <SidebarFooter className="gap-0.5 border-t border-sidebar-border p-3">
        <div className="flex gap-0.5">
          <Link
            to="/settings"
            className={`flex flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
              location.pathname.startsWith("/settings")
                ? "bg-sidebar-accent text-primary"
                : "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <IconSettings size={16} className="shrink-0" />
            {t("settings")}
          </Link>
          <Link
            to="/help"
            className={`flex flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
              location.pathname === "/help"
                ? "bg-sidebar-accent text-primary"
                : "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <IconHelp size={16} className="shrink-0" />
            {t("help")}
          </Link>
          <button
            type="button"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            title={t("toggleTheme")}
            aria-label={t("toggleTheme")}
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md text-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            {resolvedTheme === "dark" ? (
              <IconSun size={16} />
            ) : (
              <IconMoon size={16} />
            )}
          </button>
        </div>

        <div className="mt-1 flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent">
          {user?.image ? (
            <img
              src={user.image}
              alt=""
              aria-hidden="true"
              className="h-[30px] w-[30px] shrink-0 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-primary font-heading text-xs font-semibold text-primary-foreground">
              {initials(user)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-sidebar-foreground">
              {displayName(user)}
            </div>
            <div className="truncate font-mono text-[11px] text-muted-foreground">
              {user?.email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            title={t("auth:signOut")}
            aria-label={t("auth:signOut")}
            className="ml-auto shrink-0 rounded-[5px] p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground disabled:opacity-50"
          >
            <IconLogout size={16} />
          </button>
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
