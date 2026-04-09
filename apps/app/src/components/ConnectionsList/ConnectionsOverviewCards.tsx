import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Activity, Network, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectionsOverviewCardsProps {
  totalConnections: number | undefined;
  totalChannels: number | undefined;
  isLoadingConnections: boolean;
  isLoadingChannels: boolean;
}

/**
 * Three-card stats strip above the connections list: total connections,
 * total channels, and the average channels-per-connection ratio.
 *
 * Numbers use Fragment Mono + tabular-nums so all three metrics sit on
 * a shared baseline grid. The ratio is rounded to one decimal because
 * operators care about "is this a fan-out or a fan-in workload" at a
 * glance, not the exact fractional value.
 */
export function ConnectionsOverviewCards({
  totalConnections,
  totalChannels,
  isLoadingConnections,
  isLoadingChannels,
}: ConnectionsOverviewCardsProps) {
  const { t } = useTranslation("connections");

  const avgChannels =
    totalConnections && totalConnections > 0
      ? Math.round(((totalChannels ?? 0) / totalConnections) * 10) / 10
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard
        title={t("totalConnections")}
        icon={<Network className="h-4 w-4 text-info" />}
        value={totalConnections}
        caption={t("activeClientConnections")}
        isLoading={isLoadingConnections}
      />
      <MetricCard
        title={t("totalChannels")}
        icon={<Zap className="h-4 w-4 text-warning" />}
        value={totalChannels}
        caption={t("activeCommunicationChannels")}
        isLoading={isLoadingChannels}
      />
      <MetricCard
        title={t("avgChannelsPerConnection")}
        icon={<Activity className="h-4 w-4 text-success" />}
        value={avgChannels}
        caption={t("channelsPerConnection")}
        isLoading={isLoadingConnections || isLoadingChannels}
      />
    </div>
  );
}

function MetricCard({
  title,
  icon,
  value,
  caption,
  isLoading,
}: {
  title: ReactNode;
  icon: ReactNode;
  value: number | undefined;
  caption: ReactNode;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">
            {(value ?? 0).toLocaleString()}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}
