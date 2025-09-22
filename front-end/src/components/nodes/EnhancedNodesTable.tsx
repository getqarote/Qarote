import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ChevronDown,
  ChevronRight,
  MemoryStick,
  HardDrive,
  Cpu,
  Clock,
  Network,
  Database,
  Activity,
  Users,
  Settings,
  Wifi,
  Info,
  HelpCircle,
} from "lucide-react";
import { RabbitMQNode } from "@/lib/api";
import { useState } from "react";
import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { isRabbitMQAuthError } from "@/types/apiErrors";

interface EnhancedNodesTableProps {
  serverId: string;
  nodes: RabbitMQNode[];
  isLoading: boolean;
  nodesError?: Error | null;
}

type SortField =
  | "name"
  | "memUsed"
  | "diskFree"
  | "uptime"
  | "sockets"
  | "fdUsed"
  | "ioActivity"
  | "connections";
type SortDirection = "asc" | "desc";

export const EnhancedNodesTable = ({
  nodes,
  isLoading,
  nodesError,
}: EnhancedNodesTableProps) => {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNodeExpansion = (nodeName: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeName)) {
      newExpanded.delete(nodeName);
    } else {
      newExpanded.add(nodeName);
    }
    setExpandedNodes(newExpanded);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatUptime = (uptime: number): string => {
    const seconds = Math.floor(uptime / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num?.toString();
  };

  const formatRate = (rate: number): string => {
    return rate > 0 ? `${rate.toFixed(1)}/s` : "0/s";
  };

  const getNodeStatus = (node: RabbitMQNode) => {
    if (!node.running) {
      return {
        status: "Error",
        color: "bg-red-100 text-red-700",
        icon: XCircle,
      };
    }

    const memoryUsage = (node.mem_used / node.mem_limit) * 100;
    const diskUsage =
      ((node.disk_free_limit - node.disk_free) / node.disk_free_limit) * 100;

    if (memoryUsage > 80 || diskUsage > 80) {
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
      case "ioActivity":
        aValue = a.io_read_count + a.io_write_count;
        bValue = b.io_read_count + b.io_write_count;
        break;
      case "connections":
        aValue = a.connection_created;
        bValue = b.connection_created;
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
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (nodesError && isRabbitMQAuthError(nodesError)) {
    return (
      <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-5 w-5" />
            Cluster Nodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RabbitMQPermissionError
            requiredPermission={nodesError.requiredPermission}
            message={nodesError.message}
            title="RabbitMQNode Information Unavailable"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Server className="h-5 w-5 text-blue-600" />
          <span className="text-blue-900">Cluster Nodes ({nodes.length})</span>
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Detailed node metrics and health status. Click on any row to expand
          for more details.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : nodes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>
                  <SortButton field="name">RabbitMQNode Name</SortButton>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <SortButton field="memUsed">Memory Usage</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="diskFree">Disk Free</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="uptime">Uptime</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="ioActivity">I/O Activity</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="connections">Connections</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="fdUsed">File Descriptors</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNodes.map((node) => {
                const status = getNodeStatus(node);
                const StatusIcon = status.icon;
                const memoryUsage = (node.mem_used / node.mem_limit) * 100;
                const fdUsage = (node.fd_used / node.fd_total) * 100;
                const isExpanded = expandedNodes.has(node.name);

                return (
                  <>
                    <TableRow
                      key={node.name}
                      className="hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => toggleNodeExpansion(node.name)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-900">{node.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{formatBytes(node.mem_used)}</span>
                            <span className="text-gray-500">
                              / {formatBytes(node.mem_limit)}
                            </span>
                          </div>
                          <Progress
                            value={memoryUsage}
                            className={`h-2 w-20 ${memoryUsage > 80 ? "[&>div]:bg-red-500" : memoryUsage > 60 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>{formatBytes(node.disk_free)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-purple-500" />
                          <span className="text-gray-700">
                            {formatUptime(node.uptime)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <HardDrive className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-medium text-blue-700">
                              R: {formatNumber(node.io_read_count)}
                            </span>
                            <span className="text-xs font-medium text-indigo-700">
                              W: {formatNumber(node.io_write_count)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            <span className="text-blue-600">
                              {formatRate(
                                node.io_read_count_details?.rate || 0
                              )}
                            </span>{" "}
                            /{" "}
                            <span className="text-indigo-600">
                              {formatRate(
                                node.io_write_count_details?.rate || 0
                              )}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-3 h-3 text-green-500" />
                            <span className="font-medium text-green-700">
                              {formatNumber(node.connection_created)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Active:{" "}
                            <span className="text-green-600 font-medium">
                              {formatNumber(node.sockets_used)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{node.fd_used}</span>
                            <span className="text-gray-500">
                              / {node.fd_total}
                            </span>
                          </div>
                          <Progress
                            value={fdUsage}
                            className={`h-2 w-16 ${fdUsage > 80 ? "[&>div]:bg-red-500" : fdUsage > 60 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-gray-50/50 p-6">
                          <TooltipProvider>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {/* Memory Details */}
                              <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-blue-100">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                    <MemoryStick className="h-4 w-4 text-blue-600" />
                                    <span className="text-blue-900">
                                      Memory Details
                                    </span>
                                  </h4>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-gray-400 hover:text-blue-600 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <div className="space-y-2">
                                        <p className="font-medium">
                                          Memory Usage & Limits
                                        </p>
                                        <p className="text-sm">
                                          Shows how much RAM this RabbitMQ node
                                          is using. Monitor for:
                                        </p>
                                        <ul className="text-sm space-y-1 ml-4">
                                          <li>
                                            • High usage (&gt;80%) - may cause
                                            performance issues
                                          </li>
                                          <li>
                                            • Memory alarms - node will throttle
                                            publishers
                                          </li>
                                          <li>
                                            • Usage trending upward over time
                                          </li>
                                        </ul>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Used:</span>
                                    <span className="font-medium text-blue-700">
                                      {formatBytes(node.mem_used)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Limit:
                                    </span>
                                    <span className="font-medium">
                                      {formatBytes(node.mem_limit)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Usage:
                                    </span>
                                    <span
                                      className={`font-medium ${memoryUsage > 80 ? "text-red-600" : memoryUsage > 60 ? "text-yellow-600" : "text-green-600"}`}
                                    >
                                      {memoryUsage.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Alarm:
                                    </span>
                                    <Badge
                                      variant={
                                        node.mem_alarm
                                          ? "destructive"
                                          : "secondary"
                                      }
                                    >
                                      {node.mem_alarm ? "Active" : "None"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* I/O Performance */}
                              <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-purple-100">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-purple-600" />
                                    <span className="text-purple-900">
                                      I/O Performance
                                    </span>
                                  </h4>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-purple-600 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <div className="space-y-2">
                                        <p className="font-medium">
                                          Disk I/O Operations
                                        </p>
                                        <p className="text-sm">
                                          Tracks disk read/write activity.
                                          Important for:
                                        </p>
                                        <ul className="text-sm space-y-1 ml-4">
                                          <li>
                                            • High I/O rates may indicate heavy
                                            message persistence
                                          </li>
                                          <li>
                                            • Slow avg times suggest disk
                                            bottlenecks
                                          </li>
                                          <li>
                                            • Monitor during peak message loads
                                          </li>
                                        </ul>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Read Ops:
                                    </span>
                                    <span className="font-medium text-blue-700">
                                      {formatNumber(node.io_read_count)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Write Ops:
                                    </span>
                                    <span className="font-medium text-indigo-700">
                                      {formatNumber(node.io_write_count)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Read Rate:
                                    </span>
                                    <span className="font-medium text-blue-600">
                                      {formatRate(
                                        node.io_read_count_details?.rate || 0
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Write Rate:
                                    </span>
                                    <span className="font-medium text-indigo-600">
                                      {formatRate(
                                        node.io_write_count_details?.rate || 0
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Avg Read Time:
                                    </span>
                                    <span className="font-medium text-purple-700">
                                      {(node.io_read_avg_time || 0).toFixed(2)}
                                      ms
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Avg Write Time:
                                    </span>
                                    <span className="font-medium text-purple-700">
                                      {(node.io_write_avg_time || 0).toFixed(2)}
                                      ms
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Network & Connections */}
                              <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-green-100">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                    <Network className="h-4 w-4 text-green-600" />
                                    <span className="text-green-900">
                                      Network Activity
                                    </span>
                                  </h4>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-gray-400 hover:text-green-600 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <div className="space-y-2">
                                        <p className="font-medium">
                                          Connection & Channel Management
                                        </p>
                                        <p className="text-sm">
                                          Shows network activity and client
                                          connections. Watch for:
                                        </p>
                                        <ul className="text-sm space-y-1 ml-4">
                                          <li>
                                            • High connection churn (creates vs
                                            closes)
                                          </li>
                                          <li>
                                            • Socket exhaustion (near total
                                            limit)
                                          </li>
                                          <li>
                                            • Channel leaks (channels not
                                            properly closed)
                                          </li>
                                        </ul>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Connections Created:
                                    </span>
                                    <span className="font-medium text-green-700">
                                      {formatNumber(node.connection_created)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Connections Closed:
                                    </span>
                                    <span className="font-medium text-orange-700">
                                      {formatNumber(node.connection_closed)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Channels Created:
                                    </span>
                                    <span className="font-medium text-green-600">
                                      {formatNumber(node.channel_created)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Channels Closed:
                                    </span>
                                    <span className="font-medium text-orange-600">
                                      {formatNumber(node.channel_closed)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Active Sockets:
                                    </span>
                                    <span className="font-medium text-emerald-700">
                                      {node.sockets_used} / {node.sockets_total}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Net Ticktime:
                                    </span>
                                    <span className="font-medium">
                                      {node.net_ticktime}s
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Database & Queue Activity */}
                              <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-amber-100">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                    <Database className="h-4 w-4 text-amber-600" />
                                    <span className="text-amber-900">
                                      Database Activity
                                    </span>
                                  </h4>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-amber-600 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <div className="space-y-2">
                                        <p className="font-medium">
                                          Database & Message Store Operations
                                        </p>
                                        <p className="text-sm">
                                          Internal RabbitMQ database activity.
                                          Key indicators:
                                        </p>
                                        <ul className="text-sm space-y-1 ml-4">
                                          <li>
                                            • Mnesia transactions manage
                                            queue/exchange metadata
                                          </li>
                                          <li>
                                            • Message store operations handle
                                            persistent messages
                                          </li>
                                          <li>
                                            • Queue index tracks message
                                            positions
                                          </li>
                                          <li>
                                            • High activity during heavy message
                                            loads
                                          </li>
                                        </ul>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Mnesia RAM Tx:
                                    </span>
                                    <span className="font-medium text-amber-700">
                                      {formatNumber(node.mnesia_ram_tx_count)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Mnesia Disk Tx:
                                    </span>
                                    <span className="font-medium text-orange-700">
                                      {formatNumber(node.mnesia_disk_tx_count)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Msg Store Reads:
                                    </span>
                                    <span className="font-medium text-blue-700">
                                      {formatNumber(node.msg_store_read_count)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Msg Store Writes:
                                    </span>
                                    <span className="font-medium text-indigo-700">
                                      {formatNumber(node.msg_store_write_count)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Queue Index Reads:
                                    </span>
                                    <span className="font-medium text-cyan-700">
                                      {formatNumber(
                                        node.queue_index_read_count
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Queue Index Writes:
                                    </span>
                                    <span className="font-medium text-teal-700">
                                      {formatNumber(
                                        node.queue_index_write_count
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Additional System Information */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* System Details */}
                                <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                      <Cpu className="h-4 w-4 text-slate-600" />
                                      <span className="text-slate-900">
                                        System Details
                                      </span>
                                    </h4>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-gray-400 hover:text-slate-600 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm">
                                        <div className="space-y-2">
                                          <p className="font-medium">
                                            System Resources & Configuration
                                          </p>
                                          <p className="text-sm">
                                            Core system information about this
                                            node:
                                          </p>
                                          <ul className="text-sm space-y-1 ml-4">
                                            <li>
                                              • RabbitMQNode type: disk
                                              (persistent) or ram (temporary)
                                            </li>
                                            <li>
                                              • CPU cores available for Erlang
                                              processing
                                            </li>
                                            <li>
                                              • Process limits and current usage
                                            </li>
                                            <li>
                                              • Run queue shows system load
                                            </li>
                                          </ul>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Type:
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="border-slate-300 text-slate-700"
                                      >
                                        {node.type}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Processors:
                                      </span>
                                      <span className="font-medium text-slate-700">
                                        {node.processors}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        OS PID:
                                      </span>
                                      <span className="font-mono text-xs text-slate-700">
                                        {node.os_pid}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Run Queue:
                                      </span>
                                      <span className="font-medium text-slate-700">
                                        {node.run_queue}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Processes:
                                      </span>
                                      <span className="font-medium text-slate-700">
                                        {node.proc_used} / {node.proc_total}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Runtime Information */}
                                <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-rose-100">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                      <Settings className="h-4 w-4 text-rose-600" />
                                      <span className="text-rose-900">
                                        Runtime Info
                                      </span>
                                    </h4>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-gray-400 hover:text-rose-600 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm">
                                        <div className="space-y-2">
                                          <p className="font-medium">
                                            Runtime Configuration
                                          </p>
                                          <p className="text-sm">
                                            Shows current runtime configuration:
                                          </p>
                                          <ul className="text-sm space-y-1 ml-4">
                                            <li>
                                              • Enabled plugins extend RabbitMQ
                                              functionality
                                            </li>
                                            <li>
                                              • Auth mechanisms available for
                                              client connections
                                            </li>
                                            <li>
                                              • Exchange types supported by this
                                              node
                                            </li>
                                            <li>
                                              • Configuration and log file
                                              counts
                                            </li>
                                          </ul>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Enabled Plugins:
                                      </span>
                                      <span className="font-medium text-rose-700">
                                        {node.enabled_plugins?.length || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Auth Mechanisms:
                                      </span>
                                      <span className="font-medium text-pink-700">
                                        {node.auth_mechanisms?.length || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Exchange Types:
                                      </span>
                                      <span className="font-medium text-rose-600">
                                        {node.exchange_types?.length || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Config Files:
                                      </span>
                                      <span className="font-medium text-pink-600">
                                        {node.config_files?.length || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Log Files:
                                      </span>
                                      <span className="font-medium text-rose-600">
                                        {node.log_files?.length || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Health Status */}
                                <div className="space-y-3 bg-white/80 rounded-lg p-4 border border-emerald-100">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                      <Wifi className="h-4 w-4 text-emerald-600" />
                                      <span className="text-emerald-900">
                                        Health Status
                                      </span>
                                    </h4>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-gray-400 hover:text-emerald-600 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm">
                                        <div className="space-y-2">
                                          <p className="font-medium">
                                            RabbitMQNode Health & Alarms
                                          </p>
                                          <p className="text-sm">
                                            Critical health indicators to
                                            monitor:
                                          </p>
                                          <ul className="text-sm space-y-1 ml-4">
                                            <li>
                                              • Running status - node
                                              operational state
                                            </li>
                                            <li>
                                              • Memory/disk alarms - resource
                                              warnings
                                            </li>
                                            <li>
                                              • Being drained - maintenance mode
                                            </li>
                                            <li>
                                              • Partitions - network split-brain
                                              issues
                                            </li>
                                          </ul>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Running:
                                      </span>
                                      <Badge
                                        variant={
                                          node.running
                                            ? "secondary"
                                            : "destructive"
                                        }
                                        className={
                                          node.running
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : ""
                                        }
                                      >
                                        {node.running ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Being Drained:
                                      </span>
                                      <Badge
                                        variant={
                                          node.being_drained
                                            ? "destructive"
                                            : "secondary"
                                        }
                                        className={
                                          !node.being_drained
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : ""
                                        }
                                      >
                                        {node.being_drained ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Memory Alarm:
                                      </span>
                                      <Badge
                                        variant={
                                          node.mem_alarm
                                            ? "destructive"
                                            : "secondary"
                                        }
                                        className={
                                          !node.mem_alarm
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : ""
                                        }
                                      >
                                        {node.mem_alarm ? "Active" : "None"}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Disk Alarm:
                                      </span>
                                      <Badge
                                        variant={
                                          node.disk_free_alarm
                                            ? "destructive"
                                            : "secondary"
                                        }
                                        className={
                                          !node.disk_free_alarm
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : ""
                                        }
                                      >
                                        {node.disk_free_alarm
                                          ? "Active"
                                          : "None"}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Partitions:
                                      </span>
                                      <Badge
                                        variant={
                                          node.partitions?.length > 0
                                            ? "destructive"
                                            : "secondary"
                                        }
                                        className={
                                          (node.partitions?.length || 0) === 0
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : ""
                                        }
                                      >
                                        {node.partitions?.length || 0}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
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
