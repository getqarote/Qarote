import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  AlertTriangle,
  ArrowRight,
  Download,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldOff,
} from "lucide-react";
import { parseAsBoolean, parseAsStringEnum, useQueryStates } from "nuqs";
import { toast } from "sonner";

import { isCloudMode } from "@/lib/featureFlags";
import { openPortalPath } from "@/lib/runtimeConfig";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { SettingsUpgradePrompt } from "@/components/settings/SettingsUpgradePrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { usePermission } from "@/hooks/queries/useWorkspaceRole";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { UserPlan } from "@/types/plans";

type Cursor = { timestamp: string; id: string };
type RangeKey = "24h" | "7d" | "30d";

const RANGE_HOURS: Record<RangeKey, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

// Mirrors the persisted-retention window the prototype advertises and the
// Enterprise locked card promises ("searchable 90-day record").
const RETENTION_DAYS = 90;

const CATEGORY_OPTIONS = [
  { value: "all", labelKey: "category.all" },
  { value: "rabbitmq", labelKey: "category.rabbitmq" },
  { value: "workspace", labelKey: "category.workspace" },
  { value: "org", labelKey: "category.org" },
  { value: "alert", labelKey: "category.alert" },
  { value: "auth", labelKey: "category.auth" },
  { value: "system", labelKey: "category.system" },
] as const;

const RANGE_OPTIONS: RangeKey[] = ["24h", "7d", "30d"];

/** Compact timestamp for the table cell, e.g. "Jun 6 · 15:06". */
function formatCompact(iso: string, language: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(language, {
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(language, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Humanized fallback label for a dotted action key (e.g.
 * `rabbitmq.queue.purge` → "Queue purge"). Used as the `defaultValue`
 * for the `action.<key>` i18n lookup so curated labels can be added
 * later without code changes.
 */
function humanizeAction(action: string): string {
  const tail = action.split(".").slice(-2).join(" ").replace(/_/g, " ");
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const GRID =
  "grid grid-cols-[0.9fr_1.2fr_1.4fr_1.3fr_0.7fr] items-center gap-3";

export default function AuditSection() {
  const { t, i18n } = useTranslation("audit");
  const { workspace } = useWorkspace();
  const { userPlan } = useUser();
  const canRead = usePermission("audit:read");
  const canExport = usePermission("audit:export");
  const isEnterprise = userPlan === UserPlan.ENTERPRISE;

  // Shareable, URL-backed filters.
  const [filters, setFilters] = useQueryStates(
    {
      category: parseAsStringEnum<string>(
        CATEGORY_OPTIONS.map((o) => o.value)
      ).withDefault("all"),
      range: parseAsStringEnum<RangeKey>(RANGE_OPTIONS).withDefault("7d"),
      denials: parseAsBoolean.withDefault(false),
    },
    { history: "replace", clearOnDefault: true }
  );
  const { category, range, denials } = filters;
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<Cursor | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  // Relative window anchored to "now". Recomputed only when the range
  // changes (useMemo caches it), so it doesn't churn the query key per
  // render — Date.now() is intentional here.
  /* eslint-disable react-hooks/purity */
  const fromTimestamp = useMemo(
    () => new Date(Date.now() - RANGE_HOURS[range] * 3600 * 1000).toISOString(),
    [range]
  );
  /* eslint-enable react-hooks/purity */

  const queryInput = useMemo(
    () => ({
      workspaceId: workspace?.id ?? "",
      category: category === "all" ? undefined : category,
      source: denials ? ("rbac_denial" as const) : undefined,
      fromTimestamp,
      cursor,
      limit: 50,
    }),
    [workspace?.id, category, denials, fromTimestamp, cursor]
  );

  const listQuery = trpc.audit.list.useQuery(queryInput, {
    enabled: !!workspace?.id && canRead === true && isEnterprise,
    staleTime: 5_000,
  });

  const exportMutation = trpc.audit.export.useMutation({
    onSuccess: (data) => {
      downloadCsv(
        data.csv,
        `audit-${workspace?.name ?? "workspace"}-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`
      );
      toast.success(t("export.success", { count: data.rowCount }));
      if (data.truncated) toast.warning(t("export.truncated"));
    },
    onError: (error) => toast.error(error.message || t("export.failed")),
    onSettled: () => setExporting(false),
  });

  // Permission still resolving — render nothing (avoids a forbidden flash).
  if (canRead === null) return null;

  // Plan gate first: audit persistence + search + export are Enterprise-only.
  if (!isEnterprise) {
    return (
      <div className="space-y-6">
        <SectionHead title={t("title")} sub={t("gate.subtitle")} />
        <AuditUpgradeCard />
      </div>
    );
  }

  // Role gate: Enterprise org, but this member lacks audit:read.
  if (canRead === false) {
    return (
      <div className="space-y-6">
        <SectionHead title={t("title")} sub={t("forbidden.subtitle")} />
        <div className="rounded-xl border border-border bg-card px-7 py-11 text-center">
          <span
            className="mx-auto mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-[13px] bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <ShieldOff className="h-6 w-6" />
          </span>
          <h3 className="text-[19px] font-semibold tracking-tight">
            {t("forbidden.title")}
          </h3>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
            {t("forbidden.body")}
          </p>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            audit:read
          </p>
        </div>
      </div>
    );
  }

  const items = listQuery.data?.items ?? [];
  const nextCursor = listQuery.data?.nextCursor ?? null;
  const filtered = q.trim()
    ? items.filter((r) =>
        `${r.action} ${r.actorEmail ?? ""} ${r.entityLabel ?? ""} ${r.entityId ?? ""}`
          .toLowerCase()
          .includes(q.trim().toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      <SectionHead title={t("title")} sub={t("subtitle")} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            className="pl-9"
          />
        </div>

        <Select
          value={category}
          onValueChange={(v) => {
            setFilters({ category: v });
            setCursor(undefined);
          }}
        >
          <SelectTrigger className="w-auto" aria-label={t("filter.category")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={range}
          onValueChange={(v) => {
            setFilters({ range: v as RangeKey });
            setCursor(undefined);
          }}
        >
          <SelectTrigger className="w-auto" aria-label={t("filter.range")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`range.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={denials}
            onChange={(e) => {
              setFilters({ denials: e.target.checked });
              setCursor(undefined);
            }}
            className="h-4 w-4 accent-primary"
          />
          {t("denialsOnly")}
        </label>
      </div>

      {/* Error */}
      {listQuery.isError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {listQuery.error?.message ?? t("error.message")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => listQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("error.retry")}
          </Button>
        </div>
      )}

      {/* Table */}
      {listQuery.isLoading ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !listQuery.isError && filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {denials ? t("empty.denials") : t("empty.body")}
          </p>
        </div>
      ) : !listQuery.isError ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            className={cn(
              GRID,
              "border-b border-border bg-muted/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground"
            )}
          >
            <span>{t("col.timestamp")}</span>
            <span>{t("col.actor")}</span>
            <span>{t("col.action")}</span>
            <span>{t("col.entity")}</span>
            <span>{t("col.source")}</span>
          </div>

          {filtered.map((row) => {
            const isDenial = row.source === "rbac_denial";
            const actor = row.actorEmail ?? row.actorId;
            return (
              <div
                key={row.id}
                className={cn(
                  GRID,
                  "border-b border-border px-4 py-3 text-sm last:border-b-0",
                  isDenial && "bg-destructive/5"
                )}
              >
                <span
                  className="font-mono text-xs whitespace-nowrap text-muted-foreground"
                  title={formatFull(row.timestamp)}
                >
                  {formatCompact(row.timestamp, i18n.language)}
                </span>
                <span className="min-w-0 truncate">
                  {actor ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {actor}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t("system")}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate font-medium",
                      isDenial && "text-destructive"
                    )}
                  >
                    {t(`action.${row.action}`, {
                      defaultValue: humanizeAction(row.action),
                    })}
                  </span>
                  <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                    {row.action}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate">
                    {row.entityLabel ?? row.entityId ?? row.entityType}
                  </span>
                  {row.entityLabel && (
                    <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                      {row.entityType}
                    </span>
                  )}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {t(`source.${row.source}`, { defaultValue: row.source })}
                </span>
              </div>
            );
          })}

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>{t("footer.retention", { days: RETENTION_DAYS })}</span>
            {nextCursor && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => nextCursor && setCursor(nextCursor)}
              >
                {t("pagination.older")}
              </Button>
            )}
            <span className="flex-1" />
            {canExport === true && (
              <Button
                variant="outline"
                size="sm"
                disabled={exporting || items.length === 0}
                onClick={() => {
                  setExporting(true);
                  exportMutation.mutate({
                    workspaceId: queryInput.workspaceId,
                    category: queryInput.category,
                    source: queryInput.source,
                    fromTimestamp: queryInput.fromTimestamp,
                    maxRows: 10_000,
                  });
                }}
              >
                {exporting ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t("export.button")}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

/**
 * Enterprise plan gate for the audit log. Mirrors the SSO upgrade prompt
 * (carrot-palette card; cloud → pricing, self-hosted → license activation).
 */
function AuditUpgradeCard() {
  const { t } = useTranslation("audit");
  const navigate = useNavigate();
  const cloud = isCloudMode();

  return (
    <SettingsUpgradePrompt
      icon={<Lock className="h-6 w-6" />}
      title={t("gate.title")}
      body={t("gate.body")}
      note={t("gate.footnote")}
    >
      {cloud ? (
        <Button onClick={() => navigate("/plans")}>
          {t("gate.cta")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <>
          <Button onClick={() => navigate("/settings/license")}>
            {t("gate.activateLicense")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={() => openPortalPath("/purchase")}>
            {t("gate.purchaseLicense")}
          </Button>
        </>
      )}
    </SettingsUpgradePrompt>
  );
}
