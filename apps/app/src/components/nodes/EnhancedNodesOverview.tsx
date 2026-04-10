import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

import { RabbitMQNode } from "@/lib/api";
import { getUsageTone } from "@/lib/health-tones";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { Skeleton } from "@/components/ui/skeleton";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface NodesOverviewProps {
  serverId: string;
  nodes: RabbitMQNode[];
  isLoading: boolean;
  nodesError?: Error | null;
}

/**
 * Cluster health summary — health pill + inline aggregate metrics.
 *
 * Replaces the four-card hero metric grid with a single stat line that
 * follows the same pattern as ExchangesOverviewCards. The health pill
 * provides a visual anchor: green in healthy state (quiet), orange/red
 * in degraded/critical (unmissable without being theatrical).
 *
 * Memory tone inherits from getUsageTone so the percentage turns amber
 * at 75% and red at 90% — same thresholds used in the table rows.
 */
export const EnhancedNodesOverview = ({
  nodes,
  isLoading,
  nodesError,
}: NodesOverviewProps) => {
  if (nodesError && isRabbitMQAuthError(nodesError)) {
    return (
      <RabbitMQPermissionError
        requiredPermission={nodesError.requiredPermission}
        message={nodesError.message}
        title="Cluster Information Unavailable"
      />
    );
  }

  if (isLoading) {
    return <Skeleton className="h-5 w-80" />;
  }

  const totalNodes = nodes.length;
  const healthyNodes = nodes.filter((n) => n.running).length;
  const unhealthyNodes = totalNodes - healthyNodes;
  const clusterHealth = totalNodes > 0 ? (healthyNodes / totalNodes) * 100 : 0;

  const runningNodes = nodes.filter((n) => n.running);
  const totalMemUsed = runningNodes.reduce((s, n) => s + (n.mem_used || 0), 0);
  const totalMemLimit = runningNodes.reduce(
    (s, n) => s + (n.mem_limit || 0),
    0
  );
  const totalDiskFree = runningNodes.reduce(
    (s, n) => s + (n.disk_free || 0),
    0
  );
  const totalConnections = runningNodes.reduce(
    (s, n) => s + (n.sockets_used || 0),
    0
  );
  const avgMemoryPct =
    totalMemLimit > 0 ? (totalMemUsed / totalMemLimit) * 100 : 0;
  const diskFreeGB = (totalDiskFree / 1024 ** 3).toFixed(1);

  // Health pill appearance
  const isHealthy = clusterHealth === 100;
  const isDegraded = clusterHealth >= 80 && clusterHealth < 100;

  let pillClass: string;
  let PillIcon: typeof CheckCircle;
  let pillText: string;

  if (isHealthy) {
    pillClass = "bg-success/10 text-success border border-success/20";
    PillIcon = CheckCircle;
    pillText = "All Healthy";
  } else if (isDegraded) {
    pillClass = "bg-warning/10 text-warning border border-warning/20";
    PillIcon = AlertTriangle;
    pillText = `${unhealthyNodes} degraded`;
  } else {
    pillClass =
      "bg-destructive/10 text-destructive border border-destructive/20";
    PillIcon = XCircle;
    pillText = `${unhealthyNodes} critical`;
  }

  const memTone =
    runningNodes.length > 0 ? getUsageTone(avgMemoryPct) : "text-foreground";

  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground py-0.5">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${pillClass}`}
      >
        <PillIcon className="h-3 w-3" aria-hidden="true" />
        {pillText}
      </span>
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {totalNodes}
      </span>
      <span>{totalNodes === 1 ? "node" : "nodes"}</span>
      {runningNodes.length > 0 && (
        <>
          <span className="select-none text-border">·</span>
          <span className={`font-mono tabular-nums font-semibold ${memTone}`}>
            {avgMemoryPct.toFixed(1)}
          </span>
          <span>% memory</span>
          <span className="select-none text-border">·</span>
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {diskFreeGB}
          </span>
          <span>GB disk free</span>
          <span className="select-none text-border">·</span>
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {totalConnections}
          </span>
          <span>connections</span>
        </>
      )}
    </div>
  );
};
