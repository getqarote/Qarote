import { Suspense, lazy } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeRange } from "@/components/MetricsChart";

// Lazy load MetricsChart since it's a heavy charting component
const MetricsChart = lazy(() =>
  import("@/components/MetricsChart").then((module) => ({
    default: module.MetricsChart,
  }))
);

interface ChartData {
  time: string;
  messages: number;
}

interface MessageThroughputChartProps {
  chartData: ChartData[];
  selectedTimeRange: TimeRange;
  timeSeriesLoading: boolean;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

export const MessageThroughputChart = ({
  chartData,
  selectedTimeRange,
  timeSeriesLoading,
  onTimeRangeChange,
}: MessageThroughputChartProps) => {
  const getTimeRangeText = (timeRange: TimeRange) => {
    switch (timeRange) {
      case "1m":
        return "last minute";
      case "10m":
        return "last 10 minutes";
      case "1h":
        return "last hour";
      case "8h":
        return "last 8 hours";
      case "24h":
        return "last 24 hours";
      default:
        return "selected period";
    }
  };

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Message Throughput
        </CardTitle>
        <p className="text-sm text-gray-500">
          Real-time message flow over the {getTimeRangeText(selectedTimeRange)}
        </p>
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
            <MetricsChart
              data={chartData}
              onTimeRangeChange={onTimeRangeChange}
              selectedTimeRange={selectedTimeRange}
              isLoading={timeSeriesLoading}
            />
          </Suspense>
        )}
      </CardContent>
    </Card>
  );
};
