import { useEffect, useState } from "react";

import { HelpCircle, RefreshCw } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  isFetching?: boolean;
  error?: Error | null;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}

export const QueuedMessagesChart = ({
  queueTotals,
  isLoading,
  isFetching = false,
  error,
  timeRange = "1h",
  onTimeRangeChange,
}: QueuedMessagesChartProps) => {
  const [showUpdating, setShowUpdating] = useState(false);

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

  // Handle delayed updating indicator
  useEffect(() => {
    if (isFetching) {
      setShowUpdating(true);
    } else {
      // Keep showing "updating..." for 500ms after fetch completes
      const timer = setTimeout(() => {
        setShowUpdating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFetching]);

  // Handle permission errors
  if (error && isRabbitMQAuthError(error)) {
    return (
      <RabbitMQPermissionError
        requiredPermission={error.requiredPermission}
        message={error.message}
        title="Cannot View Queued Messages"
      />
    );
  }

  const chartData = queueTotals?.map((point) => ({
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

  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-foreground">
              Queued messages
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-3">
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Queued Message Definitions:</p>
                    <div className="space-y-1 text-xs">
                      <p>
                        <strong>Total:</strong> Total number of messages in all
                        queues
                      </p>
                      <p>
                        <strong>Ready:</strong> Messages ready to be delivered
                        to consumers
                      </p>
                      <p>
                        <strong>Unacked:</strong> Messages delivered but not yet
                        acknowledged
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      These metrics show the current state of messages across
                      all queues in the server.
                    </p>
                  </div>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">
                Updates every 5 seconds{showUpdating && " (updating...)"}
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
        {isLoading ? (
          <div className="h-96 w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">
                Loading queued messages...
              </p>
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
                      value: "messages",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} messages`,
                      name === "total"
                        ? "Total"
                        : name === "ready"
                          ? "Ready"
                          : name === "unacked"
                            ? "Unacked"
                            : name,
                    ]}
                    labelFormatter={(
                      time: string,
                      payload: Array<{ payload: { dateTime: string } }>
                    ) => {
                      if (payload && payload[0] && payload[0].payload) {
                        return `Date & Time: ${payload[0].payload.dateTime}`;
                      }
                      return `Time: ${time}`;
                    }}
                  />
                  {visibleLines.total && (
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#DC2626"
                      strokeWidth={2}
                      dot={false}
                      name="Total"
                    />
                  )}
                  {visibleLines.ready && (
                    <Line
                      type="monotone"
                      dataKey="ready"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                      name="Ready"
                    />
                  )}
                  {visibleLines.unacked && (
                    <Line
                      type="monotone"
                      dataKey="unacked"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={false}
                      name="Unacked"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Toggleable Legend */}
            <div className="mt-4 flex gap-4 text-xs">
              {[
                { key: "total", name: "Total", color: "#DC2626" },
                { key: "ready", name: "Ready", color: "#F59E0B" },
                { key: "unacked", name: "Unacked", color: "#06B6D4" },
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
