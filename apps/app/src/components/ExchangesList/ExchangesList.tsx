import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Activity, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { ExchangeRow } from "./ExchangeRow";
import {
  ExchangeTypeFilter,
  type ExchangeTypeFilterValue,
} from "./ExchangeTypeFilter";
import type { ExchangeListItem } from "./types";

/**
 * Exchange names are only unique within a vhost, so we key rows on the
 * composite `${vhost}:${name}`. The original page had `key={name}` which
 * caused React duplicate-key warnings and incorrect expand/collapse
 * state whenever two vhosts both had `amq.fanout`.
 */
function exchangeKey(exchange: ExchangeListItem): string {
  return `${exchange.vhost}:${exchange.name}`;
}

type SortField =
  | "name"
  | "type"
  | "bindingCount"
  | "publish_in"
  | "publish_out";
type SortDir = "asc" | "desc";

interface ExchangesListProps {
  exchanges: ExchangeListItem[];
  isLoading: boolean;
  typeFilter: ExchangeTypeFilterValue;
  onTypeFilterChange: (value: ExchangeTypeFilterValue) => void;
  onDelete?: (exchange: ExchangeListItem) => void;
  isDeleting?: boolean;
}

/**
 * Sortable exchange list with a type-filter tab bar in the header.
 * Mirrors the QueueTable pattern: sortable column headers, collapsible
 * rows with progressive disclosure, fixed-width right-aligned metric
 * columns. Default sort: bindings descending (most-connected first).
 *
 * Handles three render states:
 *   - loading  → five row-shaped skeletons
 *   - empty    → friendly explanation (general or type-specific)
 *   - populated → collapsible `ExchangeRow` for each exchange
 */
export function ExchangesList({
  exchanges,
  isLoading,
  typeFilter,
  onTypeFilterChange,
  onDelete,
  isDeleting,
}: ExchangesListProps) {
  const { t } = useTranslation("exchanges");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("bindingCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleExpanded = (key: string, isOpen: boolean) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" || field === "type" ? "asc" : "desc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...exchanges];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * (a.name || "").localeCompare(b.name || "");
        case "type":
          return dir * a.type.localeCompare(b.type);
        case "bindingCount":
          return dir * (a.bindingCount - b.bindingCount);
        case "publish_in":
          return (
            dir *
            ((a.message_stats?.publish_in ?? 0) -
              (b.message_stats?.publish_in ?? 0))
          );
        case "publish_out":
          return (
            dir *
            ((a.message_stats?.publish_out ?? 0) -
              (b.message_stats?.publish_out ?? 0))
          );
        default:
          return 0;
      }
    });
    return copy;
  }, [exchanges, sortField, sortDir]);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Type filter bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border">
        <ExchangeTypeFilter value={typeFilter} onChange={onTypeFilterChange} />
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-4"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : exchanges.length === 0 ? (
        <EmptyState typeFilter={typeFilter} />
      ) : (
        <>
          {/* Column headers with sort controls */}
          <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <SortHeader
              label={t("exchangesTitle")}
              field="name"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="flex-1 min-w-0"
            />
            <SortHeader
              label={t("type")}
              field="type"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="w-24 text-right"
            />
            <SortHeader
              label={t("bindings")}
              field="bindingCount"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="w-28 text-right"
            />
            <SortHeader
              label={t("messagesIn")}
              field="publish_in"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="w-28 text-right"
            />
            <SortHeader
              label={t("messagesOut")}
              field="publish_out"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="w-28 text-right"
            />
            {/* Spacer for expand chevron */}
            <div className="w-8" />
          </div>

          <div className="divide-y divide-border">
            {sorted.map((exchange) => {
              const key = exchangeKey(exchange);
              return (
                <ExchangeRow
                  key={key}
                  exchange={exchange}
                  isOpen={expandedKeys.has(key)}
                  onOpenChange={(open) => toggleExpanded(key, open)}
                  onDelete={onDelete ? () => onDelete(exchange) : undefined}
                  isDeleting={isDeleting}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort header                                                        */
/* ------------------------------------------------------------------ */

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
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ typeFilter }: { typeFilter: ExchangeTypeFilterValue }) {
  const { t } = useTranslation("exchanges");
  const isAll = typeFilter === "all";

  return (
    <div className="py-12 text-center">
      <Activity
        className="h-10 w-10 text-muted-foreground mx-auto mb-3"
        aria-hidden="true"
      />
      <h2 className="text-sm font-medium text-foreground mb-1">
        {isAll
          ? t("noExchangesFound")
          : t("noExchangesOfType", { type: typeFilter })}
      </h2>
    </div>
  );
}
