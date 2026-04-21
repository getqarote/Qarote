import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ExternalLink, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixelTrash } from "@/components/ui/pixel-trash";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CATALOG_BY_KEY,
  DEF_CATALOG,
  type DefRow,
  GROUP_LABEL_KEY,
  GROUP_ORDER,
  newRowId,
  normalizeDefValue,
} from "./constants";

interface DefinitionBuilderProps {
  rows: DefRow[];
  onChange: (rows: DefRow[]) => void;
  /** Show validation error (at least one key required) */
  hasError?: boolean;
}

const CUSTOM_SENTINEL = "__custom__";

export function DefinitionBuilder({
  rows,
  onChange,
  hasError,
}: DefinitionBuilderProps) {
  const { t } = useTranslation("policies");

  /** All keys currently used — keyed by row id so each row can exclude only *other* rows' keys. */
  const usedKeysByRowId = useMemo(() => {
    const map = new Map<string, string>(); // rowId → key
    for (const r of rows) {
      if (r.key) map.set(r.id, r.key);
    }
    return map;
  }, [rows]);

  /**
   * Compute per-row catalog: exclude keys used by OTHER rows so the current
   * row's own key is always present as a selectable option.
   */
  const catalogForRow = (rowId: string) => {
    const otherKeys = new Set<string>();
    for (const [id, key] of usedKeysByRowId) {
      if (id !== rowId) otherKeys.add(key);
    }
    return GROUP_ORDER.map((group) => ({
      group,
      defs: DEF_CATALOG.filter(
        (d) => d.group === group && !otherKeys.has(d.key)
      ),
    })).filter((g) => g.defs.length > 0);
  };

  const addRow = () => {
    onChange([...rows, { id: newRowId(), key: "", value: "" }]);
  };

  const updateRow = (id: string, patch: Partial<DefRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const jsonPreview = useMemo(() => {
    const entries: [string, unknown][] = [];
    for (const row of rows) {
      if (!row.key) continue;
      const value = normalizeDefValue(row.key, row.value);
      if (value === undefined) continue;
      entries.push([row.key, value]);
    }
    if (entries.length === 0) return "{}";
    return JSON.stringify(Object.fromEntries(entries), null, 2);
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p
          className={cn(
            "text-sm font-medium",
            hasError ? "text-destructive" : "text-foreground"
          )}
        >
          {t("definitionLabel")}
        </p>
        <p className="text-xs text-muted-foreground">{t("definitionDesc")}</p>
      </div>

      {rows.length === 0 ? (
        <p
          className={cn(
            "rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground",
            hasError ? "border-destructive text-destructive" : "border-border"
          )}
        >
          {t("definitionEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <DefRowItem
              key={row.id}
              row={row}
              groupedCatalog={catalogForRow(row.id)}
              onChange={(patch) => updateRow(row.id, patch)}
              onRemove={() => removeRow(row.id)}
            />
          ))}
        </ul>
      )}

      {hasError && rows.length === 0 && (
        <p className="text-xs text-destructive">{t("definitionRequired")}</p>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-2" />
        {t("addDefinitionKey")}
      </Button>

      {rows.length > 0 && (
        <details className="rounded-md border border-border bg-muted/30">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            {t("jsonPreview")}
          </summary>
          <pre className="px-3 pb-3 text-xs font-mono text-foreground whitespace-pre-wrap break-words">
            {jsonPreview}
          </pre>
        </details>
      )}
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────────────────

interface DefRowItemProps {
  row: DefRow;
  groupedCatalog: Array<{ group: string; defs: typeof DEF_CATALOG }>;
  onChange: (patch: Partial<DefRow>) => void;
  onRemove: () => void;
}

function DefRowItem({
  row,
  groupedCatalog,
  onChange,
  onRemove,
}: DefRowItemProps) {
  const { t } = useTranslation("policies");
  const def = row.key ? CATALOG_BY_KEY[row.key] : undefined;
  const isCustom = !!row.key && !def;
  const hasAnyKey = !!row.key;

  const handleKeyChange = (nextKey: string) => {
    if (nextKey === CUSTOM_SENTINEL) {
      onChange({ key: "", value: "" });
      return;
    }
    const d = CATALOG_BY_KEY[nextKey];
    onChange({ key: nextKey, value: d?.defaultValue ?? "" });
  };

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
      {isCustom ? (
        <Input
          value={row.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder={t("defCustomKeyPlaceholder")}
          className="font-mono text-sm"
        />
      ) : (
        <Select value={row.key || ""} onValueChange={handleKeyChange}>
          <SelectTrigger
            className={cn(
              "font-mono text-sm",
              !row.key && "text-muted-foreground"
            )}
          >
            <SelectValue placeholder={t("defKeyPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {groupedCatalog.map(({ group, defs }) => (
              <SelectGroup key={group}>
                <SelectLabel className="text-xs">
                  {t(GROUP_LABEL_KEY[group as keyof typeof GROUP_LABEL_KEY])}
                </SelectLabel>
                {defs.map((d) => (
                  <SelectItem key={d.key} value={d.key} className="font-mono">
                    {d.key}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectGroup>
              <SelectItem value={CUSTOM_SENTINEL}>
                {t("defCustomKey")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      <DefValueInput
        row={row}
        disabled={!hasAnyKey}
        onChange={(value) => onChange({ value })}
      />

      <div className="flex items-center gap-1">
        {def && (
          <a
            href={def.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={t("defDocs")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">{t("defDocs")}</span>
          </a>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={t("removeDefinitionKey")}
          className="text-muted-foreground hover:text-destructive"
        >
          <PixelTrash className="h-4 w-auto shrink-0" />
        </Button>
      </div>

      {def && (
        <p className="col-span-3 -mt-1 text-xs text-muted-foreground">
          {t(def.tooltipKey)}
        </p>
      )}
    </li>
  );
}

// ── Value input ────────────────────────────────────────────────────────────

function DefValueInput({
  row,
  disabled,
  onChange,
}: {
  row: DefRow;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation("policies");
  const def = row.key ? CATALOG_BY_KEY[row.key] : undefined;

  if (def?.type === "enum" && def.options) {
    return (
      <Select value={row.value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="font-mono text-sm">
          <SelectValue placeholder={t("defValuePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {def.options.map((opt) => (
            <SelectItem key={opt} value={opt} className="font-mono">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (def?.type === "number" || def?.type === "number-ms") {
    return (
      <Input
        type="number"
        inputMode="numeric"
        value={row.value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={def.defaultValue}
        className="font-mono text-sm"
      />
    );
  }

  return (
    <Input
      value={row.value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={t("defValuePlaceholder")}
      className="font-mono text-sm"
    />
  );
}
