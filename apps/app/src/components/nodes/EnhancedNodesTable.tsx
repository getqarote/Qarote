import { Fragment, useState } from "react";

import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Server,
  XCircle,
} from "lucide-react";

import { RabbitMQNode } from "@/lib/api";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  | "connections";
type SortDirection = "asc" | "desc";

const SortButton = ({
  field,
  children,
  onSort,
}: {
  field: SortField;
  children: React.ReactNode;
  onSort: (field: SortField) => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    className="h-auto p-0 font-medium hover:bg-transparent"
    onClick={() => onSort(field)}
  >
    {children}
    <ArrowUpDown className="ml-1 h-3 w-3" />
  </Button>
);

/** Label + value row for the expanded detail sections. */
const ExpandedRow = ({
  label,
  value,
  mono = false,
  tone,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  tone?: "success" | "warning" | "destructive";
}) => {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {label}
      </dt>
      <dd
        className={`text-xs font-medium text-right ${toneClass} ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
};

/** Compact inline label + value for the database strip. */
const InlineMetric = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex items-baseline gap-1.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-mono tabular-nums text-muted-foreground/80">
      {value}
    </span>
  </div>
);

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
        color: "bg-destructive/10 text-destructive",
        icon: XCircle,
      };
    }

    const memoryUsage =
      node.mem_used && node.mem_limit
        ? (node.mem_used / node.mem_limit) * 100
        : 0;
    const diskUsage =
      node.disk_free_limit && node.disk_free
        ? ((node.disk_free_limit - node.disk_free) / node.disk_free_limit) * 100
        : 0;

    if (memoryUsage > 80 || diskUsage > 80) {
      return {
        status: "Warning",
        color: "bg-warning-muted text-warning",
        icon: AlertTriangle,
      };
    }

    return {
      status: "Healthy",
      color: "bg-success-muted text-success",
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
        aValue = a.mem_used || 0;
        bValue = b.mem_used || 0;
        break;
      case "diskFree":
        aValue = a.disk_free || 0;
        bValue = b.disk_free || 0;
        break;
      case "uptime":
        aValue = a.uptime || 0;
        bValue = b.uptime || 0;
        break;
      case "sockets":
        aValue = a.sockets_used || 0;
        bValue = b.sockets_used || 0;
        break;
      case "connections":
        aValue = a.connection_created || 0;
        bValue = b.connection_created || 0;
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

  if (nodesError && isRabbitMQAuthError(nodesError)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="title-section">Nodes</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle className="title-section">Nodes</CardTitle>
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
                  <SortButton onSort={handleSort} field="name">
                    Node
                  </SortButton>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <SortButton onSort={handleSort} field="memUsed">
                    Memory Usage
                  </SortButton>
                </TableHead>
                <TableHead>
                  <SortButton onSort={handleSort} field="diskFree">
                    Disk Free
                  </SortButton>
                </TableHead>
                <TableHead>
                  <SortButton onSort={handleSort} field="uptime">
                    Uptime
                  </SortButton>
                </TableHead>
                <TableHead>
                  <SortButton onSort={handleSort} field="connections">
                    Connections
                  </SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNodes.map((node) => {
                const status = getNodeStatus(node);
                const StatusIcon = status.icon;
                const memoryUsage =
                  node.mem_used && node.mem_limit
                    ? (node.mem_used / node.mem_limit) * 100
                    : 0;
                const isExpanded = expandedNodes.has(node.name);

                return (
                  <Fragment key={node.name}>
                    <TableRow
                      className="hover:bg-accent/50 cursor-pointer"
                      onClick={() => toggleNodeExpansion(node.name)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <span
                          className="font-mono text-sm text-foreground truncate block"
                          title={node.name}
                        >
                          {node.name}
                        </span>
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
                            <span className="font-mono tabular-nums">
                              {node.mem_used
                                ? formatBytes(node.mem_used)
                                : "N/A"}
                            </span>
                            <span className="font-mono tabular-nums text-muted-foreground">
                              /{" "}
                              {node.mem_limit
                                ? formatBytes(node.mem_limit)
                                : "N/A"}
                            </span>
                          </div>
                          {node.mem_used && node.mem_limit ? (
                            <Progress
                              value={memoryUsage}
                              className={`h-2 w-20 ${
                                memoryUsage > 80
                                  ? "[&>div]:bg-destructive"
                                  : memoryUsage > 60
                                    ? "[&>div]:bg-warning"
                                    : "[&>div]:bg-success"
                              }`}
                            />
                          ) : (
                            <div className="h-2 w-20 bg-border rounded"></div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {node.disk_free ? formatBytes(node.disk_free) : "N/A"}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-sm text-muted-foreground">
                        {node.uptime ? formatUptime(node.uptime) : "—"}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-sm">
                        {node.sockets_used !== undefined
                          ? formatNumber(node.sockets_used)
                          : "—"}
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0">
                          <div className="bg-muted/40 border-b border-border">
                            {/* Primary metrics band — 5 equal sections */}
                            <div className="grid grid-cols-5 divide-x divide-border">
                              {/* Health */}
                              <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                                  Health
                                </p>
                                <dl className="space-y-2">
                                  <ExpandedRow
                                    label="Running"
                                    value={node.running ? "Yes" : "No"}
                                    tone={
                                      node.running ? "success" : "destructive"
                                    }
                                  />
                                  <ExpandedRow
                                    label="Draining"
                                    value={node.being_drained ? "Yes" : "No"}
                                    tone={
                                      node.being_drained ? "warning" : undefined
                                    }
                                  />
                                  <ExpandedRow
                                    label="Mem alarm"
                                    value={node.mem_alarm ? "Active" : "None"}
                                    tone={
                                      node.mem_alarm ? "destructive" : undefined
                                    }
                                  />
                                  <ExpandedRow
                                    label="Disk alarm"
                                    value={
                                      node.disk_free_alarm ? "Active" : "None"
                                    }
                                    tone={
                                      node.disk_free_alarm
                                        ? "destructive"
                                        : undefined
                                    }
                                  />
                                  <ExpandedRow
                                    label="Partitions"
                                    value={node.partitions?.length ?? 0}
                                    mono
                                    tone={
                                      (node.partitions?.length ?? 0) > 0
                                        ? "destructive"
                                        : undefined
                                    }
                                  />
                                </dl>
                              </div>

                              {/* Memory */}
                              <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                                  Memory
                                </p>
                                <dl className="space-y-2">
                                  <ExpandedRow
                                    label="Used"
                                    value={
                                      node.mem_used
                                        ? formatBytes(node.mem_used)
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Limit"
                                    value={
                                      node.mem_limit
                                        ? formatBytes(node.mem_limit)
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Usage"
                                    value={
                                      node.mem_used && node.mem_limit
                                        ? `${memoryUsage.toFixed(1)}%`
                                        : "—"
                                    }
                                    mono
                                    tone={
                                      memoryUsage > 90
                                        ? "destructive"
                                        : memoryUsage > 75
                                          ? "warning"
                                          : undefined
                                    }
                                  />
                                  <ExpandedRow
                                    label="Disk free"
                                    value={
                                      node.disk_free
                                        ? formatBytes(node.disk_free)
                                        : "—"
                                    }
                                    mono
                                  />
                                </dl>
                              </div>

                              {/* Disk I/O */}
                              <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                                  Disk I/O
                                </p>
                                <dl className="space-y-2">
                                  <ExpandedRow
                                    label="Reads"
                                    value={
                                      node.io_read_count
                                        ? formatNumber(node.io_read_count)
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Writes"
                                    value={
                                      node.io_write_count
                                        ? formatNumber(node.io_write_count)
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Read rate"
                                    value={
                                      node.io_read_count_details?.rate
                                        ? formatRate(
                                            node.io_read_count_details.rate
                                          )
                                        : "0/s"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Write rate"
                                    value={
                                      node.io_write_count_details?.rate
                                        ? formatRate(
                                            node.io_write_count_details.rate
                                          )
                                        : "0/s"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Avg read"
                                    value={
                                      node.io_read_avg_time
                                        ? `${node.io_read_avg_time.toFixed(2)}ms`
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Avg write"
                                    value={
                                      node.io_write_avg_time
                                        ? `${node.io_write_avg_time.toFixed(2)}ms`
                                        : "—"
                                    }
                                    mono
                                  />
                                </dl>
                              </div>

                              {/* Connections */}
                              <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                                  Connections
                                </p>
                                <dl className="space-y-2">
                                  <ExpandedRow
                                    label="Sockets"
                                    value={
                                      node.sockets_used !== undefined
                                        ? `${node.sockets_used} / ${node.sockets_total ?? 0}`
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Created"
                                    value={
                                      node.connection_created
                                        ? formatNumber(node.connection_created)
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Closed"
                                    value={
                                      node.connection_closed
                                        ? formatNumber(node.connection_closed)
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Channels"
                                    value={
                                      node.channel_created
                                        ? formatNumber(node.channel_created)
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Net tick"
                                    value={
                                      node.net_ticktime
                                        ? `${node.net_ticktime}s`
                                        : "—"
                                    }
                                    mono
                                  />
                                </dl>
                              </div>

                              {/* System */}
                              <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                                  System
                                </p>
                                <dl className="space-y-2">
                                  <ExpandedRow
                                    label="Type"
                                    value={node.type ?? "—"}
                                  />
                                  <ExpandedRow
                                    label="Processors"
                                    value={node.processors ?? "—"}
                                    mono
                                  />
                                  <ExpandedRow
                                    label="OS PID"
                                    value={node.os_pid ?? "—"}
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Run queue"
                                    value={
                                      node.run_queue !== undefined
                                        ? node.run_queue
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Processes"
                                    value={
                                      node.proc_used !== undefined &&
                                      node.proc_total !== undefined
                                        ? `${node.proc_used} / ${node.proc_total}`
                                        : "—"
                                    }
                                    mono
                                  />
                                  <ExpandedRow
                                    label="Plugins"
                                    value={node.enabled_plugins?.length ?? 0}
                                    mono
                                  />
                                </dl>
                              </div>
                            </div>

                            {/* Internal store — secondary diagnostic strip */}
                            <div className="px-5 py-3 border-t border-border/60 flex flex-wrap gap-x-6 gap-y-1.5">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest w-full mb-0.5">
                                Internal store
                              </p>
                              <InlineMetric
                                label="Mnesia RAM"
                                value={
                                  node.mnesia_ram_tx_count
                                    ? formatNumber(node.mnesia_ram_tx_count)
                                    : "—"
                                }
                              />
                              <InlineMetric
                                label="Mnesia disk"
                                value={
                                  node.mnesia_disk_tx_count
                                    ? formatNumber(node.mnesia_disk_tx_count)
                                    : "—"
                                }
                              />
                              <InlineMetric
                                label="Msg reads"
                                value={
                                  node.msg_store_read_count
                                    ? formatNumber(node.msg_store_read_count)
                                    : "—"
                                }
                              />
                              <InlineMetric
                                label="Msg writes"
                                value={
                                  node.msg_store_write_count
                                    ? formatNumber(node.msg_store_write_count)
                                    : "—"
                                }
                              />
                              <InlineMetric
                                label="Queue idx R"
                                value={
                                  node.queue_index_read_count
                                    ? formatNumber(node.queue_index_read_count)
                                    : "—"
                                }
                              />
                              <InlineMetric
                                label="Queue idx W"
                                value={
                                  node.queue_index_write_count
                                    ? formatNumber(node.queue_index_write_count)
                                    : "—"
                                }
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No nodes found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
