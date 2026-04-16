import { ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { VHost } from "@/lib/api/vhostTypes";

interface VHostStatsProps {
  vhost: VHost;
  dataUpdatedAt?: number;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 5) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  return `${diffMins}m ago`;
}

export function VHostStats({ vhost, dataUpdatedAt }: VHostStatsProps) {
  const { t } = useTranslation("vhosts");
  const [, setTick] = useState(0);

  // Re-render every 5s to keep relative time fresh
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  const messageStats = vhost.message_stats;
  const hasMessageStats = Boolean(
    messageStats &&
    (messageStats.publish !== undefined ||
      messageStats.deliver !== undefined ||
      messageStats.ack !== undefined)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="title-section">{t("stats")}</h2>
        {dataUpdatedAt ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("updatedAgo", { time: formatRelativeTime(dataUpdatedAt) })}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-8">
        <StatBlock
          label={t("vhostQueues")}
          value={vhost.stats?.queueCount ?? 0}
        />
        <StatBlock
          label={t("vhostExchanges")}
          value={vhost.stats?.exchangeCount ?? 0}
        />
        <StatBlock
          label={t("totalMessages")}
          value={vhost.stats?.totalMessages ?? 0}
        />
      </div>

      {hasMessageStats && (
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-8">
            {messageStats?.publish !== undefined && (
              <StatBlock
                label={t("published")}
                value={messageStats.publish}
                detail={
                  messageStats.publish_details
                    ? `${messageStats.publish_details.rate.toFixed(2)}/s`
                    : undefined
                }
              />
            )}
            {messageStats?.deliver !== undefined && (
              <StatBlock
                label={t("delivered")}
                value={messageStats.deliver}
                detail={
                  messageStats.deliver_details
                    ? `${messageStats.deliver_details.rate.toFixed(2)}/s`
                    : undefined
                }
              />
            )}
            {messageStats?.ack !== undefined && (
              <StatBlock
                label={t("acknowledged")}
                value={messageStats.ack}
                detail={
                  messageStats.ack_details
                    ? `${messageStats.ack_details.rate.toFixed(2)}/s`
                    : undefined
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  detail,
}: {
  label: ReactNode;
  value: number;
  detail?: string;
}) {
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-mono tabular-nums text-foreground">
        {value.toLocaleString()}
      </div>
      {detail && (
        <div className="text-xs font-mono tabular-nums text-muted-foreground mt-0.5">
          {detail}
        </div>
      )}
    </div>
  );
}
