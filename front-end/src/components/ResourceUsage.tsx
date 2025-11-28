import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Info,
  MessageSquare,
  Network,
  ShieldAlert,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface ResourceUsageProps {
  metrics: {
    totalMemory: number;
    cpuUsage: number;
    diskUsage: number;
    connectedNodes: number;
    activeQueues: number;
    avgLatency: number;
  };
  overview?: {
    object_totals?: {
      connections: number;
      channels: number;
      consumers: number;
      exchanges: number;
    };
  };
  metricsError?: Error | null;
  overviewError?: Error | null;
}

export const ResourceUsage = ({
  metrics,
  overview,
  metricsError,
  overviewError,
}: ResourceUsageProps) => {
  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCountColor = (count: number, max: number) => {
    const percentage = (count / max) * 100;
    return getUsageColor(percentage);
  };

  const resources = [
    {
      name: "CPU Usage",
      value: metrics.cpuUsage,
      unit: "%",
      icon: Cpu,
      color: "text-yellow-600",
      type: "percentage" as const,
      tooltip:
        "Estimated CPU usage across all RabbitMQ nodes in the cluster, calculated from memory pressure and connection load",
      hasError: metricsError && isRabbitMQAuthError(metricsError),
      errorSource: "metrics" as const,
    },
    {
      name: "System Memory",
      value: metrics.totalMemory,
      unit: "GB",
      icon: HardDrive,
      color: "text-blue-600",
      type: "memory" as const,
      tooltip:
        "Total estimated system memory across all nodes in the cluster (calculated as RabbitMQ memory limit × 2.5 per node)",
      hasError: metricsError && isRabbitMQAuthError(metricsError),
      errorSource: "metrics" as const,
    },
    {
      name: "Disk Usage",
      value: metrics.diskUsage,
      unit: "%",
      icon: Database,
      color: "text-purple-600",
      type: "percentage" as const,
      tooltip:
        "Disk space usage percentage across all nodes, calculated from available disk space and limits",
      hasError: metricsError && isRabbitMQAuthError(metricsError),
      errorSource: "metrics" as const,
    },
    {
      name: "Avg Latency",
      value: metrics.avgLatency,
      unit: "ms",
      icon: Network,
      color: "text-indigo-600",
      type: "latency" as const,
      tooltip:
        "Estimated average message processing latency based on publish/delivery rates and system load",
      hasError: metricsError && isRabbitMQAuthError(metricsError),
      errorSource: "metrics" as const,
    },
    {
      name: "Connections",
      value: overview?.object_totals?.connections || 0,
      unit: "",
      icon: Activity,
      color: "text-green-600",
      type: "count" as const,
      max: 100,
      tooltip:
        "Total number of active client connections to the RabbitMQ cluster",
      hasError: overviewError && isRabbitMQAuthError(overviewError),
      errorSource: "overview" as const,
    },
    {
      name: "Channels",
      value: overview?.object_totals?.channels || 0,
      unit: "",
      icon: Zap,
      color: "text-orange-600",
      type: "count" as const,
      max: 200,
      tooltip:
        "Total number of AMQP channels across all connections in the cluster",
      hasError: overviewError && isRabbitMQAuthError(overviewError),
      errorSource: "overview" as const,
    },
    {
      name: "Consumers",
      value: overview?.object_totals?.consumers || 0,
      unit: "",
      icon: MessageSquare,
      color: "text-cyan-600",
      type: "count" as const,
      max: 50,
      tooltip:
        "Total number of active message consumers across all queues in the cluster",
      hasError: overviewError && isRabbitMQAuthError(overviewError),
      errorSource: "overview" as const,
    },
  ];

  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Cpu className="w-5 h-5 text-yellow-600" />
          Resource Usage
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cluster-wide resource metrics and system usage
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {resources.map((resource) => (
          <div key={resource.name} className="space-y-2 group relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {resource.hasError ? (
                  <ShieldAlert className="w-4 h-4 text-orange-600" />
                ) : (
                  <resource.icon className={`w-4 h-4 ${resource.color}`} />
                )}
                <span className="text-sm font-medium text-gray-700 cursor-help">
                  {resource.name}
                </span>
                <Info className="w-3 h-3 text-gray-400 cursor-help opacity-60 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              {resource.hasError ? (
                <div className="text-sm">
                  <span className="font-bold text-orange-600">
                    Permission Required
                  </span>
                </div>
              ) : (
                <span className="text-sm font-bold text-gray-900">
                  {resource.type === "count"
                    ? resource.value
                    : resource.type === "memory"
                      ? resource.value?.toFixed(2)
                      : resource.value?.toFixed(1)}
                  {resource.unit}
                </span>
              )}
            </div>

            {/* Tooltip */}
            <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
              {resource.hasError
                ? `Permission required to access ${resource.errorSource} data. Need 'monitor' permission to view ${resource.name.toLowerCase()}.`
                : resource.tooltip}
            </div>

            {resource.hasError ? (
              <div className="w-full bg-orange-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-orange-400 w-0"></div>
              </div>
            ) : (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    resource.type === "percentage"
                      ? getUsageColor(resource.value)
                      : resource.type === "memory"
                        ? "bg-blue-500"
                        : resource.type === "count"
                          ? getCountColor(resource.value, resource.max || 100)
                          : resource.type === "latency"
                            ? resource.value > 10
                              ? "bg-red-500"
                              : resource.value > 5
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            : "bg-blue-500"
                  }`}
                  style={{
                    width:
                      resource.type === "percentage"
                        ? `${Math.min(resource.value, 100)}%`
                        : resource.type === "memory"
                          ? `${Math.min((resource.value / 16) * 100, 100)}%`
                          : resource.type === "count"
                            ? `${Math.min(
                                (resource.value / (resource.max || 100)) * 100,
                                100
                              )}%`
                            : resource.type === "latency"
                              ? `${Math.min((resource.value / 20) * 100, 100)}%`
                              : "50%",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
