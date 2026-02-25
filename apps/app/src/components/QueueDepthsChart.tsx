import { useCallback } from "react";

import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QueueDepthData {
  name: string;
  messages: number;
}

interface QueueData {
  name: string;
  messages: number;
  vhost: string;
}

interface QueueDepthsChartProps {
  queues: Array<QueueData>;
  isLoading: boolean;
}

const EMPTY_QUEUES: QueueData[] = [];

const CustomTooltip = ({
  active,
  payload,
  label,
  queues,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value: number }>;
  label?: string | number;
  queues: Array<QueueData>;
  [key: string]: unknown;
}) => {
  if (active && payload && payload.length) {
    const labelStr = String(label);
    const originalQueue = queues.find((q) => q.name === labelStr);
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">
          {originalQueue?.name || label}
        </p>
        <p className="text-orange-600">
          Messages: {payload[0].value.toLocaleString()}
        </p>
        {originalQueue?.vhost && originalQueue.vhost !== "/" && (
          <p className="text-gray-500 text-sm">VHost: {originalQueue.vhost}</p>
        )}
      </div>
    );
  }
  return null;
};

export const QueueDepthsChart = ({
  queues = EMPTY_QUEUES,
  isLoading,
}: QueueDepthsChartProps) => {
  const tooltipContent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => <CustomTooltip {...props} queues={queues} />,
    [queues]
  );

  // Prepare data for the chart - show all queues, prioritize those with messages
  const chartData: QueueDepthData[] = [...queues]
    .sort((a, b) => b.messages - a.messages) // Sort by message count descending (queues with messages first)
    .slice(0, 10) // Take top 10 queues (including empty ones)
    .map((queue) => ({
      name: queue.name,
      messages: queue.messages,
    }));

  // Calculate dynamic Y-axis domain
  const maxMessages = Math.max(...chartData.map((d) => d.messages), 0);
  const minMessages = Math.min(...chartData.map((d) => d.messages), 0);

  // Add some padding to the scale (10% on top, start from 0 or slightly below min if negative)
  const yAxisMax = maxMessages === 0 ? 10 : Math.ceil(maxMessages * 1.1);
  const yAxisMin = minMessages < 0 ? Math.floor(minMessages * 1.1) : 0;

  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              Queue Depths
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Current message backlog by queue
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">
              Updates every 5 seconds
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : queues.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No queues found</p>
            </div>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickFormatter={(name) =>
                    name.length > 15 ? `${name.slice(0, 15)}...` : name
                  }
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickFormatter={(value) => value.toLocaleString()}
                  domain={[yAxisMin, yAxisMax]}
                  allowDataOverflow={false}
                />
                <Tooltip content={tooltipContent} />
                <Bar
                  dataKey="messages"
                  fill="url(#barGradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(234 88 12)" />
                    <stop offset="100%" stopColor="rgb(220 38 38)" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
