import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { RefreshCw, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { isRabbitMQAuthError } from "@/types/apiErrors";
import { useEffect, useState } from "react";
import { TimeRangeSelector, TimeRange } from "@/components/TimeRangeSelector";

interface MessagesRatesChartProps {
  messagesRates?: Array<{
    timestamp: number;
    publish?: number;
    deliver?: number;
    ack?: number;
    deliver_get?: number;
    confirm?: number;
    get?: number;
    get_no_ack?: number;
    redeliver?: number;
    reject?: number;
    return_unroutable?: number;
    disk_reads?: number;
    disk_writes?: number;
  }>;
  isLoading: boolean;
  isFetching?: boolean;
  error?: Error | null;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}

export const MessagesRatesChart = ({
  messagesRates,
  isLoading,
  isFetching = false,
  error,
  timeRange = "1m",
  onTimeRangeChange,
}: MessagesRatesChartProps) => {
  const [showUpdating, setShowUpdating] = useState(false);

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
        title="Cannot View Live Rates"
      />
    );
  }

  const chartData = messagesRates?.map((point) => ({
    timestamp: point.timestamp,
    time: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    publish: point.publish || 0,
    deliver: point.deliver || 0,
    ack: point.ack || 0,
    deliver_get: point.deliver_get || 0,
    confirm: point.confirm || 0,
    get: point.get || 0,
    get_no_ack: point.get_no_ack || 0,
    redeliver: point.redeliver || 0,
    reject: point.reject || 0,
    return_unroutable: point.return_unroutable || 0,
    disk_reads: point.disk_reads || 0,
    disk_writes: point.disk_writes || 0,
  }));

  return (
    <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Messages rates
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-3">
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Message Rate Definitions:</p>
                    <div className="space-y-1 text-xs">
                      <p>
                        <strong>Publish:</strong> Rate at which messages are
                        entering the server
                      </p>
                      <p>
                        <strong>Deliver:</strong> Rate at which messages are
                        delivered to consumers
                      </p>
                      <p>
                        <strong>Ack:</strong> Rate at which message
                        acknowledgments are received
                      </p>
                      <p>
                        <strong>Deliver Get:</strong> Rate at which messages are
                        delivered via basic.get
                      </p>
                      <p>
                        <strong>Confirm:</strong> Rate at which publisher
                        confirms are received
                      </p>
                      <p>
                        <strong>Get:</strong> Rate at which messages are
                        retrieved via basic.get
                      </p>
                      <p>
                        <strong>Get No Ack:</strong> Rate at which messages are
                        retrieved without acknowledgment
                      </p>
                      <p>
                        <strong>Redeliver:</strong> Rate at which messages are
                        redelivered
                      </p>
                      <p>
                        <strong>Reject:</strong> Rate at which messages are
                        rejected
                      </p>
                      <p>
                        <strong>Return Unroutable:</strong> Rate at which
                        unroutable messages are returned
                      </p>
                      <p>
                        <strong>Disk Reads:</strong> Rate at which messages are
                        read from disk
                      </p>
                      <p>
                        <strong>Disk Writes:</strong> Rate at which messages are
                        written to disk
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
              <p className="text-sm text-gray-500">Loading live rates...</p>
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
                      value: "msgs/s",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)} msgs/s`,
                      name.charAt(0).toUpperCase() +
                        name.slice(1).replace("_", " "),
                    ]}
                    labelFormatter={(time: string) => `Time: ${time}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="publish"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={false}
                    name="Publish"
                  />
                  <Line
                    type="monotone"
                    dataKey="deliver"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    name="Deliver"
                  />
                  <Line
                    type="monotone"
                    dataKey="ack"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    name="Ack"
                  />
                  <Line
                    type="monotone"
                    dataKey="deliver_get"
                    stroke="#EC4899"
                    strokeWidth={2}
                    dot={false}
                    name="Deliver Get"
                  />
                  <Line
                    type="monotone"
                    dataKey="confirm"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    name="Confirm"
                  />
                  <Line
                    type="monotone"
                    dataKey="get"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    dot={false}
                    name="Get"
                  />
                  <Line
                    type="monotone"
                    dataKey="get_no_ack"
                    stroke="#C4B5FD"
                    strokeWidth={2}
                    dot={false}
                    name="Get No Ack"
                  />
                  <Line
                    type="monotone"
                    dataKey="redeliver"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                    name="Redeliver"
                  />
                  <Line
                    type="monotone"
                    dataKey="reject"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={false}
                    name="Reject"
                  />
                  <Line
                    type="monotone"
                    dataKey="return_unroutable"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    dot={false}
                    name="Return Unroutable"
                  />
                  <Line
                    type="monotone"
                    dataKey="disk_reads"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                    name="Disk Reads"
                  />
                  <Line
                    type="monotone"
                    dataKey="disk_writes"
                    stroke="#DC2626"
                    strokeWidth={2}
                    dot={false}
                    name="Disk Writes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
