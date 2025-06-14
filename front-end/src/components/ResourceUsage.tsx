import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Cpu,
  HardDrive,
  Database,
  Activity,
  Zap,
  MessageSquare,
  Network,
} from "lucide-react";

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
}

export const ResourceUsage = ({ metrics, overview }: ResourceUsageProps) => {
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
    },
    {
      name: "Memory",
      value: metrics.totalMemory,
      unit: "GB",
      icon: HardDrive,
      color: "text-blue-600",
      type: "memory" as const,
    },
    {
      name: "Disk Usage",
      value: metrics.diskUsage,
      unit: "%",
      icon: Database,
      color: "text-purple-600",
      type: "percentage" as const,
    },
    {
      name: "Connections",
      value: overview?.object_totals?.connections || 0,
      unit: "",
      icon: Activity,
      color: "text-green-600",
      type: "count" as const,
      max: 100,
    },
    {
      name: "Channels",
      value: overview?.object_totals?.channels || 0,
      unit: "",
      icon: Zap,
      color: "text-orange-600",
      type: "count" as const,
      max: 200,
    },
    {
      name: "Consumers",
      value: overview?.object_totals?.consumers || 0,
      unit: "",
      icon: MessageSquare,
      color: "text-cyan-600",
      type: "count" as const,
      max: 50,
    },
    {
      name: "Avg Latency",
      value: metrics.avgLatency,
      unit: "ms",
      icon: Network,
      color: "text-indigo-600",
      type: "latency" as const,
    },
  ];

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-yellow-600" />
          Resource Usage
        </CardTitle>
        <p className="text-sm text-gray-500">Cluster resource consumption</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {resources.map((resource) => (
          <div key={resource.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <resource.icon className={`w-4 h-4 ${resource.color}`} />
                <span className="text-sm font-medium text-gray-700">
                  {resource.name}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {resource.type === "count"
                  ? resource.value
                  : resource.value?.toFixed(1)}
                {resource.unit}
              </span>
            </div>
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
