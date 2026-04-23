import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import {
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CHART_ACK,
  CHART_CONFIRM,
  CHART_DELIVER,
  CHART_DELIVER_GET,
  CHART_DELIVER_NO_ACK,
  CHART_DISK_READS,
  CHART_DISK_WRITES,
  CHART_DROP_UNROUTABLE,
  CHART_GET,
  CHART_GET_EMPTY,
  CHART_GET_NO_ACK,
  CHART_PUBLISH,
  CHART_REDELIVER,
  CHART_REJECT,
  CHART_RETURN_UNROUTABLE,
} from "@/lib/chartColors";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { TimeRange, TimeRangeSelector } from "@/components/TimeRangeSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface MessagesRatesChartProps {
  messagesRates?: Array<{
    timestamp: number;
    publish?: number;
    deliver?: number;
    ack?: number;
    deliver_get?: number;
    deliver_no_ack?: number;
    confirm?: number;
    get?: number;
    get_no_ack?: number;
    get_empty?: number;
    redeliver?: number;
    reject?: number;
    return_unroutable?: number;
    drop_unroutable?: number;
    disk_reads?: number;
    disk_writes?: number;
  }>;
  ratesMode?: "detailed" | "basic" | "none";
  isLoading: boolean;
  error?: Error | null;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}

export const MessagesRatesChart = ({
  messagesRates,
  ratesMode,
  isLoading,
  error,
  timeRange = "1d",
  onTimeRangeChange,
}: MessagesRatesChartProps) => {
  const { t } = useTranslation("dashboard");

  // State for toggling line visibility.
  //
  // The 10 most-common series (publish, deliver, ack, ...) are visible by
  // default. The 5 "advanced" series (get_empty, return_unroutable,
  // drop_unroutable, disk_writes, disk_reads) are hidden by default and
  // revealed via the "Show advanced" toggle below — this prevents the chart
  // from rendering 15 overlapping lines on first paint, which is unreadable
  // even with a deliberately curated palette.
  const [visibleLines, setVisibleLines] = useState({
    publish: true,
    deliver: true,
    ack: true,
    deliver_get: true,
    deliver_no_ack: true,
    confirm: true,
    get: true,
    get_no_ack: true,
    redeliver: true,
    reject: true,
    // Advanced — start hidden, flipped on by the toggle below
    get_empty: false,
    return_unroutable: false,
    drop_unroutable: false,
    disk_reads: false,
    disk_writes: false,
  });

  // Whether the "advanced" legend section and its 5 series are revealed.
  // Tracks visibleLines for the 5 advanced keys; toggling this flips all of
  // them together.
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const toggleAdvanced = () => {
    setAdvancedExpanded((prev) => {
      const next = !prev;
      setVisibleLines((current) => ({
        ...current,
        get_empty: next,
        return_unroutable: next,
        drop_unroutable: next,
        disk_reads: next,
        disk_writes: next,
      }));
      return next;
    });
  };

  // Toggle line visibility
  const toggleLine = (metricName: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [metricName]: !prev[metricName],
    }));
  };

  const emptyPoint = {
    publish: 0,
    deliver: 0,
    ack: 0,
    deliver_get: 0,
    deliver_no_ack: 0,
    confirm: 0,
    get: 0,
    get_no_ack: 0,
    get_empty: 0,
    redeliver: 0,
    reject: 0,
    return_unroutable: 0,
    drop_unroutable: 0,
    disk_reads: 0,
    disk_writes: 0,
  };

  const mappedData = messagesRates?.map((point) => ({
    timestamp: point.timestamp,
    time: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    dateTime: new Date(point.timestamp).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    publish: point.publish || 0,
    deliver: point.deliver || 0,
    ack: point.ack || 0,
    deliver_get: point.deliver_get || 0,
    deliver_no_ack: point.deliver_no_ack || 0,
    confirm: point.confirm || 0,
    get: point.get || 0,
    get_no_ack: point.get_no_ack || 0,
    get_empty: point.get_empty || 0,
    redeliver: point.redeliver || 0,
    reject: point.reject || 0,
    return_unroutable: point.return_unroutable || 0,
    drop_unroutable: point.drop_unroutable || 0,
    disk_reads: point.disk_reads || 0,
    disk_writes: point.disk_writes || 0,
  }));

  // Generate placeholder data when no rates exist so the chart
  // renders axes/grid. Memoized on `mappedData.length` so the 7
  // placeholder timestamps are stable across renders when they
  // do appear — `Date.now()` during render is an impure call and
  // the React 19 compiler rejects it in the render body.
  const chartData = useMemo(() => {
    if (mappedData && mappedData.length > 0) return mappedData;
    const now = Date.now();
    return Array.from({ length: 7 }, (_, i) => {
      const ts = now - (6 - i) * 10000;
      return {
        ...emptyPoint,
        timestamp: ts,
        time: new Date(ts).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        dateTime: "",
      };
    });
    // `mappedData` is a derived local, not stable across renders.
    // Compare on its length so we only regenerate when the array
    // goes from populated back to empty (or vice versa).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedData?.length]);

  // Handle permission errors — rendered AFTER all hooks to satisfy
  // the rules-of-hooks invariant that every render calls the same
  // hooks in the same order.
  if (error && isRabbitMQAuthError(error)) {
    return (
      <RabbitMQPermissionError
        requiredPermission={error.requiredPermission}
        message={error.message}
        title={t("cannotViewLiveRates")}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="title-section">{t("messagesRates")}</h2>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-3">
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{t("messageRateDefinitions")}</p>
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong>{t("legendPublish")}:</strong> {t("defPublish")}
                    </p>
                    <p>
                      <strong>{t("legendDeliver")}:</strong> {t("defDeliver")}
                    </p>
                    <p>
                      <strong>{t("legendAck")}:</strong> {t("defAck")}
                    </p>
                    <p>
                      <strong>{t("legendDeliverGet")}:</strong>{" "}
                      {t("defDeliverGet")}
                    </p>
                    <p>
                      <strong>{t("legendDeliverNoAck")}:</strong>{" "}
                      {t("defDeliverNoAck")}
                    </p>
                    <p>
                      <strong>{t("legendConfirm")}:</strong> {t("defConfirm")}
                    </p>
                    <p>
                      <strong>{t("legendGet")}:</strong> {t("defGet")}
                    </p>
                    <p>
                      <strong>{t("legendGetNoAck")}:</strong> {t("defGetNoAck")}
                    </p>
                    <p>
                      <strong>{t("legendGetEmpty")}:</strong> {t("defGetEmpty")}
                    </p>
                    <p>
                      <strong>{t("legendRedeliver")}:</strong>{" "}
                      {t("defRedeliver")}
                    </p>
                    <p>
                      <strong>{t("legendReject")}:</strong> {t("defReject")}
                    </p>
                    <p>
                      <strong>{t("legendReturnUnroutable")}:</strong>{" "}
                      {t("defReturnUnroutable")}
                    </p>
                    <p>
                      <strong>{t("legendDropUnroutable")}:</strong>{" "}
                      {t("defDropUnroutable")}
                    </p>
                    <p>
                      <strong>{t("legendDiskReads")}:</strong>{" "}
                      {t("defDiskReads")}
                    </p>
                    <p>
                      <strong>{t("legendDiskWrites")}:</strong>{" "}
                      {t("defDiskWrites")}
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
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
        {ratesMode === "basic" && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <Trans
                i18nKey="basicRatesAlert"
                ns="dashboard"
                components={{
                  code: (
                    <code className="rounded bg-muted px-1 py-0.5 text-xs" />
                  ),
                }}
              />
            </AlertDescription>
          </Alert>
        )}
        {isLoading ? (
          <div className="h-64 w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("loadingLiveRates")}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    fontSize={11}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                    label={{
                      value: t("msgsPerSec"),
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)} ${t("msgsPerSec")}`,
                      name.charAt(0).toUpperCase() +
                        name.slice(1).replace("_", " "),
                    ]}
                    labelFormatter={(
                      time: string,
                      payload: ReadonlyArray<{ payload?: { dateTime: string } }>
                    ) => {
                      if (payload && payload[0] && payload[0].payload) {
                        return t("dateAndTime", {
                          dateTime: payload[0].payload.dateTime,
                        });
                      }
                      return t("timeLabel", { time });
                    }}
                  />
                  {visibleLines.publish && (
                    <Line
                      type="monotone"
                      dataKey="publish"
                      stroke={CHART_PUBLISH}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendPublish")}
                    />
                  )}
                  {visibleLines.deliver && (
                    <Line
                      type="monotone"
                      dataKey="deliver"
                      stroke={CHART_DELIVER}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendDeliver")}
                    />
                  )}
                  {visibleLines.ack && (
                    <Line
                      type="monotone"
                      dataKey="ack"
                      stroke={CHART_ACK}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendAck")}
                    />
                  )}
                  {visibleLines.deliver_get && (
                    <Line
                      type="monotone"
                      dataKey="deliver_get"
                      stroke={CHART_DELIVER_GET}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendDeliverGet")}
                    />
                  )}
                  {visibleLines.deliver_no_ack && (
                    <Line
                      type="monotone"
                      dataKey="deliver_no_ack"
                      stroke={CHART_DELIVER_NO_ACK}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendDeliverNoAck")}
                    />
                  )}
                  {visibleLines.confirm && (
                    <Line
                      type="monotone"
                      dataKey="confirm"
                      stroke={CHART_CONFIRM}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendConfirm")}
                    />
                  )}
                  {visibleLines.get && (
                    <Line
                      type="monotone"
                      dataKey="get"
                      stroke={CHART_GET}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendGet")}
                    />
                  )}
                  {visibleLines.get_no_ack && (
                    <Line
                      type="monotone"
                      dataKey="get_no_ack"
                      stroke={CHART_GET_NO_ACK}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendGetNoAck")}
                    />
                  )}
                  {visibleLines.redeliver && (
                    <Line
                      type="monotone"
                      dataKey="redeliver"
                      stroke={CHART_REDELIVER}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendRedeliver")}
                    />
                  )}
                  {visibleLines.reject && (
                    <Line
                      type="monotone"
                      dataKey="reject"
                      stroke={CHART_REJECT}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendReject")}
                    />
                  )}
                  {visibleLines.get_empty && (
                    <Line
                      type="monotone"
                      dataKey="get_empty"
                      stroke={CHART_GET_EMPTY}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendGetEmpty")}
                    />
                  )}
                  {visibleLines.return_unroutable && (
                    <Line
                      type="monotone"
                      dataKey="return_unroutable"
                      stroke={CHART_RETURN_UNROUTABLE}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendReturnUnroutable")}
                    />
                  )}
                  {visibleLines.drop_unroutable && (
                    <Line
                      type="monotone"
                      dataKey="drop_unroutable"
                      stroke={CHART_DROP_UNROUTABLE}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendDropUnroutable")}
                    />
                  )}
                  {visibleLines.disk_writes && (
                    <Line
                      type="monotone"
                      dataKey="disk_writes"
                      stroke={CHART_DISK_WRITES}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendDiskWrites")}
                    />
                  )}
                  {visibleLines.disk_reads && (
                    <Line
                      type="monotone"
                      dataKey="disk_reads"
                      stroke={CHART_DISK_READS}
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name={t("legendDiskReads")}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Toggleable Legend — split into "common" (always
                visible) and "advanced" (hidden behind a toggle). The
                advanced section keeps the 5 rare series and their lines
                off-screen by default so the chart isn't a wall of 15
                overlapping lines on first paint. */}
            {(() => {
              type Metric = {
                key: keyof typeof visibleLines;
                name: string;
                color: string;
              };
              const commonMetrics: Metric[] = [
                {
                  key: "publish",
                  name: t("legendPublish"),
                  color: CHART_PUBLISH,
                },
                {
                  key: "confirm",
                  name: t("legendConfirm"),
                  color: CHART_CONFIRM,
                },
                {
                  key: "deliver",
                  name: t("legendDeliver"),
                  color: CHART_DELIVER,
                },
                {
                  key: "deliver_get",
                  name: t("legendDeliverGet"),
                  color: CHART_DELIVER_GET,
                },
                {
                  key: "deliver_no_ack",
                  name: t("legendDeliverNoAck"),
                  color: CHART_DELIVER_NO_ACK,
                },
                { key: "ack", name: t("legendAck"), color: CHART_ACK },
                {
                  key: "redeliver",
                  name: t("legendRedeliver"),
                  color: CHART_REDELIVER,
                },
                { key: "get", name: t("legendGet"), color: CHART_GET },
                {
                  key: "get_no_ack",
                  name: t("legendGetNoAck"),
                  color: CHART_GET_NO_ACK,
                },
                { key: "reject", name: t("legendReject"), color: CHART_REJECT },
              ];
              const advancedMetrics: Metric[] = [
                {
                  key: "get_empty",
                  name: t("legendGetEmpty"),
                  color: CHART_GET_EMPTY,
                },
                {
                  key: "return_unroutable",
                  name: t("legendReturnUnroutable"),
                  color: CHART_RETURN_UNROUTABLE,
                },
                {
                  key: "drop_unroutable",
                  name: t("legendDropUnroutable"),
                  color: CHART_DROP_UNROUTABLE,
                },
                {
                  key: "disk_writes",
                  name: t("legendDiskWrites"),
                  color: CHART_DISK_WRITES,
                },
                {
                  key: "disk_reads",
                  name: t("legendDiskReads"),
                  color: CHART_DISK_READS,
                },
              ];

              const renderChip = (metric: Metric) => (
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
              );

              return (
                <>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                    {commonMetrics.map(renderChip)}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleAdvanced}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      aria-expanded={advancedExpanded}
                    >
                      {advancedExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {advancedExpanded ? t("hideAdvanced") : t("showAdvanced")}
                      <span className="text-muted-foreground/60">
                        ({advancedMetrics.length})
                      </span>
                    </button>
                  </div>
                  {advancedExpanded && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                      {advancedMetrics.map(renderChip)}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
