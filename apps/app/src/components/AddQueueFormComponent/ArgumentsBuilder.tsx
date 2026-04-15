import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { ARG_CATALOG, CATALOG_BY_KEY, normalizeArgValue } from "./constants";
import type { ArgRow } from "./types";

interface ArgumentsBuilderProps {
  rows: ArgRow[];
  onChange: (rows: ArgRow[]) => void;
  /** When true, render a JSON receipt below the rows. */
  showJsonPreview?: boolean;
}

const CUSTOM_SENTINEL = "__custom__";

const GROUP_ORDER = ["limits", "lifecycle", "dlq", "behavior"] as const;

const GROUP_LABEL_KEY: Record<string, string> = {
  limits: "argGroupLimits",
  lifecycle: "argGroupLifecycle",
  dlq: "argGroupDlq",
  behavior: "argGroupBehavior",
};

const newRowId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ArgumentsBuilder = ({
  rows,
  onChange,
  showJsonPreview = true,
}: ArgumentsBuilderProps) => {
  const { t } = useTranslation("queues");

  const groupedCatalog = useMemo(() => {
    const usedKeys = new Set(rows.map((r) => r.key).filter(Boolean));
    return GROUP_ORDER.map((group) => ({
      group,
      defs: ARG_CATALOG.filter(
        (a) => a.group === group && !usedKeys.has(a.key)
      ),
    })).filter((g) => g.defs.length > 0);
  }, [rows]);

  const addRow = () => {
    onChange([...rows, { id: newRowId(), key: "", value: "" }]);
  };

  const updateRow = (id: string, patch: Partial<ArgRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const jsonPreview = useMemo(() => {
    const entries: [string, unknown][] = [];
    for (const row of rows) {
      if (!row.key) continue;
      const value = normalizeArgValue(row.key, row.value);
      if (value === undefined) continue;
      entries.push([row.key, value]);
    }
    if (entries.length === 0) return "{}";
    return JSON.stringify(Object.fromEntries(entries), null, 2);
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {t("argumentsBuilderTitle")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("argumentsBuilderDesc")}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
          {t("argumentsEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <ArgumentRow
              key={row.id}
              row={row}
              groupedCatalog={groupedCatalog}
              onChange={(patch) => updateRow(row.id, patch)}
              onRemove={() => removeRow(row.id)}
            />
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-2" />
        {t("addArgument")}
      </Button>

      {showJsonPreview && rows.length > 0 && (
        <details className="rounded-md border border-border bg-muted/30">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            {t("argJsonPreview")}
          </summary>
          <pre className="px-3 pb-3 text-xs font-mono text-foreground whitespace-pre-wrap break-words">
            {jsonPreview}
          </pre>
        </details>
      )}
    </div>
  );
};

interface ArgumentRowProps {
  row: ArgRow;
  groupedCatalog: Array<{ group: string; defs: typeof ARG_CATALOG }>;
  onChange: (patch: Partial<ArgRow>) => void;
  onRemove: () => void;
}

const ArgumentRow = ({
  row,
  groupedCatalog,
  onChange,
  onRemove,
}: ArgumentRowProps) => {
  const { t } = useTranslation("queues");
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
      {/* Key picker */}
      {isCustom ? (
        <Input
          value={row.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder={t("argCustomKeyPlaceholder")}
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
            <SelectValue placeholder={t("argKeyPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {groupedCatalog.map(({ group, defs }) => (
              <SelectGroup key={group}>
                <SelectLabel className="text-xs">
                  {t(GROUP_LABEL_KEY[group])}
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
                {t("argCustomKey")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      {/* Value input — typed per key */}
      <ValueInput
        row={row}
        disabled={!hasAnyKey}
        onChange={(value) => onChange({ value })}
      />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {def && (
          <a
            href={def.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={t("argDocs")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">{t("argDocs")}</span>
          </a>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={t("removeArgument")}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Helper/tooltip line */}
      {def && (
        <p className="col-span-3 -mt-1 text-xs text-muted-foreground">
          {t(def.tooltipKey)}
        </p>
      )}
    </li>
  );
};

interface ValueInputProps {
  row: ArgRow;
  disabled: boolean;
  onChange: (value: string) => void;
}

const ValueInput = ({ row, disabled, onChange }: ValueInputProps) => {
  const { t } = useTranslation("queues");
  const def = row.key ? CATALOG_BY_KEY[row.key] : undefined;

  if (!def) {
    return (
      <Input
        value={row.value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={t("argValuePlaceholder")}
        className="font-mono text-sm"
      />
    );
  }

  if (def.type === "enum" && def.options) {
    return (
      <Select value={row.value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="font-mono text-sm">
          <SelectValue placeholder={t("argValuePlaceholder")} />
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

  if (def.type === "boolean") {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
        <Switch
          checked={row.value === "true"}
          onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          disabled={disabled}
          id={`arg-bool-${row.id}`}
        />
        <label
          htmlFor={`arg-bool-${row.id}`}
          className="font-mono text-sm text-foreground cursor-pointer"
        >
          {row.value === "true" ? "true" : "false"}
        </label>
      </div>
    );
  }

  if (def.type === "number" || def.type === "number-ms") {
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
      placeholder={t("argValuePlaceholder")}
      className="font-mono text-sm"
    />
  );
};
