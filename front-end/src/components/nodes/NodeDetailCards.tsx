import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Server,
  HardDrive,
  Cpu,
  Wifi,
  Clock,
  Database,
  Activity,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Node } from "@/lib/api";
import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { isRabbitMQAuthError } from "@/types/apiErrors";

interface NodeDetailCardsProps {
  serverId: string;
  nodes: Node[];
  isLoading: boolean;
  nodesError?: Error | null;
}

export const NodeDetailCards = ({
  nodes,
  isLoading,
  nodesError,
}: NodeDetailCardsProps) => {
  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatUptime = (uptimeMs: number) => {
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getNodeHealthStatus = (node: Node) => {
    if (!node.running) {
      return {
        status: "Error",
        color: "bg-red-100 text-red-700",
        icon: XCircle,
        severity: "critical",
      };
    }

    const memoryUsage =
      node.mem_limit > 0 ? (node.mem_used / node.mem_limit) * 100 : 0;
    const diskUsage =
      node.disk_free_limit > 0
        ? ((node.disk_free_limit - node.disk_free) / node.disk_free_limit) * 100
        : 0;

    if (memoryUsage > 90 || diskUsage > 90) {
      return {
        status: "Critical",
        color: "bg-red-100 text-red-700",
        icon: AlertTriangle,
        severity: "critical",
      };
    }

    if (memoryUsage > 75 || diskUsage > 75) {
      return {
        status: "Warning",
        color: "bg-yellow-100 text-yellow-700",
        icon: AlertTriangle,
        severity: "warning",
      };
    }

    return {
      status: "Healthy",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
      severity: "healthy",
    };
  };

  const getNodeMetrics = (node: Node) => {
    const memoryUsagePercent =
      node.mem_limit > 0 ? (node.mem_used / node.mem_limit) * 100 : 0;
    const diskFreePercent =
      node.disk_free_limit > 0
        ? (node.disk_free / node.disk_free_limit) * 100
        : 100;
    const diskUsagePercent = 100 - diskFreePercent;
    const socketUsagePercent =
      node.sockets_total > 0
        ? (node.sockets_used / node.sockets_total) * 100
        : 0;
    const fdUsagePercent =
      node.fd_total > 0 ? (node.fd_used / node.fd_total) * 100 : 0;

    return {
      memoryUsagePercent,
      diskUsagePercent,
      socketUsagePercent,
      fdUsagePercent,
      estimatedSystemMemory: (node.mem_limit || 0) * 2.5,
    };
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-5 w-5" />
            Node Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 bg-gray-50 rounded-lg border">
                <Skeleton className="h-6 w-32 mb-3" />
                <Skeleton className="h-4 w-20 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
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
        title="Node Details Unavailable"
      />
    );
  }

  return (
    <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Node Details ({nodes.length})
        </CardTitle>
        <p className="text-sm text-gray-500">
          Comprehensive metrics for each node in the cluster
        </p>
      </CardHeader>
      <CardContent>
        {nodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodes.map((node) => {
              const healthStatus = getNodeHealthStatus(node);
              const metrics = getNodeMetrics(node);

              return (
                <div
                  key={node.name}
                  className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-lg transition-all duration-300"
                >
                  {/* Node Header */}
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-bold text-gray-900 text-lg truncate"
                        title={node.name}
                      >
                        {node.name}
                      </h3>
                      <p className="text-sm text-gray-600">{node.type}</p>
                    </div>
                    <Badge className={`${healthStatus.color} flex-shrink-0`}>
                      <healthStatus.icon className="w-3 h-3 mr-1" />
                      {healthStatus.status}
                    </Badge>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-4">
                    {/* Memory Usage */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">Memory</span>
                        </div>
                        <span className="text-sm font-bold">
                          {formatBytes(node.mem_used)} /{" "}
                          {formatBytes(node.mem_limit)}
                        </span>
                      </div>
                      <Progress
                        value={metrics.memoryUsagePercent}
                        className="h-2"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {metrics.memoryUsagePercent.toFixed(1)}% used
                      </div>
                    </div>

                    {/* Disk Usage */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">Disk</span>
                        </div>
                        <span className="text-sm font-bold">
                          {formatBytes(node.disk_free)} free
                        </span>
                      </div>
                      <Progress
                        value={metrics.diskUsagePercent}
                        className="h-2"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {metrics.diskUsagePercent.toFixed(1)}% used
                      </div>
                    </div>

                    {/* System Resources */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <Cpu className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <div className="text-sm font-bold">
                          {node.processors}
                        </div>
                        <div className="text-xs text-gray-500">CPUs</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <Activity className="w-4 h-4 text-green-600 mx-auto mb-1" />
                        <div className="text-sm font-bold">
                          {node.sockets_used}/{node.sockets_total}
                        </div>
                        <div className="text-xs text-gray-500">Sockets</div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">Uptime</span>
                        </div>
                        <span className="font-medium">
                          {formatUptime(node.uptime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">
                            File Descriptors
                          </span>
                        </div>
                        <span className="font-medium">
                          {node.fd_used}/{node.fd_total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">Est. System</span>
                        </div>
                        <span className="font-medium">
                          {formatBytes(metrics.estimatedSystemMemory)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Nodes Found
            </h3>
            <p className="text-gray-500">
              No RabbitMQ nodes detected for this server.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
