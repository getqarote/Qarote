import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Server, Wifi, HardDrive, Cpu, ExternalLink } from "lucide-react";
import { useServerContext } from "@/contexts/ServerContext";
import { useNodes } from "@/hooks/useApi";
import { Node } from "@/lib/api";
import { Link } from "react-router-dom";

export const ConnectedNodes = () => {
  const { selectedServerId } = useServerContext();
  const { data: nodesData, isLoading } = useNodes(selectedServerId);

  const nodes = nodesData?.nodes || [];

  const getStatusBadge = (node: Node) => {
    if (!node.running) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-700">
          <Wifi className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    }

    const memoryUsage = (node.mem_used / node.mem_limit) * 100;
    const diskUsage =
      ((node.disk_free_limit - node.disk_free) / node.disk_free_limit) * 100;

    if (memoryUsage > 80 || diskUsage > 80) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
          <Wifi className="w-3 h-3 mr-1" />
          Warning
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700">
        <Wifi className="w-3 h-3 mr-1" />
        Running
      </Badge>
    );
  };

  const formatUptime = (uptimeMs: number) => {
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Server className="h-5 w-5" />
              Connected Nodes ({nodes.length})
            </CardTitle>
            <p className="text-sm text-gray-500">
              RabbitMQ cluster node status and metrics
            </p>
          </div>
          {nodes.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link to="/nodes" className="flex items-center gap-2">
                View Details
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg border">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-20 mb-2" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : nodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodes.map((node) => (
              <div
                key={node.name}
                className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {node.name}
                  </h3>
                  {getStatusBadge(node)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{node.type}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Uptime:</span>
                    <span className="font-medium">
                      {formatUptime(node.uptime)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <HardDrive className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                      <div className="text-xs font-medium">
                        {formatBytes(node.mem_used)} /{" "}
                        {formatBytes(node.mem_limit)}
                      </div>
                      <div className="text-xs text-gray-500">
                        RabbitMQ Memory
                      </div>
                    </div>

                    <div className="text-center p-2 bg-green-50 rounded">
                      <Cpu className="h-4 w-4 text-green-600 mx-auto mb-1" />
                      <div className="text-xs font-medium">
                        {node.processors}
                      </div>
                      <div className="text-xs text-gray-500">CPUs</div>
                    </div>

                    <div className="text-center p-2 bg-purple-50 rounded">
                      <Server className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                      <div className="text-xs font-medium">
                        {formatBytes(node.disk_free)}
                      </div>
                      <div className="text-xs text-gray-500">Disk Free</div>
                    </div>

                    <div className="text-center p-2 bg-orange-50 rounded">
                      <HardDrive className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                      <div className="text-xs font-medium">
                        {formatBytes(node.mem_limit * 2.5)}
                      </div>
                      <div className="text-xs text-gray-500">Est. System</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No nodes found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
