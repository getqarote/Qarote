import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronDown, ChevronUp, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  VHostListItem,
  VHostsTableRow,
} from "@/components/VHostsList/VHostsTableRow";

type SortKey = "name" | "ready" | "unacked" | "total";
type SortDirection = "asc" | "desc";

interface VHostsTableProps {
  vhosts: VHostListItem[];
  /**
   * Builds the detail-page path for a given vhost. Passed as a route
   * (not a navigate callback) so the row can render a real `<Link>` —
   * see `VHostsTableRow` for the keyboard/screen-reader rationale.
   */
  buildHref: (vhost: VHostListItem) => string;
  onDelete: (vhost: VHostListItem) => void;
  /**
   * The current filter query string. When non-empty and there are no
   * results, the table renders an empty state with a "Clear filter"
   * button. The parent owns filter state; this is passed through for
   * display and to trigger `onClearFilter`.
   */
  filterQuery: string;
  onClearFilter: () => void;
}

/**
 * The virtual hosts list table.
 *
 * No outer Card wrapper: the page-level `<TitleWithCount>` is the only
 * heading this surface needs. A Card would add a second "Virtual Hosts"
 * title — chrome drift the Users table fix already eliminated.
 *
 * Client-side sort on Name, Ready, Unacked, and Total columns.
 * Each sortable header is a focusable `<button>` with `aria-sort` on
 * the parent `<th>` so screen readers announce the sort direction.
 * Inactive-column chevrons are rendered at low opacity to signal
 * "sortable, not active" without adding visual noise.
 *
 * Empty filter state: when the parent filters produce zero rows and a
 * filter is active, a SearchX icon + copy + "Clear filter" button are
 * rendered inside the table body — keeps table chrome stable instead
 * of unmounting the whole surface.
 */
export function VHostsTable({
  vhosts,
  buildHref,
  onDelete,
  filterQuery,
  onClearFilter,
}: VHostsTableProps) {
  const { t } = useTranslation("vhosts");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...vhosts];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      } else if (sortKey === "ready") {
        cmp = (a.messages_ready ?? 0) - (b.messages_ready ?? 0);
      } else if (sortKey === "unacked") {
        cmp =
          (a.messages_unacknowledged ?? 0) - (b.messages_unacknowledged ?? 0);
      } else if (sortKey === "total") {
        cmp = (a.messages ?? 0) - (b.messages ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [vhosts, sortKey, sortDir]);

  const isEmpty = sorted.length === 0;
  const hasFilter = filterQuery.trim().length > 0;

  const sortIcon = (column: SortKey) => {
    const isActive = sortKey === column;
    const opacity = isActive ? "opacity-100" : "opacity-30";
    return sortDir === "asc" || !isActive ? (
      <ChevronUp className={`h-3.5 w-3.5 ${opacity}`} aria-hidden="true" />
    ) : (
      <ChevronDown className={`h-3.5 w-3.5 ${opacity}`} aria-hidden="true" />
    );
  };

  const ariaSort = (column: SortKey): "ascending" | "descending" | "none" => {
    if (sortKey !== column) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[260px]" aria-sort={ariaSort("name")}>
              <button
                type="button"
                onClick={() => handleSort("name")}
                className="inline-flex items-center gap-1 rounded-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={
                  sortKey === "name" && sortDir === "asc"
                    ? t("sortDescending")
                    : t("sortByName")
                }
              >
                {t("name")}
                {sortIcon("name")}
              </button>
            </TableHead>
            <TableHead>{t("usersCol")}</TableHead>
            <TableHead aria-sort={ariaSort("ready")}>
              <button
                type="button"
                onClick={() => handleSort("ready")}
                className="inline-flex items-center gap-1 rounded-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={
                  sortKey === "ready" && sortDir === "asc"
                    ? t("sortDescending")
                    : t("sortByReady")
                }
              >
                {t("ready")}
                {sortIcon("ready")}
              </button>
            </TableHead>
            <TableHead aria-sort={ariaSort("unacked")}>
              <button
                type="button"
                onClick={() => handleSort("unacked")}
                className="inline-flex items-center gap-1 rounded-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={
                  sortKey === "unacked" && sortDir === "asc"
                    ? t("sortDescending")
                    : t("sortByUnacked")
                }
              >
                {t("unacked")}
                {sortIcon("unacked")}
              </button>
            </TableHead>
            <TableHead aria-sort={ariaSort("total")}>
              <button
                type="button"
                onClick={() => handleSort("total")}
                className="inline-flex items-center gap-1 rounded-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={
                  sortKey === "total" && sortDir === "asc"
                    ? t("sortDescending")
                    : t("sortByTotal")
                }
              >
                {t("total")}
                {sortIcon("total")}
              </button>
            </TableHead>
            <TableHead className="w-[56px]">
              <span className="sr-only">{t("common:actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <td colSpan={6} className="px-6 py-12">
                <div className="flex flex-col items-center gap-3 text-center">
                  <SearchX
                    className="h-8 w-8 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    {hasFilter ? t("emptyFilterState") : t("common:noResults")}
                  </p>
                  {hasFilter && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClearFilter}
                    >
                      {t("emptyFilterStateAction")}
                    </Button>
                  )}
                </div>
              </td>
            </TableRow>
          ) : (
            sorted.map((vhost) => (
              <VHostsTableRow
                key={vhost.name}
                vhost={vhost}
                href={buildHref(vhost)}
                onDelete={() => onDelete(vhost)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
