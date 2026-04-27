import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { AlertCircle, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatChartTimestamp } from "@/lib/chart-utils";
import { CHART_CONSUMERS } from "@/lib/chartColors";

import type { HistoricalRange } from "@/components/HistoricalRangeSelector";

interface Snapshot {
  timestamp: string | Date;
  consumerCount: number;
}

interface ConsumerHistoryChartProps {
  snapshots?: Snapshot[];
  isLoading: boolean;
  error?: Error | null;
  rangeHours: HistoricalRange;
}

export const ConsumerHistoryChart = ({
  snapshots,
  isLoading,
  error,
  rangeHours,
}: ConsumerHistoryChartProps) => {
  const { t } = useTranslation("queues");

  const chartData = useMemo(
    () =>
      (snapshots ?? []).map((s) => {
        const ts = new Date(s.timestamp);
        return {
          time: formatChartTimestamp(ts, rangeHours),
          dateTime: ts.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          consumers: s.consumerCount,
        };
      }),
    [snapshots, rangeHours]
  );

  if (isLoading) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("historyLoading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <p className="text-sm">{t("historyErrorConsumer")}</p>
        </div>
      </div>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            fontSize={11}
            interval={
              chartData.length > 8 ? Math.floor(chartData.length / 8) : 0
            }
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
            label={{
              value: "consumers",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle" },
            }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number) => [`${value}`, "Consumers"]}
            labelFormatter={(
              _time: string,
              payload: ReadonlyArray<{ payload: { dateTime: string } }>
            ) => payload?.[0]?.payload?.dateTime ?? _time}
          />
          <Line
            type="monotone"
            dataKey="consumers"
            stroke={CHART_CONSUMERS}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
