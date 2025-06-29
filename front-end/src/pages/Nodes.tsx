import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { useServerContext } from "@/contexts/ServerContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { NodesOverview, NodeDetailCards, NodesTable } from "@/components/nodes";
import { NoServerConfigured } from "@/components/NoServerConfigured";

const Nodes = () => {
  const { selectedServerId, hasServers } = useServerContext();
  const { workspacePlan } = useWorkspace();

  if (!hasServers) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <NoServerConfigured
              title="RabbitMQ Nodes"
              description="Add a RabbitMQ server connection to view cluster nodes and their metrics."
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!selectedServerId) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    RabbitMQ Nodes
                  </h1>
                  <p className="text-gray-500">
                    Please select a RabbitMQ server to view its nodes
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    RabbitMQ Nodes
                  </h1>
                  <p className="text-gray-500">
                    Detailed view of cluster nodes and their metrics
                  </p>
                </div>
              </div>
              <PlanBadge workspacePlan={workspacePlan} />
            </div>

            {/* Cluster Overview */}
            <NodesOverview serverId={selectedServerId} />

            {/* Node Detail Cards */}
            <NodeDetailCards serverId={selectedServerId} />

            {/* Detailed Metrics Table */}
            <NodesTable serverId={selectedServerId} />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Nodes;
