import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { getSeverityAccent } from "@/components/alerts/alertUtils";
import { CleanupRabbit } from "@/components/CleanupRabbit";
import { Button } from "@/components/ui/button";

import {
  useDismissFinding,
  useGetFindings,
  useResolveFinding,
  useTriggerScan,
} from "@/hooks/queries/useScan";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import {
  categoryCounts,
  FINDING_CATEGORIES,
  type FindingCategory,
  resourceTypeToCategory,
} from "./findingCategory";
import { FindingDetailDrawer, type ScanFinding } from "./FindingDetailDrawer";

const PAGE = 5;
const FETCH_LIMIT = 200;

interface ConfigScanTabProps {
  serverId: string;
  serverName: string;
}

type Finding = NonNullable<
  ReturnType<typeof useGetFindings>["data"]
>["findings"][number];

export function ConfigScanTab({ serverId, serverName }: ConfigScanTabProps) {
  const { t } = useTranslation("alerts");
  const { workspace } = useWorkspace();

  const [category, setCategory] = useState<FindingCategory | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: openData, isLoading } = useGetFindings(serverId, {
    resolved: false,
    limit: FETCH_LIMIT,
  });
  const { data: resolvedData } = useGetFindings(serverId, {
    resolved: true,
    limit: FETCH_LIMIT,
    enabled: showHidden,
  });
  const { data: dismissedData } = useGetFindings(serverId, {
    dismissed: true,
    limit: FETCH_LIMIT,
    enabled: showHidden,
  });

  const triggerScan = useTriggerScan();
  const resolveFinding = useResolveFinding();
  const dismissFinding = useDismissFinding();
  const pending = resolveFinding.isPending || dismissFinding.isPending;

  const openFindings = useMemo(() => openData?.findings ?? [], [openData]);
  const hiddenCount = (resolvedData?.total ?? 0) + (dismissedData?.total ?? 0);

  const counts = useMemo(() => categoryCounts(openFindings), [openFindings]);
  const openTotal = openFindings.length;

  // Open + (optionally) resolved/dismissed, filtered by category, paginated.
  const visible = useMemo(() => {
    const base: Finding[] = showHidden
      ? [
          ...openFindings,
          ...(resolvedData?.findings ?? []),
          ...(dismissedData?.findings ?? []),
        ]
      : openFindings;
    return category
      ? base.filter((f) => resourceTypeToCategory(f.resourceType) === category)
      : base;
  }, [showHidden, openFindings, resolvedData, dismissedData, category]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE));
  const pageClamped = Math.min(page, totalPages);
  const paged = visible.slice((pageClamped - 1) * PAGE, pageClamped * PAGE);

  const openFinding =
    openId != null ? (visible.find((f) => f.id === openId) ?? null) : null;

  const handleScan = () => {
    if (!workspace?.id) return;
    triggerScan.mutate(
      { serverId, workspaceId: workspace.id, force: true },
      {
        onSuccess: () => setPage(1),
        onError: () => toast.error(t("scan.toast.actionError")),
      }
    );
  };

  const handleResolve = (findingId: string) => {
    if (!workspace?.id) return;
    resolveFinding.mutate(
      { serverId, workspaceId: workspace.id, findingId },
      {
        onSuccess: () => {
          toast.success(t("scan.toast.resolveSuccess"));
          setOpenId(null);
        },
        onError: () => toast.error(t("scan.toast.actionError")),
      }
    );
  };

  const handleDismiss = (findingId: string, reason?: string) => {
    if (!workspace?.id) return;
    dismissFinding.mutate(
      { serverId, workspaceId: workspace.id, findingId, reason },
      {
        onSuccess: () => {
          toast.success(t("scan.toast.dismissSuccess"));
          setOpenId(null);
        },
        onError: () => toast.error(t("scan.toast.actionError")),
      }
    );
  };

  const setCat = (c: FindingCategory | null) => {
    setCategory(c);
    setPage(1);
  };

  const cats: Array<[FindingCategory | "all", number]> = [
    ["all", openTotal],
    ...FINDING_CATEGORIES.map(
      (c) => [c, counts[c]] as [FindingCategory, number]
    ),
  ];

  return (
    <div className="space-y-3">
      {/* Category pills + Run scan */}
      <div className="flex flex-wrap items-center gap-1.5">
        {cats.map(([c, n]) => {
          const on = c === "all" ? category === null : category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() =>
                setCat(c === "all" ? null : (c as FindingCategory))
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                on
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "all" ? t("filter.all") : t(`scan.categories.${c}`)}
              {n > 0 && (
                <span className="font-mono text-[11px] opacity-70">{n}</span>
              )}
            </button>
          );
        })}
        <Button
          size="sm"
          className="ml-auto gap-1.5"
          onClick={handleScan}
          disabled={triggerScan.isPending}
        >
          {triggerScan.isPending ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {triggerScan.isPending ? t("scan.scanning") : t("scan.runScan")}
        </Button>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">
          {t("scan.openFindings", { count: openTotal })}
        </span>
        <span className="flex-1" />
        {hiddenCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              role="switch"
              aria-checked={showHidden}
              aria-label={t("scan.showResolvedIgnored")}
              onClick={() => {
                setShowHidden((v) => !v);
                setPage(1);
              }}
              className={`relative h-4 w-7 rounded-full transition-colors ${
                showHidden ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                  showHidden ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </button>
            {t("scan.showResolvedIgnored")}
          </label>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-muted-foreground">
            <CleanupRabbit />
          </div>
          <p className="text-sm font-medium">{t("scan.emptyTitle")}</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {category ? t("scan.emptyCategory") : t("scan.emptyDesc")}
          </p>
          {!category && (
            <Button size="sm" onClick={handleScan} className="mt-1 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("scan.runFirstScan")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {paged.map((f) => (
            <FindingRow key={f.id} finding={f} onOpen={() => setOpenId(f.id)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {visible.length > PAGE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pageClamped <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← {t("pager.prev")}
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {t("pager.range", {
              from: (pageClamped - 1) * PAGE + 1,
              to: Math.min(pageClamped * PAGE, visible.length),
              total: visible.length,
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={pageClamped >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("pager.next")} →
          </Button>
        </div>
      )}

      <FindingDetailDrawer
        finding={openFinding as ScanFinding | null}
        serverName={serverName}
        pending={pending}
        rescanning={triggerScan.isPending}
        onClose={() => setOpenId(null)}
        onResolve={handleResolve}
        onDismiss={handleDismiss}
        onRescan={handleScan}
      />
    </div>
  );
}

function FindingRow({
  finding,
  onOpen,
}: {
  finding: Finding;
  onOpen: () => void;
}) {
  const { t } = useTranslation("alerts");
  const accent = getSeverityAccent(finding.severity as never);
  const status = finding.resolvedAt
    ? "resolved"
    : finding.dismissedAt
      ? "dismissed"
      : "open";
  const label = t(`ruleLabels.${finding.ruleKey}`, {
    defaultValue: finding.ruleKey,
  });
  const why = t(`ruleGuidance.${finding.ruleKey}.what`, {
    defaultValue: "",
    resource: finding.resourceName,
    vhost: finding.vhost ?? "/",
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20 ${
        status !== "open" ? "opacity-60" : ""
      }`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${accent.bg}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="truncate">{label}</span>
          <code className="shrink-0 font-mono text-xs text-accent-foreground">
            {finding.resourceName}
          </code>
          {status !== "open" && (
            <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {t(`scan.${status === "resolved" ? "resolved" : "dismissed"}`)}
            </span>
          )}
        </div>
        {why && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{why}</p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 shrink-0 px-2 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        {t("scan.inspect")}
      </Button>
    </div>
  );
}
