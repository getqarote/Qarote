import "@xyflow/react/dist/style.css";
// Topology theming overrides — must load AFTER the React Flow base styles.
import "@/components/topology/topology.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  useQueryStates,
} from "nuqs";

import {
  buildTopologyGraph,
  type ExchangeNodeData,
  type QueueNodeData,
} from "@/lib/topology/layout";

import { FirstRunCockpit } from "@/components/cockpit/FirstRunCockpit";
import { FeatureGate } from "@/components/FeatureGate";
import { PageErrorOrGate } from "@/components/PageErrorOrGate";
import { PageLoader } from "@/components/PageLoader";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { TopologySkeleton } from "@/components/skeletons/TopologySkeleton";
import { ExchangeNode } from "@/components/topology/ExchangeNode";
import { NodeDetail, type PickedNode } from "@/components/topology/NodeDetail";
import { QueueNode } from "@/components/topology/QueueNode";
import { TopologyFilterPanel } from "@/components/topology/TopologyFilterPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  const { selectedServerId, hasServers } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { resolvedTheme } = useTheme();
  const { hasFeature } = useFeatureFlags();
  const isTopologyEnabled = hasFeature("topology_visualization");

  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [picked, setPicked] = useState<PickedNode | null>(null);

  // ≤860px: the filter panel becomes a left drawer instead of an inline column
  // (the canvas needs the width on narrow screens).
  const [isNarrow, setIsNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 860px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [
    {
      showOrphans: showOrphanQueues,
      hiddenExchanges: hiddenExchangesArr,
      hiddenQueues: hiddenQueuesArr,
    },
    setFilters,
  ] = useQueryStates(
    {
      showOrphans: parseAsBoolean.withDefault(true),
      hiddenExchanges: parseAsArrayOf(parseAsString).withDefault([]),
      hiddenQueues: parseAsArrayOf(parseAsString).withDefault([]),
    },
    { history: "replace" as const, clearOnDefault: true }
  );

  // Derive Sets from the URL-backed arrays so the rest of the component
  // (buildTopologyGraph, has() calls, isFiltering) stays unchanged.
  // Slice to 500 as a defense-in-depth cap against crafted URLs with huge arrays.
  const hiddenExchanges = useMemo(
    () => new Set(hiddenExchangesArr.slice(0, 500)),
    [hiddenExchangesArr]
  );
  const hiddenQueues = useMemo(
    () => new Set(hiddenQueuesArr.slice(0, 500)),
    [hiddenQueuesArr]
  );

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
    // Centre the graph on mount and after every filter change. A double rAF
    // waits one painted frame so the custom nodes have been measured before
    // fitView computes the bounds — otherwise it fits to stale/zero sizes and
    // the graph sticks to the top-left.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 });
      });
    });
  }, [initialGraph, setNodes, setEdges]);

  // Click a node → open the drill-down drawer (the replacement for "Browse").
  // The synthetic "(default)" exchange is a render-only grouping for orphan
  // queues — it has no backend object, so it isn't selectable.
  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.type === "queueNode") {
      setPicked({ kind: "queue", data: node.data as unknown as QueueNodeData });
    } else if (node.type === "exchangeNode") {
      const data = node.data as unknown as ExchangeNodeData;
      if (data.label === "(default)") return;
      setPicked({ kind: "exchange", data });
    }
  }, []);

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

  // Partial functional updater: only the mutated key is returned so nuqs
  // merges it with the existing state rather than replacing it wholesale.
  const toggleExchange = useCallback(
    (name: string) => {
      void setFilters((prev) => ({
        hiddenExchanges: prev.hiddenExchanges.includes(name)
          ? prev.hiddenExchanges.filter((n) => n !== name)
          : [...prev.hiddenExchanges, name],
      }));
    },
    [setFilters]
  );

  const toggleQueue = useCallback(
    (name: string) => {
      void setFilters((prev) => ({
        hiddenQueues: prev.hiddenQueues.includes(name)
          ? prev.hiddenQueues.filter((n) => n !== name)
          : [...prev.hiddenQueues, name],
      }));
    },
    [setFilters]
  );

  const toggleAllExchanges = useCallback(
    (visible: boolean) => {
      void setFilters({
        hiddenExchanges: visible ? [] : panelExchanges.map((e) => e.name),
      });
    },
    [panelExchanges, setFilters]
  );

  const toggleAllQueues = useCallback(
    (visible: boolean) => {
      void setFilters({
        hiddenQueues: visible ? [] : panelQueues.map((q) => q.name),
      });
    },
    [panelQueues, setFilters]
  );

  if (!hasServers) {
    return (
      <PageShell bare>
        <FirstRunCockpit />
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
          <TopologySkeleton />
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
          <div className="space-y-4">
            {/* Summary bar — its own card, like the prototype */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
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
                  onClick={() =>
                    void setFilters({ showOrphans: !showOrphanQueues })
                  }
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
                  variant={
                    (isNarrow ? filterSheetOpen : showFilterPanel)
                      ? "secondary"
                      : "ghost"
                  }
                  size="sm"
                  onClick={() =>
                    isNarrow
                      ? setFilterSheetOpen((o) => !o)
                      : setShowFilterPanel((s) => !s)
                  }
                  className="flex items-center gap-1.5 text-xs"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  {t("filters.filterPanel")}
                </Button>
              </div>
            </div>

            {/* Panel + canvas — two separate cards in a row */}
            <div
              className="flex gap-4"
              style={{ height: "calc(100vh - 18rem)" }}
            >
              {/* Desktop: inline filter card. ≤860px: a left drawer (below). */}
              {!isNarrow && showFilterPanel && (
                <div className="w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
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
                </div>
              )}

              <Sheet
                open={isNarrow && filterSheetOpen}
                onOpenChange={setFilterSheetOpen}
              >
                <SheetContent side="left" className="w-72 p-0">
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
                </SheetContent>
              </Sheet>

              <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
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
                <p className="pointer-events-none absolute bottom-3 right-4 select-none font-mono text-[11px] text-muted-foreground/70">
                  {t("canvasHint")}
                </p>
              </div>
            </div>
          </div>
        )}

        <NodeDetail
          picked={picked}
          bindings={topologyData?.bindings ?? []}
          onClose={() => setPicked(null)}
        />
      </FeatureGate>
    </PageShell>
  );
};

export default Topology;
