import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  PlusCircle,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
   * Total vhosts before any filter is applied. Used to distinguish
   * "nothing configured yet" (totalCount === 0) from "filter produced
   * no results" (filtered list is empty but totalCount > 0). These
   * need different empty states: onboarding vs. no-match.
   */
  totalCount: number;
  /**
   * The current filter query string. When non-empty and there are no
   * results, the table renders an empty state with a "Clear filter"
   * button. The parent owns filter state; this is passed through for
   * display and to trigger `onClearFilter`.
   */
  filterQuery: string;
  onClearFilter: () => void;
  /**
   * Called when the "Add virtual host" button in the onboarding empty
   * state is clicked. Only rendered when `totalCount === 0` and no
   * filter is active.
   */
  onAddFirst?: () => void;
}

/**
 * The virtual hosts list table.
 *
 * No outer Card wrapper: the page-level `<TitleWithCount>` is the only
 * heading this surface needs.
 *
 * Empty states — three distinct cases:
 *   1. `totalCount === 0 && !hasFilter`: onboarding — no vhosts exist
 *      yet. Show a prompt and an "Add virtual host" button.
 *   2. `sorted.length === 0 && hasFilter`: filter produced no matches.
 *      Show the current filter query and a "Clear filter" button.
 *   3. `sorted.length > 0`: normal table rows.
 *
 * Sort: client-side on Name (string), Ready/Unacked/Total (number).
 * `aria-sort` on `<th>` announces state to screen readers. Button
 * aria-labels describe *current* sort state, not the pending action,
 * so VoiceOver/NVDA users get "Name, sorted ascending" rather than
 * the ambiguous "Sort descending."
 */
export function VHostsTable({
  vhosts,
  buildHref,
  onDelete,
  totalCount,
  filterQuery,
  onClearFilter,
  onAddFirst,
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

  const hasFilter = filterQuery.trim().length > 0;
  const isEmpty = sorted.length === 0;
  const isOnboarding = totalCount === 0 && !hasFilter;

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

  /**
   * Describes current sort state (not pending action) so screen readers
   * announce "Name, sorted ascending" rather than the ambiguous
   * "Sort descending" (which implies the column is currently descending).
   */
  const sortAriaLabel = (column: SortKey, columnLabel: string): string => {
    if (sortKey !== column)
      return column === "name"
        ? t("sortByName")
        : column === "ready"
          ? t("sortByReady")
          : column === "unacked"
            ? t("sortByUnacked")
            : t("sortByTotal");
    return `${columnLabel}, ${sortDir === "asc" ? t("sortAscending") : t("sortDescending")}`;
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
                aria-label={sortAriaLabel("name", t("name"))}
              >
                {t("name")}
                {sortIcon("name")}
              </button>
            </TableHead>
            <TableHead>
              <div className="inline-flex items-center gap-1 text-muted-foreground">
                {t("usersCol")}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <HelpCircle
                          className="h-3 w-3 opacity-50"
                          aria-hidden="true"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("permissionsColTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TableHead>
            <TableHead aria-sort={ariaSort("ready")}>
              <button
                type="button"
                onClick={() => handleSort("ready")}
                className="inline-flex items-center gap-1 rounded-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={sortAriaLabel("ready", t("ready"))}
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
                aria-label={sortAriaLabel("unacked", t("unacked"))}
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
                aria-label={sortAriaLabel("total", t("total"))}
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
                  {isOnboarding ? (
                    <>
                      <PlusCircle
                        className="h-8 w-8 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {t("noVhostsYet")}
                        </p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          {t("noVhostsDescription")}
                        </p>
                      </div>
                      {onAddFirst && (
                        <Button type="button" size="sm" onClick={onAddFirst}>
                          <PlusCircle
                            className="h-4 w-4 mr-1.5"
                            aria-hidden="true"
                          />
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
