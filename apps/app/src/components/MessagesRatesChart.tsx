import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { HelpCircle, Info, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { TimeRange, TimeRangeSelector } from "@/components/TimeRangeSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // State for toggling line visibility
  const [visibleLines, setVisibleLines] = useState({
    publish: true,
    deliver: true,
    ack: true,
    deliver_get: true,
    deliver_no_ack: true,
    confirm: true,
    get: true,
    get_no_ack: true,
    get_empty: true,
    redeliver: true,
    reject: true,
    return_unroutable: true,
    drop_unroutable: true,
    disk_reads: true,
    disk_writes: true,
  });

  // Toggle line visibility
  const toggleLine = (metricName: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [metricName]: !prev[metricName],
    }));
  };

  // Handle permission errors
  if (error && isRabbitMQAuthError(error)) {
    return (
      <RabbitMQPermissionError
        requiredPermission={error.requiredPermission}
        message={error.message}
        title={t("cannotViewLiveRates")}
      />
    );
  }

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

  // Generate placeholder data when no rates exist so the chart renders axes/grid
  const chartData =
    mappedData && mappedData.length > 0
      ? mappedData
      : Array.from({ length: 7 }, (_, i) => {
          const ts = Date.now() - (6 - i) * 10000;
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

  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-foreground">
              {t("messagesRates")}
            </CardTitle>
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
                        <strong>Publish:</strong> {t("defPublish")}
                      </p>
                      <p>
                        <strong>Deliver:</strong> {t("defDeliver")}
                      </p>
                      <p>
                        <strong>Ack:</strong> {t("defAck")}
                      </p>
                      <p>
                        <strong>Deliver / Get:</strong> {t("defDeliverGet")}
                      </p>
                      <p>
                        <strong>Deliver (auto ack):</strong>{" "}
                        {t("defDeliverNoAck")}
                      </p>
                      <p>
                        <strong>Confirm:</strong> {t("defConfirm")}
                      </p>
                      <p>
                        <strong>Get:</strong> {t("defGet")}
                      </p>
                      <p>
                        <strong>Get No Ack:</strong> {t("defGetNoAck")}
                      </p>
                      <p>
                        <strong>Get (empty):</strong> {t("defGetEmpty")}
                      </p>
                      <p>
                        <strong>Redeliver:</strong> {t("defRedeliver")}
                      </p>
                      <p>
                        <strong>Reject:</strong> {t("defReject")}
                      </p>
                      <p>
                        <strong>Return Unroutable:</strong>{" "}
                        {t("defReturnUnroutable")}
                      </p>
                      <p>
                        <strong>Drop Unroutable:</strong>{" "}
                        {t("defDropUnroutable")}
                      </p>
                      <p>
                        <strong>Disk Reads:</strong> {t("defDiskReads")}
                      </p>
                      <p>
                        <strong>Disk Writes:</strong> {t("defDiskWrites")}
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">
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
      </CardHeader>
      <CardContent>
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
          <div className="h-96 w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">{t("loadingLiveRates")}</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Chart */}
            <div className="h-96 w-full">
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
                      stroke="#F97316"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Publish"
                    />
                  )}
                  {visibleLines.deliver && (
                    <Line
                      type="monotone"
                      dataKey="deliver"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Deliver"
                    />
                  )}
                  {visibleLines.ack && (
                    <Line
                      type="monotone"
                      dataKey="ack"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Ack"
                    />
                  )}
                  {visibleLines.deliver_get && (
                    <Line
                      type="monotone"
                      dataKey="deliver_get"
                      stroke="#EC4899"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Deliver / Get"
                    />
                  )}
                  {visibleLines.deliver_no_ack && (
                    <Line
                      type="monotone"
                      dataKey="deliver_no_ack"
                      stroke="#F472B6"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Deliver (auto ack)"
                    />
                  )}
                  {visibleLines.confirm && (
                    <Line
                      type="monotone"
                      dataKey="confirm"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Confirm"
                    />
                  )}
                  {visibleLines.get && (
                    <Line
                      type="monotone"
                      dataKey="get"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Get"
                    />
                  )}
                  {visibleLines.get_no_ack && (
                    <Line
                      type="monotone"
                      dataKey="get_no_ack"
                      stroke="#C4B5FD"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Get No Ack"
                    />
                  )}
                  {visibleLines.redeliver && (
                    <Line
                      type="monotone"
                      dataKey="redeliver"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Redeliver"
                    />
                  )}
                  {visibleLines.reject && (
                    <Line
                      type="monotone"
                      dataKey="reject"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Reject"
                    />
                  )}
                  {visibleLines.get_empty && (
                    <Line
                      type="monotone"
                      dataKey="get_empty"
                      stroke="#92400E"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Get (empty)"
                    />
                  )}
                  {visibleLines.return_unroutable && (
                    <Line
                      type="monotone"
                      dataKey="return_unroutable"
                      stroke="#1E40AF"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Return Unroutable"
                    />
                  )}
                  {visibleLines.drop_unroutable && (
                    <Line
                      type="monotone"
                      dataKey="drop_unroutable"
                      stroke="#FDE047"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Drop Unroutable"
                    />
                  )}
                  {visibleLines.disk_writes && (
                    <Line
                      type="monotone"
                      dataKey="disk_writes"
                      stroke="#DC2626"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Disk Writes"
                    />
                  )}
                  {visibleLines.disk_reads && (
                    <Line
                      type="monotone"
                      dataKey="disk_reads"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={ratesMode === "basic"}
                      name="Disk Reads"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Toggleable Legend */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {[
                // Column 1
                { key: "publish", name: "Publish", color: "#F97316" }, // Orange
                { key: "confirm", name: "Publisher confirm", color: "#F59E0B" }, // Amber
                {
                  key: "deliver",
                  name: "Deliver (manual ack)",
                  color: "#3B82F6", // Blue
                },

                // Column 2
                {
                  key: "deliver_get",
                  name: "Deliver / Get",
                  color: "#EC4899", // Pink
                },
                {
                  key: "deliver_no_ack",
                  name: "Deliver (auto ack)",
                  color: "#F472B6", // Pink-400
                },
                { key: "ack", name: "Consumer ack", color: "#10B981" }, // Emerald
                { key: "redeliver", name: "Redelivered", color: "#8B5CF6" }, // Violet

                // Column 3
                { key: "get", name: "Get (manual ack)", color: "#06B6D4" }, // Cyan
                { key: "get_no_ack", name: "Get (auto ack)", color: "#C4B5FD" }, // Light purple
                { key: "get_empty", name: "Get (empty)", color: "#92400E" }, // Brown
                { key: "reject", name: "Reject", color: "#6366F1" }, // Indigo

                // Column 4
                {
                  key: "return_unroutable",
                  name: "Unroutable (return)",
                  color: "#1E40AF", // Indigo
                },
                {
                  key: "drop_unroutable",
                  name: "Unroutable (drop)",
                  color: "#FDE047", // Yellow
                },
                { key: "disk_writes", name: "Disk write", color: "#DC2626" }, // Red
                { key: "disk_reads", name: "Disk read", color: "#059669" }, // Green
              ].map((metric) => (
                <div
                  key={metric.key}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    visibleLines[metric.key as keyof typeof visibleLines]
                      ? "bg-accent hover:bg-accent/80"
                      : "bg-muted hover:bg-muted/80 opacity-60"
                  }`}
                  onClick={() =>
                    toggleLine(metric.key as keyof typeof visibleLines)
                  }
                >
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="text-foreground">{metric.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
