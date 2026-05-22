import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertTriangle,
  Download,
  HelpCircle,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";

import { WorkspaceForbidden } from "@/components/rbac/WorkspaceForbidden";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { usePermission } from "@/hooks/queries/useWorkspaceRole";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

type Cursor = { timestamp: string; id: string };
type SourceFilter = "qarote" | "rbac_denial" | "broker_diff";
type Tab = "activity" | "denials";

const NON_DENIAL_SOURCES: ReadonlyArray<SourceFilter> = [
  "qarote",
  "broker_diff",
];

const ACTIVITY_SOURCE_OPTIONS = [
  { value: "all", labelKey: "source.all" },
  { value: "qarote", labelKey: "source.qarote" },
  { value: "broker_diff", labelKey: "source.broker_diff" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "all", labelKey: "category.all" },
  { value: "rabbitmq", labelKey: "category.rabbitmq" },
  { value: "workspace", labelKey: "category.workspace" },
  { value: "org", labelKey: "category.org" },
  { value: "alert", labelKey: "category.alert" },
  { value: "auth", labelKey: "category.auth" },
  { value: "system", labelKey: "category.system" },
] as const;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Relative time label, localized via the platform's
 * `Intl.RelativeTimeFormat`. Picks the largest unit that fits and
 * formats with the caller's i18n language. Sub-60s renders as "now"
 * (Intl emits "in 0 seconds" / "0 seconds ago" otherwise — awkward).
 */
function formatRelative(
  iso: string,
  language: string,
  now: Date = new Date()
): string {
  const diffSec = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) {
    // "Just now" equivalent — `Intl.RelativeTimeFormat` doesn't have
    // this idiom, so use the localized 0-minute form.
    return new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(
      0,
      "minute"
    );
  }
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "always" });
  const min = Math.floor(diffSec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hr = Math.floor(min / 60);
  if (hr < 24) return rtf.format(-hr, "hour");
  const day = Math.floor(hr / 24);
  if (day < 30) return rtf.format(-day, "day");
  const mo = Math.floor(day / 30);
  return rtf.format(-mo, "month");
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

/**
 * Date input value (yyyy-mm-dd) → ISO datetime at the user's *local*
 * midnight, then serialized to UTC. A user in PST picking "May 9"
 * means "May 9 from 00:00 PST to 24:00 PST", not 00:00 UTC. Building
 * via `new Date(value + "T00:00:00Z")` would shift the day boundary
 * by the TZ offset and surface events from the wrong calendar day.
 */
function dateInputToIso(value: string, end: boolean): string | undefined {
  if (!value) return undefined;
  const parts = value.split("-");
  if (parts.length !== 3) return undefined;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return undefined;
  }
  // Local-midnight constructor — `monthIndex` is 0-based.
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return undefined;
  // End-exclusive (`lt` in the API): advance one local day so the
  // entire user-picked day is included.
  if (end) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export default function AuditSection() {
  const { t, i18n } = useTranslation("audit");
  const { workspace } = useWorkspace();
  const canRead = usePermission("audit:read");
  const canExport = usePermission("audit:export");

  // Filters are URL-backed so views are shareable (compliance workflow:
  // "look at this audit slice between X and Y in category Z"). `actor`
  // is deliberately excluded — it's an employee email and putting it in
  // the URL leaks it into browser history, API access logs (via
  // Referer), and any third-party site clicked from this page. `cursor`
  // stays local — it's derived from server responses, not user input,
  // and would be brittle in URL form (IDs change between deploys).
  const [filters, setFilters] = useQueryStates(
    {
      tab: parseAsStringEnum<Tab>(["activity", "denials"]).withDefault(
        "activity"
      ),
      category: parseAsString.withDefault("all"),
      // `source` only applies inside the Activity tab (Denials is always rbac_denial)
      source: parseAsString.withDefault("all"),
      // YYYY-MM-DD form values; conversion to ISO happens in dateInputToIso
      from: parseAsString.withDefault(""),
      to: parseAsString.withDefault(""),
    },
    { history: "replace", clearOnDefault: true }
  );
  const { tab, category, source: activitySource, from, to } = filters;
  const [actor, setActor] = useState<string>("");
  const [cursor, setCursor] = useState<Cursor | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const actorInputRef = useRef<HTMLInputElement>(null);

  const resolvedSource: SourceFilter | undefined = useMemo(() => {
    if (tab === "denials") return "rbac_denial";
    if (activitySource === "all") return undefined;
    return activitySource as SourceFilter;
  }, [tab, activitySource]);

  const filtersActive =
    category !== "all" ||
    activitySource !== "all" ||
    actor.trim() !== "" ||
    from !== "" ||
    to !== "";

  const queryInput = useMemo(
    () => ({
      workspaceId: workspace?.id ?? "",
      category: category === "all" ? undefined : category,
      source: resolvedSource,
      actor: actor.trim() === "" ? undefined : actor.trim(),
      fromTimestamp: dateInputToIso(from, false),
      toTimestamp: dateInputToIso(to, true),
      cursor,
      limit: 50,
    }),
    [workspace?.id, category, resolvedSource, actor, from, to, cursor]
  );

  const listQuery = trpc.audit.list.useQuery(queryInput, {
    enabled: !!workspace?.id && canRead === true,
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
      toast.success(
        t("export.success", {
          count: data.rowCount,
          defaultValue: "Exported {{count}} rows",
        })
      );
      if (data.truncated) {
        toast.warning(
          t("export.truncated", {
            defaultValue:
              "Result was truncated to the row cap. Refine filters to capture older history.",
          })
        );
      }
    },
    onError: (error) => {
      toast.error(
        error.message || t("export.failed", { defaultValue: "Export failed" })
      );
    },
    onSettled: () => setExporting(false),
  });

  const clearFilters = () => {
    // Preserve `tab` — Esc clears filters within the current tab, not the tab itself.
    setFilters({
      category: "all",
      source: "all",
      from: "",
      to: "",
    });
    setActor("");
    setCursor(undefined);
  };

  // Browser-tab badge for denial count — like Gmail's unread counter.
  // Lets an admin keep this tab pinned and notice new denials at a glance.
  const denialCount = listQuery.data?.denialCount ?? 0;
  useEffect(() => {
    if (denialCount <= 0) return;
    const original = document.title;
    document.title = `(${denialCount}) ${original.replace(/^\(\d+\)\s*/, "")}`;
    return () => {
      document.title = original;
    };
  }, [denialCount]);

  // Power-user keyboard shortcuts (only fire when no input is focused):
  //   /   focus actor search        Esc clear filters
  //   r   refresh                   The shortcuts are surfaced via a `?`
  // Tooltip in the toolbar so they're discoverable without being noisy.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        // Allow Esc to blur an input even while it's focused.
        if (e.key === "Escape") (target as HTMLElement).blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        actorInputRef.current?.focus();
      } else if (e.key === "Escape" && filtersActive) {
        e.preventDefault();
        clearFilters();
      } else if (e.key === "r") {
        e.preventDefault();
        void listQuery.refetch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersActive]);

  // Permission loading: render nothing until resolved (avoids flash of forbidden).
  if (canRead === null) return null;
  if (canRead === false) {
    return <WorkspaceForbidden cause={{ code: "WORKSPACE_PERMISSION" }} />;
  }

  const items = listQuery.data?.items ?? [];
  const nextCursor = listQuery.data?.nextCursor ?? null;
  const total = listQuery.data?.total ?? 0;
  const pageStart = items.length > 0 ? 1 : 0;
  const pageEnd = items.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{t("title", { defaultValue: "Audit log" })}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("description", {
                // 400 days is the default; admins can override via
                // `AUDIT_LOG_RETENTION_DAYS`. Until the backend exposes
                // the active value, the UI shows the default.
                retentionDays: 400,
                defaultValue:
                  "Forensic trail of admin-relevant changes. Retention: {{retentionDays}} days.",
              })}
            </p>
          </div>
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
                  actor: queryInput.actor,
                  fromTimestamp: queryInput.fromTimestamp,
                  toTimestamp: queryInput.toTimestamp,
                  maxRows: 10_000,
                });
              }}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t("export.button", { defaultValue: "Export CSV" })}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              // Tab switches are discrete navigation: push so Back returns
              // to the previous tab. Filter changes use the global "replace"
              // default to avoid history bloat. Reset `source` when leaving
              // Activity — it's Activity-only and would otherwise ghost in
              // the URL on Denials.
              const next: Partial<{ tab: Tab; source: string }> = {
                tab: v as Tab,
              };
              if (v === "denials") next.source = "all";
              setFilters(next, { history: "push" });
              setCursor(undefined);
            }}
          >
            <TabsList>
              <TabsTrigger value="activity">
                {t("tab.activity", { defaultValue: "Activity" })}
              </TabsTrigger>
              <TabsTrigger value="denials" className="gap-2">
                {t("tab.denials", { defaultValue: "Denials" })}
                {denialCount > 0 && (
                  <Badge
                    variant={tab === "denials" ? "destructive" : "soft-muted"}
                    className="px-1.5 py-0 text-[10px] font-semibold"
                  >
                    {denialCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={category}
              onValueChange={(v) => {
                setFilters({ category: v });
                setCursor(undefined);
              }}
            >
              <SelectTrigger
                className="w-44"
                aria-label={t("filter.category.placeholder", {
                  defaultValue: "Category",
                })}
              >
                <SelectValue
                  placeholder={t("filter.category.placeholder", {
                    defaultValue: "Category",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {t(o.labelKey, { defaultValue: o.value })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {tab === "activity" && (
              <Select
                value={activitySource}
                onValueChange={(v) => {
                  setFilters({ source: v });
                  setCursor(undefined);
                }}
              >
                <SelectTrigger
                  className="w-44"
                  aria-label={t("filter.source.placeholder", {
                    defaultValue: "Source",
                  })}
                >
                  <SelectValue
                    placeholder={t("filter.source.placeholder", {
                      defaultValue: "Source",
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(o.labelKey, { defaultValue: o.value })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input
              type="date"
              className="w-40"
              aria-label={t("filter.from.label", { defaultValue: "From date" })}
              value={from}
              onChange={(e) => {
                setFilters({ from: e.target.value });
                setCursor(undefined);
              }}
            />
            <Input
              type="date"
              className="w-40"
              aria-label={t("filter.to.label", { defaultValue: "To date" })}
              value={to}
              onChange={(e) => {
                setFilters({ to: e.target.value });
                setCursor(undefined);
              }}
            />

            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={actorInputRef}
                className="pl-9 pr-10"
                placeholder={t("filter.actor.placeholder", {
                  defaultValue: "Actor — email or user ID",
                })}
                value={actor}
                onChange={(e) => {
                  setActor(e.target.value);
                  setCursor(undefined);
                }}
              />
              {/* Subtle "/" hint inside the input — discoverable on hover, ignored otherwise */}
              <kbd
                aria-hidden={true}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center justify-center h-5 min-w-5 px-1 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground"
              >
                /
              </kbd>
            </div>

            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {t("filter.clear", { defaultValue: "Clear filters" })}
              </Button>
            )}

            {/* Discoverable shortcut hint for power users */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    aria-label={t("shortcuts.label", {
                      defaultValue: "Keyboard shortcuts",
                    })}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center gap-3">
                      <kbd className="px-1.5 py-0.5 rounded border bg-background/40">
                        /
                      </kbd>
                      <span>
                        {t("shortcuts.focusActor", {
                          defaultValue: "Focus actor search",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-1.5 py-0.5 rounded border bg-background/40">
                        Esc
                      </kbd>
                      <span>
                        {t("shortcuts.clear", {
                          defaultValue: "Clear filters",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-1.5 py-0.5 rounded border bg-background/40">
                        r
                      </kbd>
                      <span>
                        {t("shortcuts.refresh", {
                          defaultValue: "Refresh",
                        })}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {listQuery.isLoading
                ? t("status.loading", { defaultValue: "Loading…" })
                : items.length === 0
                  ? t("status.empty", { defaultValue: "No matching events" })
                  : t("status.range", {
                      start: pageStart,
                      end: pageEnd,
                      total,
                      defaultValue:
                        "Showing {{start}}–{{end}} of {{total}} events",
                    })}
            </span>
            {listQuery.isFetching && !listQuery.isLoading && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("status.refreshing", { defaultValue: "Refreshing…" })}
              </span>
            )}
          </div>

          {/* Error state */}
          {listQuery.isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {t("error.title", { defaultValue: "Could not load audit log" })}
              </AlertTitle>
              <AlertDescription className="flex items-start justify-between gap-3">
                <span>
                  {listQuery.error?.message ??
                    t("error.message", {
                      defaultValue:
                        "The server returned an error. Try again or refine the filters.",
                    })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => listQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  {t("error.retry", { defaultValue: "Retry" })}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Table / loading / empty */}
          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !listQuery.isError && items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              {filtersActive ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("empty.filtered", {
                      defaultValue: "No audit events match the filters.",
                    })}
                  </p>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    {t("filter.clear", { defaultValue: "Clear filters" })}
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <ShieldCheck
                    className="h-8 w-8 mx-auto text-muted-foreground/60"
                    aria-hidden={true}
                  />
                  <p className="text-sm font-medium">
                    {t("empty.quiet", {
                      defaultValue: "The journal is quiet",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("empty.quietDetail", {
                      defaultValue:
                        "No privileged operations recorded. Admin-relevant changes will appear here as they happen.",
                    })}
                  </p>
                </div>
              )}
            </div>
          ) : !listQuery.isError ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("col.timestamp", { defaultValue: "When" })}
                  </TableHead>
                  <TableHead>
                    {t("col.action", { defaultValue: "Action" })}
                  </TableHead>
                  <TableHead>
                    {t("col.actor", { defaultValue: "Actor" })}
                  </TableHead>
                  <TableHead>
                    {t("col.entity", { defaultValue: "Entity" })}
                  </TableHead>
                  <TableHead>
                    {t("col.source", { defaultValue: "Source" })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => {
                  const isDenial = row.source === "rbac_denial";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        <span title={formatTime(row.timestamp)}>
                          {formatRelative(row.timestamp, i18n.language)}
                        </span>
                        <span className="block text-[10px] text-muted-foreground/70">
                          {formatTime(row.timestamp)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.action}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.actorEmail ?? row.actorId ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.entityLabel ?? row.entityId ?? row.entityType}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isDenial ? "destructive" : "soft-muted"}
                          className="text-xs gap-1"
                        >
                          {isDenial && (
                            <ShieldOff className="h-3 w-3" aria-hidden={true} />
                          )}
                          {NON_DENIAL_SOURCES.includes(
                            row.source as SourceFilter
                          ) || isDenial
                            ? t(`source.${row.source}`, {
                                defaultValue: row.source,
                              })
                            : row.source}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}

          {/* Pagination */}
          {(cursor || nextCursor) && !listQuery.isError && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {total > pageEnd
                  ? t("pagination.more", {
                      count: total - pageEnd,
                      defaultValue_one: "{{count}} more event",
                      defaultValue_other: "{{count}} more events",
                    })
                  : ""}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!cursor}
                  onClick={() => setCursor(undefined)}
                >
                  {t("pagination.first", { defaultValue: "First page" })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!nextCursor}
                  onClick={() => nextCursor && setCursor(nextCursor)}
                >
                  {t("pagination.next", { defaultValue: "Next" })}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
