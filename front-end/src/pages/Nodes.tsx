import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { useServerContext } from "@/contexts/ServerContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNodes } from "@/hooks/useApi";
import { RabbitMQAuthorizationError } from "@/types/apiErrors";
import { EnhancedNodesOverview } from "@/components/nodes/EnhancedNodesOverview";
import { EnhancedNodesTable } from "@/components/nodes/EnhancedNodesTable";
import { NoServerConfigured } from "@/components/NoServerConfigured";

const Nodes = () => {
  const { selectedServerId, hasServers } = useServerContext();
  const { workspacePlan } = useWorkspace();

  // Single useNodes call for all child components
  const { data: nodesData, isLoading: nodesLoading } =
    useNodes(selectedServerId);
  const nodes = nodesData?.nodes || [];

  // Check for permission status and create error object for backward compatibility with UI components
  const nodesPermissionStatus = nodesData?.permissionStatus;
  const processedNodesError =
    nodesPermissionStatus && !nodesPermissionStatus.hasPermission
      ? new RabbitMQAuthorizationError({
          error: "insufficient_permissions",
          message: nodesPermissionStatus.message,
          code: "RABBITMQ_INSUFFICIENT_PERMISSIONS",
          requiredPermission: nodesPermissionStatus.requiredPermission,
        })
      : null;

  if (!hasServers) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <NoServerConfigured
              title="Nodes"
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
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="title-page">Nodes</h1>
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
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="content-container-large">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="title-page">Nodes</h1>
                  <p className="text-gray-500">
                    Detailed view of cluster nodes and their metrics
                  </p>
                </div>
              </div>
              <PlanBadge workspacePlan={workspacePlan} />
            </div>

            {/* Cluster Overview */}
            <EnhancedNodesOverview
              serverId={selectedServerId}
              nodes={nodes}
              isLoading={nodesLoading}
              nodesError={processedNodesError}
            />

            {/* Enhanced Node Table with Expandable Details */}
            <EnhancedNodesTable
              serverId={selectedServerId}
              nodes={nodes}
              isLoading={nodesLoading}
              nodesError={processedNodesError}
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Nodes;
