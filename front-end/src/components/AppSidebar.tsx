import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  MessageSquare,
  Clock,
  Server,
  Plus,
  LogOut,
  User,
  AlertTriangle,
  Shield,
  HelpCircle,
  Settings,
  Database,
} from "lucide-react";
import { useServerContext } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLogout } from "@/hooks/useAuth";
import { useServers } from "@/hooks/useApi";
import { AddServerForm } from "@/components/AddServerFormComponent";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { useLocation, Link } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ServerManagement } from "@/components/ServerManagement";
import { ThemeToggle } from "@/components/ThemeToggle";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Activity,
  },
  {
    title: "Queues",
    url: "/queues",
    icon: MessageSquare,
  },
  {
    title: "Connections",
    url: "/connections",
    icon: Clock,
  },
  {
    title: "Nodes",
    url: "/nodes",
    icon: Server,
  },
  {
    title: "Exchanges",
    url: "/exchanges",
    icon: Activity,
  },
  {
    title: "Virtual Hosts",
    url: "/vhosts",
    icon: Database,
    adminOnly: true,
  },
  {
    title: "Users",
    url: "/users",
    icon: User,
    adminOnly: true,
  },
  // {
  //   title: "Routing",
  //   url: "/routing",
  //   icon: GitBranch,
  //   isSoon: true,
  // },
  // {
  //   title: "Logs",
  //   url: "/logs",
  //   icon: FileText,
  //   isSoon: true,
  // },
  {
    title: "Alerts",
    url: "/alerts",
    icon: AlertTriangle,
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
  },
  {
    title: "Help & Support",
    url: "/help",
    icon: HelpCircle,
  },
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
  const location = useLocation();
  const { selectedServerId, setSelectedServerId } = useServerContext();
  const { workspacePlan } = useWorkspace();
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  // Plan checking
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <Sidebar className="border-r-0 bg-sidebar backdrop-blur-sm">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
            <img src="/icon_rabbit.svg" alt="Rabbit" className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sidebar-foreground">RabbitHQ</h2>
            <p className="text-xs text-sidebar-foreground/70">
              The next GUI for RabbitMQ
            </p>
          </div>
        </div>

        {/* Server Selection */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
              Server
            </span>
            <div className="flex items-center gap-1">
              <ServerManagement
                trigger={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    title="Manage servers"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                }
              />
            </div>
          </div>

          {servers.length > 0 ? (
            <Select
              value={selectedServerId}
              onValueChange={setSelectedServerId}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select a server...">
                  {selectedServerId &&
                    servers.find((s) => s.id === selectedServerId) && (
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <Server className="h-3 w-3 flex-shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span
                            className="truncate font-medium"
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
                          <span className="text-xs text-sidebar-foreground/70 truncate">
                            {
                              servers.find((s) => s.id === selectedServerId)
                                ?.name
                            }
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
                      <Server className="h-3 w-3 flex-shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium" title={server.host}>
                          {shortenHost(server.host)}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {server.name}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center p-3 bg-sidebar-accent rounded-lg border-2 border-dashed border-sidebar-border">
              <Server className="h-8 w-8 text-sidebar-foreground/70 mx-auto mb-2" />
              <p className="text-xs text-sidebar-foreground/70 mb-2">
                No servers configured
              </p>
              <AddServerForm
                trigger={
                  <Button size="sm" variant="outline" className="text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Server
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => {
                  // Filter admin-only items for non-admin users
                  if (item.adminOnly && user?.role !== "ADMIN") {
                    return false;
                  }
                  return true;
                })
                .map((item) => {
                  const isActive = location.pathname === item.url;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`w-full justify-start transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700"
                            : "hover:bg-sidebar-accent text-sidebar-foreground"
                        }`}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg"
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.title}</span>
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
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-sidebar-foreground/70">Theme</span>
          <ThemeToggle />
        </div>

        {/* User section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-sidebar-foreground/70" />
            <div className="flex flex-col">
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
        currentPlan={workspacePlan}
        feature="server management"
      />
    </Sidebar>
  );
}
