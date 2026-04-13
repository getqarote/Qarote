import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ArrowDown, ArrowUp, SearchX, Trash2, X } from "lucide-react";

import type { RabbitMQUser } from "@/lib/api/userTypes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UsersTableRow } from "@/components/UsersList/UsersTableRow";

type SortDir = "asc" | "desc";

interface UsersTableProps {
  users: RabbitMQUser[];
  buildHref: (user: RabbitMQUser) => string;
  onDelete: (user: RabbitMQUser) => void;
  onBulkDelete: (users: RabbitMQUser[]) => void;
  filterQuery: string;
  onClearFilter: () => void;
}

function isProtectedUser(user: RabbitMQUser): boolean {
  return user.name === "admin" || !!user.tags?.includes("protected");
}

/**
 * Sortable users list — div-based layout matching QueueTable pattern.
 * Single-column sort on Name. Row selection with bulk delete action bar.
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
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

  const sortedUsers = useMemo(() => {
    const copy = [...users];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort(
      (a, b) =>
        dir * a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    return copy;
  }, [users, sortDir]);

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

  const toggleSort = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

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
    if (toDelete.length > 0) onBulkDelete(toDelete);
  };

  const isEmpty = sortedUsers.length === 0;
  const hasFilter = filterQuery.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Selection action bar */}
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
            variant="destructive-outline"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("deleteSelected")}
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[2.5rem_1fr_auto_auto_8rem_2.5rem] items-center gap-x-4 px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <div>
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
          </div>
          <button
            type="button"
            onClick={toggleSort}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-foreground"
          >
            {t("nameCo")}
            {sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
          </button>
          <div>{t("tags")}</div>
          <div>{t("canAccessVhosts")}</div>
          <div>{t("hasPassword")}</div>
          <div>
            <span className="sr-only">{t("common:actions")}</span>
          </div>
        </div>

        {/* Rows or empty state */}
        {isEmpty ? (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
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
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedUsers.map((user) => {
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
