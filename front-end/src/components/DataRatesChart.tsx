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
import { Connection } from "@/lib/api/rabbitmqTypes";
import { useEffect, useState } from "react";

interface DataRatesChartProps {
  connections?: Connection[];
  isLoading: boolean;
  isFetching?: boolean;
  error?: Error | null;
}

export const DataRatesChart = ({
  connections,
  isLoading,
  isFetching = false,
  error,
}: DataRatesChartProps) => {
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
        title="Cannot View Data Rates"
      />
    );
  }

  // Calculate total send and receive rates from all connections
  const totalSendOctets =
    connections?.reduce((sum, conn) => sum + (conn.send_oct || 0), 0) || 0;
  const totalRecvOctets =
    connections?.reduce((sum, conn) => sum + (conn.recv_oct || 0), 0) || 0;

  // For now, we'll simulate time series data with current values
  // In a real implementation, this would be historical data
  const currentTime = Date.now();
  const timePoints = 20; // Show 20 time points
  const intervalMs = 30000; // 30 seconds between points

  const chartData = [];
  for (let i = timePoints - 1; i >= 0; i--) {
    const timestamp = currentTime - i * intervalMs;
    chartData.push({
      timestamp,
      time: new Date(timestamp).toLocaleTimeString(),
      send: totalSendOctets,
      receive: totalRecvOctets,
    });
  }

  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Data rates
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-3">
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Data Rate Definitions:</p>
                    <div className="space-y-1 text-xs">
                      <p>
                        <strong>Send:</strong> Rate at which data is being sent
                        from connections (bytes/second)
                      </p>
                      <p>
                        <strong>Receive:</strong> Rate at which data is being
                        received by connections (bytes/second)
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      These rates represent the total data throughput across all
                      active connections.
                    </p>
                  </div>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">
              Updates every 5 seconds{showUpdating && " (updating...)"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-96 w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">Loading data rates...</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Chart */}
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
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
                      value: "bytes/s",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)} bytes/s`,
                      name === "send" ? "Send" : "Receive",
                    ]}
                    labelFormatter={(time: string) => `Time: ${time}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="send"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    name="Send"
                  />
                  <Line
                    type="monotone"
                    dataKey="receive"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    name="Receive"
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
