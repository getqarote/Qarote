import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { VHost } from "@/lib/api/vhostTypes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VHostStatsProps {
  vhost: VHost;
}

/**
 * VHost-level message stats: how many queues and exchanges live in this
 * vhost, how many messages are in flight, and (when published rates are
 * known) the publish / deliver / ack rates.
 *
 * Numbers use Fragment Mono + tabular-nums because they're the primary
 * reason an operator is on this page.
 */
export function VHostStats({ vhost }: VHostStatsProps) {
  const { t } = useTranslation("vhosts");

  const messageStats = vhost.message_stats;
  const hasMessageStats = Boolean(
    messageStats &&
    (messageStats.publish !== undefined ||
      messageStats.deliver !== undefined ||
      messageStats.ack !== undefined)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section">{t("stats")}</CardTitle>
      </CardHeader>
      <CardContent>
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
          <div className="mt-6 pt-6 border-t">
            {/* No sub-heading here — the divider and the different labels
                (published / delivered / acknowledged vs the resource
                counts above) carry the transition on their own. */}
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
      </CardContent>
    </Card>
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
