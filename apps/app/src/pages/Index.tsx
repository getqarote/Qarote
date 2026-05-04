import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ChevronDown } from "lucide-react";

import { UserRole } from "@/lib/api";

import { AddServerButton } from "@/components/AddServerButton";
import { ConnectedNodes } from "@/components/ConnectedNodes";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { HomeActiveConcerns } from "@/components/home/HomeActiveConcerns";
import { HomePulse } from "@/components/home/HomePulse";
import { HomeStatusBanner } from "@/components/home/HomeStatusBanner";
import { MessagesRatesChart } from "@/components/MessagesRatesChart";
import { MetricsStatusStrip } from "@/components/MetricsStatusStrip";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageErrorOrGate } from "@/components/PageErrorOrGate";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { QueueDepthsChart } from "@/components/QueueDepthsChart";
import { QueuedMessagesChart } from "@/components/QueuedMessagesChart";
import { RecentAlerts } from "@/components/RecentAlerts";
import { ResourceUsage } from "@/components/ResourceUsage";
import { TimeRange } from "@/components/TimeRangeSelector";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDiagnosis } from "@/hooks/queries/useDiagnosis";
import { useServers } from "@/hooks/queries/useServer";
import { useDashboardData } from "@/hooks/ui/useDashboardData";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const Index = () => {
  const { t } = useTranslation("dashboard");
  const { selectedServerId, hasServers } = useServerContext();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [liveRatesTimeRange, setLiveRatesTimeRange] = useState<TimeRange>("1d");
  const [activityExpanded, setActivityExpanded] = useState(false);

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

  const { hasFeature } = useFeatureFlags();
  const hasDiagnosis = hasFeature("incident_diagnosis");
  const { data: diagnosisData, isFetched: isDiagnosisFetched } = useDiagnosis(
    selectedServerId,
    120,
    { enabled: hasDiagnosis }
  );
  const diagnoses = diagnosisData?.diagnoses;
  const signalErrorCount = diagnosisData?.signalErrors?.length ?? 0;

  // Compute root-cause incident counts in one place. The status banner
  // takes a clean { critical, warning, total } shape — derived here
  // rather than letting the banner reason about the API's loose
  // `Record<string, number>` `severitySummary` (keyed by uppercase
  // severity strings, no `total` field). The MetricsStatusStrip below
  // also reads the same root count so the sidebar badge, the banner,
  // and the strip cannot disagree.
  const rootDiagnoses = hasDiagnosis
    ? (diagnoses?.filter((d) => !d.supersededBy) ?? [])
    : [];
  const rootDiagnosisCount =
    hasDiagnosis && isDiagnosisFetched ? rootDiagnoses.length : undefined;
  const bannerCounts =
    hasDiagnosis && isDiagnosisFetched
      ? {
          critical: rootDiagnoses.filter(
            (d) => d.severity === "CRITICAL" || d.severity === "HIGH"
          ).length,
          warning: rootDiagnoses.filter(
            (d) => d.severity === "MEDIUM" || d.severity === "LOW"
          ).length,
          total: rootDiagnoses.length,
        }
      : null;

  // Display name for the status banner. Fall back to host or a generic
  // label so the calm copy never reads "All quiet across undefined."
  const { data: serversData } = useServers();
  const selectedServer = serversData?.servers?.find(
    (s) => s.id === selectedServerId
  );
  const serverName =
    selectedServer?.name ?? selectedServer?.host ?? t("home.serverFallback");

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
          <h1 className="title-page">{t("home.title")}</h1>
        </div>
        <PageErrorOrGate
          error={overviewError}
          fallbackMessage={t("common:serverConnectionError")}
        />
      </PageShell>
    );
  }

  return (
    <PageShell bare>
      {/*
        Home rhythm — 4 zones per docs/plans/sidebar-redesign.md § Home:
          1. STATUS    — calm/amber/red banner, lead-with-state
          2. CONCERNS  — Diagnosis cards (root only) + recent alerts
          3. ACTIVITY  — KPI strip, totals, throughput, depths, nodes
          4. PULSE     — Daily Digest teaser
        Generous separation between zones (gap-10), tight rhythm within.
        Incident-mode hierarchy lives in the banner; the rest stays calm.
      */}
      <div className="content-container-large !space-y-10">
        {/* Toolbar — sidebar trigger + admin CTA. The status banner
            below now carries the "you are home" semantic role; we
            don't need a noisy H1 fighting it for attention. The
            visually-hidden h1 keeps the page accessible to screen
            readers and the document outline. */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="sr-only">{t("home.title")}</h1>
            </div>
            <div className="flex items-center gap-3">
              {user?.role === UserRole.ADMIN && <AddServerButton />}
            </div>
          </div>
          <ConnectionStatus />
        </div>

        {/* ZONE 1 — STATUS. Loud only when warranted. Tone derived from
            the root-incident counts. `null` counts mean diagnosis is
            unavailable for this server (no plan/license/capability)
            and the banner renders a neutral surface. */}
        <HomeStatusBanner
          serverName={serverName}
          counts={bannerCounts}
          isLoading={hasDiagnosis && !isDiagnosisFetched}
          signalErrorCount={signalErrorCount}
        />

        {/* ZONE 2 — CONCERNS. RecentAlerts is suppressed in incident mode
            (banner red) — three competing "look here" surfaces dilute the
            signal. When calm, the compact thin bar keeps the zone light. */}
        <HomeActiveConcerns
          diagnoses={diagnoses}
          isFetched={isDiagnosisFetched}
        />
        {(bannerCounts?.critical ?? 0) === 0 && <RecentAlerts />}

        {/* ZONE 3 — ACTIVITY. Collapsed by default so Home delivers on its
            "answer in <3 seconds" promise (zones 1+2+4). Operators who want
            the full KPI/chart view expand once and the state persists for
            the session. */}
        <Collapsible open={activityExpanded} onOpenChange={setActivityExpanded}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <span>{t("home.activity.label")}</span>
            <ChevronDown
              aria-hidden="true"
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${activityExpanded ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="space-y-10 pt-6">
              <MetricsStatusStrip
                metrics={metrics}
                isLoading={isLoading}
                metricsError={metricsError}
                nodesError={nodesError}
                diagnosisCount={rootDiagnosisCount}
              />

              <ResourceUsage overview={overview} overviewError={null} />

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

              <QueueDepthsChart queues={queues} isLoading={queuesLoading} />

              <ConnectedNodes
                nodes={nodes}
                isLoading={isLoading}
                nodesError={nodesError}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ZONE 4 — PULSE. Soft teaser for Daily Digest, contextualised
            to the active workspace. Hides itself while loading and when
            workspace context isn't resolved. */}
        <HomePulse />
      </div>
    </PageShell>
  );
};

export default Index;
