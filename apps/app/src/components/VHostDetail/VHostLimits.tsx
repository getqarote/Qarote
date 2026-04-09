import { useTranslation } from "react-i18next";

import type { VHost } from "@/lib/api/vhostTypes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VHostLimitsProps {
  vhost: VHost;
}

/**
 * RabbitMQ's `/vhost-limits/{vhost}` endpoint returns an array of
 * `{vhost, value: {max-connections, max-queues, ...}}` entries (one per
 * vhost), not a flat object. We intentionally preserve that runtime shape
 * here rather than fighting the typed wrapper; the cast is local and
 * clearly labelled.
 */
type VHostLimitsRuntime = Array<{
  vhost: string;
  value: {
    "max-connections"?: number;
    "max-queues"?: number;
  };
}>;

/**
 * Renders the vhost's connection and queue limits only when at least one
 * is set. Matches `UserLimits` — a card full of em-dashes is chrome
 * without information, and the "Set limits" form right below already
 * communicates "none set" through its empty fields.
 */
export function VHostLimits({ vhost }: VHostLimitsProps) {
  const { t } = useTranslation("vhosts");

  const limits = (
    vhost.limits as unknown as VHostLimitsRuntime | undefined
  )?.[0]?.value;
  const maxConnections = limits?.["max-connections"];
  const maxQueues = limits?.["max-queues"];

  if (maxConnections === undefined && maxQueues === undefined) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section">{t("limits")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {t("maxConnections")}
            </div>
            <div className="text-2xl font-mono tabular-nums text-foreground">
              {maxConnections ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {t("maxQueues")}
            </div>
            <div className="text-2xl font-mono tabular-nums text-foreground">
              {maxQueues ?? "—"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
