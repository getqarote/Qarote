import { useTranslation } from "react-i18next";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

import { Queue } from "@/lib/api";

import { Skeleton } from "@/components/ui/skeleton";

interface QueuesOverviewProps {
  queues: Queue[];
  isLoading: boolean;
}

/**
 * Inline stat line for queues — health pill + aggregate metrics.
 *
 * Mirrors the ConnectionsOverviewCards pattern: a colored pill anchors
 * the status, inline metrics separated by dots provide the numbers.
 * Max messages replaces avg because outlier detection ("which queue is
 * backing up?") is more actionable than the average.
 */
export function QueuesOverviewCards({
  queues,
  isLoading,
}: QueuesOverviewProps) {
  const { t } = useTranslation("queues");

  if (isLoading) {
    return <Skeleton className="h-5 w-80" />;
  }

  const total = queues.length;
  const totalMessages = queues.reduce((sum, q) => sum + (q.messages ?? 0), 0);
  const totalConsumers = queues.reduce((sum, q) => sum + (q.consumers ?? 0), 0);

  // Max messages per queue — outlier detection is more useful than avg
  const maxMessages =
    total > 0 ? Math.max(...queues.map((q) => q.messages ?? 0)) : 0;

  // Health: all running = healthy, any non-running = degraded/critical
  const downCount = queues.filter(
    (q) => q.state && q.state.toLowerCase() !== "running"
  ).length;

  let pillClass: string;
  let PillIcon: typeof CheckCircle;
  let pillText: string;

  if (total === 0) {
    pillClass = "bg-muted text-muted-foreground border border-border";
    PillIcon = CheckCircle;
    pillText = t("noQueuesOnServer");
  } else if (downCount === 0) {
    pillClass = "bg-success/10 text-success border border-success/20";
    PillIcon = CheckCircle;
    pillText = t("allRunning");
  } else if (downCount < total) {
    pillClass = "bg-warning/10 text-warning border border-warning/20";
    PillIcon = AlertTriangle;
    pillText = t("nDown", { count: downCount });
  } else {
    pillClass =
      "bg-destructive/10 text-destructive border border-destructive/20";
    PillIcon = XCircle;
    pillText = t("nDown", { count: downCount });
  }

  // Tone for max messages: flag outliers
  const maxMessagesTone =
    maxMessages >= 10000
      ? "text-destructive"
      : maxMessages >= 1000
        ? "text-warning"
        : "text-foreground";

  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground py-0.5">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${pillClass}`}
      >
        <PillIcon className="h-3 w-3" aria-hidden="true" />
        {pillText}
      </span>
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {total.toLocaleString()}
      </span>
      <span>{t(total === 1 ? "queue" : "queues")}</span>
      {total > 0 && (
        <>
          <span className="select-none text-border">&middot;</span>
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {totalMessages.toLocaleString()}
          </span>
          <span>{t(totalMessages === 1 ? "messages" : "messages")}</span>
          <span className="select-none text-border">&middot;</span>
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {totalConsumers.toLocaleString()}
          </span>
          <span>{t("consumers")}</span>
          <span className="select-none text-border">&middot;</span>
          <span
            className={`font-mono tabular-nums font-semibold ${maxMessagesTone}`}
            title={t("maxMessagesTooltip")}
          >
            {maxMessages.toLocaleString()}
          </span>
          <span title={t("maxMessagesTooltip")}>
            {t("maxMessagesPerQueue")}
          </span>
        </>
      )}
    </div>
  );
}
