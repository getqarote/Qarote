import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Server } from "lucide-react";

import { UserRole } from "@/lib/api";

import { AddServerButton } from "@/components/AddServerButton";
import { AppSidebar } from "@/components/AppSidebar";
import { ConnectedNodes } from "@/components/ConnectedNodes";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { MessagesRatesChart } from "@/components/MessagesRatesChart";
import { MetricsStatusStrip } from "@/components/MetricsStatusStrip";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { QueueDepthsChart } from "@/components/QueueDepthsChart";
import { QueuedMessagesChart } from "@/components/QueuedMessagesChart";
import { RecentAlerts } from "@/components/RecentAlerts";
import { ResourceUsage } from "@/components/ResourceUsage";
import { TimeRange } from "@/components/TimeRangeSelector";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDashboardData } from "@/hooks/ui/useDashboardData";

const Index = () => {
  const { t } = useTranslation("dashboard");
  const { selectedServerId, hasServers } = useServerContext();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [liveRatesTimeRange, setLiveRatesTimeRange] = useState<TimeRange>("1d");

  // Check if user needs to create a workspace
  useEffect(() => {
    if (isAuthenticated && !user?.workspaceId) {
      navigate("/onboarding", { replace: true });
    }
    // Don't navigate to "/" when already on "/" - this prevents redirect loops
  }, [isAuthenticated, user?.workspaceId, navigate]);

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
    overviewError,
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
              title={t("rabbitMQDashboard")}
              subtitle={t("pageSubtitle")}
              description={t("addServerDescription")}
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
                    <h1 className="title-page">{t("rabbitMQDashboard")}</h1>
                    <p className="text-gray-500">{t("selectServerPrompt")}</p>
                  </div>
                </div>
              </div>
              <Card className="border-0 shadow-md bg-card">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {t("pleaseSelectServer")}
                    </h2>
                    <p className="text-gray-600 mb-4">
                      {t("chooseServerFromSidebar")}
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

  // Show error state when server is unreachable (500 errors)
  if (overviewError) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="title-page">{t("pageTitle")}</h1>
              </div>
              <PageError message={t("common:serverConnectionError")} />
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
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <h1 className="title-page">{t("pageTitle")}</h1>
                </div>
                <div className="flex items-center gap-3">
                  {user?.role === UserRole.ADMIN && <AddServerButton />}
                </div>
              </div>
              <ConnectionStatus />
            </div>

            {/* Compact status strip — replaces the 7-card hero grid.
                Calm baseline, threshold-driven color for sharp alerts. */}
            <MetricsStatusStrip
              metrics={metrics}
              isLoading={isLoading}
              metricsError={metricsError}
              nodesError={nodesError}
            />

            {/* Charts - Full Width Stacked */}
            {/* Queued Messages Chart - Full Width */}
            <QueuedMessagesChart
              queueTotals={queueTotals}
              isLoading={liveRatesLoading}
              error={liveRatesError}
              timeRange={liveRatesTimeRange}
              onTimeRangeChange={setLiveRatesTimeRange}
            />

            {/* Messages Rates Chart - Full Width */}
            <MessagesRatesChart
              messagesRates={liveRatesData?.messagesRates}
              ratesMode={liveRatesData?.ratesMode}
              isLoading={liveRatesLoading}
              error={liveRatesError}
              timeRange={liveRatesTimeRange}
              onTimeRangeChange={setLiveRatesTimeRange}
            />

            {/* Queue Depths Chart - Full Width */}
            <QueueDepthsChart queues={queues} isLoading={queuesLoading} />

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
