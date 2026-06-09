/**
 * Cockpit "What your agent sees right now" — the glance the agent reads.
 * Calm: "all quiet" + live metrics. Incident: the root diagnosis findings
 * (reusing HomeActiveConcerns → DiagnosisCard with on-demand ✨ Explain —
 * no auto-explain, per the agent-first plan). Metrics strip + throughput
 * charts below, with a stale overlay when the broker is unreachable.
 *
 * Self-fetches its data (react-query dedupes shared queries) so the cockpit
 * page stays a thin composition.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Network, RefreshCw } from "lucide-react";

import { HomeActiveConcerns } from "@/components/home/HomeActiveConcerns";
import { MessagesRatesChart } from "@/components/MessagesRatesChart";
import { MetricsStatusStrip } from "@/components/MetricsStatusStrip";
import { QueuedMessagesChart } from "@/components/QueuedMessagesChart";
import { TimeRange } from "@/components/TimeRangeSelector";
import { Button } from "@/components/ui/button";

import { useServerContext } from "@/contexts/ServerContext";

import { useDiagnosis } from "@/hooks/queries/useDiagnosis";
import { useMessageIdCoverage } from "@/hooks/queries/useMessageIdCoverage";
import { useOverview } from "@/hooks/queries/useRabbitMQ";
import { useDashboardData } from "@/hooks/ui/useDashboardData";

import { ClusterDrawer } from "./ClusterDrawer";

export function WhatAgentSees() {
  const { t } = useTranslation("cockpit");
  const { selectedServerId } = useServerContext();
  const [timeRange, setTimeRange] = useState<TimeRange>("1d");
  const [clusterOpen, setClusterOpen] = useState(false);

  const {
    metrics,
    liveRatesData,
    queueTotals,
    isLoading,
    queuesLoading,
    liveRatesLoading,
    metricsError,
    liveRatesError,
    nodesError,
  } = useDashboardData(selectedServerId, timeRange);

  const {
    isError: overviewError,
    isLoading: overviewLoading,
    data: overviewData,
    refetch: refetchOverview,
  } = useOverview(selectedServerId);
  // Same predicate as ConnectionBar so the two blocks never disagree on the
  // broker-down state (both read the one deduped overview query).
  const brokerUnreachable =
    overviewError || (!overviewLoading && !overviewData?.overview);

  const hasDiagnosis = !!selectedServerId;
  const {
    data: diagnosisData,
    isFetched: isDiagnosisFetched,
    isError: isDiagnosisError,
  } = useDiagnosis(selectedServerId, 120, { enabled: hasDiagnosis });
  const diagnoses = diagnosisData?.diagnoses;
  // Only trust the diagnosis state once the query SUCCEEDED with data — a
  // failed fetch is `isFetched` too, and would otherwise read as "all quiet".
  const diagnosisReady = isDiagnosisFetched && !isDiagnosisError && !!diagnoses;
  const rootDiagnoses = diagnosisReady
    ? diagnoses.filter((d) => !d.supersededBy)
    : [];
  const rootDiagnosisCount = diagnosisReady ? rootDiagnoses.length : undefined;
  const isCalm = diagnosisReady && rootDiagnoses.length === 0;

  const { data: coverageData, isHidden: coverageHidden } =
    useMessageIdCoverage(selectedServerId);
  const messageIdCoverage =
    !coverageHidden && coverageData && coverageData.firehoseEnabled
      ? {
          taggedPublishes: coverageData.taggedPublishes,
          totalPublishes: coverageData.totalPublishes,
        }
      : null;
  // Gate on isDiagnosisFetched so the message-id popover doesn't flash on
  // (suppress=false) for the brief window before diagnoses resolve.
  const suppressMessageIdPopover = Boolean(
    isDiagnosisFetched &&
    diagnoses?.some((d) => d.rule === "LOW_MESSAGE_ID_COVERAGE")
  );

  return (
    <section className="card-unified space-y-5" aria-label={t("sees.title")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="title-section">{t("sees.title")}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetchOverview()}
          aria-label={t("sees.refresh")}
          title={t("sees.refresh")}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Calm / incident lead */}
      {isCalm ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-muted px-4 py-3 text-sm">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-success"
            aria-hidden="true"
          />
          <span className="font-medium text-success">{t("sees.allQuiet")}</span>
        </div>
      ) : (
        <HomeActiveConcerns
          diagnoses={diagnoses}
          isFetched={isDiagnosisFetched}
        />
      )}

      {/* Live metrics + throughput — stale overlay when the broker is down */}
      <div className="relative">
        {brokerUnreachable && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/80 p-4 text-center backdrop-blur-xs">
            <Network
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {t("sees.staleMetrics")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetchOverview()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("sees.retry")}
            </Button>
          </div>
        )}

        {/* `inert` (React 19) removes pointer AND keyboard interaction and
            implies aria-hidden — avoids the focusable-but-aria-hidden defect
            that pointer-events-none + aria-hidden leaves behind. */}
        <div
          className={brokerUnreachable ? "space-y-5 opacity-40" : "space-y-5"}
          inert={brokerUnreachable}
        >
          <MetricsStatusStrip
            metrics={metrics}
            isLoading={isLoading}
            metricsError={metricsError}
            nodesError={nodesError}
            diagnosisCount={rootDiagnosisCount}
            messageIdCoverage={messageIdCoverage}
            suppressMessageIdPopover={suppressMessageIdPopover}
          />

          <div className="grid grid-cols-1 min-[1440px]:grid-cols-2 gap-6 [&>*]:min-w-0">
            <QueuedMessagesChart
              queueTotals={queueTotals}
              isLoading={liveRatesLoading || queuesLoading}
              error={liveRatesError}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
            <MessagesRatesChart
              messagesRates={liveRatesData?.messagesRates}
              ratesMode={liveRatesData?.ratesMode}
              isLoading={liveRatesLoading}
              error={liveRatesError}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClusterOpen(true)}
            >
              <Network className="h-4 w-4" aria-hidden="true" />
              {t("sees.clusterDetail")}
            </Button>
          </div>
        </div>
      </div>

      <ClusterDrawer open={clusterOpen} onOpenChange={setClusterOpen} />
    </section>
  );
}
