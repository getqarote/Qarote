import { useState } from "react";
import { Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { RecentAlerts } from "@/components/RecentAlerts";
import { ResourceUsage } from "@/components/ResourceUsage";
import { ConnectedNodes } from "@/components/ConnectedNodes";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import PlanUpgradeModal from "@/components/plans/PlanUpgradeModal";
import { AddServerButton } from "@/components/AddServerButton";
import { PrimaryMetricsCards } from "@/components/PrimaryMetricsCards";
import { SecondaryMetricsCards } from "@/components/SecondaryMetricsCards";
import { MessageThroughputChart } from "@/components/MessageThroughputChart";
import { ActiveQueuesSection } from "@/components/ActiveQueuesSection";
import { useServerContext } from "@/contexts/ServerContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDashboardData } from "@/hooks/useDashboardData";

const Index = () => {
  const { selectedServerId, hasServers, serverCount } = useServerContext();
  const { workspacePlan, isLoading: workspaceLoading } = useWorkspace();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const {
    overview,
    queues,
    nodes,
    metrics,
    chartData,
    isLoading,
    queuesLoading,
    timeSeriesLoading,
    selectedTimeRange,
    handleTimeRangeChange,
  } = useDashboardData(selectedServerId);

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
                    Dashboard
                  </h1>
                  <ConnectionStatus />
                </div>
              </div>
              <div className="flex gap-3">
                <AddServerButton
                  workspacePlan={workspacePlan}
                  serverCount={serverCount}
                  workspaceLoading={workspaceLoading}
                  onUpgradeClick={() => setShowUpgradeModal(true)}
                />
              </div>
            </div>

            {/* Primary Metrics Cards */}
            <PrimaryMetricsCards metrics={metrics} isLoading={isLoading} />

            {/* Secondary Metrics */}
            <SecondaryMetricsCards
              metrics={metrics}
              nodes={nodes}
              isLoading={isLoading}
            />

            {/* Message Throughput Chart - Full Width */}
            <MessageThroughputChart
              chartData={chartData}
              selectedTimeRange={selectedTimeRange}
              timeSeriesLoading={timeSeriesLoading}
              onTimeRangeChange={handleTimeRangeChange}
            />

            {/* Active Queues - Full Width Section */}
            <ActiveQueuesSection
              queues={queues}
              queuesLoading={queuesLoading}
            />

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
