import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HardDrive,
  Activity,
  Network,
  HelpCircle,
} from "lucide-react";
import { RabbitMQNode } from "@/lib/api";
import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
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
      <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-5 w-5 text-emerald-600" />
            <span className="text-emerald-900">Cluster Overview</span>
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

  // Calculate aggregate metrics
  const totalMemoryUsed = nodes.reduce((sum, node) => sum + node.mem_used, 0);
  const totalMemoryLimit = nodes.reduce((sum, node) => sum + node.mem_limit, 0);
  const totalDiskFree = nodes.reduce((sum, node) => sum + node.disk_free, 0);
  const totalConnections = nodes.reduce(
    (sum, node) => sum + node.sockets_used,
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
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
      };
    if (clusterHealth >= 80)
      return {
        status: "Degraded",
        color: "bg-yellow-100 text-yellow-700",
        icon: AlertTriangle,
      };
    return {
      status: "Critical",
      color: "bg-red-100 text-red-700",
      icon: XCircle,
    };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  const getOverviewTooltipContent = (statName: string) => {
    switch (statName) {
      case "Cluster Health":
        return (
          <div className="text-sm">
            <div className="font-medium mb-2">Cluster Health Status</div>
            <p>
              Shows the percentage of healthy nodes in your RabbitMQ cluster.
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div>
                • <span className="font-medium">100%:</span> All nodes healthy
              </div>
              <div>
                • <span className="font-medium">80-99%:</span> Some nodes
                degraded
              </div>
              <div>
                • <span className="font-medium">&lt;80%:</span> Critical cluster
                state
              </div>
            </div>
          </div>
        );
      case "Memory Usage":
        return (
          <div className="text-sm">
            <div className="font-medium mb-2">Cluster Memory Usage</div>
            <p>
              Total memory consumption across all RabbitMQ nodes in the cluster.
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div>• Monitor for high usage patterns</div>
              <div>• Configure memory alarms when needed</div>
              <div>• Scale nodes if consistently high</div>
            </div>
          </div>
        );
      case "Disk Space":
        return (
          <div className="text-sm">
            <div className="font-medium mb-2">Available Disk Space</div>
            <p>Total free disk space across all cluster nodes.</p>
            <div className="mt-2 space-y-1 text-xs">
              <div>• Critical for message persistence</div>
              <div>• Low space triggers disk alarms</div>
              <div>• Monitor to prevent storage issues</div>
            </div>
          </div>
        );
      case "Connections":
        return (
          <div className="text-sm">
            <div className="font-medium mb-2">Active Connections</div>
            <p>Total number of client connections across all cluster nodes.</p>
            <div className="mt-2 space-y-1 text-xs">
              <div>• Includes publishers and consumers</div>
              <div>• High counts may impact performance</div>
              <div>• Monitor for connection leaks</div>
            </div>
          </div>
        );
      default:
        return <div className="text-sm">Information about this metric</div>;
    }
  };

  const overviewStats = [
    {
      name: "Total Nodes",
      value: totalNodes,
      unit: "",
      description: `${healthyNodes} healthy`,
      icon: Server,
      color: "text-blue-600",
    },
    {
      name: "Memory Usage",
      value: avgMemoryUsage.toFixed(1),
      unit: "%",
      description: `${formatBytes(totalMemoryUsed)} used`,
      icon: HardDrive,
      color:
        avgMemoryUsage > 80
          ? "text-red-600"
          : avgMemoryUsage > 60
            ? "text-yellow-600"
            : "text-green-600",
    },
    {
      name: "Total Disk Free",
      value: formatBytes(totalDiskFree),
      unit: "",
      description: "Available storage",
      icon: Activity,
      color: "text-purple-600",
    },
    {
      name: "Active Connections",
      value: totalConnections,
      unit: "",
      description: "Total sockets in use",
      icon: Network,
      color: "text-orange-600",
    },
  ];

  return (
    <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-600" />
              <span className="text-emerald-900">Cluster Overview</span>
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
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
              <div key={i} className="p-4 bg-gray-50 rounded-lg border">
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {overviewStats.map((stat) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={stat.name}
                    className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <StatIcon className={`h-5 w-5 ${stat.color}`} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          {getOverviewTooltipContent(stat.name)}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-600">
                        {stat.name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${stat.color}`}>
                          {stat.value}
                        </span>
                        {stat.unit && (
                          <span className="text-sm text-gray-500">
                            {stat.unit}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {stat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
};
