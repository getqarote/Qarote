/**
 * Cockpit "What your agent sees right now" — the glance the agent reads.
 * Calm: "all quiet" + live metrics. Incident: a one-line concern summary
 * linking to /diagnosis — the card list it replaced duplicated the dashboard
 * this page exists to replace. Metrics strip + throughput charts below, with
 * a stale overlay when the broker is unreachable.
 *
 * Self-fetches its data (react-query dedupes shared queries) so the cockpit
 * page stays a thin composition.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Network, RefreshCw, Search } from "lucide-react";

import { formatRelativeAgo } from "@/lib/formatRelativeAgo";

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
import { TimeRangeSegmented } from "./TimeRangeSegmented";

// The calm banner's "no findings in the last N" window tracks the selected
// metrics range, but the findings lookback is capped server-side at
// [30 min, 8 h] (getIncidentDiagnosis windowMinutes). Sub-30m ranges floor to
// 30m and 1d ceils to 8h, so the banner always shows the window we actually
// queried — never a longer span than the diagnosis really inspected.
const RANGE_TO_MINUTES: Record<TimeRange, number> = {
  "1m": 1,
  "10m": 10,
  "1h": 60,
  "8h": 480,
  "1d": 1440,
};
const FINDINGS_MIN_MINUTES = 30;
const FINDINGS_MAX_MINUTES = 480;

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;

/** Compact, locale-neutral window label: 30 → "30m", 60 → "1h", 480 → "8h". */
function formatWindowLabel(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`;
}

export function WhatAgentSees() {
  const { t } = useTranslation("cockpit");
  // Chart-prompt strings live in the dashboard namespace (with the chart).
  const { t: tDash } = useTranslation("dashboard");
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

  // Findings lookback follows the selected range, clamped to the backend cap.
  const findingsWindowMinutes = Math.min(
    FINDINGS_MAX_MINUTES,
    Math.max(FINDINGS_MIN_MINUTES, RANGE_TO_MINUTES[timeRange])
  );

  const hasDiagnosis = !!selectedServerId;
  const {
    data: diagnosisData,
    isFetched: isDiagnosisFetched,
    isError: isDiagnosisError,
    dataUpdatedAt: diagnosisUpdatedAt,
  } = useDiagnosis(selectedServerId, findingsWindowMinutes, {
    enabled: hasDiagnosis,
  });
  const diagnoses = diagnosisData?.diagnoses;
  // Only trust the diagnosis state once the query SUCCEEDED with data — a
  // failed fetch is `isFetched` too, and would otherwise read as "all quiet".
  const diagnosisReady = isDiagnosisFetched && !isDiagnosisError && !!diagnoses;
  const rootDiagnoses = diagnosisReady
    ? diagnoses.filter((d) => !d.supersededBy)
    : [];
  const rootDiagnosisCount = diagnosisReady ? rootDiagnoses.length : undefined;
  const isCalm = diagnosisReady && rootDiagnoses.length === 0;

  // Worst-first, so the summary leads with the severity that matters.
  const bySeverity = rootDiagnoses.reduce<Record<string, number>>((acc, d) => {
    acc[d.severity] = (acc[d.severity] ?? 0) + 1;
    return acc;
  }, {});
  // Only worth showing when severities actually differ: with a single level
  // the breakdown just repeats the headline count ("2 concerns · 2 medium").
  const presentSeverities = SEVERITY_ORDER.filter((s) => bySeverity[s]);
  const severityBreakdown =
    presentSeverities.length > 1
      ? presentSeverities
          .map((s) =>
            t(`sees.concerns.severity.${s.toLowerCase()}`, {
              count: bySeverity[s],
            })
          )
          .join(", ")
      : "";
  const hasCritical = Boolean(bySeverity.CRITICAL);

  // Calm banner — two distinct facts: the window (follows the range) and the
  // scan freshness (relative, from when the diagnosis query last resolved).
  const calmWindowLabel = formatWindowLabel(findingsWindowMinutes);
  const lastScanAgo =
    isCalm && diagnosisUpdatedAt
      ? formatRelativeAgo(new Date(diagnosisUpdatedAt), t("sees.calm.justNow"))
      : null;

  // Incident marker for the throughput charts: anchored on the top root
  // finding. Built only when there's an active concern, so calm cockpits
  // pass `undefined` and the charts stay marker-free.
  const topDiagnosis = !isCalm ? rootDiagnoses[0] : undefined;
  const incidentMarker = topDiagnosis
    ? {
        timestamp: Date.parse(topDiagnosis.detectedAt),
        label: `${new Date(topDiagnosis.detectedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })} — ${topDiagnosis.description ?? topDiagnosis.queueName ?? ""}`,
        onSeeFinding: () =>
          document
            .getElementById("cockpit-concerns")
            ?.scrollIntoView({ block: "center", behavior: "smooth" }),
      }
    : undefined;

  // Context-built prompt for the Message-rates "Ask your agent" chip: an
  // incident-scoped question when a finding is active (substituting the real
  // queue name), otherwise a calm rate-exploration prompt. Series names stay
  // literal in the prompt so the agent maps them to RabbitMQ metrics.
  const ratesAskPrompt = topDiagnosis?.queueName
    ? tDash("chartAsk.ratesPromptIncident", { queue: topDiagnosis.queueName })
    : tDash("chartAsk.ratesPromptCalm");

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.12em] text-muted-foreground">
          <Search
            className="h-4 w-4 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          {t("sees.title")}
        </h2>
        <div className="flex items-center gap-2">
          <TimeRangeSegmented
            value={timeRange}
            onValueChange={setTimeRange}
            label={t("sees.timeRange.label")}
          />
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
      </div>

      {/* Calm / incident lead. Renders nothing until the diagnosis query has
          actually succeeded: a failed fetch leaves rootDiagnoses empty but
          isCalm false, which would otherwise print "0 concerns" — a false
          all-clear at the exact moment we know least. The card list this
          replaced guarded the same way. */}
      {!diagnosisReady ? null : isCalm ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-success/30 bg-success-muted px-4 py-3 text-sm">
          <span
            className="mt-px h-2 w-2 shrink-0 rounded-full bg-success"
            aria-hidden="true"
          />
          <span className="font-medium text-success">
            {t("sees.calm.headline", { window: calmWindowLabel })}
          </span>
          {lastScanAgo && (
            <span className="font-mono text-xs text-muted-foreground">
              · {t("sees.calm.lastScan", { ago: lastScanAgo })}
            </span>
          )}
        </div>
      ) : (
        // One line rather than a card list: the detail lives on /diagnosis and
        // the agent already has it through the MCP tools. Repeating it here
        // rebuilt the dashboard this page exists to replace.
        <div
          id="cockpit-concerns"
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-4 py-3 text-sm ${
            hasCritical
              ? "border-destructive/30 bg-destructive/10"
              : "border-warning/30 bg-warning-muted"
          }`}
        >
          <span
            className={`mt-px h-2 w-2 shrink-0 rounded-full ${
              hasCritical ? "bg-destructive" : "bg-warning"
            }`}
            aria-hidden="true"
          />
          <span
            className={`font-medium ${
              hasCritical ? "text-destructive" : "text-warning"
            }`}
          >
            {t("sees.concerns.headline", {
              count: rootDiagnoses.length,
              window: calmWindowLabel,
            })}
          </span>
          {severityBreakdown && (
            <span className="font-mono text-xs text-muted-foreground">
              · {severityBreakdown}
            </span>
          )}
          <Link
            to="/diagnosis"
            className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("sees.concerns.view")} →
          </Link>
        </div>
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

          {/* Cluster link sits directly under the metric tiles (right-aligned),
              mirroring the prototype's `.metrics__foot` — a small mono link,
              not a button. */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setClusterOpen(true)}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Network className="h-3.5 w-3.5" aria-hidden="true" />
              {t("sees.cluster")}
            </button>
          </div>

          {/* Time range is owned by the panel header's segmented control
              (single source of truth) — the charts receive the selected
              range for data but no change handler, so their per-chart
              selectors stay hidden. */}
          <div className="grid grid-cols-1 min-[1440px]:grid-cols-2 gap-6 [&>*]:min-w-0">
            <QueuedMessagesChart
              queueTotals={queueTotals}
              isLoading={liveRatesLoading || queuesLoading}
              error={liveRatesError}
              timeRange={timeRange}
              incidentMarker={incidentMarker}
              variant="sparkline"
            />
            <MessagesRatesChart
              messagesRates={liveRatesData?.messagesRates}
              ratesMode={liveRatesData?.ratesMode}
              isLoading={liveRatesLoading}
              error={liveRatesError}
              timeRange={timeRange}
              incidentMarker={incidentMarker}
              askPrompt={ratesAskPrompt}
              variant="sparkline"
            />
          </div>
        </div>
      </div>

      <ClusterDrawer open={clusterOpen} onOpenChange={setClusterOpen} />
    </section>
  );
}
