import {
  Activity,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  Network,
  Server,
  XCircle,
} from "lucide-react";

import { RabbitMQNode } from "@/lib/api";
import { getUsageTone } from "@/lib/health-tones";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface NodesOverviewProps {
  serverId: string;
  nodes: RabbitMQNode[];
  isLoading: boolean;
  nodesError?: Error | null;
}

export const EnhancedNodesOverview = ({
  nodes,
  isLoading,
  nodesError,
}: NodesOverviewProps) => {
  if (nodesError && isRabbitMQAuthError(nodesError)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Cluster Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RabbitMQPermissionError
            requiredPermission={nodesError.requiredPermission}
            message={nodesError.message}
            title="Cluster Information Unavailable"
          />
        </CardContent>
      </Card>
    );
  }

  const healthyNodes = nodes.filter((node) => node.running).length;
  const totalNodes = nodes.length;
  const clusterHealth = totalNodes > 0 ? (healthyNodes / totalNodes) * 100 : 0;

  // Calculate aggregate metrics - only include running nodes with data
  const runningNodes = nodes.filter((node) => node.running);
  const totalMemoryUsed = runningNodes.reduce(
    (sum, node) => sum + (node.mem_used || 0),
    0
  );
  const totalMemoryLimit = runningNodes.reduce(
    (sum, node) => sum + (node.mem_limit || 0),
    0
  );
  const totalDiskFree = runningNodes.reduce(
    (sum, node) => sum + (node.disk_free || 0),
    0
  );
  const totalConnections = runningNodes.reduce(
    (sum, node) => sum + (node.sockets_used || 0),
    0
  );
  const avgMemoryUsage =
    totalMemoryLimit > 0 ? (totalMemoryUsed / totalMemoryLimit) * 100 : 0;

  const formatBytes = (bytes: number) => {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getHealthStatus = () => {
    if (clusterHealth === 100)
      return {
        status: "All Healthy",
        color: "bg-success-muted text-success",
        icon: CheckCircle,
      };
    if (clusterHealth >= 80)
      return {
        status: "Degraded",
        color: "bg-warning-muted text-warning",
        icon: AlertTriangle,
      };
    return {
      status: "Critical",
      color: "bg-destructive/10 text-destructive",
      icon: XCircle,
    };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  const overviewStats = [
    {
      name: "Total Nodes",
      value: totalNodes,
      unit: "",
      description: `${healthyNodes} healthy`,
      icon: Server,
      color: "text-muted-foreground",
    },
    {
      name: "Memory Usage",
      value: runningNodes.length > 0 ? avgMemoryUsage.toFixed(1) : "N/A",
      unit: runningNodes.length > 0 ? "%" : "",
      description:
        runningNodes.length > 0
          ? `${formatBytes(totalMemoryUsed)} used`
          : "No running nodes",
      icon: HardDrive,
      color:
        runningNodes.length > 0
          ? getUsageTone(avgMemoryUsage)
          : "text-muted-foreground",
    },
    {
      name: "Total Disk Free",
      value: runningNodes.length > 0 ? formatBytes(totalDiskFree) : "N/A",
      unit: "",
      description:
        runningNodes.length > 0 ? "Available storage" : "No running nodes",
      icon: Activity,
      color: "text-muted-foreground",
    },
    {
      name: "Active Connections",
      value: runningNodes.length > 0 ? totalConnections : "N/A",
      unit: "",
      description:
        runningNodes.length > 0 ? "Total sockets in use" : "No running nodes",
      icon: Network,
      color: "text-muted-foreground",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">Cluster Overview</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              RabbitMQ cluster health and aggregate metrics
            </p>
          </div>
          <Badge className={healthStatus.color}>
            <HealthIcon className="w-3 h-3 mr-1" />
            {healthStatus.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 bg-card rounded-lg border">
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {overviewStats.map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="p-4 bg-card rounded-lg border border-border hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <StatIcon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {stat.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${stat.color}`}>
                        {stat.value}
                      </span>
                      {stat.unit && (
                        <span className="text-sm text-muted-foreground">
                          {stat.unit}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
