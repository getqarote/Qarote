import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  HelpCircle,
  Server,
  XCircle,
} from "lucide-react";

import { RabbitMQNode } from "@/lib/api";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { isRabbitMQAuthError } from "@/types/apiErrors";

type SortField = "name" | "memUsed" | "diskFree" | "uptime" | "connections";
type SortDir = "asc" | "desc";

const MEMORY_CRITICAL_PCT = 90;
const MEMORY_WARN_PCT = 75;

interface EnhancedNodesTableProps {
  serverId: string;
  nodes: RabbitMQNode[];
  isLoading: boolean;
  nodesError?: Error | null;
}

/**
 * Sortable node list — bare table, no Card wrapper.
 *
 * Mirrors the QueueTable / ExchangesList pattern: sortable column
 * headers, collapsible rows with progressive disclosure, fixed-width
 * right-aligned metric columns. Default sort: name ascending.
 */
export const EnhancedNodesTable = ({
  nodes,
  isLoading,
  nodesError,
}: EnhancedNodesTableProps) => {
  const { t } = useTranslation("nodes");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleExpanded = (name: string, isOpen: boolean) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...nodes];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "memUsed":
          return dir * ((a.mem_used || 0) - (b.mem_used || 0));
        case "diskFree":
          return dir * ((a.disk_free || 0) - (b.disk_free || 0));
        case "uptime":
          return dir * ((a.uptime || 0) - (b.uptime || 0));
        case "connections":
          return dir * ((a.sockets_used || 0) - (b.sockets_used || 0));
        default:
          return 0;
      }
    });
    return copy;
  }, [nodes, sortField, sortDir]);

  if (nodesError && isRabbitMQAuthError(nodesError)) {
    return (
      <RabbitMQPermissionError
        requiredPermission={nodesError.requiredPermission}
        message={nodesError.message}
        title={t("permissionErrorTitle")}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="py-12 text-center">
          <Server
            className="h-10 w-10 text-muted-foreground mx-auto mb-3"
            aria-hidden="true"
          />
          <h2 className="text-sm font-medium text-foreground mb-1">
            {t("noNodesFound")}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Column headers with sort controls */}
      <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <SortHeader
          label={t("nodeName")}
          field="name"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="flex-1 min-w-0"
        />
        <div className="w-24 text-right">{t("status")}</div>
        <SortHeader
          label={t("memory")}
          field="memUsed"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-32 text-right"
        />
        <SortHeader
          label={t("diskFree")}
          field="diskFree"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-28 text-right"
        />
        <SortHeader
          label={t("uptime")}
          field="uptime"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-24 text-right"
        />
        <SortHeader
          label={t("connections")}
          field="connections"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-28 text-right"
        />
        {/* Spacer for expand chevron */}
        <div className="w-8" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {sorted.map((node) => (
          <NodeRow
            key={node.name}
            node={node}
            isOpen={expandedNodes.has(node.name)}
            onOpenChange={(open) => toggleExpanded(node.name, open)}
          />
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Node Row                                                           */
/* ------------------------------------------------------------------ */

function NodeRow({
  node,
  isOpen,
  onOpenChange,
}: {
  node: RabbitMQNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("nodes");
  const status = getNodeStatus(node);
  const StatusIcon = status.icon;
  const memoryUsage =
    node.mem_used && node.mem_limit
      ? (node.mem_used / node.mem_limit) * 100
      : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
        >
          {/* Left: identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span
              className="font-medium truncate font-mono text-sm"
              title={node.name}
            >
              {node.name}
            </span>
            <Badge className={status.color}>
              <StatusIcon
                className={`w-3 h-3 ${status.discriminant !== "healthy" ? "mr-1" : ""}`}
                aria-label={
                  status.discriminant === "healthy"
                    ? t("statusLabels.healthy")
                    : undefined
                }
                aria-hidden={status.discriminant !== "healthy"}
              />
              {status.discriminant !== "healthy" &&
                t(`statusLabels.${status.discriminant}`)}
            </Badge>
          </div>

          {/* Right: metrics aligned to sort headers */}
          <div className="flex items-center gap-0">
            <span className="w-24 hidden xl:block" />
            <div className="w-32 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="font-mono tabular-nums text-sm text-foreground">
                  {node.mem_used ? formatBytes(node.mem_used) : "—"}
                </span>
              </div>
              {node.mem_used && node.mem_limit ? (
                <Progress
                  value={memoryUsage}
                  className={`h-1.5 w-16 ml-auto mt-1 ${
                    memoryUsage > 80
                      ? "[&>div]:bg-destructive"
                      : memoryUsage > 60
                        ? "[&>div]:bg-warning"
                        : "[&>div]:bg-success"
                  }`}
                />
              ) : null}
            </div>
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground">
              {node.disk_free ? formatBytes(node.disk_free) : "—"}
            </span>
            <span className="w-24 text-right font-mono tabular-nums text-sm text-muted-foreground">
              {node.uptime ? formatUptime(node.uptime) : "—"}
            </span>
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground">
              {node.sockets_used !== undefined
                ? formatNumber(node.sockets_used)
                : "—"}
            </span>
            <div className="w-8 flex justify-center">
              <PixelChevronRight
                className={`h-3 text-muted-foreground transition-transform duration-150 shrink-0 ${
                  isOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <NodeDetailsPanel node={node} memoryUsage={memoryUsage} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/*  Details Panel (expanded)                                           */
/* ------------------------------------------------------------------ */

function NodeDetailsPanel({
  node,
  memoryUsage,
}: {
  node: RabbitMQNode;
  memoryUsage: number;
}) {
  const { t } = useTranslation("nodes");
  const [showAll, setShowAll] = useState(
    () => getNodeStatus(node).discriminant !== "healthy"
  );

  return (
    <TooltipProvider>
      <div className="border-t border-border bg-muted/20">
        {/* Summary / Full details toggle */}
        <div className="flex justify-end px-5 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? t("details.summary") : t("details.fullDetails")}
          </Button>
        </div>

        {/* Primary metrics band — 5 equal sections */}
        <div className="grid grid-cols-5 divide-x divide-border">
          {/* Health */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {t("details.sections.health")}
            </p>
            <dl className="space-y-2">
              <ExpandedRow
                label={t("details.rows.running")}
                value={
                  node.running
                    ? t("details.values.yes")
                    : t("details.values.no")
                }
                tone={node.running ? "success" : "destructive"}
              />
              <ExpandedRow
                label={t("details.rows.draining")}
                value={
                  node.being_drained
                    ? t("details.values.yes")
                    : t("details.values.no")
                }
                tone={node.being_drained ? "warning" : undefined}
                tooltip={t("details.tooltips.draining")}
              />
              <ExpandedRow
                label={t("details.rows.memAlarm")}
                value={
                  node.mem_alarm
                    ? t("details.values.active")
                    : t("details.values.none")
                }
                tone={node.mem_alarm ? "destructive" : undefined}
                tooltip={t("details.tooltips.memAlarm")}
              />
              <ExpandedRow
                label={t("details.rows.diskAlarm")}
                value={
                  node.disk_free_alarm
                    ? t("details.values.active")
                    : t("details.values.none")
                }
                tone={node.disk_free_alarm ? "destructive" : undefined}
                tooltip={t("details.tooltips.diskAlarm")}
              />
              <ExpandedRow
                label={t("details.rows.partitions")}
                value={node.partitions?.length ?? 0}
                mono
                tone={
                  (node.partitions?.length ?? 0) > 0 ? "destructive" : undefined
                }
                tooltip={t("details.tooltips.partitions")}
              />
            </dl>
          </div>

          {/* Memory */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {t("details.sections.memory")}
            </p>
            <dl className="space-y-2">
              <ExpandedRow
                label={t("details.rows.used")}
                value={node.mem_used ? formatBytes(node.mem_used) : "—"}
                mono
              />
              <ExpandedRow
                label={t("details.rows.limit")}
                value={node.mem_limit ? formatBytes(node.mem_limit) : "—"}
                mono
              />
              <ExpandedRow
                label={t("details.rows.usage")}
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
                label={t("details.rows.diskFree")}
                value={node.disk_free ? formatBytes(node.disk_free) : "—"}
                mono
              />
            </dl>
          </div>

          {/* Disk I/O */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {t("details.sections.diskIO")}
            </p>
            <dl className="space-y-2">
              <ExpandedRow
                label={t("details.rows.readRate")}
                value={
                  node.io_read_count_details?.rate
                    ? formatRate(node.io_read_count_details.rate)
                    : "0/s"
                }
                mono
              />
              <ExpandedRow
                label={t("details.rows.writeRate")}
                value={
                  node.io_write_count_details?.rate
                    ? formatRate(node.io_write_count_details.rate)
                    : "0/s"
                }
                mono
              />
              <ExpandedRow
                label={t("details.rows.avgRead")}
                value={
                  node.io_read_avg_time
                    ? `${node.io_read_avg_time.toFixed(2)}ms`
                    : "—"
                }
                mono
              />
              <ExpandedRow
                label={t("details.rows.avgWrite")}
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
              {t("details.sections.connections")}
            </p>
            <dl className="space-y-2">
              <ExpandedRow
                label={t("details.rows.sockets")}
                value={
                  node.sockets_used !== undefined
                    ? `${node.sockets_used} / ${node.sockets_total ?? 0}`
                    : "—"
                }
                mono
              />
              <ExpandedRow
                label={t("details.rows.created")}
                value={
                  node.connection_created
                    ? formatNumber(node.connection_created)
                    : "—"
                }
                mono
              />
              <ExpandedRow
                label={t("details.rows.closed")}
                value={
                  node.connection_closed
                    ? formatNumber(node.connection_closed)
                    : "—"
                }
                mono
              />
              <ExpandedRow
                label={t("details.rows.channels")}
                value={
                  node.channel_created
                    ? formatNumber(node.channel_created)
                    : "—"
                }
                mono
              />
              <ExpandedRow
                label={t("details.rows.netTick")}
                value={node.net_ticktime ? `${node.net_ticktime}s` : "—"}
                mono
                tooltip={t("details.tooltips.netTick")}
              />
            </dl>
          </div>

          {/* System */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {t("details.sections.system")}
            </p>
            <dl className="space-y-2">
              <ExpandedRow
                label={t("details.rows.type")}
                value={node.type ?? "—"}
              />
              <ExpandedRow
                label={t("details.rows.processors")}
                value={node.processors ?? "—"}
                mono
              />
              <ExpandedRow
                label={t("details.rows.osPid")}
                value={node.os_pid ?? "—"}
                mono
              />
              <ExpandedRow
                label={t("details.rows.runQueue")}
                value={node.run_queue !== undefined ? node.run_queue : "—"}
                mono
                tooltip={t("details.tooltips.runQueue")}
              />
              <ExpandedRow
                label={t("details.rows.processes")}
                value={
                  node.proc_used !== undefined && node.proc_total !== undefined
                    ? `${node.proc_used} / ${node.proc_total}`
                    : "—"
                }
                mono
              />
              <ExpandedRow
                label={t("details.rows.plugins")}
                value={node.enabled_plugins?.length ?? 0}
                mono
              />
            </dl>
          </div>
        </div>

        {/* Full details section — hidden in summary mode */}
        {showAll && (
          <div className="grid grid-cols-5 divide-x divide-border border-t border-border/60">
            {/* Extended health */}
            <div className="px-5 py-4">
              <dl className="space-y-2">
                <ExpandedRow
                  label={t("details.rows.draining")}
                  value={
                    node.being_drained
                      ? t("details.values.yes")
                      : t("details.values.no")
                  }
                  tone={node.being_drained ? "warning" : undefined}
                />
              </dl>
            </div>

            {/* Extended memory — placeholder columns */}
            <div className="px-5 py-4" />
            <div className="px-5 py-4" />
            <div className="px-5 py-4" />
            <div className="px-5 py-4" />
          </div>
        )}

        {/* Internal store — secondary diagnostic strip */}
        <div className="px-5 py-3 border-t border-border/60 flex flex-wrap gap-x-6 gap-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest w-full mb-0.5">
            {t("details.sections.internalStore")}
          </p>
          <InlineMetric
            label={t("details.inlineMetrics.mnesiaRam")}
            value={
              node.mnesia_ram_tx_count
                ? formatNumber(node.mnesia_ram_tx_count)
                : "—"
            }
          />
          <InlineMetric
            label={t("details.inlineMetrics.mnesiaDisk")}
            value={
              node.mnesia_disk_tx_count
                ? formatNumber(node.mnesia_disk_tx_count)
                : "—"
            }
          />
          <InlineMetric
            label={t("details.inlineMetrics.msgReads")}
            value={
              node.msg_store_read_count
                ? formatNumber(node.msg_store_read_count)
                : "—"
            }
          />
          <InlineMetric
            label={t("details.inlineMetrics.msgWrites")}
            value={
              node.msg_store_write_count
                ? formatNumber(node.msg_store_write_count)
                : "—"
            }
          />
          <InlineMetric
            label={t("details.inlineMetrics.queueIdxR")}
            value={
              node.queue_index_read_count
                ? formatNumber(node.queue_index_read_count)
                : "—"
            }
          />
          <InlineMetric
            label={t("details.inlineMetrics.queueIdxW")}
            value={
              node.queue_index_write_count
                ? formatNumber(node.queue_index_write_count)
                : "—"
            }
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function ExpandedRow({
  label,
  value,
  mono = false,
  tone,
  tooltip,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  tone?: "success" | "warning" | "destructive";
  tooltip?: string;
}) {
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
      <dt className="text-xs text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1">
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 cursor-help">
                {label}
                <HelpCircle className="h-3 w-3 opacity-50" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          label
        )}
      </dt>
      <dd
        className={`text-xs font-medium text-right ${toneClass} ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function InlineMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono tabular-nums text-muted-foreground/80">
        {value}
      </span>
    </div>
  );
}

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onToggle,
  className = "",
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onToggle: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        isActive ? "text-foreground" : ""
      } ${className}`}
    >
      {label}
      {isActive ? (
        currentDir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Utility functions                                                  */
/* ------------------------------------------------------------------ */

function getNodeStatus(node: RabbitMQNode): {
  discriminant: "error" | "critical" | "warning" | "draining" | "healthy";
  color: string;
  icon: typeof CheckCircle;
} {
  if (!node.running) {
    return {
      discriminant: "error",
      color: "bg-destructive/10 text-destructive",
      icon: XCircle,
    };
  }

  const memoryUsage =
    node.mem_used && node.mem_limit
      ? (node.mem_used / node.mem_limit) * 100
      : 0;

  const partitions = node.partitions?.length ?? 0;

  if (node.mem_alarm || node.disk_free_alarm || partitions > 0) {
    return {
      discriminant: "critical",
      color: "bg-destructive/10 text-destructive",
      icon: AlertTriangle,
    };
  }

  if (node.being_drained) {
    return {
      discriminant: "draining",
      color: "bg-warning-muted text-warning",
      icon: AlertTriangle,
    };
  }

  if (memoryUsage >= MEMORY_CRITICAL_PCT) {
    return {
      discriminant: "critical",
      color: "bg-destructive/10 text-destructive",
      icon: AlertTriangle,
    };
  }

  if (memoryUsage >= MEMORY_WARN_PCT) {
    return {
      discriminant: "warning",
      color: "bg-warning-muted text-warning",
      icon: AlertTriangle,
    };
  }

  return {
    discriminant: "healthy",
    color: "bg-success-muted text-success",
    icon: CheckCircle,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatNumber(num: number): string {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num?.toString();
}

function formatRate(rate: number): string {
  return rate > 0 ? `${rate.toFixed(1)}/s` : "0/s";
}
