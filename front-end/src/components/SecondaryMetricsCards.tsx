import { Server, Cpu, HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Node {
  running: boolean;
}

interface SecondaryMetricsData {
  connectedNodes: number;
  cpuUsage: number;
  totalMemory: number;
}

interface SecondaryMetricsCardsProps {
  metrics: SecondaryMetricsData;
  nodes: Node[];
  isLoading: boolean;
}

export const SecondaryMetricsCards = ({
  metrics,
  nodes,
  isLoading,
}: SecondaryMetricsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Connected Nodes
          </CardTitle>
          <Server className="h-5 w-5 text-cyan-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-8" />
          ) : (
            <div className="text-2xl font-bold text-gray-900">
              {metrics.connectedNodes}
            </div>
          )}
          <p className="text-xs text-green-600 mt-1">
            {nodes.every((node) => node.running)
              ? "All nodes healthy"
              : "Some issues detected"}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            CPU Usage
          </CardTitle>
          <Cpu className="h-5 w-5 text-yellow-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="text-2xl font-bold text-gray-900">
              {metrics.cpuUsage.toFixed(1)}%
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Cluster average</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Memory Usage
          </CardTitle>
          <HardDrive className="h-5 w-5 text-red-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="text-2xl font-bold text-gray-900">
              {metrics.totalMemory.toFixed(1)} GB
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Total allocated</p>
        </CardContent>
      </Card>
    </div>
  );
};
