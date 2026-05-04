import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  Background,
  type ColorMode,
  Controls,
  type NodeMouseHandler,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Eye, EyeOff, ListFilter, Network } from "lucide-react";

import { buildTopologyGraph } from "@/lib/topology/layout";

import { FeatureGate } from "@/components/FeatureGate";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageErrorOrGate } from "@/components/PageErrorOrGate";
import { PageLoader } from "@/components/PageLoader";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { ExchangeNode } from "@/components/topology/ExchangeNode";
import { QueueNode } from "@/components/topology/QueueNode";
import { TopologyFilterPanel } from "@/components/topology/TopologyFilterPanel";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useServerContext } from "@/contexts/ServerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useTopology } from "@/hooks/queries/useRabbitMQ";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const nodeTypes = {
  exchangeNode: ExchangeNode,
  queueNode: QueueNode,
};

const Topology = () => {
  const { t } = useTranslation("topology");
  const navigate = useNavigate();
  const { selectedServerId, hasServers } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { resolvedTheme } = useTheme();
  const { hasFeature } = useFeatureFlags();
  const isTopologyEnabled = hasFeature("topology_visualization");

  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const [showOrphanQueues, setShowOrphanQueues] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [hiddenExchanges, setHiddenExchanges] = useState<Set<string>>(
    new Set()
  );
  const [hiddenQueues, setHiddenQueues] = useState<Set<string>>(new Set());

  const {
    data: topologyData,
    isLoading,
    error,
  } = useTopology(selectedServerId, selectedVHost, isTopologyEnabled);

  // Filtered lists for the panel (exclude amq.* and default exchange)
  const panelExchanges = useMemo(
    () =>
      (topologyData?.exchanges ?? []).filter(
        (e) => e.name !== "" && !e.name.startsWith("amq.")
      ),
    [topologyData?.exchanges]
  );

  const panelQueues = useMemo(
    () => topologyData?.queues ?? [],
    [topologyData?.queues]
  );

  const initialGraph = useMemo(() => {
    if (!topologyData) return { nodes: [], edges: [] };
    return buildTopologyGraph(
      topologyData.exchanges,
      topologyData.queues,
      topologyData.bindings,
      topologyData.consumers,
      { showOrphanQueues, hiddenExchanges, hiddenQueues }
    );
  }, [topologyData, showOrphanQueues, hiddenExchanges, hiddenQueues]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);

  useEffect(() => {
    setNodes(initialGraph.nodes);
    setEdges(initialGraph.edges);
    // Re-fit the view after a short delay to let the layout settle
    requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({ padding: 0.2, duration: 200 });
    });
  }, [initialGraph, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const label = (node.data as { label: string }).label;
      if (node.type === "queueNode") {
        navigate(`/queues/${encodeURIComponent(label)}`);
      } else if (node.type === "exchangeNode" && label !== "(default)") {
        navigate(`/exchanges/${encodeURIComponent(label)}`);
      }
    },
    [navigate]
  );

  const colorMode: ColorMode = resolvedTheme === "dark" ? "dark" : "light";

  // Counts for the toolbar (visible items only)
  const visibleExchangeCount = panelExchanges.filter(
    (e) => !hiddenExchanges.has(e.name)
  ).length;
  const visibleQueueCount = panelQueues.filter(
    (q) => !hiddenQueues.has(q.name)
  ).length;
  const bindingCount =
    topologyData?.bindings?.filter((b) => b.source !== "").length ?? 0;
  const isFiltering = hiddenExchanges.size > 0 || hiddenQueues.size > 0;

  const toggleExchange = useCallback((name: string) => {
    setHiddenExchanges((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleQueue = useCallback((name: string) => {
    setHiddenQueues((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleAllExchanges = useCallback(
    (visible: boolean) => {
      if (visible) {
        setHiddenExchanges(new Set());
      } else {
        setHiddenExchanges(new Set(panelExchanges.map((e) => e.name)));
      }
    },
    [panelExchanges]
  );

  const toggleAllQueues = useCallback(
    (visible: boolean) => {
      if (visible) {
        setHiddenQueues(new Set());
      } else {
        setHiddenQueues(new Set(panelQueues.map((q) => q.name)));
      }
    },
    [panelQueues]
  );

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
          heading={t("noServerSelected")}
          description={t("selectServerPrompt")}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <FeatureGate feature="topology_visualization" fallback={<PageLoader />}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="title-page">{t("pageTitle")}</h1>
            </div>
          </div>
        </div>

        {error ? (
          <PageErrorOrGate
            error={error}
            fallbackMessage={t("common:serverConnectionError")}
          />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-full rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : nodes.length === 0 &&
          hiddenExchanges.size === 0 &&
          hiddenQueues.size === 0 ? (
          <div className="text-center py-16">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">
              {t("noTopologyData")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("noTopologyDataDesc")}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
              <div className="flex items-center gap-5 text-sm text-muted-foreground">
                <span>
                  <span className="font-mono tabular-nums font-medium text-foreground">
                    {visibleExchangeCount}
                  </span>
                  {isFiltering && (
                    <span className="font-mono tabular-nums">
                      /{panelExchanges.length}
                    </span>
                  )}{" "}
                  {t("stats.exchanges", { count: visibleExchangeCount })}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span>
                  <span className="font-mono tabular-nums font-medium text-foreground">
                    {visibleQueueCount}
                  </span>
                  {isFiltering && (
                    <span className="font-mono tabular-nums">
                      /{panelQueues.length}
                    </span>
                  )}{" "}
                  {t("stats.queues", { count: visibleQueueCount })}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span>
                  <span className="font-mono tabular-nums font-medium text-foreground">
                    {bindingCount}
                  </span>{" "}
                  {t("stats.bindings", { count: bindingCount })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showOrphanQueues ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowOrphanQueues(!showOrphanQueues)}
                  className="flex items-center gap-1.5 text-xs"
                >
                  {showOrphanQueues ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  {t("filters.defaultExchange")}
                </Button>
                <Button
                  variant={showFilterPanel ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  {t("filters.filterPanel")}
                </Button>
              </div>
            </div>

            {/* Canvas + Filter Panel */}
            <div className="flex" style={{ height: "calc(100vh - 16rem)" }}>
              {showFilterPanel && (
                <TopologyFilterPanel
                  exchanges={panelExchanges}
                  queues={panelQueues}
                  hiddenExchanges={hiddenExchanges}
                  hiddenQueues={hiddenQueues}
                  onToggleExchange={toggleExchange}
                  onToggleQueue={toggleQueue}
                  onToggleAllExchanges={toggleAllExchanges}
                  onToggleAllQueues={toggleAllQueues}
                />
              )}
              <div className="flex-1 min-w-0">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  onNodeClick={onNodeClick}
                  onInit={(instance) => {
                    reactFlowRef.current = instance;
                  }}
                  colorMode={colorMode}
                  nodesConnectable={false}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  minZoom={0.1}
                  maxZoom={2}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background />
                  <Controls />
                </ReactFlow>
              </div>
            </div>
          </div>
        )}
      </FeatureGate>
    </PageShell>
  );
};

export default Topology;
