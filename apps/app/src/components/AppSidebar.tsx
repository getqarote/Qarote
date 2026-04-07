import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  FolderTree,
  HelpCircle,
  LogOut,
  MessageSquare,
  Network,
  Plus,
  Server,
  Settings,
  User,
} from "lucide-react";

import { UserRole } from "@/lib/api";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { ServerManagement } from "@/components/ServerManagement";
import { Button } from "@/components/ui/button";
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

import { useServers } from "@/hooks/queries/useServer";
import { useLogout } from "@/hooks/ui/useAuth";
import { useUser } from "@/hooks/ui/useUser";

const menuItems = [
  { titleKey: "sidebar:dashboard", url: "/", icon: Activity },
  { titleKey: "sidebar:queues", url: "/queues", icon: MessageSquare },
  { titleKey: "sidebar:connections", url: "/connections", icon: Clock },
  { titleKey: "sidebar:nodes", url: "/nodes", icon: Server },
  { titleKey: "sidebar:exchanges", url: "/exchanges", icon: Activity },
  { titleKey: "sidebar:topology", url: "/topology", icon: Network },
  {
    titleKey: "sidebar:virtualHosts",
    url: "/vhosts",
    icon: Database,
    adminOnly: true,
  },
  { titleKey: "sidebar:users", url: "/users", icon: User, adminOnly: true },
  { titleKey: "sidebar:alerts", url: "/alerts", icon: AlertTriangle },
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
                      <Settings className="h-3 w-3" />
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
                <SelectTrigger className="w-full text-sm text-left">
                  <SelectValue placeholder={t("selectServer")}>
                    {selectedServerId &&
                      servers.find((s) => s.id === selectedServerId) && (
                        <div className="flex items-center gap-2 w-full min-w-0">
                          <Server className="h-3 w-3 shrink-0" />
                          <div className="flex flex-col min-w-0 flex-1 text-left">
                            <span className="truncate font-medium">
                              {
                                servers.find((s) => s.id === selectedServerId)
                                  ?.name
                              }
                            </span>
                            <span
                              className="text-xs text-sidebar-foreground/70 truncate"
                              title={
                                servers.find((s) => s.id === selectedServerId)
                                  ?.host
                              }
                            >
                              {shortenHost(
                                servers.find((s) => s.id === selectedServerId)
                                  ?.host || ""
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[300px]">
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <Server className="h-3 w-3 shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium">{server.name}</span>
                          <span
                            className="text-xs text-muted-foreground truncate"
                            title={server.host}
                          >
                            {shortenHost(server.host)}
                          </span>
                        </div>
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
                          <Plus className="h-4 w-4 text-muted-foreground" />
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
              <Server className="h-8 w-8 text-sidebar-foreground/70 mx-auto mb-2" />
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
                            <FolderTree className="h-3 w-3 shrink-0" />
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
                            <FolderTree className="h-3 w-3 shrink-0" />
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
                              <Plus className="h-4 w-4 text-muted-foreground" />
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
                  <FolderTree className="h-8 w-8 text-sidebar-foreground/70 mx-auto mb-2" />
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
                          <item.icon className="w-4 h-4" />
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
          <HelpCircle className="w-4 h-4" />
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
          <Settings className="w-4 h-4" />
          {t("settings")}
        </Link>

        {/* User section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {user?.image ? (
              <img
                src={user.image}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-4 h-4 text-sidebar-foreground/70 shrink-0" />
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
            className="text-sidebar-foreground/70 hover:text-red-400 p-1"
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
