import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { UserRole } from "@/lib/api";

import { AddServerButton } from "@/components/AddServerButton";
import { ConnectedNodes } from "@/components/ConnectedNodes";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { MessagesRatesChart } from "@/components/MessagesRatesChart";
import { MetricsStatusStrip } from "@/components/MetricsStatusStrip";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { QueueDepthsChart } from "@/components/QueueDepthsChart";
import { QueuedMessagesChart } from "@/components/QueuedMessagesChart";
import { RecentAlerts } from "@/components/RecentAlerts";
import { ResourceUsage } from "@/components/ResourceUsage";
import { TimeRange } from "@/components/TimeRangeSelector";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDashboardData } from "@/hooks/ui/useDashboardData";

const Index = () => {
  const { t } = useTranslation("dashboard");
  const { selectedServerId, hasServers } = useServerContext();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
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
      <PageShell bare>
        <NoServerConfigured
          title={t("rabbitMQDashboard")}
          subtitle={t("pageSubtitle")}
          description={t("addServerDescription")}
        />
      </PageShell>
    );
  }

  if (!selectedServerId) {
    return (
      <PageShell>
        <NoServerSelectedCard
          title={t("rabbitMQDashboard")}
          subtitle={t("pageSubtitle")}
          heading={t("pleaseSelectServer")}
          description={t("chooseServerFromSidebar")}
        />
      </PageShell>
    );
  }

  if (overviewError) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="title-page">{t("pageTitle")}</h1>
        </div>
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  return (
    <PageShell bare>
      {/*
        Dashboard rhythm (arrange pass):
        header → SUMMARY → ISSUES → FLOW → BREAKDOWN → INFRA
        Tight spacing within groups, generous space-y-10 between
        sections. Incident-mode hierarchy: problems jump, healthy
        state is calm.
      */}
      <div className="content-container-large !space-y-10">
        {/* Header — tight grouping, title + connection + CTA */}
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

        {/* SUMMARY — compact status strip + cluster totals inline. */}
        <MetricsStatusStrip
          metrics={metrics}
          isLoading={isLoading}
          metricsError={metricsError}
          nodesError={nodesError}
        />

        {/* CLUSTER TOTALS — inline stat line: connections, channels,
            consumers, exchanges. Matches health-pill pattern. */}
        <ResourceUsage overview={overview} overviewError={null} />

        {/* ISSUES — promoted from the bottom of the page. When there are
            active alerts this is the most important thing on screen. When
            empty, the component collapses to a quiet "all systems normal"
            state, so it costs almost no space in the healthy case. */}
        <RecentAlerts />

        {/* FLOW — throughput story. Queued volume and message rates side
            by side starting at 1440px. */}
        <div className="grid grid-cols-1 min-[1440px]:grid-cols-2 gap-6 [&>*]:min-w-0">
          <QueuedMessagesChart
            queueTotals={queueTotals}
            isLoading={liveRatesLoading}
            error={liveRatesError}
            timeRange={liveRatesTimeRange}
            onTimeRangeChange={setLiveRatesTimeRange}
          />
          <MessagesRatesChart
            messagesRates={liveRatesData?.messagesRates}
            ratesMode={liveRatesData?.ratesMode}
            isLoading={liveRatesLoading}
            error={liveRatesError}
            timeRange={liveRatesTimeRange}
            onTimeRangeChange={setLiveRatesTimeRange}
          />
        </div>

        {/* BREAKDOWN — per-queue depths. Full width because the chart
            benefits from horizontal space when many queues are present. */}
        <QueueDepthsChart queues={queues} isLoading={queuesLoading} />

        {/* INFRA — node health with collapsible detail rows. Full width. */}
        <ConnectedNodes
          nodes={nodes}
          isLoading={isLoading}
          nodesError={nodesError}
        />
      </div>
    </PageShell>
  );
};

export default Index;
