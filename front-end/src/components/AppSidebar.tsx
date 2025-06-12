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
import { Activity, MessageSquare, Clock, Server, Plus } from "lucide-react";
import { useServerContext } from "@/contexts/ServerContext";
import { useServers } from "@/hooks/useApi";
import { AddServerForm } from "@/components/AddServerForm";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Activity,
    isActive: true,
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
    title: "Exchanges",
    url: "/exchanges",
    icon: Activity,
  },
  {
    title: "Channels",
    url: "/channels",
    icon: MessageSquare,
  },
];

export function AppSidebar() {
  const { selectedServerId, setSelectedServerId } = useServerContext();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];
  const selectedServer = servers.find(
    (server) => server.id === selectedServerId
  );

  return (
    <Sidebar className="border-r-0 bg-white/90 backdrop-blur-sm">
      <SidebarHeader className="border-b border-gray-100 p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">RabbitMQ</h2>
            <p className="text-xs text-gray-500">GUI Next</p>
          </div>
        </div>

        {/* Server Selection */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Server
            </span>
            <AddServerForm
              trigger={
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              }
            />
          </div>

          {servers.length > 0 ? (
            <Select
              value={selectedServerId || ""}
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
                      <span>{server.name}</span>
                      <Badge variant="outline" className="text-xs ml-1">
                        {server.host}:{server.port}
                      </Badge>
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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full justify-start transition-all duration-200 ${
                      item.isActive
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <a
                      href={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 p-4">
        <div className="text-xs text-gray-500 text-center">
          {selectedServer ? (
            <div className="space-y-1">
              <p className="font-medium text-gray-700">Connected to:</p>
              <p className="truncate">{selectedServer.name}</p>
              <p className="text-gray-400">
                {selectedServer.host}:{selectedServer.port}
              </p>
              <Badge
                variant="outline"
                className="text-xs bg-green-50 text-green-700 border-green-200"
              >
                {selectedServer.vhost}
              </Badge>
            </div>
          ) : (
            <p>No server selected</p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
