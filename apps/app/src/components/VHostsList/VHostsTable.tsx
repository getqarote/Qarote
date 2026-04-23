import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  PlusCircle,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  VHostListItem,
  VHostsTableRow,
} from "@/components/VHostsList/VHostsTableRow";

type SortField = "name" | "ready" | "unacked" | "total";
type SortDir = "asc" | "desc";

interface VHostsTableProps {
  vhosts: VHostListItem[];
  buildHref: (vhost: VHostListItem) => string;
  onDelete: (vhost: VHostListItem) => void;
  totalCount: number;
  filterQuery: string;
  onClearFilter: () => void;
  onAddFirst?: () => void;
  getThreshold?: (vhostName: string) => number;
}

/**
 * Sortable vhost list — div-based flex layout matching QueueTable /
 * ExchangesList pattern. Rows link to detail pages (no collapsible).
 *
 * Sort: client-side on Name (string), Ready/Unacked/Total (number).
 * Default sort: name ascending.
 */
export function VHostsTable({
  vhosts,
  buildHref,
  onDelete,
  totalCount,
  filterQuery,
  onClearFilter,
  onAddFirst,
  getThreshold,
}: VHostsTableProps) {
  const { t } = useTranslation("vhosts");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...vhosts];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortField) {
        case "name":
          return (
            dir *
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
        case "ready":
          return dir * ((a.messages_ready ?? 0) - (b.messages_ready ?? 0));
        case "unacked":
          return (
            dir *
            ((a.messages_unacknowledged ?? 0) -
              (b.messages_unacknowledged ?? 0))
          );
        case "total":
          return dir * ((a.messages ?? 0) - (b.messages ?? 0));
        default:
          return 0;
      }
    });
    return copy;
  }, [vhosts, sortField, sortDir]);

  const hasFilter = filterQuery.trim().length > 0;
  const isEmpty = sorted.length === 0;
  const isOnboarding = totalCount === 0 && !hasFilter;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Column headers with sort controls */}
      <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <SortHeader
          label={t("name")}
          field="name"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="flex-1 min-w-0"
        />
        <div className="w-24 text-right">{t("usersCol")}</div>
        <SortHeader
          label={t("ready")}
          field="ready"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-28 text-right"
        />
        <SortHeader
          label={t("unacked")}
          field="unacked"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-28 text-right"
        />
        <SortHeader
          label={t("total")}
          field="total"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-28 text-right"
        />
        {/* Spacer for actions */}
        <div className="w-10" />
      </div>

      {/* Rows or empty state */}
      {isEmpty ? (
        <div className="py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            {isOnboarding ? (
              <>
                <PlusCircle
                  className="h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("noVhostsYet")}</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {t("noVhostsDescription")}
                  </p>
                </div>
                {onAddFirst && (
                  <Button type="button" size="sm" onClick={onAddFirst}>
                    <PlusCircle className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    {t("addVhost")}
                  </Button>
                )}
              </>
            ) : (
              <>
                <SearchX
                  className="h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  {t("emptyFilterState")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClearFilter}
                >
                  {t("emptyFilterStateAction")}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((vhost) => (
            <VHostsTableRow
              key={vhost.name}
              vhost={vhost}
              href={buildHref(vhost)}
              onDelete={() => onDelete(vhost)}
              unackedWarnThreshold={
                getThreshold ? getThreshold(vhost.name) : 100
              }
            />
          ))}
        </div>
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
