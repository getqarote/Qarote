import { useEffect, useState } from "react";
import { Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { RecentAlerts } from "@/components/RecentAlerts";
import { ResourceUsage } from "@/components/ResourceUsage";
import { ConnectedNodes } from "@/components/ConnectedNodes";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { AddServerButton } from "@/components/AddServerButton";
import { PrimaryMetricsCards } from "@/components/PrimaryMetricsCards";
import { SecondaryMetricsCards } from "@/components/SecondaryMetricsCards";
import { MessagesRatesChart } from "@/components/MessagesRatesChart";
import { QueuedMessagesChart } from "@/components/QueuedMessagesChart";
import { QueueDepthsChart } from "@/components/QueueDepthsChart";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { useServerContext } from "@/contexts/ServerContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/contexts/AuthContextDefinition";
import { useNavigate } from "react-router-dom";
import { TimeRange } from "@/components/TimeRangeSelector";

const Index = () => {
  const { selectedServerId, hasServers } = useServerContext();
  const { user, isAuthenticated, refetchUser } = useAuth();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [liveRatesTimeRange, setLiveRatesTimeRange] = useState<TimeRange>("1d");

  // Check if user needs to create a workspace
  useEffect(() => {
    if (isAuthenticated) {
      if (!user?.workspaceId) {
        navigate("/workspace", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, refetchUser]);

  const {
    overview,
    queues,
    nodes,
    metrics,
    liveRatesData,
    queueTotals,
    isLoading,
    queuesLoading,
    liveRatesLoading,
    liveRatesFetching,
    queuesFetching,
    overviewFetching,
    nodesFetching,
    enhancedMetricsFetching,
    metricsError,
    liveRatesError,
    nodesError,
  } = useDashboardData(selectedServerId, liveRatesTimeRange);

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
              title="RabbitMQ Dashboard"
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
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="title-page">RabbitMQ Dashboard</h1>
                    <p className="text-gray-500">
                      Please select a RabbitMQ server to view the dashboard
                    </p>
                  </div>
                </div>
                <PlanBadge />
              </div>
              <Card className="border-0 shadow-md bg-card">
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
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="content-container-large">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="title-page">Dashboard</h1>
                  <ConnectionStatus />
                </div>
              </div>
              <div className="flex gap-3">
                <PlanBadge />
                <AddServerButton />
              </div>
            </div>

            {/* Primary Metrics Cards */}
            <PrimaryMetricsCards
              metrics={metrics}
              isLoading={isLoading}
              metricsError={metricsError}
              overviewFetching={overviewFetching}
              enhancedMetricsFetching={enhancedMetricsFetching}
            />

            {/* Secondary Metrics */}
            <SecondaryMetricsCards
              metrics={metrics}
              isLoading={isLoading}
              metricsError={metricsError}
              nodesError={nodesError}
              nodesFetching={nodesFetching}
              enhancedMetricsFetching={enhancedMetricsFetching}
            />

            {/* Charts - Full Width Stacked */}
            {/* Queued Messages Chart - Full Width */}
            <QueuedMessagesChart
              queueTotals={queueTotals}
              isLoading={liveRatesLoading}
              isFetching={liveRatesFetching}
              error={liveRatesError}
              timeRange={liveRatesTimeRange}
              onTimeRangeChange={setLiveRatesTimeRange}
            />

            {/* Messages Rates Chart - Full Width */}
            <MessagesRatesChart
              messagesRates={liveRatesData?.messagesRates}
              isLoading={liveRatesLoading}
              isFetching={liveRatesFetching}
              error={liveRatesError}
              timeRange={liveRatesTimeRange}
              onTimeRangeChange={setLiveRatesTimeRange}
            />

            {/* Queue Depths Chart - Full Width */}
            <QueueDepthsChart
              queues={queues}
              isLoading={queuesLoading}
              isFetching={queuesFetching}
            />

            {/* Connected Nodes - Full Width */}
            <ConnectedNodes
              nodes={nodes}
              isLoading={isLoading}
              nodesError={nodesError}
            />

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentAlerts />
              <ResourceUsage
                metrics={metrics}
                overview={overview}
                metricsError={metricsError}
                overviewError={null}
              />
            </div>
          </div>
        </main>
      </div>
      {showUpgradeModal && (
        <PlanUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="server management"
        />
      )}
    </SidebarProvider>
  );
};

export default Index;
