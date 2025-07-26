import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HardDrive,
  Cpu,
  Database,
  Activity,
} from "lucide-react";
import { useNodes, useEnhancedMetrics } from "@/hooks/useApi";
import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { isRabbitMQAuthError } from "@/types/apiErrors";

interface NodesOverviewProps {
  serverId: string;
}

export const NodesOverview = ({ serverId }: NodesOverviewProps) => {
  const {
    data: nodesData,
    isLoading: nodesLoading,
    error: nodesError,
  } = useNodes(serverId);
  const { data: metricsData, isLoading: metricsLoading } =
    useEnhancedMetrics(serverId);

  const nodes = nodesData?.nodes || [];
  const metrics = metricsData?.metrics;

  const isLoading = nodesLoading || metricsLoading;

  // Calculate cluster health
  const healthyNodes = nodes.filter((node) => node.running).length;
  const totalNodes = nodes.length;
  const clusterHealth = totalNodes > 0 ? (healthyNodes / totalNodes) * 100 : 0;

  // Get health status
  const getHealthStatus = () => {
    if (clusterHealth === 100)
      return {
        status: "Healthy",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
      };
    if (clusterHealth >= 80)
      return {
        status: "Warning",
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

  const overviewStats = [
    {
      name: "Total Nodes",
      value: totalNodes,
      unit: "",
      icon: Server,
      color: "text-blue-600",
    },
    {
      name: "Healthy Nodes",
      value: healthyNodes,
      unit: "",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      name: "System Memory",
      value: metrics?.totalMemoryGB || 0,
      unit: "GB",
      icon: HardDrive,
      color: "text-purple-600",
    },
    {
      name: "Avg CPU Usage",
      value: metrics?.avgCpuUsage || 0,
      unit: "%",
      icon: Cpu,
      color: "text-yellow-600",
    },
    {
      name: "Disk Usage",
      value: metrics?.diskUsage || 0,
      unit: "%",
      icon: Database,
      color: "text-orange-600",
    },
    {
      name: "Total Connections",
      value: metrics?.connections?.length || 0,
      unit: "",
      icon: Activity,
      color: "text-cyan-600",
    },
  ];

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-5 w-5" />
            Cluster Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                <Skeleton className="h-8 w-8 mx-auto mb-2" />
                <Skeleton className="h-6 w-16 mx-auto mb-1" />
                <Skeleton className="h-4 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle RabbitMQ authorization errors
  if (nodesError && isRabbitMQAuthError(nodesError)) {
    return (
      <RabbitMQPermissionError
        requiredPermission={nodesError.requiredPermission}
        message={nodesError.message}
        title="Cannot View Cluster Overview"
      />
    );
  }

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Cluster Overview
          <Badge className={`ml-auto ${healthStatus.color}`}>
            <healthStatus.icon className="w-3 h-3 mr-1" />
            {healthStatus.status}
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-500">
          Real-time cluster health and resource metrics
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {overviewStats.map((stat) => (
            <div
              key={stat.name}
              className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-all duration-300"
            >
              <stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />
              <div className="text-2xl font-bold text-gray-900">
                {stat.unit === "%" || stat.unit === "GB"
                  ? stat.value.toFixed(1)
                  : stat.value}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {stat.unit}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">{stat.name}</div>
            </div>
          ))}
        </div>

        {/* Cluster Health Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Cluster Health
            </span>
            <span className="text-sm font-bold text-gray-900">
              {clusterHealth.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                clusterHealth === 100
                  ? "bg-green-500"
                  : clusterHealth >= 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${clusterHealth}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              {healthyNodes} of {totalNodes} nodes healthy
            </span>
            <span>
              {totalNodes - healthyNodes > 0
                ? `${totalNodes - healthyNodes} issues`
                : "All systems operational"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
