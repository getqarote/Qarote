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
import { Badge } from "@/components/ui/badge";
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
  Search,
  FileText,
  GitBranch,
  HelpCircle,
  Settings,
} from "lucide-react";
import { useServerContext } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdmin } from "@/lib/auth/superAdmin";
import { useLogout } from "@/hooks/useAuth";
import { useServers } from "@/hooks/useApi";
import { AddServerForm } from "@/components/AddServerForm";
import { PrivacyNotice } from "@/components/PrivacyNotice";
import PlanUpgradeModal from "@/components/plans/PlanUpgradeModal";
import { useLocation, Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ServerManagement } from "@/components/ServerManagement";

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
    title: "Browser",
    url: "/messages",
    icon: Search,
    isNew: true,
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
    title: "Routing",
    url: "/routing",
    icon: GitBranch,
    isSoon: true,
  },
  {
    title: "Logs",
    url: "/logs",
    icon: FileText,
    isSoon: true,
  },
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
    title: "Privacy Settings",
    url: "/privacy-settings",
    icon: Shield,
  },
  {
    title: "Help & Support",
    url: "/help",
    icon: HelpCircle,
  },
];

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
    <Sidebar className="border-r-0 bg-white/90 backdrop-blur-sm">
      <SidebarHeader className="border-b border-gray-100 p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Rabbit Scout</h2>
            <p className="text-xs text-gray-500">The next GUI for RabbitMQ</p>
          </div>
        </div>

        {/* Server Selection */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                <SelectValue placeholder="Select a server..." />
              </SelectTrigger>
              <SelectContent>
                {servers.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    <div className="flex items-center gap-2">
                      <Server className="h-3 w-3" />
                      <div className="flex flex-col">
                        <span className="font-medium">{server.host}</span>
                        <span className="text-xs text-gray-500">
                          {server.name}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Server className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-2">
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
          <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const isAlertsItem = item.title === "Alerts";
                const isNewItem = item.isNew;
                const isSoonItem = item.isSoon;
                // Always show "Soon" badge for Alerts, regardless of environment
                const showComingSoon = isAlertsItem || isSoonItem;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`w-full justify-start transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <Link
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium">{item.title}</span>
                        {showComingSoon && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-xs bg-orange-100 text-orange-700 border-orange-200"
                          >
                            Soon
                          </Badge>
                        )}
                        {isNewItem && !isSoonItem && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-xs bg-green-100 text-green-700 border-green-200"
                          >
                            New
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Super Admin Dashboard - Only visible to creator */}
              {isSuperAdmin(user) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={`w-full justify-start transition-all duration-200 ${
                      location.pathname === "/admin"
                        ? "bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Link
                      to="/admin"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="font-medium">Admin</span>
                      <Badge
                        variant="secondary"
                        className="ml-auto text-xs bg-red-100 text-red-800 border-red-200"
                      >
                        Creator
                      </Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 p-4 space-y-4">
        {/* Privacy Status */}
        <div className="px-2">
          <PrivacyNotice variant="compact" />
        </div>

        {/* User section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-500" />
            <div className="flex flex-col">
              <span className="font-medium text-gray-700">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-gray-500">{user?.email}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="text-gray-500 hover:text-red-600 p-1"
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
