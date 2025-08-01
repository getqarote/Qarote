import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Server,
  ArrowUpDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  MemoryStick,
} from "lucide-react";
import { Node } from "@/lib/api";
import { useState } from "react";
import { NodeMemoryDetails } from "./NodeMemoryDetails";
import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { isRabbitMQAuthError } from "@/types/apiErrors";

interface NodesTableProps {
  serverId: string;
  nodes: Node[];
  isLoading: boolean;
  nodesError?: Error | null;
}

type SortField =
  | "name"
  | "memUsed"
  | "diskFree"
  | "uptime"
  | "sockets"
  | "fdUsed";
type SortDirection = "asc" | "desc";

export const NodesTable = ({
  serverId,
  nodes,
  isLoading,
  nodesError,
}: NodesTableProps) => {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedNodeForMemory, setSelectedNodeForMemory] = useState<
    string | null
  >(null);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatUptime = (uptimeMs: number) => {
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    return `${days}d ${hours}h`;
  };

  const getNodeStatus = (node: Node) => {
    if (!node.running) {
      return {
        status: "Error",
        color: "bg-red-100 text-red-700",
        icon: XCircle,
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
      };
    }

    if (memoryUsage > 75 || diskUsage > 75) {
      return {
        status: "Warning",
        color: "bg-yellow-100 text-yellow-700",
        icon: AlertTriangle,
      };
    }

    return {
      status: "Healthy",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
    };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedNodes = [...nodes].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case "name":
        aValue = a.name;
        bValue = b.name;
        break;
      case "memUsed":
        aValue = a.mem_used;
        bValue = b.mem_used;
        break;
      case "diskFree":
        aValue = a.disk_free;
        bValue = b.disk_free;
        break;
      case "uptime":
        aValue = a.uptime;
        bValue = b.uptime;
        break;
      case "sockets":
        aValue = a.sockets_used;
        bValue = b.sockets_used;
        break;
      case "fdUsed":
        aValue = a.fd_used;
        bValue = b.fd_used;
        break;
      default:
        aValue = a.name;
        bValue = b.name;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="w-3 h-3 text-gray-400" />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-5 w-5" />
            Detailed Node Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
        title="Nodes Table Unavailable"
      />
    );
  }

  return (
    <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Detailed Node Metrics
          <Info className="w-4 h-4 text-gray-400 ml-auto" />
        </CardTitle>
        <p className="text-sm text-gray-500">
          Comprehensive system metrics and resource utilization for each node
        </p>
      </CardHeader>
      <CardContent>
        {nodes.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <SortableHeader field="name">Node Name</SortableHeader>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <SortableHeader field="memUsed">Memory Usage</SortableHeader>
                  <SortableHeader field="diskFree">
                    Disk Available
                  </SortableHeader>
                  <TableHead>CPUs</TableHead>
                  <SortableHeader field="sockets">Sockets</SortableHeader>
                  <SortableHeader field="fdUsed">
                    File Descriptors
                  </SortableHeader>
                  <SortableHeader field="uptime">Uptime</SortableHeader>
                  <TableHead>Version</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedNodes.map((node) => {
                  const status = getNodeStatus(node);
                  const memoryPercent =
                    node.mem_limit > 0
                      ? (node.mem_used / node.mem_limit) * 100
                      : 0;
                  const socketPercent =
                    node.sockets_total > 0
                      ? (node.sockets_used / node.sockets_total) * 100
                      : 0;
                  const fdPercent =
                    node.fd_total > 0
                      ? (node.fd_used / node.fd_total) * 100
                      : 0;

                  return (
                    <TableRow
                      key={node.name}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <TableCell className="font-semibold">
                        {node.name}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <status.icon className="w-3 h-3 mr-1" />
                          {status.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {node.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatBytes(node.mem_used)} /{" "}
                            {formatBytes(node.mem_limit)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {memoryPercent.toFixed(1)}% used
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatBytes(node.disk_free)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{node.processors}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {node.sockets_used} / {node.sockets_total}
                          </div>
                          <div className="text-xs text-gray-500">
                            {socketPercent.toFixed(1)}% used
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {node.fd_used} / {node.fd_total}
                          </div>
                          <div className="text-xs text-gray-500">
                            {fdPercent.toFixed(1)}% used
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatUptime(node.uptime)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            RMQ{" "}
                            {node.applications?.find(
                              (app) => app.name === "rabbit"
                            )?.version || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Erlang{" "}
                            {node.applications?.find(
                              (app) => app.name === "kernel"
                            )?.version || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedNodeForMemory(node.name)}
                          className="flex items-center gap-1"
                        >
                          <MemoryStick className="h-3 w-3" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
      {selectedNodeForMemory && (
        <CardContent className="border-t bg-gray-50">
          <NodeMemoryDetails
            serverId={serverId}
            nodeName={selectedNodeForMemory}
            onClose={() => setSelectedNodeForMemory(null)}
          />
        </CardContent>
      )}
    </Card>
  );
};
