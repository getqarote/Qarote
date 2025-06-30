/**
 * Main routing visualization component with interactive diagrams
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ExchangeNode } from "./ExchangeNode";
import { QueueNode } from "./QueueNode";
import { MessageFlow } from "./MessageFlow";
import { VisualizationControls } from "./VisualizationControls";
import logger from "../../lib/logger";
import {
  ExchangeNode as ExchangeNodeType,
  QueueNode as QueueNodeType,
  MessageFlow as MessageFlowType,
  Binding,
  VisualizationSettings,
  FilterOptions,
  Position,
  SimulationConfig,
} from "./types";
import {
  autoLayoutNodes,
  generateSmoothPath,
  getNodeCenter,
  generateRandomMessage,
  calculateNodeSize,
  debounce,
  formatNumber,
} from "./utils";
import {
  GitBranch,
  Zap,
  AlertCircle,
  TrendingUp,
  Network,
  Activity,
} from "lucide-react";
import PremiumPageWrapper from "../PremiumPageWrapper";
import { WorkspacePlan } from "@/types/plans";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// Mock data for demonstration
const generateMockData = () => {
  const exchanges: ExchangeNodeType[] = [
    {
      id: "ex1",
      name: "user.events",
      type: "topic",
      position: { x: 100, y: 100 },
      size: calculateNodeSize("user.events", "exchange"),
      isActive: true,
      messageCount: 1250,
      routingKeys: ["user.created", "user.updated", "user.deleted"],
      bindings: [],
    },
    {
      id: "ex2",
      name: "orders.direct",
      type: "direct",
      position: { x: 100, y: 250 },
      size: calculateNodeSize("orders.direct", "exchange"),
      isActive: true,
      messageCount: 3420,
      routingKeys: ["order.created", "order.updated"],
      bindings: [],
    },
    {
      id: "ex3",
      name: "notifications.fanout",
      type: "fanout",
      position: { x: 100, y: 400 },
      size: calculateNodeSize("notifications.fanout", "exchange"),
      isActive: true,
      messageCount: 890,
      routingKeys: [],
      bindings: [],
    },
  ];

  const queues: QueueNodeType[] = [
    {
      id: "q1",
      name: "user-service",
      position: { x: 400, y: 80 },
      size: calculateNodeSize("user-service", "queue"),
      isActive: true,
      messageCount: 45,
      consumerCount: 2,
      messagesReady: 12,
      messagesUnacknowledged: 3,
    },
    {
      id: "q2",
      name: "audit-service",
      position: { x: 400, y: 160 },
      size: calculateNodeSize("audit-service", "queue"),
      isActive: true,
      messageCount: 23,
      consumerCount: 1,
      messagesReady: 8,
      messagesUnacknowledged: 1,
    },
    {
      id: "q3",
      name: "order-processor",
      position: { x: 400, y: 250 },
      size: calculateNodeSize("order-processor", "queue"),
      isActive: true,
      messageCount: 156,
      consumerCount: 3,
      messagesReady: 45,
      messagesUnacknowledged: 12,
    },
    {
      id: "q4",
      name: "email-service",
      position: { x: 400, y: 340 },
      size: calculateNodeSize("email-service", "queue"),
      isActive: true,
      messageCount: 67,
      consumerCount: 1,
      messagesReady: 23,
      messagesUnacknowledged: 5,
    },
    {
      id: "q5",
      name: "sms-service",
      position: { x: 400, y: 420 },
      size: calculateNodeSize("sms-service", "queue"),
      isActive: false,
      messageCount: 0,
      consumerCount: 0,
      messagesReady: 0,
      messagesUnacknowledged: 0,
    },
  ];

  const bindings: Binding[] = [
    {
      id: "b1",
      exchangeId: "ex1",
      queueId: "q1",
      routingKey: "user.*",
      isActive: true,
    },
    {
      id: "b2",
      exchangeId: "ex1",
      queueId: "q2",
      routingKey: "user.*",
      isActive: true,
    },
    {
      id: "b3",
      exchangeId: "ex2",
      queueId: "q3",
      routingKey: "order.created",
      isActive: true,
    },
    {
      id: "b4",
      exchangeId: "ex3",
      queueId: "q4",
      routingKey: "",
      isActive: true,
    },
    {
      id: "b5",
      exchangeId: "ex3",
      queueId: "q5",
      routingKey: "",
      isActive: false,
    },
  ];

  return { exchanges, queues, bindings };
};

export const RoutingVisualization: React.FC = () => {
  const { workspacePlan } = useWorkspace();
  const [data, setData] = useState(generateMockData());
  const [messageFlows, setMessageFlows] = useState<MessageFlowType[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    nodeId: string | null;
    offset: Position;
  }>({ isDragging: false, nodeId: null, offset: { x: 0, y: 0 } });

  const [settings, setSettings] = useState<VisualizationSettings>({
    showMessageFlow: true,
    showBindings: true,
    showInactiveNodes: true,
    animationSpeed: 1,
    autoLayout: false,
    theme: "light",
    nodeSpacing: 100,
    showStatistics: true,
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    exchangeTypes: ["direct", "topic", "headers", "fanout"],
    showEmptyQueues: true,
    showUnboundExchanges: true,
    routingKeyPattern: "",
    messageCountThreshold: 0,
  });

  const [simulation, setSimulation] = useState<SimulationConfig>({
    isEnabled: false,
    messageRate: 2,
    routingPatterns: [],
    duration: 0,
    autoGenerate: true,
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Filter data based on current filters
  const filteredData = React.useMemo(() => {
    const filteredExchanges = data.exchanges.filter((ex) => {
      if (!filterOptions.exchangeTypes.includes(ex.type)) return false;
      if (!settings.showInactiveNodes && !ex.isActive) return false;
      if (ex.messageCount < filterOptions.messageCountThreshold) return false;
      if (!filterOptions.showUnboundExchanges && ex.bindings.length === 0)
        return false;
      return true;
    });

    const filteredQueues = data.queues.filter((q) => {
      if (!settings.showInactiveNodes && !q.isActive) return false;
      if (!filterOptions.showEmptyQueues && q.messageCount === 0) return false;
      if (q.messageCount < filterOptions.messageCountThreshold) return false;
      return true;
    });

    return {
      ...data,
      exchanges: filteredExchanges,
      queues: filteredQueues,
    };
  }, [data, filterOptions, settings]);

  // Auto-layout when enabled
  useEffect(() => {
    if (settings.autoLayout) {
      const { exchanges, queues } = autoLayoutNodes(
        filteredData.exchanges,
        filteredData.queues,
        data.bindings,
        {
          type: "force",
          direction: "horizontal",
          spacing: { node: settings.nodeSpacing, level: 150 },
          animation: { enabled: true, duration: 1000, easing: "ease-out" },
        }
      );
      setData((prev) => ({ ...prev, exchanges, queues }));
    }
  }, [
    settings.autoLayout,
    settings.nodeSpacing,
    filteredData.exchanges,
    filteredData.queues,
    data.bindings,
  ]);

  // Simulation logic
  useEffect(() => {
    if (!simulation.isEnabled) return;

    const interval = setInterval(() => {
      const activeExchanges = filteredData.exchanges.filter(
        (ex) => ex.isActive
      );
      const activeQueues = filteredData.queues.filter((q) => q.isActive);

      if (activeExchanges.length === 0 || activeQueues.length === 0) return;

      // Generate random message flow
      const exchange =
        activeExchanges[Math.floor(Math.random() * activeExchanges.length)];
      const relatedBindings = data.bindings.filter(
        (b) => b.exchangeId === exchange.id && b.isActive
      );

      if (relatedBindings.length === 0) return;

      const binding =
        relatedBindings[Math.floor(Math.random() * relatedBindings.length)];
      const queue = activeQueues.find((q) => q.id === binding.queueId);

      if (!queue) return;

      const flowId = Math.random().toString(36).substr(2, 9);
      const exchangeCenter = getNodeCenter(exchange);
      const queueCenter = getNodeCenter(queue);
      const path = generateSmoothPath(exchangeCenter, queueCenter);

      const newFlow: MessageFlowType = {
        id: flowId,
        exchangeId: exchange.id,
        queueId: queue.id,
        routingKey: binding.routingKey || "default",
        message: generateRandomMessage(binding.routingKey || "default"),
        timestamp: Date.now(),
        status: "routing",
        progress: 0,
        path,
      };

      setMessageFlows((prev) => [...prev, newFlow]);

      // Animate the flow
      let progress = 0;
      const animateFlow = () => {
        progress += 0.02 * settings.animationSpeed;

        setMessageFlows((prev) =>
          prev.map((flow) =>
            flow.id === flowId
              ? {
                  ...flow,
                  progress: Math.min(progress, 1),
                  status: progress >= 1 ? "delivered" : "routing",
                }
              : flow
          )
        );

        if (progress < 1) {
          requestAnimationFrame(animateFlow);
        }
      };

      requestAnimationFrame(animateFlow);
    }, 1000 / simulation.messageRate);

    return () => clearInterval(interval);
  }, [
    simulation.isEnabled,
    simulation.messageRate,
    settings.animationSpeed,
    filteredData,
    data.bindings,
  ]);

  // Clean up completed message flows
  const handleFlowComplete = useCallback((flowId: string) => {
    setTimeout(() => {
      setMessageFlows((prev) => prev.filter((flow) => flow.id !== flowId));
    }, 1000);
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const node = [...filteredData.exchanges, ...filteredData.queues].find(
        (n) => n.id === nodeId
      );
      if (!node) return;

      setDragState({
        isDragging: true,
        nodeId,
        offset: {
          x: e.clientX - rect.left - node.position.x,
          y: e.clientY - rect.top - node.position.y,
        },
      });
    },
    [filteredData]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.isDragging || !dragState.nodeId) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const newPosition = {
        x: e.clientX - rect.left - dragState.offset.x,
        y: e.clientY - rect.top - dragState.offset.y,
      };

      setData((prev) => ({
        ...prev,
        exchanges: prev.exchanges.map((ex) =>
          ex.id === dragState.nodeId ? { ...ex, position: newPosition } : ex
        ),
        queues: prev.queues.map((q) =>
          q.id === dragState.nodeId ? { ...q, position: newPosition } : q
        ),
      }));
    },
    [dragState]
  );

  const handleMouseUp = useCallback(() => {
    setDragState({ isDragging: false, nodeId: null, offset: { x: 0, y: 0 } });
  }, []);

  // Metrics calculation
  const metrics = React.useMemo(() => {
    const totalNodes =
      filteredData.exchanges.length + filteredData.queues.length;
    const activeConnections = data.bindings.filter((b) => b.isActive).length;
    const messagesPerSecond = messageFlows.filter(
      (f) => f.status === "routing"
    ).length;
    const deliveredFlows = messageFlows.filter(
      (f) => f.status === "delivered"
    ).length;
    const totalFlows = messageFlows.length;
    const routingSuccessRate =
      totalFlows > 0 ? (deliveredFlows / totalFlows) * 100 : 100;

    return {
      totalNodes,
      activeConnections,
      messagesPerSecond,
      routingSuccessRate,
    };
  }, [filteredData, data.bindings, messageFlows]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <AppSidebar />

        <PremiumPageWrapper
          workspacePlan={workspacePlan}
          feature="Message Routing"
          featureDescription="is a powerful feature that helps you configure and monitor complex message routing patterns between exchanges and queues."
          requiredPlan="Developer or higher"
          preserveLayout={true}
        >
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white">
              <div className="px-6 py-8">
                <div className="flex items-center gap-4 mb-6">
                  <SidebarTrigger className="text-white hover:bg-white/20" />
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <GitBranch className="h-8 w-8" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold flex items-center gap-3">
                        Routing Visualization
                        <Badge
                          variant="secondary"
                          className="bg-white/20 text-white border-white/30"
                        >
                          New
                        </Badge>
                      </h1>
                      <p className="text-blue-100 mt-1">
                        Interactive diagrams showing real-time message flows
                        across exchanges
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-white/10 border-white/20 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Network className="w-5 h-5" />
                        <div>
                          <div className="text-2xl font-bold">
                            {metrics.totalNodes}
                          </div>
                          <div className="text-sm opacity-90">Total Nodes</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/10 border-white/20 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        <div>
                          <div className="text-2xl font-bold">
                            {metrics.activeConnections}
                          </div>
                          <div className="text-sm opacity-90">
                            Active Bindings
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/10 border-white/20 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        <div>
                          <div className="text-2xl font-bold">
                            {metrics.messagesPerSecond}
                          </div>
                          <div className="text-sm opacity-90">Msg/sec</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/10 border-white/20 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        <div>
                          <div className="text-2xl font-bold">
                            {metrics.routingSuccessRate.toFixed(1)}%
                          </div>
                          <div className="text-sm opacity-90">Success Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Canvas Area */}
              <div className="flex-1 relative">
                <div
                  ref={canvasRef}
                  className="w-full h-full relative bg-white overflow-hidden cursor-default"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Grid Background */}
                  <div className="absolute inset-0 opacity-10">
                    <svg width="100%" height="100%">
                      <defs>
                        <pattern
                          id="grid"
                          width="20"
                          height="20"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 20 0 L 0 0 0 20"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>

                  {/* Binding Lines */}
                  {settings.showBindings && (
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 5 }}
                    >
                      {data.bindings
                        .filter((binding) => binding.isActive)
                        .map((binding) => {
                          const exchange = filteredData.exchanges.find(
                            (ex) => ex.id === binding.exchangeId
                          );
                          const queue = filteredData.queues.find(
                            (q) => q.id === binding.queueId
                          );

                          if (!exchange || !queue) return null;

                          const start = getNodeCenter(exchange);
                          const end = getNodeCenter(queue);

                          return (
                            <line
                              key={binding.id}
                              x1={start.x}
                              y1={start.y}
                              x2={end.x}
                              y2={end.y}
                              stroke="#d1d5db"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                              className="transition-all duration-200"
                            />
                          );
                        })}
                    </svg>
                  )}

                  {/* Exchange Nodes */}
                  {filteredData.exchanges.map((exchange) => (
                    <ExchangeNode
                      key={exchange.id}
                      node={exchange}
                      isSelected={selectedNode === exchange.id}
                      isDragging={
                        dragState.isDragging && dragState.nodeId === exchange.id
                      }
                      onMouseDown={(e) => handleMouseDown(exchange.id, e)}
                      onClick={() => setSelectedNode(exchange.id)}
                      showMetrics={settings.showStatistics}
                    />
                  ))}

                  {/* Queue Nodes */}
                  {filteredData.queues.map((queue) => (
                    <QueueNode
                      key={queue.id}
                      node={queue}
                      isSelected={selectedNode === queue.id}
                      isDragging={
                        dragState.isDragging && dragState.nodeId === queue.id
                      }
                      onMouseDown={(e) => handleMouseDown(queue.id, e)}
                      onClick={() => setSelectedNode(queue.id)}
                      showMetrics={settings.showStatistics}
                    />
                  ))}

                  {/* Message Flows */}
                  {settings.showMessageFlow &&
                    messageFlows.map((flow) => {
                      const exchange = filteredData.exchanges.find(
                        (ex) => ex.id === flow.exchangeId
                      );
                      return exchange ? (
                        <MessageFlow
                          key={flow.id}
                          flow={flow}
                          exchangeType={exchange.type}
                          onComplete={handleFlowComplete}
                          animationSpeed={settings.animationSpeed}
                        />
                      ) : null;
                    })}

                  {/* Selected Node Info */}
                  {selectedNode && (
                    <div className="absolute top-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
                      {(() => {
                        const node = [
                          ...filteredData.exchanges,
                          ...filteredData.queues,
                        ].find((n) => n.id === selectedNode);
                        if (!node) return null;

                        const isExchange = "type" in node;
                        return (
                          <div>
                            <div className="font-semibold text-gray-800 mb-2">
                              {isExchange ? "Exchange" : "Queue"}: {node.name}
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              {isExchange && (
                                <div>
                                  Type: {(node as ExchangeNodeType).type}
                                </div>
                              )}
                              <div>
                                Messages: {formatNumber(node.messageCount)}
                              </div>
                              <div>
                                Status: {node.isActive ? "Active" : "Inactive"}
                              </div>
                              {!isExchange && (
                                <>
                                  <div>
                                    Consumers:{" "}
                                    {(node as QueueNodeType).consumerCount}
                                  </div>
                                  <div>
                                    Ready:{" "}
                                    {formatNumber(
                                      (node as QueueNodeType).messagesReady
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => setSelectedNode(null)}
                            >
                              Close
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Empty State */}
                  {filteredData.exchanges.length === 0 &&
                    filteredData.queues.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">
                            No nodes to display
                          </h3>
                          <p>Adjust your filters to see routing topology</p>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Controls Panel */}
              <VisualizationControls
                settings={settings}
                onSettingsChange={setSettings}
                filterOptions={filterOptions}
                onFilterChange={setFilterOptions}
                isSimulationRunning={simulation.isEnabled}
                onToggleSimulation={() =>
                  setSimulation((prev) => ({
                    ...prev,
                    isEnabled: !prev.isEnabled,
                  }))
                }
                onResetLayout={() => {
                  const { exchanges, queues } = autoLayoutNodes(
                    filteredData.exchanges,
                    filteredData.queues,
                    data.bindings,
                    {
                      type: "force",
                      direction: "horizontal",
                      spacing: { node: settings.nodeSpacing, level: 150 },
                      animation: {
                        enabled: true,
                        duration: 1000,
                        easing: "ease-out",
                      },
                    }
                  );
                  setData((prev) => ({ ...prev, exchanges, queues }));
                }}
                onExport={() => {
                  // TODO: Implement export functionality
                  logger.info("Export functionality would be implemented here");
                }}
                metrics={metrics}
              />
            </div>
          </main>
        </PremiumPageWrapper>
      </div>
    </SidebarProvider>
  );
};

export default RoutingVisualization;
