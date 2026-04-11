import { useTranslation } from "react-i18next";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

interface ConnectionsOverviewProps {
  totalConnections: number | undefined;
  totalChannels: number | undefined;
  connections: Array<{ channelCount: number; state?: string }>;
  isLoadingConnections: boolean;
  isLoadingChannels: boolean;
}

/**
 * Inline stat line for connections — health pill + aggregate metrics.
 *
 * Follows the same pattern as EnhancedNodesOverview: a colored pill
 * anchors the status, inline metrics separated by dots provide the
 * numbers. Max channels replaces avg channels because outlier
 * detection ("which connection is hogging channels?") is more
 * actionable than the average.
 */
export function ConnectionsOverviewCards({
  totalConnections,
  totalChannels,
  connections,
  isLoadingConnections,
  isLoadingChannels,
}: ConnectionsOverviewProps) {
  const { t } = useTranslation("connections");

  if (isLoadingConnections || isLoadingChannels) {
    return <Skeleton className="h-5 w-80" />;
  }

  const total = totalConnections ?? 0;
  const channels = totalChannels ?? 0;

  // Max channels per connection — outlier detection is more useful than avg
  const maxChannels =
    connections.length > 0
      ? Math.max(...connections.map((c) => c.channelCount))
      : 0;

  // Health: all running = healthy, any non-running = degraded/critical
  const blockedCount = connections.filter(
    (c) => c.state && c.state.toLowerCase() !== "running"
  ).length;

  let pillClass: string;
  let PillIcon: typeof CheckCircle;
  let pillText: string;

  if (total === 0) {
    // No connections — neutral, quiet
    pillClass = "bg-muted text-muted-foreground border border-border";
    PillIcon = CheckCircle;
    pillText = t("noActiveConnections");
  } else if (blockedCount === 0) {
    pillClass = "bg-success/10 text-success border border-success/20";
    PillIcon = CheckCircle;
    pillText = t("allRunning");
  } else if (blockedCount < total) {
    pillClass = "bg-warning/10 text-warning border border-warning/20";
    PillIcon = AlertTriangle;
    pillText = t("nBlocked", { count: blockedCount });
  } else {
    pillClass =
      "bg-destructive/10 text-destructive border border-destructive/20";
    PillIcon = XCircle;
    pillText = t("nBlocked", { count: blockedCount });
  }

  // Tone for max channels: flag outliers
  const maxChannelsTone =
    maxChannels >= 50
      ? "text-warning"
      : maxChannels >= 100
        ? "text-destructive"
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
      <span>{t(total === 1 ? "connection" : "connections")}</span>
      {total > 0 && (
        <>
          <span className="select-none text-border">·</span>
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {channels.toLocaleString()}
          </span>
          <span>{t(channels === 1 ? "channel" : "channels")}</span>
          <span className="select-none text-border">·</span>
          <span
            className={`font-mono tabular-nums font-semibold ${maxChannelsTone}`}
            title={t("maxChannelsTooltip")}
          >
            {maxChannels}
          </span>
          <span title={t("maxChannelsTooltip")}>{t("maxChPerConn")}</span>
        </>
      )}
    </div>
  );
}
