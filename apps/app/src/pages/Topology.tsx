import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  Background,
  type ColorMode,
  Controls,
  MiniMap,
  type NodeMouseHandler,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Network, RefreshCw, Server } from "lucide-react";

import { buildTopologyGraph } from "@/lib/topology/layout";

import { AppSidebar } from "@/components/AppSidebar";
import { FeatureGate } from "@/components/FeatureGate";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageLoader } from "@/components/PageLoader";
import { ExchangeNode } from "@/components/topology/ExchangeNode";
import { QueueNode } from "@/components/topology/QueueNode";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

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

  const {
    data: topologyData,
    isLoading,
    error,
  } = useTopology(selectedServerId, selectedVHost, isTopologyEnabled);

  const initialGraph = useMemo(() => {
    if (!topologyData) return { nodes: [], edges: [] };
    return buildTopologyGraph(
      topologyData.exchanges,
      topologyData.queues,
      topologyData.bindings,
      topologyData.consumers
    );
  }, [topologyData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);

  useEffect(() => {
    setNodes(initialGraph.nodes);
    setEdges(initialGraph.edges);
  }, [initialGraph, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "queueNode") {
        const queueName = (node.data as { label: string }).label;
        navigate(`/queues/${encodeURIComponent(queueName)}`);
      }
    },
    [navigate]
  );

  const colorMode: ColorMode = resolvedTheme === "dark" ? "dark" : "light";

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
                  <p className="text-muted-foreground">{t("pageSubtitle")}</p>
                </div>
              </div>
              <Card className="border-0 shadow-md bg-card">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-foreground mb-2">
                      {t("noServerSelected")}
                    </h2>
                    <p className="text-muted-foreground">
                      {t("selectServerPrompt")}
                    </p>
                  </div>
                </CardContent>
              </Card>
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
        <FeatureGate feature="topology_visualization" fallback={<PageLoader />}>
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="title-page">{t("pageTitle")}</h1>
                    <p className="text-muted-foreground">{t("pageSubtitle")}</p>
                  </div>
                </div>
              </div>

              <Card className="border-0 shadow-md bg-card">
                <CardContent className="p-0">
                  {error ? (
                    <div className="text-center py-8">
                      <div className="text-destructive mb-2">
                        {t("failedToLoad")}
                      </div>
                    </div>
                  ) : isLoading ? (
                    <div className="text-center py-16">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>{t("loadingTopology")}</p>
                    </div>
                  ) : nodes.length === 0 ? (
                    <div className="text-center py-16">
                      <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {t("noTopologyData")}
                      </h3>
                      <p className="text-muted-foreground">
                        {t("noTopologyDataDesc")}
                      </p>
                    </div>
                  ) : (
                    <div className="h-[70vh] w-full">
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        onNodeClick={onNodeClick}
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
                        <MiniMap
                          zoomable
                          pannable
                          nodeColor={(node) =>
                            node.type === "exchangeNode" ? "#3b82f6" : "#10b981"
                          }
                          nodeStrokeColor={(node) =>
                            node.type === "exchangeNode" ? "#2563eb" : "#059669"
                          }
                          nodeStrokeWidth={2}
                        />
                      </ReactFlow>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </FeatureGate>
      </div>
    </SidebarProvider>
  );
};

export default Topology;
