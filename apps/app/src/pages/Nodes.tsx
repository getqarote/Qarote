import { useTranslation } from "react-i18next";

import { EnhancedNodesOverview } from "@/components/nodes/EnhancedNodesOverview";
import { EnhancedNodesTable } from "@/components/nodes/EnhancedNodesTable";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";

import { useServerContext } from "@/contexts/ServerContext";

import { useNodes } from "@/hooks/queries/useRabbitMQ";

import { RabbitMQAuthorizationError } from "@/types/apiErrors";

const Nodes = () => {
  const { t } = useTranslation("nodes");
  const { selectedServerId, hasServers } = useServerContext();
  const {
    data: nodesData,
    isLoading: nodesLoading,
    error: nodesQueryError,
  } = useNodes(selectedServerId);
  const nodes = nodesData?.nodes || [];

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
      <PageShell bare>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
        </div>
        <NoServerConfigured
          title={t("noServerTitle")}
          subtitle={t("pageSubtitle")}
          description={t("noServerDescription")}
        />
      </PageShell>
    );
  }

  if (!selectedServerId) {
    return (
      <PageShell>
        <NoServerSelectedCard
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
          heading={t("noServerTitle")}
          description={t("selectServerPrompt")}
        />
      </PageShell>
    );
  }

  if (nodesQueryError) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="title-page">{t("pageTitle")}</h1>
          </div>
        </div>
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <TitleWithCount count={nodes.length}>
              {t("pageTitle")}
            </TitleWithCount>
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

      {/* Node Table */}
      <EnhancedNodesTable
        serverId={selectedServerId}
        nodes={nodes}
        isLoading={nodesLoading}
        nodesError={processedNodesError}
      />
    </PageShell>
  );
};

export default Nodes;
