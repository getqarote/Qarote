import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Pencil, X } from "lucide-react";

import { ChurnStatistics } from "@/components/nodes/ChurnStatistics";
import { EnhancedNodesOverview } from "@/components/nodes/EnhancedNodesOverview";
import { EnhancedNodesTable } from "@/components/nodes/EnhancedNodesTable";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";

import { useServerContext } from "@/contexts/ServerContext";

import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import {
  useNodes,
  useOverview,
  useSetClusterName,
} from "@/hooks/queries/useRabbitMQ";
import { useToast } from "@/hooks/ui/useToast";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { RabbitMQAuthorizationError } from "@/types/apiErrors";

const Nodes = () => {
  const { t } = useTranslation("nodes");
  const { selectedServerId, hasServers } = useServerContext();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const { data: orgData } = useCurrentOrganization();
  const isOrgAdmin = orgData?.role === "OWNER" || orgData?.role === "ADMIN";

  const {
    data: nodesData,
    isLoading: nodesLoading,
    error: nodesQueryError,
  } = useNodes(selectedServerId);

  const { data: overviewData, isLoading: overviewLoading } =
    useOverview(selectedServerId);

  const setClusterNameMutation = useSetClusterName();
  const [editingClusterName, setEditingClusterName] = useState(false);
  const [clusterNameValue, setClusterNameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentClusterName = overviewData?.overview?.cluster_name ?? "";

  useEffect(() => {
    if (editingClusterName) {
      setClusterNameValue(currentClusterName);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editingClusterName, currentClusterName]);

  const handleSaveClusterName = async () => {
    if (!selectedServerId || !workspace?.id) return;
    try {
      await setClusterNameMutation.mutateAsync({
        serverId: selectedServerId,
        workspaceId: workspace.id,
        name: clusterNameValue.trim(),
      });
      setEditingClusterName(false);
      toast({ title: t("clusterNameUpdated") });
    } catch {
      toast({ title: t("clusterNameError"), variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    setEditingClusterName(false);
  };

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

      {/* Cluster Name */}
      {currentClusterName && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("clusterName")}:</span>
          {editingClusterName ? (
            <>
              <Input
                ref={inputRef}
                value={clusterNameValue}
                onChange={(e) => setClusterNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveClusterName();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="h-7 w-64 text-sm font-mono"
                disabled={setClusterNameMutation.isPending}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleSaveClusterName}
                disabled={
                  setClusterNameMutation.isPending || !clusterNameValue.trim()
                }
                aria-label={t("saveClusterName")}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleCancelEdit}
                disabled={setClusterNameMutation.isPending}
                aria-label={t("cancelEdit")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className="font-mono font-semibold text-foreground">
                {currentClusterName}
              </span>
              {isOrgAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-50 hover:opacity-100"
                  onClick={() => setEditingClusterName(true)}
                  aria-label={t("editClusterName")}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
        </div>
      )}

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

      {/* Churn Statistics */}
      <ChurnStatistics
        churnRates={overviewData?.overview?.churnRates}
        isLoading={overviewLoading}
      />
    </PageShell>
  );
};

export default Nodes;
