import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { HelpCircle, RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { ChartIncidentMarker, matchIncidentTime } from "@/lib/chart-utils";
import {
  CHART_QUEUED_READY,
  CHART_QUEUED_TOTAL,
  CHART_QUEUED_UNACKED,
} from "@/lib/chartColors";
import { copyToClipboard } from "@/lib/clipboard";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { TimeRange, TimeRangeSelector } from "@/components/TimeRangeSelector";
import { IconSparkle } from "@/components/ui/icons";
import { FlowLoader } from "@/components/ui/loaders/FlowLoader";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface QueuedMessagesChartProps {
  queueTotals?: Array<{
    timestamp: number;
    messages?: number;
    messages_ready?: number;
    messages_unacknowledged?: number;
  }>;
  isLoading: boolean;
  error?: Error | null;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  incidentMarker?: ChartIncidentMarker;
  /**
   * Visual density. "full" (default) keeps the dashboard chrome (axes, grid,
   * chip-grid legend, updates pill). "sparkline" strips the chrome down to a
   * minimalist filled area for the agent cockpit: hidden axes, no grid,
   * reduced height, a single-row inline legend, and a synthesis value in the
   * header instead of the updates pill. The recharts engine and the incident
   * marker / annotation / "ask your agent" chip are preserved in both modes.
   */
  variant?: "full" | "sparkline";
}

export const QueuedMessagesChart = ({
  queueTotals,
  isLoading,
  error,
  timeRange = "1h",
  onTimeRangeChange,
  incidentMarker,
  variant = "full",
}: QueuedMessagesChartProps) => {
  const { t } = useTranslation("dashboard");
  const isSparkline = variant === "sparkline";

  // State for toggling line visibility
  const [visibleLines, setVisibleLines] = useState({
    total: true,
    ready: true,
    unacked: true,
  });

  // Toggle line visibility
  const toggleLine = (metricName: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [metricName]: !prev[metricName],
    }));
  };

  const emptyPoint = {
    total: 0,
    ready: 0,
    unacked: 0,
  };

  const mappedData = queueTotals?.map((point) => ({
    timestamp: point.timestamp,
    time: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    dateTime: new Date(point.timestamp).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    total: point.messages || 0,
    ready: point.messages_ready || 0,
    unacked: point.messages_unacknowledged || 0,
  }));

  // Only generate placeholder data when queueTotals is a defined
  // empty array (no queues exist). When undefined, data is
  // unavailable — don't fake zeros. Memoized so `Date.now()` is
  // only called when the data shape changes, not on every render.
  const chartData = useMemo(() => {
    if (mappedData === undefined) return undefined;
    if (mappedData.length > 0) return mappedData;
    const now = Date.now();
    return Array.from({ length: 7 }, (_, i) => {
      const ts = now - (6 - i) * 10000;
      return {
        ...emptyPoint,
        timestamp: ts,
        time: new Date(ts).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dateTime: "",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedData?.length]);

  // Map the incident timestamp onto the rendered XAxis category, or null when
  // the incident falls outside this chart's window.
  const incidentTime = incidentMarker
    ? matchIncidentTime(chartData, incidentMarker.timestamp)
    : null;

  // Calm detection (sparkline case 1): data is DEFINED and present, but every
  // relevant series value (total + ready + unacked) is 0 across all points.
  // This is a legitimate "quiet — no traffic" state, distinct from missing
  // data (isLoading) or a down broker (parent overlay). Memoized on the data
  // length so it only recomputes when the series shape changes.
  const allZero = useMemo(() => {
    if (!mappedData || mappedData.length === 0) return false;
    return mappedData.every(
      (point) => point.total === 0 && point.ready === 0 && point.unacked === 0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedData?.length, mappedData]);

  // Current-value chip (mirrors the prototype's `chart__val`): latest `total`
  // with a trend arrow vs the previous point. Derived from real data only —
  // hidden while loading or when the series is empty (placeholder zeros).
  const headerValue = useMemo(() => {
    if (!mappedData || mappedData.length === 0) return null;
    const last = mappedData[mappedData.length - 1];
    const prev =
      mappedData.length > 1 ? mappedData[mappedData.length - 2] : undefined;
    const trend =
      prev === undefined || last.total === prev.total
        ? ""
        : last.total > prev.total
          ? " ↑"
          : " ↓";
    return `${last.total.toLocaleString()}${trend}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedData?.length, mappedData?.[mappedData.length - 1]?.total]);

  const askPrompt = t("chartAsk.queuedPrompt");
  const copyAskPrompt = async () => {
    if (await copyToClipboard(askPrompt)) {
      toast.success(t("chartAsk.copied"));
    } else {
      toast.error(t("chartAsk.copyFailed"));
    }
  };

  // Handle permission errors — rendered AFTER all hooks to satisfy
  // the rules-of-hooks invariant.
  if (error && isRabbitMQAuthError(error)) {
    return (
      <RabbitMQPermissionError
        requiredPermission={error.requiredPermission}
        message={error.message}
        title={t("cannotViewQueuedMessages")}
      />
    );
  }

  // Curated sparkline legend series (ready + unacked). Total is the stack
  // sum, not a third series, in this mode.
  const sparkMetrics = [
    { key: "ready" as const, name: t("ready"), color: CHART_QUEUED_READY },
    {
      key: "unacked" as const,
      name: t("unacked"),
      color: CHART_QUEUED_UNACKED,
    },
  ];

  // ── Sparkline branch (agent cockpit) ────────────────────────────────────
  // SparkCard shell from docs/reference/cockpitCharts.reference.tsx: a clean
  // bordered card with a header synthesis value (no "updates every 5s" pill,
  // no help-tooltip), an axis-free 140px stacked area, the incident
  // annotation, and the "ask your agent" chip.
  if (isSparkline) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="title-section text-base">{t("queuedMessages")}</h3>
          {!isLoading && headerValue && (
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {headerValue}
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="flex h-[140px] w-full flex-col items-center justify-center gap-2">
            <FlowLoader size={120} />
            <span className="font-mono text-xs text-muted-foreground">
              {t("chartState.collecting")}
            </span>
          </div>
        ) : (
          <>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="queuedSparkReady"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={CHART_QUEUED_READY}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_QUEUED_READY}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="queuedSparkUnacked"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={CHART_QUEUED_UNACKED}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_QUEUED_UNACKED}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                    hide
                  />
                  {incidentTime !== null && (
                    <ReferenceLine
                      x={incidentTime}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="3 3"
                      strokeOpacity={0.7}
                      ifOverflow="extendDomain"
                    />
                  )}
                  {visibleLines.ready && (
                    <Area
                      type="monotone"
                      dataKey="ready"
                      stackId="q"
                      stroke={CHART_QUEUED_READY}
                      strokeWidth={1.6}
                      fill="url(#queuedSparkReady)"
                      dot={false}
                      isAnimationActive={false}
                      name={t("ready")}
                    />
                  )}
                  {visibleLines.unacked && (
                    <Area
                      type="monotone"
                      dataKey="unacked"
                      stackId="q"
                      stroke={CHART_QUEUED_UNACKED}
                      strokeWidth={1.6}
                      fill="url(#queuedSparkUnacked)"
                      dot={false}
                      isAnimationActive={false}
                      name={t("unacked")}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Calm (case 1): data present but every series is 0 — replace
                the legend with a single muted "quiet" note. Otherwise the
                one-line SparkLegend: dot + label toggle buttons. */}
            {allZero ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("chartState.quiet")}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {sparkMetrics.map((metric) => {
                  const on = visibleLines[metric.key];
                  return (
                    <button
                      key={metric.key}
                      type="button"
                      onClick={() => toggleLine(metric.key)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 transition-opacity ${
                        on ? "" : "opacity-40"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: metric.color }}
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">
                        {metric.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {incidentMarker && incidentTime !== null && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                  aria-hidden="true"
                />
                <span>{incidentMarker.label}</span>
                {incidentMarker.onSeeFinding && (
                  <button
                    type="button"
                    onClick={incidentMarker.onSeeFinding}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {t("chartAsk.seeFinding")}
                  </button>
                )}
              </p>
            )}
            {/* No "Ask your agent" chip here — Queued messages is just
                ready/unacked; the agent-first bridge lives only on Message
                rates (where the deep series breakdown is delegated). */}
          </>
        )}
      </div>
    );
  }

  // ── Full branch (dashboard / QueueDetail) ───────────────────────────────
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="title-section">{t("queuedMessages")}</h2>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-3">
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{t("queuedMessageDefinitions")}</p>
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong>Total:</strong> {t("defTotal")}
                    </p>
                    <p>
                      <strong>Ready:</strong> {t("defReady")}
                    </p>
                    <p>
                      <strong>Unacked:</strong> {t("defUnacked")}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("queuedMetricsNote")}
                  </p>
                </div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
          {!isLoading && headerValue && (
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {headerValue}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">
              {t("updatesEvery5s")}
            </span>
          </div>
          {onTimeRangeChange && (
            <TimeRangeSelector
              value={timeRange}
              onValueChange={onTimeRangeChange}
            />
          )}
        </div>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="h-64 w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("loadingQueuedMessages")}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                >
                  <defs>
                    <linearGradient
                      id="queuedFillTotal"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={CHART_QUEUED_TOTAL}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_QUEUED_TOTAL}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="queuedFillReady"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={CHART_QUEUED_READY}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_QUEUED_READY}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="queuedFillUnacked"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={CHART_QUEUED_UNACKED}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_QUEUED_UNACKED}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    interval="preserveStartEnd"
                    stroke="hsl(var(--border))"
                    tick={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                    label={{
                      value: t("messagesUnit"),
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                    }}
                    stroke="hsl(var(--border))"
                    tick={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} ${t("messagesUnit")}`,
                      name === "total"
                        ? t("total")
                        : name === "ready"
                          ? t("ready")
                          : name === "unacked"
                            ? t("unacked")
                            : name,
                    ]}
                    labelFormatter={(
                      time: string,
                      payload: ReadonlyArray<{ payload: { dateTime: string } }>
                    ) => {
                      if (payload && payload[0] && payload[0].payload) {
                        return t("dateAndTime", {
                          dateTime: payload[0].payload.dateTime,
                        });
                      }
                      return t("timeLabel", { time });
                    }}
                  />
                  {incidentTime !== null && (
                    <ReferenceLine
                      x={incidentTime}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="3 3"
                      strokeOpacity={0.7}
                      ifOverflow="extendDomain"
                    />
                  )}
                  {visibleLines.total && (
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={CHART_QUEUED_TOTAL}
                      strokeWidth={2}
                      fill="url(#queuedFillTotal)"
                      dot={false}
                      name={t("total")}
                    />
                  )}
                  {visibleLines.ready && (
                    <Area
                      type="monotone"
                      dataKey="ready"
                      stroke={CHART_QUEUED_READY}
                      strokeWidth={2}
                      fill="url(#queuedFillReady)"
                      dot={false}
                      name={t("ready")}
                    />
                  )}
                  {visibleLines.unacked && (
                    <Area
                      type="monotone"
                      dataKey="unacked"
                      stroke={CHART_QUEUED_UNACKED}
                      strokeWidth={2}
                      fill="url(#queuedFillUnacked)"
                      dot={false}
                      name={t("unacked")}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Toggleable Legend — the chip grid. */}
            {(() => {
              const metrics = [
                { key: "total", name: t("total"), color: CHART_QUEUED_TOTAL },
                { key: "ready", name: t("ready"), color: CHART_QUEUED_READY },
                {
                  key: "unacked",
                  name: t("unacked"),
                  color: CHART_QUEUED_UNACKED,
                },
              ] as const;

              return (
                <div className="mt-4 flex gap-4 text-xs">
                  {metrics.map((metric) => (
                    <div
                      key={metric.key}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        visibleLines[metric.key]
                          ? "bg-accent hover:bg-accent/80"
                          : "bg-muted hover:bg-muted/80 opacity-60"
                      }`}
                      onClick={() => toggleLine(metric.key)}
                    >
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: metric.color }}
                      />
                      <span className="text-foreground">{metric.name}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {incidentMarker && incidentTime !== null && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-destructive"
                  aria-hidden="true"
                />
                <span>{incidentMarker.label}</span>
                {incidentMarker.onSeeFinding && (
                  <button
                    type="button"
                    onClick={incidentMarker.onSeeFinding}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("chartAsk.seeFinding")}
                  </button>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {t("chartAsk.queuedHint")}
              </span>
              <button
                type="button"
                onClick={copyAskPrompt}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <IconSparkle size={14} aria-hidden="true" />
                {t("chartAsk.askButton")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
