import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, ChevronDown, Pencil, X } from "lucide-react";

import { EnhancedNodesOverview } from "@/components/nodes/EnhancedNodesOverview";
import { EnhancedNodesTable } from "@/components/nodes/EnhancedNodesTable";
import { PortsAndContexts } from "@/components/nodes/PortsAndContexts";
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

import {
  isRabbitMQAuthError,
  RabbitMQAuthorizationError,
} from "@/types/apiErrors";

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
    isFetching: nodesFetching,
    dataUpdatedAt: nodesUpdatedAt,
    error: nodesQueryError,
    refetch: refetchNodes,
  } = useNodes(selectedServerId);

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (nodesFetching || nodesUpdatedAt === 0) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nodesFetching, nodesUpdatedAt]);

  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
  } = useOverview(selectedServerId);

  const setClusterNameMutation = useSetClusterName();
  const [editingClusterName, setEditingClusterName] = useState(false);
  const [clusterNameValue, setClusterNameValue] = useState("");
  const [showPorts, setShowPorts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentClusterName = overviewData?.overview?.cluster_name ?? "";

  useEffect(() => {
    if (editingClusterName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (nodesQueryError && !isRabbitMQAuthError(nodesQueryError)) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="title-page">{t("pageTitle")}</h1>
          </div>
        </div>
        <PageError
          message={t("common:serverConnectionError")}
          onRetry={() => refetchNodes()}
        />
      </PageShell>
    );
  }

  const hasUnhealthyNodes = nodes.some(
    (n) =>
      !n.running ||
      n.mem_alarm ||
      n.disk_free_alarm ||
      (n.partitions?.length ?? 0) > 0
  );

  const secondsAgo = Math.floor((now - nodesUpdatedAt) / 1000);

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
            {currentClusterName && !editingClusterName && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-muted-foreground font-mono">
                  {currentClusterName}
                </span>
                {isOrgAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-50 hover:opacity-100"
                    onClick={() => setEditingClusterName(true)}
                    aria-label={t("editClusterName")}
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
            )}
            {editingClusterName && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Input
                  ref={inputRef}
                  value={clusterNameValue}
                  onChange={(e) => setClusterNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveClusterName();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  className="h-6 w-48 text-xs font-mono"
                  disabled={setClusterNameMutation.isPending}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={handleSaveClusterName}
                  disabled={
                    setClusterNameMutation.isPending || !clusterNameValue.trim()
                  }
                  aria-label={t("saveClusterName")}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={handleCancelEdit}
                  disabled={setClusterNameMutation.isPending}
                  aria-label={t("cancelEdit")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        {nodesUpdatedAt > 0 && (
          <span
            className={`text-xs tabular-nums ${
              !nodesFetching && secondsAgo > 30
                ? "text-warning"
                : "text-muted-foreground"
            }`}
          >
            {nodesFetching
              ? t("common:updating")
              : secondsAgo <= 2
                ? t("common:justUpdated")
                : t("common:updatedAgo", {
                    seconds: secondsAgo,
                  })}
          </span>
        )}
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
        defaultSortByStatus={hasUnhealthyNodes}
        fetchFailed={
          nodesQueryError != null && !isRabbitMQAuthError(nodesQueryError)
        }
      />

      {/* Ports & Contexts — collapsed by default */}
      {(overviewData?.overview?.listeners?.length ?? 0) > 0 ||
      (overviewData?.overview?.contexts?.length ?? 0) > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowPorts((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-150 ${showPorts ? "rotate-180" : ""}`}
            />
            {showPorts ? t("ports.hide") : t("ports.show")}
          </button>
          {showPorts && (
            <div className="mt-3">
              <PortsAndContexts
                listeners={overviewData?.overview?.listeners ?? []}
                contexts={overviewData?.overview?.contexts ?? []}
                isLoading={overviewLoading}
                fetchFailed={!!overviewError}
              />
            </div>
          )}
        </div>
      ) : null}
    </PageShell>
  );
};

export default Nodes;
