import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  MessageSquare,
  Clock,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Zap,
  RefreshCw,
} from "lucide-react";
import { TimeRange } from "@/components/MetricsChart";
import { QueueCard } from "@/components/QueueCard";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { RecentAlerts } from "@/components/RecentAlerts";
import { ResourceUsage } from "@/components/ResourceUsage";
import { ConnectedNodes } from "@/components/ConnectedNodes";
import { AddServerForm } from "@/components/AddServerForm";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import PlanUpgradeModal from "@/components/plans/PlanUpgradeModal";
import { useServerContext } from "@/contexts/ServerContext";
import { canUserAddServer, WorkspacePlan } from "@/lib/plans/planUtils";
import { Lock } from "lucide-react";

// Lazy load MetricsChart since it's a heavy charting component
const MetricsChart = lazy(() =>
  import("@/components/MetricsChart").then((module) => ({
    default: module.MetricsChart,
  }))
);
import {
  useOverview,
  useQueues,
  useNodes,
  useEnhancedMetrics,
  useTimeSeriesMetrics,
} from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const navigate = useNavigate();
  const { selectedServerId, hasServers } = useServerContext();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Plan checking
  const workspacePlan = WorkspacePlan.FREE; // TODO: Get from workspace context
  const canAddServer = canUserAddServer(workspacePlan);

  const handleAddServerClick = () => {
    if (!canAddServer) {
      setShowUpgradeModal(true);
    }
    // If canAddServer is true, AddServerForm will handle it
  };

  const {
    data: overviewData,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useOverview(selectedServerId || "");
  const {
    data: queuesData,
    isLoading: queuesLoading,
    refetch: refetchQueues,
  } = useQueues(selectedServerId || "");
  const {
    data: nodesData,
    isLoading: nodesLoading,
    refetch: refetchNodes,
  } = useNodes(selectedServerId || "");
  const {
    data: enhancedMetricsData,
    isLoading: enhancedMetricsLoading,
    refetch: refetchEnhancedMetrics,
  } = useEnhancedMetrics(selectedServerId || "");

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("1m");

  const {
    data: timeSeriesData,
    isLoading: timeSeriesLoading,
    refetch: refetchTimeSeries,
  } = useTimeSeriesMetrics(selectedServerId || "", selectedTimeRange);

  const [chartData, setChartData] = useState([
    { time: "00:00", messages: 0 },
    { time: "04:00", messages: 0 },
    { time: "08:00", messages: 0 },
    { time: "12:00", messages: 0 },
    { time: "16:00", messages: 0 },
    { time: "20:00", messages: 0 },
  ]);

  const overview = overviewData?.overview;
  const queues = queuesData?.queues || [];
  const nodes = useMemo(() => nodesData?.nodes || [], [nodesData?.nodes]);
  const enhancedMetrics = enhancedMetricsData?.metrics;

  // Use only server-calculated metrics
  const metrics = {
    messagesPerSec: Math.round(
      (overview?.message_stats?.publish_details?.rate || 0) +
        (overview?.message_stats?.deliver_details?.rate || 0)
    ),
    activeQueues: overview?.object_totals?.queues || 0,
    avgLatency: enhancedMetrics?.avgLatency || 0,
    queueDepth: overview?.queue_totals?.messages || 0,
    connectedNodes: nodes.length,
    totalMemory: enhancedMetrics?.totalMemoryGB || 0,
    cpuUsage: enhancedMetrics?.avgCpuUsage || 0,
    diskUsage: enhancedMetrics?.diskUsage || 0,
  };

  // Update chart data from time series API
  useEffect(() => {
    if (timeSeriesData?.timeseries) {
      setChartData(
        timeSeriesData.timeseries.map((point) => ({
          time: point.time,
          messages: point.messages,
        }))
      );
    }
  }, [timeSeriesData]);

  const handleRefresh = () => {
    if (selectedServerId) {
      refetchOverview();
      refetchQueues();
      refetchNodes();
      refetchTimeSeries();
    }
  };

  const handleTimeRangeChange = (timeRange: TimeRange) => {
    setSelectedTimeRange(timeRange);
    // The useTimeSeriesMetrics hook will automatically refetch when timeRange changes
  };

  const isLoading =
    overviewLoading || queuesLoading || nodesLoading || timeSeriesLoading;

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
              title="RabbitMQ Dashboard"
              subtitle="Welcome! Let's get started by adding your first RabbitMQ server"
              description="Add a RabbitMQ server connection to start monitoring your queues and messages."
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      RabbitMQ Dashboard
                    </h1>
                    <p className="text-gray-500">
                      Please select a RabbitMQ server to view the dashboard
                    </p>
                  </div>
                </div>
              </div>
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Please Select a Server
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Choose a RabbitMQ server from the sidebar to view its
                      dashboard.
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
                    RabbitMQ GUI Next
                  </h1>
                  <ConnectionStatus />
                </div>
              </div>
              <div className="flex gap-3">
                {canAddServer ? (
                  <AddServerForm />
                ) : (
                  <Button
                    onClick={handleAddServerClick}
                    disabled={true}
                    variant="outline"
                    className="flex items-center gap-2 opacity-60 cursor-not-allowed"
                    title="Upgrade to add servers"
                  >
                    <Lock className="w-4 h-4" />
                    Add Server
                    <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                      Pro
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Primary Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Messages/sec
                  </CardTitle>
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      {metrics.messagesPerSec.toLocaleString()}
                    </div>
                  )}
                  <p className="text-xs text-green-600 mt-1">Real-time data</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Active Queues
                  </CardTitle>
                  <Activity className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      {metrics.activeQueues}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Across all vhosts
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Queue Depth
                  </CardTitle>
                  <Zap className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      {metrics.queueDepth.toLocaleString()}
                    </div>
                  )}
                  <p className="text-xs text-orange-600 mt-1">
                    Total pending messages
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Avg Latency
                  </CardTitle>
                  <Clock className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      {metrics.avgLatency.toFixed(1)}ms
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Estimated latency
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Connected Nodes
                  </CardTitle>
                  <Server className="h-5 w-5 text-cyan-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-6 w-8" />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {metrics.connectedNodes}
                    </div>
                  )}
                  <p className="text-xs text-green-600 mt-1">
                    {nodes.every((node) => node.running)
                      ? "All nodes healthy"
                      : "Some issues detected"}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    CPU Usage
                  </CardTitle>
                  <Cpu className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {metrics.cpuUsage.toFixed(1)}%
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Cluster average</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Memory Usage
                  </CardTitle>
                  <HardDrive className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {metrics.totalMemory.toFixed(1)} GB
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Total allocated</p>
                </CardContent>
              </Card>
            </div>

            {/* Message Throughput Chart - Full Width */}
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Message Throughput
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Real-time message flow over the{" "}
                  {selectedTimeRange === "1m"
                    ? "last minute"
                    : selectedTimeRange === "10m"
                    ? "last 10 minutes"
                    : selectedTimeRange === "1h"
                    ? "last hour"
                    : selectedTimeRange === "8h"
                    ? "last 8 hours"
                    : "last 24 hours"}
                </p>
              </CardHeader>
              <CardContent>
                {timeSeriesLoading ? (
                  <div className="h-64 w-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-sm text-gray-500">
                        Loading metrics...
                      </p>
                    </div>
                  </div>
                ) : (
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-500">
                            Loading chart...
                          </span>
                        </div>
                      </div>
                    }
                  >
                    <MetricsChart
                      data={chartData}
                      onTimeRangeChange={handleTimeRangeChange}
                      selectedTimeRange={selectedTimeRange}
                      isLoading={timeSeriesLoading}
                    />
                  </Suspense>
                )}
              </CardContent>
            </Card>

            {/* Active Queues - Full Width Section */}
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Active Queues
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      Currently processing messages
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/queues")}
                  >
                    View All Queues
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {queuesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg border">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-20 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    ))}
                  </div>
                ) : queues.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {queues.slice(0, 6).map((queue, index) => (
                      <QueueCard key={queue.name} queue={queue} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No queues found on this server
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connected Nodes - Full Width */}
            <ConnectedNodes />

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentAlerts />
              <ResourceUsage metrics={metrics} overview={overview} />
            </div>
          </div>
        </main>
      </div>
      {showUpgradeModal && (
        <PlanUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlan={workspacePlan}
          feature="server management"
        />
      )}
    </SidebarProvider>
  );
};

export default Index;
