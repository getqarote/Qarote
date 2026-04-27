import { useMemo, useState } from "react";
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
import {
  CHART_QUEUED_READY,
  CHART_QUEUED_TOTAL,
  CHART_QUEUED_UNACKED,
} from "@/lib/chartColors";

import type { HistoricalRange } from "@/components/HistoricalRangeSelector";

interface Snapshot {
  timestamp: string | Date;
  messages: string;
  messagesReady: string;
  messagesUnack: string;
}

interface QueueHistoryChartProps {
  snapshots?: Snapshot[];
  isLoading: boolean;
  error?: Error | null;
  rangeHours: HistoricalRange;
}

export const QueueHistoryChart = ({
  snapshots,
  isLoading,
  error,
  rangeHours,
}: QueueHistoryChartProps) => {
  const { t } = useTranslation("queues");

  const [visibleLines, setVisibleLines] = useState({
    total: true,
    ready: true,
    unacked: true,
  });

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const chartData = useMemo(() => {
    const points = (snapshots ?? [])
      .map((s) => {
        const ts = new Date(s.timestamp);
        if (isNaN(ts.getTime())) return null;
        const total = Number(s.messages);
        const ready = Number(s.messagesReady);
        const unacked = Number(s.messagesUnack);
        return {
          _ts: ts.getTime(),
          time: formatChartTimestamp(ts, rangeHours),
          dateTime: ts.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          total: isNaN(total) ? 0 : total,
          ready: isNaN(ready) ? 0 : ready,
          unacked: isNaN(unacked) ? 0 : unacked,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a._ts - b._ts);

    return points.map(({ _ts: _, ...rest }) => rest);
  }, [snapshots, rangeHours]);

  if (isLoading) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("historyLoading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <p className="text-sm">{t("historyErrorQueue")}</p>
        </div>
      </div>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
      </div>
    );
  }

  const series = [
    {
      key: "total" as const,
      label: t("historySeriesTotal"),
      bgClass: "bg-[hsl(var(--chart-deliver))]",
    },
    {
      key: "ready" as const,
      label: t("historySeriesReady"),
      bgClass: "bg-[hsl(var(--chart-ack))]",
    },
    {
      key: "unacked" as const,
      label: t("historySeriesUnacked"),
      bgClass: "bg-[hsl(var(--chart-publish))]",
    },
  ];

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
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
              domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
              label={{
                value: t("historySeriesUnit"),
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} ${t("historySeriesUnit")}`,
                name === "total"
                  ? t("historySeriesTotal")
                  : name === "ready"
                    ? t("historySeriesReady")
                    : t("historySeriesUnacked"),
              ]}
              labelFormatter={(
                time: string,
                payload: ReadonlyArray<{ payload: { dateTime: string } }>
              ) => payload?.[0]?.payload?.dateTime ?? time}
            />
            {visibleLines.total && (
              <Line
                type="monotone"
                dataKey="total"
                stroke={CHART_QUEUED_TOTAL}
                strokeWidth={2}
                dot={false}
              />
            )}
            {visibleLines.ready && (
              <Line
                type="monotone"
                dataKey="ready"
                stroke={CHART_QUEUED_READY}
                strokeWidth={2}
                dot={false}
              />
            )}
            {visibleLines.unacked && (
              <Line
                type="monotone"
                dataKey="unacked"
                stroke={CHART_QUEUED_UNACKED}
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex gap-4 text-xs">
        {series.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={visibleLines[s.key]}
            aria-label={t("historySeriesToggle", { label: s.label })}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
              visibleLines[s.key]
                ? "bg-accent hover:bg-accent/80"
                : "bg-muted hover:bg-muted/80 opacity-60"
            }`}
            onClick={() => toggleLine(s.key)}
          >
            <div className={`w-3 h-3 rounded-sm ${s.bgClass}`} />
            <span className="text-foreground">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
