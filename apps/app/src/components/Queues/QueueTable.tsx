import { ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Lock,
  MessageSquare,
  Users,
} from "lucide-react";

import { Queue } from "@/lib/api";

import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { QueueStatusBadge } from "@/components/Queues/queue-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";
import { Skeleton } from "@/components/ui/skeleton";

type SortField = "name" | "messages" | "messages_unacknowledged" | "consumers";
type SortDir = "asc" | "desc";

interface QueueTableProps {
  queues: Queue[];
  isLoading: boolean;
  searchTerm: string;
  isAdmin?: boolean;
  onNavigateToQueue: (queueName: string) => void;
  onRefetch: () => void;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * Sortable queue list — bare table, no Card wrapper.
 *
 * Mirrors the Connections pattern: sortable column headers, collapsible
 * rows with progressive disclosure. Primary columns (name, messages,
 * unacked, consumers) visible in collapsed state; rates, memory, vhost,
 * node, and actions in the expanded detail panel.
 *
 * Default sort: messages descending (heaviest queues first).
 */
export function QueueTable({
  queues,
  isLoading,
  searchTerm,
  isAdmin,
  onNavigateToQueue,
  onRefetch,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: QueueTableProps) {
  const { t } = useTranslation("queues");
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("messages");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleExpanded = (name: string, isOpen: boolean) => {
    setExpandedNames((prev) => {
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
    const copy = [...queues];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "messages":
          return dir * ((a.messages ?? 0) - (b.messages ?? 0));
        case "messages_unacknowledged":
          return (
            dir *
            ((a.messages_unacknowledged ?? 0) -
              (b.messages_unacknowledged ?? 0))
          );
        case "consumers":
          return dir * ((a.consumers ?? 0) - (b.consumers ?? 0));
        default:
          return 0;
      }
    });
    return copy;
  }, [queues, sortField, sortDir]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Column headers with sort controls */}
        <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <SortHeader
            label={t("queueName")}
            field="name"
            currentField={sortField}
            currentDir={sortDir}
            onToggle={toggleSort}
            className="flex-1 min-w-0"
          />
          <SortHeader
            label={t("messages")}
            field="messages"
            currentField={sortField}
            currentDir={sortDir}
            onToggle={toggleSort}
            className="w-28 text-right"
          />
          <SortHeader
            label={t("unacked")}
            field="messages_unacknowledged"
            currentField={sortField}
            currentDir={sortDir}
            onToggle={toggleSort}
            className="w-28 text-right"
          />
          <SortHeader
            label={t("consumers")}
            field="consumers"
            currentField={sortField}
            currentDir={sortDir}
            onToggle={toggleSort}
            className="w-28 text-right"
          />
          {/* Spacer for expand chevron */}
          <div className="w-8" />
        </div>

        {/* Rows or empty state */}
        {queues.length === 0 ? (
          <EmptyState searchTerm={searchTerm} />
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((queue) => (
              <QueueRow
                key={`${queue.name}-${queue.vhost}`}
                queue={queue}
                isOpen={expandedNames.has(queue.name)}
                onOpenChange={(open) => toggleExpanded(queue.name, open)}
                onNavigateToQueue={onNavigateToQueue}
                isAdmin={isAdmin}
                onRefetch={onRefetch}
              />
            ))}
          </div>
        )}
      </div>

      {total > pageSize && (
        <PaginationControls
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={t("queues")}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Queue Row                                                          */
/* ------------------------------------------------------------------ */

interface QueueRowProps {
  queue: Queue;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToQueue: (queueName: string) => void;
  isAdmin?: boolean;
  onRefetch: () => void;
}

function QueueRow({
  queue,
  isOpen,
  onOpenChange,
  onNavigateToQueue,
  isAdmin,
  onRefetch,
}: QueueRowProps) {
  const { t } = useTranslation("queues");

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
        >
          {/* Left: identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="font-medium truncate font-mono text-sm cursor-pointer hover:text-primary hover:underline"
                title={queue.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToQueue(encodeURIComponent(queue.name));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onNavigateToQueue(encodeURIComponent(queue.name));
                  }
                }}
                role="link"
                tabIndex={0}
              >
                {queue.name}
              </span>
              {queue.internal && (
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1 shrink-0"
                  title="Internal queue (not accessible via AMQP)"
                >
                  <Lock className="w-3 h-3" />
                  {t("internal")}
                </Badge>
              )}
            </div>
            <QueueStatusBadge state={queue.state} />
            <span className="hidden xl:inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="font-mono tabular-nums">{queue.consumers}</span>
            </span>
          </div>

          {/* Right: key metrics aligned to sort headers */}
          <div className="flex items-center gap-0">
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground">
              {(queue.messages ?? 0).toLocaleString()}
            </span>
            <span
              className={`w-28 text-right font-mono tabular-nums text-sm ${
                (queue.messages_unacknowledged ?? 0) > 0
                  ? "text-warning font-semibold"
                  : "text-foreground"
              }`}
            >
              {(queue.messages_unacknowledged ?? 0).toLocaleString()}
            </span>
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground xl:hidden">
              {queue.consumers.toLocaleString()}
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
        <QueueDetailsPanel
          queue={queue}
          isAdmin={isAdmin}
          onRefetch={onRefetch}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/*  Details Panel (expanded)                                           */
/* ------------------------------------------------------------------ */

function QueueDetailsPanel({
  queue,
  isAdmin,
  onRefetch,
}: {
  queue: Queue;
  isAdmin?: boolean;
  onRefetch: () => void;
}) {
  const { t } = useTranslation("queues");

  const incomingRate = queue.message_stats?.publish_details?.rate ?? 0;
  const deliverGetRate = queue.message_stats?.deliver_get_details?.rate ?? 0;
  const ackRate = queue.message_stats?.ack_details?.rate ?? 0;
  const memoryMB = (queue.memory ?? 0) / (1024 * 1024);

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
      {/* Inline metrics strip */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <DetailItem label={t("vhost")} value={queue.vhost} mono />
        <DetailItem label={t("node")} value={queue.node} mono />
        <DetailItem label={t("type")} value={queue.type} />
        <DetailItem
          label={t("ready")}
          value={(queue.messages_ready ?? 0).toLocaleString()}
          mono
        />
        <DetailItem
          label={t("incoming")}
          value={`${incomingRate.toFixed(1)}/s`}
          mono
        />
        <DetailItem
          label={t("deliverGet")}
          value={`${deliverGetRate.toFixed(1)}/s`}
          mono
        />
        <DetailItem label={t("ack")} value={`${ackRate.toFixed(1)}/s`} mono />
        <DetailItem
          label={t("memory")}
          value={`${memoryMB.toFixed(1)} MB`}
          mono
        />
        {queue.durable && (
          <DetailItem label={t("durable")} value={t("durable")} />
        )}
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-2 pt-1">
          <PurgeQueueDialog
            queueName={queue.name}
            messageCount={queue.messages}
            vhost={queue.vhost}
            onSuccess={() => onRefetch()}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-xs font-medium text-foreground ${mono ? "font-mono tabular-nums" : ""}`}
      >
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

function EmptyState({ searchTerm }: { searchTerm: string }) {
  const { t } = useTranslation("queues");
  return (
    <div className="py-12 text-center">
      <MessageSquare
        className="h-10 w-10 text-muted-foreground mx-auto mb-3"
        aria-hidden="true"
      />
      <h2 className="text-sm font-medium text-foreground mb-1">
        {searchTerm
          ? t("noQueuesMatchingSearch", { term: searchTerm })
          : t("noQueuesOnServer")}
      </h2>
    </div>
  );
}
