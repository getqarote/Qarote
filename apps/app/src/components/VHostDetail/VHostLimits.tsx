import { useTranslation } from "react-i18next";

import type { VHost } from "@/lib/api/vhostTypes";

interface VHostLimitsProps {
  vhost: VHost;
}

type VHostLimitsRuntime = Array<{
  vhost: string;
  value: {
    "max-connections"?: number;
    "max-queues"?: number;
  };
}>;

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
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("limits")}</h2>
      </div>
      <div className="p-4">
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
      </div>
    </div>
  );
}
