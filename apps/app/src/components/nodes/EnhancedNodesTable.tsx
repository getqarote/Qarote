import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  Server,
  XCircle,
} from "lucide-react";

import { RabbitMQNode } from "@/lib/api";
import {
  getUsageTone,
  MEMORY_CRITICAL_PCT,
  MEMORY_WARN_PCT,
} from "@/lib/health-tones";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { Badge } from "@/components/ui/badge";
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
                className={`w-3 h-3 ${status.label !== "Healthy" ? "mr-1" : ""}`}
              />
              {status.label !== "Healthy" && status.label}
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
                    memoryUsage >= MEMORY_CRITICAL_PCT
                      ? "[&>div]:bg-destructive"
                      : memoryUsage >= MEMORY_WARN_PCT
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
  const [showAll, setShowAll] = useState(
    () => getNodeStatus(node).label !== "Healthy"
  );

  const memTone = getUsageTone(memoryUsage, {
    warn: MEMORY_WARN_PCT,
    critical: MEMORY_CRITICAL_PCT,
  });

  const hasInternalStore =
    node.mnesia_ram_tx_count != null ||
    node.mnesia_disk_tx_count != null ||
    node.msg_store_read_count != null ||
    node.msg_store_write_count != null ||
    node.queue_index_read_count != null ||
    node.queue_index_write_count != null;

  return (
    <div className="border-t border-border bg-muted/20">
      {/* Toggle */}
      <div className="flex justify-end px-5 pt-2">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? "Summary" : "Full details"}
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-150 ${showAll ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {!showAll ? (
        /* ── Triage view: critical signals at a glance ── */
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3 px-5 py-3">
          {/* Health flags */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Health
            </p>
            <dl className="space-y-1.5">
              <ExpandedRow
                label="Running"
                value={node.running ? "Yes" : "No"}
                tone={node.running ? "success" : "destructive"}
              />
              {node.being_drained && (
                <ExpandedRow
                  label="Draining"
                  value="Yes"
                  tone="warning"
                  tooltip="This node is being gracefully removed. New connections are redirected to other nodes."
                />
              )}
              <ExpandedRow
                label="Mem alarm"
                value={node.mem_alarm ? "Active" : "None"}
                tone={node.mem_alarm ? "destructive" : undefined}
                tooltip="Memory usage exceeded the watermark. Publisher confirms are blocked until memory drops."
              />
              <ExpandedRow
                label="Disk alarm"
                value={node.disk_free_alarm ? "Active" : "None"}
                tone={node.disk_free_alarm ? "destructive" : undefined}
                tooltip="Free disk space dropped below the watermark. Publishing is blocked until space is freed."
              />
              <ExpandedRow
                label="Partitions"
                value={node.partitions?.length ?? 0}
                mono
                tone={
                  (node.partitions?.length ?? 0) > 0 ? "destructive" : undefined
                }
                tooltip="Network partition detected. Nodes cannot communicate — a split-brain condition requiring immediate attention."
              />
            </dl>
          </div>

          {/* Memory */}
          {(node.mem_used || node.mem_limit || node.disk_free) && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Memory
              </p>
              <dl className="space-y-1.5">
                {node.mem_used && node.mem_limit && (
                  <ExpandedRow
                    label="Usage"
                    value={`${memoryUsage.toFixed(1)}% · ${formatBytes(node.mem_used)} / ${formatBytes(node.mem_limit)}`}
                    mono
                    tone={
                      memTone === "text-foreground"
                        ? undefined
                        : memTone === "text-warning"
                          ? "warning"
                          : "destructive"
                    }
                  />
                )}
                {node.disk_free && (
                  <ExpandedRow
                    label="Disk free"
                    value={formatBytes(node.disk_free)}
                    mono
                  />
                )}
              </dl>
            </div>
          )}

          {/* Connections */}
          {node.sockets_used !== undefined && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Connections
              </p>
              <dl className="space-y-1.5">
                <ExpandedRow
                  label="Sockets"
                  value={`${node.sockets_used} / ${node.sockets_total ?? 0}`}
                  mono
                />
                {node.channel_created !== undefined && (
                  <ExpandedRow
                    label="Channels"
                    value={formatNumber(node.channel_created)}
                    mono
                  />
                )}
              </dl>
            </div>
          )}
        </div>
      ) : (
        /* ── Full view: all columns, urgency-ordered ── */
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-border">
            {/* Health */}
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Health
              </p>
              <dl className="space-y-2">
                <ExpandedRow
                  label="Running"
                  value={node.running ? "Yes" : "No"}
                  tone={node.running ? "success" : "destructive"}
                />
                <ExpandedRow
                  label="Draining"
                  value={node.being_drained ? "Yes" : "No"}
                  tone={node.being_drained ? "warning" : undefined}
                  tooltip="This node is being gracefully removed. New connections are redirected to other nodes."
                />
                <ExpandedRow
                  label="Mem alarm"
                  value={node.mem_alarm ? "Active" : "None"}
                  tone={node.mem_alarm ? "destructive" : undefined}
                  tooltip="Memory usage exceeded the watermark. Publisher confirms are blocked until memory drops."
                />
                <ExpandedRow
                  label="Disk alarm"
                  value={node.disk_free_alarm ? "Active" : "None"}
                  tone={node.disk_free_alarm ? "destructive" : undefined}
                  tooltip="Free disk space dropped below the watermark. Publishing is blocked until space is freed."
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
                  tooltip="Network partition detected. Nodes cannot communicate — a split-brain condition requiring immediate attention."
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
                  value={node.mem_used ? formatBytes(node.mem_used) : "—"}
                  mono
                />
                <ExpandedRow
                  label="Limit"
                  value={node.mem_limit ? formatBytes(node.mem_limit) : "—"}
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
                    memTone === "text-foreground"
                      ? undefined
                      : memTone === "text-warning"
                        ? "warning"
                        : "destructive"
                  }
                />
                <ExpandedRow
                  label="Disk free"
                  value={node.disk_free ? formatBytes(node.disk_free) : "—"}
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
                  value={node.net_ticktime ? `${node.net_ticktime}s` : "—"}
                  mono
                  tooltip="Erlang heartbeat interval. If a node misses 4 consecutive ticks, it is considered unreachable."
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
                  label="Read rate"
                  value={
                    node.io_read_count_details?.rate
                      ? formatRate(node.io_read_count_details.rate)
                      : "0/s"
                  }
                  mono
                />
                <ExpandedRow
                  label="Write rate"
                  value={
                    node.io_write_count_details?.rate
                      ? formatRate(node.io_write_count_details.rate)
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

            {/* System */}
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                System
              </p>
              <dl className="space-y-2">
                <ExpandedRow label="Type" value={node.type ?? "—"} />
                <ExpandedRow
                  label="Processors"
                  value={node.processors ?? "—"}
                  mono
                />
                <ExpandedRow label="OS PID" value={node.os_pid ?? "—"} mono />
                <ExpandedRow
                  label="Run queue"
                  value={node.run_queue !== undefined ? node.run_queue : "—"}
                  mono
                  tooltip="Erlang processes waiting to be scheduled. Values above 1 indicate CPU contention."
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

          {/* Internal store — only rendered when data is present */}
          {hasInternalStore && (
            <div className="px-5 py-3 border-t border-border/60 flex flex-wrap gap-x-6 gap-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest w-full mb-0.5">
                Internal store
              </p>
              {node.mnesia_ram_tx_count != null && (
                <InlineMetric
                  label="Mnesia RAM"
                  value={formatNumber(node.mnesia_ram_tx_count)}
                />
              )}
              {node.mnesia_disk_tx_count != null && (
                <InlineMetric
                  label="Mnesia disk"
                  value={formatNumber(node.mnesia_disk_tx_count)}
                />
              )}
              {node.msg_store_read_count != null && (
                <InlineMetric
                  label="Msg reads"
                  value={formatNumber(node.msg_store_read_count)}
                />
              )}
              {node.msg_store_write_count != null && (
                <InlineMetric
                  label="Msg writes"
                  value={formatNumber(node.msg_store_write_count)}
                />
              )}
              {node.queue_index_read_count != null && (
                <InlineMetric
                  label="Queue idx R"
                  value={formatNumber(node.queue_index_read_count)}
                />
              )}
              {node.queue_index_write_count != null && (
                <InlineMetric
                  label="Queue idx W"
                  value={formatNumber(node.queue_index_write_count)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
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
      <dt className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {tooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                  {label}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-60" collisionPadding={8}>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

function getNodeStatus(node: RabbitMQNode) {
  if (!node.running) {
    return {
      label: "Error",
      color: "bg-destructive/10 text-destructive",
      icon: XCircle,
    };
  }

  if (
    node.mem_alarm ||
    node.disk_free_alarm ||
    (node.partitions?.length ?? 0) > 0
  ) {
    return {
      label: "Critical",
      color: "bg-destructive/10 text-destructive",
      icon: XCircle,
    };
  }

  if (node.being_drained) {
    return {
      label: "Draining",
      color: "bg-warning-muted text-warning",
      icon: AlertTriangle,
    };
  }

  const memoryUsage =
    node.mem_used && node.mem_limit
      ? (node.mem_used / node.mem_limit) * 100
      : 0;

  if (memoryUsage >= MEMORY_CRITICAL_PCT) {
    return {
      label: "Critical",
      color: "bg-destructive/10 text-destructive",
      icon: XCircle,
    };
  }

  if (memoryUsage >= MEMORY_WARN_PCT) {
    return {
      label: "Warning",
      color: "bg-warning-muted text-warning",
      icon: AlertTriangle,
    };
  }

  return {
    label: "Healthy",
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
