import { useTranslation } from "react-i18next";

import { Queue } from "@/lib/api";

import { QueueStatusBadge } from "@/components/Queues/queue-status-badge";

interface QueueStatsProps {
  queue: Queue;
}

export function QueueStats({ queue }: QueueStatsProps) {
  const { t } = useTranslation("queues");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
          <p className="text-2xl font-mono tabular-nums text-foreground">
            {queue.messages.toLocaleString()}
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-1">{t("consumers")}</p>
          <p className="text-2xl font-mono tabular-nums text-foreground">
            {queue.consumers}
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-1">
            {t("memoryUsage")}
          </p>
          <p className="text-2xl font-mono tabular-nums text-foreground">
            {formatBytes(queue.memory)}
          </p>
        </div>
      </div>
    </div>
  );
}
