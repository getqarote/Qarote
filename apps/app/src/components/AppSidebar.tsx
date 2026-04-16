import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { LogOut, Plus } from "lucide-react";

import { UserRole } from "@/lib/api";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { ServerManagement } from "@/components/ServerManagement";
import { Button } from "@/components/ui/button";
import { PixelActivity } from "@/components/ui/pixel-activity";
import { PixelAlert } from "@/components/ui/pixel-alert";
import { PixelClock } from "@/components/ui/pixel-clock";
import { PixelDatabase } from "@/components/ui/pixel-database";
import { PixelFolder } from "@/components/ui/pixel-folder";
import { PixelHelp } from "@/components/ui/pixel-help";
import { PixelMessage } from "@/components/ui/pixel-message";
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

import { useOverview } from "@/hooks/queries/useRabbitMQ";
import { useServers } from "@/hooks/queries/useServer";
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

const menuItems = [
  { titleKey: "sidebar:dashboard", url: "/", icon: PixelActivity },
  { titleKey: "sidebar:queues", url: "/queues", icon: PixelMessage },
  { titleKey: "sidebar:connections", url: "/connections", icon: PixelClock },
  { titleKey: "sidebar:nodes", url: "/nodes", icon: PixelServer },
  { titleKey: "sidebar:exchanges", url: "/exchanges", icon: PixelActivity },
  { titleKey: "sidebar:topology", url: "/topology", icon: PixelNetwork },
  {
    titleKey: "sidebar:virtualHosts",
    url: "/vhosts",
    icon: PixelDatabase,
    adminOnly: true,
  },
  {
    titleKey: "sidebar:users",
    url: "/users",
    icon: PixelUser,
    adminOnly: true,
  },
  { titleKey: "sidebar:alerts", url: "/alerts", icon: PixelAlert },
];

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
  const logoutMutation = useLogout();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  // Plan checking
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
              {t("server")}
            </span>
            {user?.role === UserRole.ADMIN && (
              <div className="flex items-center gap-1">
                <ServerManagement
                  trigger={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      title={t("common:manageServers")}
                    >
                      <PixelSettings className="h-3 w-auto" />
                    </Button>
                  }
                />
              </div>
            )}
          </div>

          {servers.length > 0 ? (
            <>
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
                      const s = servers.find((s) => s.id === selectedServerId);
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
                          <span className="font-medium">{t("addServer")}</span>
                        </div>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
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
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                  {t("virtualHost")}
                </span>
              </div>

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
                            <PixelFolder className="h-3 shrink-0" />
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
                            <PixelFolder className="h-3 shrink-0" />
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
                  <PixelFolder className="h-8 text-sidebar-foreground/70 mx-auto mb-2" />
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

      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">
            {t("management")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => {
                  // Filter admin-only items for non-admin users
                  if (item.adminOnly && user?.role !== UserRole.ADMIN) {
                    return false;
                  }
                  return true;
                })
                .map((item) => {
                  const isActive = location.pathname === item.url;

                  return (
                    <SidebarMenuItem key={item.titleKey}>
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
                          <item.icon className="h-4 w-auto shrink-0" />
                          <span className="font-medium truncate">
                            {t(item.titleKey)}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
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
          >
            <LogOut className="w-4 h-4" />
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
