import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ArrowDown, ArrowUp, ArrowUpDown, Network } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { ConnectionRow } from "./ConnectionRow";
import type { ConnectionListItem } from "./types";

type SortField = "name" | "send_oct" | "channelCount";
type SortDir = "asc" | "desc";

interface ConnectionsListProps {
  connections: ConnectionListItem[];
  isLoading: boolean;
}

/**
 * Sortable connection list — bare table on white, no Card wrapper.
 *
 * Sorting defaults to bytes sent descending because operators scanning
 * connections usually want to find the heaviest talkers first.
 */
export function ConnectionsList({
  connections,
  isLoading,
}: ConnectionsListProps) {
  const { t } = useTranslation("connections");
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("send_oct");
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
    const copy = [...connections];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "send_oct":
          return dir * ((a.send_oct ?? 0) - (b.send_oct ?? 0));
        case "channelCount":
          return dir * (a.channelCount - b.channelCount);
        default:
          return 0;
      }
    });
    return copy;
  }, [connections, sortField, sortDir]);

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
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Column headers with sort controls */}
      <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <SortHeader
          label={t("pageTitle")}
          field="name"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="flex-1 min-w-0"
        />
        <SortHeader
          label={t("totalChannels")}
          field="channelCount"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-28 text-right"
        />
        <SortHeader
          label={t("bytesSent")}
          field="send_oct"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-28 text-right"
        />
        {/* Spacer for expand chevron */}
        <div className="w-8" />
      </div>

      {/* Rows or empty state */}
      {connections.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((connection) => (
            <ConnectionRow
              key={connection.name}
              connection={connection}
              isOpen={expandedNames.has(connection.name)}
              onOpenChange={(open) => toggleExpanded(connection.name, open)}
            />
          ))}
        </div>
      )}
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

function EmptyState() {
  const { t } = useTranslation("connections");
  return (
    <div className="py-12 text-center">
      <Network
        className="h-10 w-10 text-muted-foreground mx-auto mb-3"
        aria-hidden="true"
      />
      <h2 className="text-sm font-medium text-foreground mb-1">
        {t("noActiveConnections")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t("noActiveConnectionsDesc")}
      </p>
    </div>
  );
}
