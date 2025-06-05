
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
import { Activity, MessageSquare, Clock } from "lucide-react";

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
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <a href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg">
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
          Connected to cluster-prod-01
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
