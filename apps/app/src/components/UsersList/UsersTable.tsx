import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronDown, ChevronUp, SearchX, Trash2, X } from "lucide-react";

import type { RabbitMQUser } from "@/lib/api/userTypes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsersTableRow } from "@/components/UsersList/UsersTableRow";

type SortDirection = "asc" | "desc";

interface UsersTableProps {
  users: RabbitMQUser[];
  /**
   * Builds the detail-page path for a given user. Passed as a route
   * (not a navigate callback) so the row can render a real `<Link>` —
   * see `UsersTableRow` for the keyboard/screen-reader rationale.
   */
  buildHref: (user: RabbitMQUser) => string;
  onDelete: (user: RabbitMQUser) => void;
  onBulkDelete: (users: RabbitMQUser[]) => void;
  /**
   * When the filter is active and there are no matches, `UsersTable`
   * shows an empty state with a "Clear filter" button. The parent
   * still owns the filter state so it can reset it from the button
   * and from the `/` keyboard shortcut.
   */
  filterQuery: string;
  onClearFilter: () => void;
}

function isProtectedUser(user: RabbitMQUser): boolean {
  return user.name === "admin" || !!user.tags?.includes("protected");
}

/**
 * The users list.
 *
 * - No outer Card wrapper: the page-level `<TitleWithCount>` is the
 *   only heading this surface needs; nesting a second "Users" title
 *   inside a Card was chrome drift.
 * - Client-side sort on the Name column: clickable `<button>` header,
 *   `aria-sort`, two-state chevron, default ascending.
 * - Row selection with a sticky action bar for bulk delete. Protected
 *   users are excluded from selection (checkbox hidden at row level).
 * - Empty filter state ("no matches for X" + clear-filter) inside the
 *   table body so the table chrome stays stable.
 */
export function UsersTable({
  users,
  buildHref,
  onDelete,
  onBulkDelete,
  filterQuery,
  onClearFilter,
}: UsersTableProps) {
  const { t } = useTranslation("users");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

  const sortedUsers = useMemo(() => {
    const copy = [...users];
    copy.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [users, sortDir]);

  // Keep selection in sync with visible rows — drop anything that
  // filtered out or got deleted upstream.
  const visibleNames = useMemo(
    () => new Set(sortedUsers.map((u) => u.name)),
    [sortedUsers]
  );
  const effectiveSelection = useMemo(() => {
    const next = new Set<string>();
    for (const name of selectedNames) {
      if (visibleNames.has(name)) next.add(name);
    }
    return next;
  }, [selectedNames, visibleNames]);

  const selectableUsers = sortedUsers.filter((u) => !isProtectedUser(u));
  const allSelectableSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((u) => effectiveSelection.has(u.name));
  const someSelectableSelected =
    effectiveSelection.size > 0 && !allSelectableSelected;
  const selectedCount = effectiveSelection.size;

  const toggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const toggleRow = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelectableSelected) {
      setSelectedNames(new Set());
    } else {
      setSelectedNames(new Set(selectableUsers.map((u) => u.name)));
    }
  };

  const clearSelection = () => setSelectedNames(new Set());

  const handleBulkDelete = () => {
    const toDelete = sortedUsers.filter((u) => effectiveSelection.has(u.name));
    if (toDelete.length > 0) {
      onBulkDelete(toDelete);
    }
  };

  const ariaSort = sortDir === "asc" ? "ascending" : "descending";
  const isEmpty = sortedUsers.length === 0;
  const hasFilter = filterQuery.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Selection action bar — appears only when something is selected. */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">
              {t("selectedCount", { count: selectedCount })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-7 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {t("clearSelection")}
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("deleteSelected")}
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px] pr-0">
                {selectableUsers.length > 0 && (
                  <Checkbox
                    checked={
                      allSelectableSelected
                        ? true
                        : someSelectableSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleAll}
                    aria-label={t("selectAll")}
                  />
                )}
              </TableHead>
              <TableHead className="w-[260px]" aria-sort={ariaSort}>
                <button
                  type="button"
                  onClick={toggleSort}
                  className="inline-flex items-center gap-1 rounded-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={
                    sortDir === "asc" ? t("sortAscending") : t("sortDescending")
                  }
                >
                  {t("nameCo")}
                  {sortDir === "asc" ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </TableHead>
              <TableHead>{t("tags")}</TableHead>
              <TableHead>{t("canAccessVhosts")}</TableHead>
              <TableHead className="w-[160px]">{t("hasPassword")}</TableHead>
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
                      {hasFilter
                        ? t("emptyFilterState")
                        : t("common:noResults")}
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
              sortedUsers.map((user) => {
                const isProtected = isProtectedUser(user);
                return (
                  <UsersTableRow
                    key={user.name}
                    user={user}
                    href={buildHref(user)}
                    selected={effectiveSelection.has(user.name)}
                    onToggleSelect={
                      isProtected ? undefined : () => toggleRow(user.name)
                    }
                    onDelete={() => onDelete(user)}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
