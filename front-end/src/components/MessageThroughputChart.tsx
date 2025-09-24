import { Suspense, lazy } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeRange } from "@/components/ThroughputChart";
import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { isRabbitMQAuthError } from "@/types/apiErrors";

// Lazy load ThroughputChart since it's a heavy charting component
const ThroughputChart = lazy(() =>
  import("@/components/ThroughputChart").then((module) => ({
    default: module.ThroughputChart,
  }))
);

interface ChartData {
  time: string;
  published: number;
  consumed: number;
}

interface MessageThroughputChartProps {
  chartData: ChartData[];
  selectedTimeRange: TimeRange;
  timeSeriesLoading: boolean;
  timeSeriesError?: Error | null;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  availableTimeRanges?: TimeRange[];
}

export const MessageThroughputChart = ({
  chartData,
  selectedTimeRange,
  timeSeriesLoading,
  timeSeriesError,
  onTimeRangeChange,
  availableTimeRanges,
}: MessageThroughputChartProps) => {
  // Handle permission errors
  if (timeSeriesError && isRabbitMQAuthError(timeSeriesError)) {
    return (
      <RabbitMQPermissionError
        requiredPermission={timeSeriesError.requiredPermission}
        message={timeSeriesError.message}
        title="Cannot View Message Throughput Chart"
      />
    );
  }
  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Message Throughput
        </CardTitle>
        <p className="text-sm text-gray-500">Published vs Consumed messages</p>
      </CardHeader>
      <CardContent>
        {timeSeriesLoading ? (
          <div className="h-64 w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">Loading metrics...</p>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">
                    Loading chart...
                  </span>
                </div>
              </div>
            }
          >
            <ThroughputChart
              data={chartData}
              onTimeRangeChange={onTimeRangeChange}
              selectedTimeRange={selectedTimeRange}
              availableTimeRanges={availableTimeRanges}
              isLoading={timeSeriesLoading}
            />
          </Suspense>
        )}
      </CardContent>
    </Card>
  );
};
