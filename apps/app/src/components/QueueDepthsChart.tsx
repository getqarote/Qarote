import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
const DEFAULT_VISIBLE = 10;

/**
 * Queue depths — proportional bar list, not a chart.
 *
 * Shows the top 10 queues by message count with a "See more" link
 * to the full Queues page when there are more.
 */
export const QueueDepthsChart = ({
  queues = EMPTY_QUEUES,
  isLoading,
}: QueueDepthsChartProps) => {
  const { t } = useTranslation("dashboard");

  const sorted = [...queues].sort((a, b) => b.messages - a.messages);
  const visible = sorted.slice(0, DEFAULT_VISIBLE);

  const maxMessages =
    visible.length > 0 ? Math.max(...visible.map((q) => q.messages), 1) : 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              {t("queueDepths")}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({sorted.length})
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("currentMessageBacklog")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">
                {t("updatesEvery5s")}
              </span>
            </div>
            <Link
              to="/queues"
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {t("seeMore")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("noQueuesFound")}
          </p>
        ) : (
          <div className="space-y-1">
            {visible.map((queue) => (
              <QueueRow
                key={`${queue.name}-${queue.vhost}`}
                queue={queue}
                maxMessages={maxMessages}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function QueueRow({
  queue,
  maxMessages,
}: {
  queue: QueueData;
  maxMessages: number;
}) {
  const pct = maxMessages > 0 ? (queue.messages / maxMessages) * 100 : 0;

  const fillTone =
    queue.messages >= 10000
      ? "bg-destructive/15"
      : queue.messages >= 1000
        ? "bg-warning/15"
        : "bg-primary/10";

  return (
    <div className="relative flex items-center justify-between gap-3 px-3 py-1.5 rounded">
      <div
        className={`absolute inset-y-0 left-0 rounded ${fillTone} transition-all duration-300`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
      <span
        className="relative text-sm font-mono truncate min-w-0 text-foreground"
        title={
          queue.vhost !== "/" ? `${queue.name} (${queue.vhost})` : queue.name
        }
      >
        {queue.name}
      </span>
      <span
        className={`relative text-sm font-mono tabular-nums font-semibold shrink-0 ${
          queue.messages >= 10000
            ? "text-destructive"
            : queue.messages >= 1000
              ? "text-warning"
              : "text-foreground"
        }`}
      >
        {queue.messages.toLocaleString()}
      </span>
    </div>
  );
}
