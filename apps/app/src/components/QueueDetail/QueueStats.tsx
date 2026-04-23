import { useTranslation } from "react-i18next";

import { Queue } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

import { QueueStatusBadge } from "@/components/Queues/queue-status-badge";

interface QueueStatsProps {
  queue: Queue;
}

/**
 * Severity escalation for numeric values.
 * Returns a text color class based on thresholds.
 */
function getMessageSeverity(queue: Queue): string {
  // No messages = calm baseline
  if (queue.messages === 0) return "text-foreground";
  // High unacked ratio or absolute count = escalate
  if (queue.messages_unacknowledged > 1000) return "text-destructive";
  if (queue.messages > 10000) return "text-warning";
  return "text-foreground";
}

function getConsumerSeverity(queue: Queue): string {
  // No consumers with messages backing up = problem
  if (queue.consumers === 0 && queue.messages > 0) return "text-destructive";
  if (queue.consumers === 0) return "text-muted-foreground";
  return "text-foreground";
}

function getMemorySeverity(memory: number): string {
  // > 100MB = warning, > 500MB = critical
  if (memory > 500 * 1024 * 1024) return "text-destructive";
  if (memory > 100 * 1024 * 1024) return "text-warning";
  return "text-foreground";
}

export function QueueStats({ queue }: QueueStatsProps) {
  const { t } = useTranslation("queues");

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-1">{t("status")}</p>
          <QueueStatusBadge state={queue.state} />
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-1">
            {t("totalMessages")}
          </p>
          <p
            className={`text-2xl font-mono tabular-nums ${getMessageSeverity(queue)}`}
          >
            {queue.messages.toLocaleString()}
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-1">{t("consumers")}</p>
          <p
            className={`text-2xl font-mono tabular-nums ${getConsumerSeverity(queue)}`}
          >
            {queue.consumers}
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-1">
            {t("memoryUsage")}
          </p>
          <p
            className={`text-2xl font-mono tabular-nums ${getMemorySeverity(queue.memory)}`}
          >
            {formatBytes(queue.memory)}
          </p>
        </div>
      </div>
    </div>
  );
}
