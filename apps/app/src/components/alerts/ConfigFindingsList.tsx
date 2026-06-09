import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Ban,
  Check,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ScanLine,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  useDismissFinding,
  useGetFindings,
  useResolveFinding,
  useTriggerScan,
} from "@/hooks/queries/useScan";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import {
  formatRelativeTime,
  formatTimestamp,
  getSeverityColor,
} from "./alertUtils";

const SEVERITIES = ["HIGH", "MEDIUM", "LOW", "INFO"] as const;
const PAGE_SIZE = 25;

// The three disjoint lifecycle views. Each maps to a distinct getFindings
// filter so a finding is never double-counted across tabs.
type FindingView = "active" | "resolved" | "dismissed";

interface CoverageState {
  checked: string[];
  skipped: { section: string; reason: string }[];
}

type Finding = NonNullable<
  ReturnType<typeof useGetFindings>["data"]
>["findings"][number];

interface ConfigFindingsListProps {
  serverId: string;
}

export function ConfigFindingsList({ serverId }: ConfigFindingsListProps) {
  const { t } = useTranslation("alerts");
  const { workspace } = useWorkspace();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [view, setView] = useState<FindingView>("active");
  const [page, setPage] = useState(1);
  const [lastCoverage, setLastCoverage] = useState<CoverageState | null>(null);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);
  const [dismissTarget, setDismissTarget] = useState<Finding | null>(null);
  const [dismissReason, setDismissReason] = useState("");

  const { data, isLoading } = useGetFindings(serverId, {
    resolved: view === "dismissed" ? undefined : view === "resolved",
    dismissed: view === "dismissed" ? true : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const triggerScan = useTriggerScan();
  const resolveFinding = useResolveFinding();
  const dismissFinding = useDismissFinding();

  const handleScan = () => {
    if (!workspace?.id) return;
    triggerScan.mutate(
      { serverId, workspaceId: workspace.id, force: true },
      {
        onSuccess: (result) => {
          if (result.coverage)
            setLastCoverage(result.coverage as CoverageState);
          setLastScanAt(new Date());
          setPage(1);
        },
      }
    );
  };

  const handleResolve = (findingId: string) => {
    if (!workspace?.id) return;
    resolveFinding.mutate(
      { serverId, workspaceId: workspace.id, findingId },
      {
        onSuccess: () => toast.success(t("scan.toast.resolveSuccess")),
        onError: () => toast.error(t("scan.toast.actionError")),
      }
    );
  };

  const handleDismissConfirm = () => {
    if (!workspace?.id || !dismissTarget) return;
    const trimmed = dismissReason.trim();
    dismissFinding.mutate(
      {
        serverId,
        workspaceId: workspace.id,
        findingId: dismissTarget.id,
        reason: trimmed !== "" ? trimmed : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("scan.toast.dismissSuccess"));
          setDismissTarget(null);
          setDismissReason("");
        },
        onError: () => toast.error(t("scan.toast.actionError")),
      }
    );
  };

  const findings = data?.findings ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isEmpty = !isLoading && findings.length === 0 && !triggerScan.isPending;

  const emptyCopy = {
    active: { title: t("scan.emptyTitle"), desc: t("scan.emptyDesc") },
    resolved: {
      title: t("scan.emptyResolvedTitle"),
      desc: t("scan.emptyResolvedDesc"),
    },
    dismissed: {
      title: t("scan.emptyDismissedTitle"),
      desc: t("scan.emptyDismissedDesc"),
    },
  }[view];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={severityFilter}
            onValueChange={(v) => {
              setSeverityFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-sm">
              <SelectValue placeholder={t("scan.allSeverities")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("scan.allSeverities")}</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={view}
            onValueChange={(v) => {
              setView(v as FindingView);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("scan.statusActive")}</SelectItem>
              <SelectItem value="resolved">
                {t("scan.statusResolved")}
              </SelectItem>
              <SelectItem value="dismissed">
                {t("scan.statusDismissed")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {lastScanAt && (
            <span className="text-xs text-muted-foreground">
              {t("scan.lastScan", {
                time: formatRelativeTime(lastScanAt.toISOString()),
              })}
            </span>
          )}
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleScan}
            disabled={triggerScan.isPending}
          >
            {triggerScan.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {triggerScan.isPending ? t("scan.scanning") : t("scan.runScan")}
          </Button>
        </div>
      </div>

      {/* Coverage bar */}
      {lastCoverage && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {lastCoverage.checked.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-950 dark:text-green-400"
            >
              <CheckCircle2 className="h-3 w-3" />
              {s}
            </span>
          ))}
          {lastCoverage.skipped.map(({ section }) => (
            <span
              key={section}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
            >
              <XCircle className="h-3 w-3" />
              {section}
            </span>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state — view-specific copy so the user knows whether the list
          is truly empty or they're just looking at a different tab. */}
      {isEmpty && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ScanLine className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">{emptyCopy.title}</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {emptyCopy.desc}
          </p>
          {view === "active" && (
            <Button size="sm" onClick={handleScan} className="mt-1 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("scan.runFirstScan")}
            </Button>
          )}
        </div>
      )}

      {/* Findings list */}
      {findings.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {findings.map((finding) => {
            const { dot, badge } = getSeverityColor(finding.severity as never);
            const isResolved = !!finding.resolvedAt;
            const isDismissed = !!finding.dismissedAt;
            const isActive = !isResolved && !isDismissed;
            const isResolving =
              resolveFinding.isPending &&
              resolveFinding.variables?.findingId === finding.id;
            const isBusy =
              isResolving ||
              (dismissFinding.isPending &&
                dismissFinding.variables?.findingId === finding.id);
            return (
              <div
                key={finding.id}
                className={`group flex items-start gap-3 px-4 py-3 transition-colors ${
                  isActive
                    ? "hover:bg-muted/30"
                    : "bg-muted/20 hover:bg-muted/30 opacity-70"
                }`}
              >
                {isResolved ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                ) : isDismissed ? (
                  <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`}
                  />
                )}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${badge} ${
                        isActive ? "" : "opacity-60"
                      }`}
                    >
                      {t(`rules.severity.${finding.severity.toLowerCase()}`, {
                        defaultValue: finding.severity,
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {t(`ruleLabels.${finding.ruleKey}`, {
                        defaultValue: finding.ruleKey,
                      })}
                    </span>
                    {isResolved && (
                      <Badge
                        variant="outline"
                        className="text-xs h-4 px-1.5 border-green-600/40 text-green-700 dark:text-green-400"
                      >
                        {t("scan.resolved")}
                      </Badge>
                    )}
                    {isDismissed && (
                      <Badge
                        variant="outline"
                        className="text-xs h-4 px-1.5 text-muted-foreground"
                      >
                        {t("scan.dismissed")}
                      </Badge>
                    )}
                  </div>
                  <p
                    className={`text-sm font-medium truncate ${
                      isActive ? "" : "line-through text-muted-foreground"
                    }`}
                  >
                    {finding.resourceType}/{finding.resourceName}
                    {finding.vhost && finding.vhost !== "/" && (
                      <span className="text-muted-foreground ml-1 no-underline">
                        ({finding.vhost})
                      </span>
                    )}
                  </p>
                  {isDismissed && finding.dismissReason && (
                    <p className="text-xs text-muted-foreground italic truncate">
                      “{finding.dismissReason}”
                    </p>
                  )}
                </div>

                {/* Actions — only active findings can be resolved or
                    dismissed; terminal states are read-only. */}
                {isActive && (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      disabled={isBusy}
                      onClick={() => handleResolve(finding.id)}
                    >
                      {isResolving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      {t("scan.resolveAction")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                      disabled={isBusy}
                      onClick={() => {
                        setDismissReason("");
                        setDismissTarget(finding);
                      }}
                    >
                      <Ban className="h-3 w-3" />
                      {t("scan.dismissAction")}
                    </Button>
                  </div>
                )}

                <div className="text-right shrink-0 text-xs text-muted-foreground space-y-0.5">
                  <p title={formatTimestamp(finding.detectedAt)}>
                    {formatRelativeTime(finding.detectedAt)}
                  </p>
                  {isResolved && finding.resolvedAt && (
                    <p className="text-green-600 dark:text-green-400">
                      {t("scan.resolvedAt", {
                        time: formatRelativeTime(finding.resolvedAt),
                      })}
                    </p>
                  )}
                  {isDismissed && finding.dismissedAt && (
                    <p>
                      {t("scan.dismissedAt", {
                        time: formatRelativeTime(finding.dismissedAt),
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t("scan.pageInfo", {
              current: page,
              total: totalPages,
              count: total,
            })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              ›
            </Button>
          </div>
        </div>
      )}

      {/* Dismiss-with-reason dialog */}
      <Dialog
        open={dismissTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDismissTarget(null);
            setDismissReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("scan.dismissTitle")}</DialogTitle>
            <DialogDescription>
              {t("scan.dismissDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="dismiss-reason">
              {t("scan.dismissReasonLabel")}
            </label>
            <Textarea
              id="dismiss-reason"
              value={dismissReason}
              maxLength={500}
              rows={3}
              placeholder={t("scan.dismissReasonPlaceholder")}
              onChange={(e) => setDismissReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDismissTarget(null);
                setDismissReason("");
              }}
            >
              {t("scan.cancel")}
            </Button>
            <Button
              className="gap-1.5"
              disabled={dismissFinding.isPending}
              onClick={handleDismissConfirm}
            >
              {dismissFinding.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {t("scan.dismissConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
