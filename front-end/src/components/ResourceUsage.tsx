import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, HardDrive, Database } from "lucide-react";

interface ResourceUsageProps {
  metrics: {
    totalMemory: number;
    cpuUsage: number;
    diskUsage: number;
  };
}

export const ResourceUsage = ({ metrics }: ResourceUsageProps) => {
  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const resources = [
    {
      name: "CPU Usage",
      value: metrics.cpuUsage,
      unit: "%",
      icon: Cpu,
      color: "text-yellow-600",
    },
    {
      name: "Memory",
      value: metrics.totalMemory,
      unit: "GB",
      icon: HardDrive,
      color: "text-blue-600",
    },
    {
      name: "Disk Usage",
      value: metrics.diskUsage,
      unit: "%",
      icon: Database,
      color: "text-purple-600",
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
                {resource.value?.toFixed(1)}
                {resource.unit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  resource.unit === "%"
                    ? getUsageColor(resource.value)
                    : "bg-blue-500"
                }`}
                style={{
                  width:
                    resource.unit === "%"
                      ? `${Math.min(resource.value, 100)}%`
                      : `${Math.min((resource.value / 16) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
