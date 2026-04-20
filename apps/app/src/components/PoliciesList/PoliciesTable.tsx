import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { PolicyListItem } from "./types";

type SortField = "name" | "pattern" | "applyTo" | "priority";
type SortDir = "asc" | "desc";

interface PoliciesTableProps {
  policies: PolicyListItem[];
  isLoading: boolean;
  onEdit?: (policy: PolicyListItem) => void;
  onDelete?: (policy: PolicyListItem) => void;
  isDeleting?: boolean;
}

export function PoliciesTable({
  policies,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}: PoliciesTableProps) {
  const { t } = useTranslation("policies");
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "priority" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...policies];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "pattern":
          return dir * a.pattern.localeCompare(b.pattern);
        case "applyTo":
          return dir * a["apply-to"].localeCompare(b["apply-to"]);
        case "priority":
          return dir * (a.priority - b.priority);
        default:
          return 0;
      }
    });
    return copy;
  }, [policies, sortField, sortDir]);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {isLoading ? (
        <LoadingRows />
      ) : policies.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Column headers */}
          <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <SortHeader
              label={t("columnName")}
              field="name"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="flex-1 min-w-0"
            />
            <SortHeader
              label={t("columnPattern")}
              field="pattern"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="w-40 text-left"
            />
            <SortHeader
              label={t("columnApplyTo")}
              field="applyTo"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="w-28 text-right"
            />
            <SortHeader
              label={t("columnPriority")}
              field="priority"
              currentField={sortField}
              currentDir={sortDir}
              onToggle={toggleSort}
              className="w-24 text-right"
            />
            <div className="w-32 text-right">{t("columnDefinition")}</div>
            {(onEdit || onDelete) && <div className="w-20" />}
          </div>

          <div className="divide-y divide-border">
            {sorted.map((policy) => (
              <PolicyRow
                key={`${policy.vhost}:${policy.name}`}
                policy={policy}
                onEdit={onEdit}
                onDelete={onDelete}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PolicyRow({
  policy,
  onEdit,
  onDelete,
  isDeleting,
}: {
  policy: PolicyListItem;
  onEdit?: (p: PolicyListItem) => void;
  onDelete?: (p: PolicyListItem) => void;
  isDeleting?: boolean;
}) {
  const { t } = useTranslation("policies");
  const [expanded, setExpanded] = useState(false);

  const definitionKeys = Object.keys(policy.definition);
  const definitionPreview =
    definitionKeys.length === 0
      ? "{}"
      : `{${definitionKeys.slice(0, 2).join(", ")}${definitionKeys.length > 2 ? ", …" : ""}}`;

  return (
    <div>
      <div className="flex items-center px-4 py-3 hover:bg-muted/20 transition-colors">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm truncate block">
            {policy.name}
          </span>
          <span className="text-xs text-muted-foreground">{policy.vhost}</span>
        </div>

        <div className="w-40 font-mono text-xs text-muted-foreground truncate">
          {policy.pattern}
        </div>

        <div className="w-28 text-right">
          <Badge variant="outline" className="text-xs capitalize">
            {policy["apply-to"]}
          </Badge>
        </div>

        <div className="w-24 text-right text-sm tabular-nums">
          {policy.priority}
        </div>

        <div className="w-32 text-right">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors truncate max-w-full"
            title={t("expandDefinition")}
          >
            {definitionPreview}
          </button>
        </div>

        {(onEdit || onDelete) && (
          <div className="w-20 flex items-center justify-end gap-1">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(policy)}
                title={t("editPolicy")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 hover:text-destructive"
                onClick={() => onDelete(policy)}
                disabled={isDeleting}
                title={t("deletePolicy")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-3 bg-muted/10 border-t border-border/50">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(policy.definition, null, 2)}
          </pre>
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

function LoadingRows() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation("policies");
  return (
    <div className="py-12 text-center">
      <FileText
        className="h-10 w-10 text-muted-foreground mx-auto mb-3"
        aria-hidden="true"
      />
      <h2 className="text-sm font-medium text-foreground mb-1">
        {t("noPoliciesFound")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("noPoliciesDesc")}</p>
    </div>
  );
}
