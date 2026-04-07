import { useCallback } from "react";
import { useTranslation } from "react-i18next";

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

const CustomXAxisTick = ({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) => {
  if (!payload) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={8}
        textAnchor="end"
        fill="hsl(var(--muted-foreground))"
        fontSize={11}
        transform="rotate(-40)"
      >
        {payload.value}
      </text>
    </g>
  );
};

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
        <p className="font-medium text-foreground">
          {originalQueue?.name || label}
        </p>
        <p className="text-foreground">
          Messages: {payload[0].value.toLocaleString()}
        </p>
        {originalQueue?.vhost && originalQueue.vhost !== "/" && (
          <p className="text-muted-foreground text-sm">
            VHost: {originalQueue.vhost}
          </p>
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
  const { t } = useTranslation("dashboard");

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
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              {t("queueDepths")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("currentMessageBacklog")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">
              {t("updatesEvery5s")}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : queues.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">{t("noQueuesFound")}</p>
            </div>
          </div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  tick={<CustomXAxisTick />}
                  height={130}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => value.toLocaleString()}
                  domain={[yAxisMin, yAxisMax]}
                  allowDataOverflow={false}
                />
                <Tooltip content={tooltipContent} />
                <Bar
                  dataKey="messages"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
