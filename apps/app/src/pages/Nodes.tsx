import { useTranslation } from "react-i18next";

import { AppSidebar } from "@/components/AppSidebar";
import { EnhancedNodesOverview } from "@/components/nodes/EnhancedNodesOverview";
import { EnhancedNodesTable } from "@/components/nodes/EnhancedNodesTable";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { useServerContext } from "@/contexts/ServerContext";

import { useNodes } from "@/hooks/queries/useRabbitMQ";

import { RabbitMQAuthorizationError } from "@/types/apiErrors";

const Nodes = () => {
  const { t } = useTranslation("nodes");
  const { selectedServerId, hasServers } = useServerContext();
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
              title={t("noServerTitle")}
              description={t("noServerDescription")}
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
                  <h1 className="title-page">{t("pageTitle")}</h1>
                  <p className="text-gray-500">{t("selectServerPrompt")}</p>
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
                  <h1 className="title-page">{t("pageTitle")}</h1>
                  <p className="text-gray-500">{t("pageSubtitle")}</p>
                </div>
              </div>
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
