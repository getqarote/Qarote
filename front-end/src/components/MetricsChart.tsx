import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export type TimeRange = "1m" | "10m" | "1h" | "8h" | "24h";

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  description: string;
}

const timeRangeOptions: TimeRangeOption[] = [
  { value: "1m", label: "Last minute", description: "Real-time data" },
  { value: "10m", label: "Last 10 minutes", description: "Recent activity" },
  { value: "1h", label: "Last hour", description: "Short-term trends" },
  { value: "8h", label: "Last 8 hours", description: "Daily patterns" },
  { value: "24h", label: "Last 24 hours", description: "Full day overview" },
];

interface MetricsChartProps {
  data: Array<{
    time: string;
    messages: number;
  }>;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  selectedTimeRange?: TimeRange;
  isLoading?: boolean;
}

export const MetricsChart = ({
  data,
  onTimeRangeChange,
  selectedTimeRange = "24h",
  isLoading = false,
}: MetricsChartProps) => {
  const [localTimeRange, setLocalTimeRange] =
    useState<TimeRange>(selectedTimeRange);

  const handleTimeRangeChange = (value: TimeRange) => {
    setLocalTimeRange(value);
    onTimeRangeChange?.(value);
  };

  const currentTimeRange = onTimeRangeChange
    ? selectedTimeRange
    : localTimeRange;
  const selectedOption = timeRangeOptions.find(
    (option) => option.value === currentTimeRange
  );

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Time Range:</span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={currentTimeRange}
            onValueChange={handleTimeRangeChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-gray-500">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Last Updated Indicator */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Message Throughput</span>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            width={undefined}
            height={undefined}
          >
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value.toString();
              }}
            />
            <Line
              type="monotone"
              dataKey="messages"
              stroke="url(#gradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#8b5cf6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time Range Info */}
      <div className="text-xs text-gray-500 text-center">
        {selectedOption && (
          <span>Showing {selectedOption.description.toLowerCase()}</span>
        )}
      </div>
    </div>
  );
};
