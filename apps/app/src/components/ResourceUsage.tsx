import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface ResourceUsageProps {
  overview?: {
    object_totals?: {
      connections: number;
      channels: number;
      consumers: number;
      exchanges: number;
    };
  };
  overviewError?: Error | null;
}

/**
 * Cluster object totals — inline stat line (no Card wrapper).
 *
 * Matches the health-pill + dot-separated metrics pattern used on
 * the Queues and Connections pages. Renders connections, channels,
 * consumers, and exchanges as a compact horizontal strip.
 */
export const ResourceUsage = ({
  overview,
  overviewError,
}: ResourceUsageProps) => {
  const { t } = useTranslation("dashboard");

  const hasError = overviewError && isRabbitMQAuthError(overviewError);

  if (!overview && !hasError) {
    return <Skeleton className="h-5 w-96" />;
  }

  const connections = overview?.object_totals?.connections ?? 0;
  const channels = overview?.object_totals?.channels ?? 0;
  const consumers = overview?.object_totals?.consumers ?? 0;
  const exchanges = overview?.object_totals?.exchanges ?? 0;

  if (hasError) {
    return (
      <div className="flex items-center gap-2 text-sm text-warning">
        <span className="font-medium">{t("clusterTotals")}:</span>
        <span>{t("permissionRequired")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{t("clusterTotals")}</span>
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {connections.toLocaleString()}
      </span>
      <span title={t("connectionTooltip")}>{t("connectionsCount")}</span>
      <span className="select-none text-border">&middot;</span>
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {channels.toLocaleString()}
      </span>
      <span title={t("channelTooltip")}>{t("channelsCount")}</span>
      <span className="select-none text-border">&middot;</span>
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {consumers.toLocaleString()}
      </span>
      <span title={t("consumerTooltip")}>{t("consumersCount")}</span>
      <span className="select-none text-border">&middot;</span>
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {exchanges.toLocaleString()}
      </span>
      <span title={t("exchangeTooltip")}>{t("exchangesCount")}</span>
    </div>
  );
};
