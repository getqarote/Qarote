import { Clock } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TimeRange =
  | "1m"
  | "10m"
  | "1h"
  | "8h"
  | "24h"
  | "7d"
  | "30d"
  | "90d"
  | "1y";

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
  { value: "7d", label: "Last 7 days", description: "Weekly trends" },
  { value: "30d", label: "Last 30 days", description: "Monthly patterns" },
  { value: "90d", label: "Last 90 days", description: "Quarterly overview" },
  { value: "1y", label: "Last year", description: "Annual trends" },
];

interface ThroughputChartProps {
  data: Array<{
    time: string;
    published: number;
    consumed: number;
  }>;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  selectedTimeRange: TimeRange;
  availableTimeRanges?: TimeRange[];
  isLoading?: boolean;
}

// Custom tooltip component
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const published = payload.find((p) => p.name === "Published")?.value || 0;
    const consumed = payload.find((p) => p.name === "Consumed")?.value || 0;
    const difference = published - consumed;

    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg min-w-[200px]">
        <p className="font-medium text-gray-900 mb-2">{label}</p>

        {payload.map((entry, index: number) => (
          <div key={index} className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm">{entry.name}:</span>
            </div>
            <span className="font-mono text-sm font-medium">
              {entry.value.toLocaleString()}/s
            </span>
          </div>
        ))}

        <hr className="my-2 border-gray-200" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Net flow:</span>
          <span
            className={`font-mono text-sm font-medium ${
              difference > 0
                ? "text-orange-600"
                : difference < 0
                  ? "text-green-600"
                  : "text-gray-600"
            }`}
          >
            {difference > 0 ? "+" : ""}
            {difference.toLocaleString()}/s
          </span>
        </div>

        {Math.abs(difference) > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {difference > 0 ? "Messages accumulating" : "Queue draining"}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const ThroughputChart = ({
  data,
  onTimeRangeChange,
  selectedTimeRange = "1h",
  availableTimeRanges,
  isLoading = false,
}: ThroughputChartProps) => {
  const selectedOption = timeRangeOptions.find(
    (option) => option.value === selectedTimeRange
  );

  // Filter time range options based on available ranges from API
  const filteredTimeRangeOptions = availableTimeRanges
    ? timeRangeOptions.filter((option) =>
        availableTimeRanges.includes(option.value)
      )
    : timeRangeOptions;

  if (isLoading) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      {onTimeRangeChange && (
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 font-medium">Time Range:</span>
          {filteredTimeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onTimeRangeChange(option.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                selectedTimeRange === option.value
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                No Recent Activity
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                No messages have been published or consumed in the{" "}
                {selectedOption?.description.toLowerCase() || "selected period"}
                .
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient
                  id="publishAreaGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient
                  id="consumeAreaGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
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
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M/s`;
                  } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(1)}k/s`;
                  }
                  return `${value}/s`;
                }}
                label={{
                  value: "Messages per second",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    textAnchor: "middle",
                    fontSize: "12px",
                    fill: "#64748b",
                  },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="published"
                name="Published"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#publishAreaGradient)"
              />
              <Area
                type="monotone"
                dataKey="consumed"
                name="Consumed"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#consumeAreaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
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
