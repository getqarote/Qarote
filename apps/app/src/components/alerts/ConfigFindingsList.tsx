import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ScanLine,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useGetFindings, useTriggerScan } from "@/hooks/queries/useScan";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import {
  formatRelativeTime,
  formatTimestamp,
  getSeverityColor,
} from "./alertUtils";

const SEVERITIES = ["HIGH", "MEDIUM", "LOW", "INFO"] as const;
const PAGE_SIZE = 25;

interface CoverageState {
  checked: string[];
  skipped: { section: string; reason: string }[];
}

interface ConfigFindingsListProps {
  serverId: string;
}

export function ConfigFindingsList({ serverId }: ConfigFindingsListProps) {
  const { t } = useTranslation("alerts");
  const { workspace } = useWorkspace();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [page, setPage] = useState(1);
  const [lastCoverage, setLastCoverage] = useState<CoverageState | null>(null);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);

  // showResolved toggles between two *disjoint* views:
  //   - false → active findings only (resolved: false)
  //   - true  → resolved findings only (resolved: true)
  // Previously this used `undefined` for the resolved branch, which returned
  // active+resolved combined and made the two views look identical.
  const { data, isLoading } = useGetFindings(serverId, {
    resolved: showResolved,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const triggerScan = useTriggerScan();

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

  const findings = data?.findings ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isEmpty = !isLoading && findings.length === 0 && !triggerScan.isPending;

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

          <Button
            variant={showResolved ? "default" : "outline"}
            size="sm"
            className="h-8 text-sm"
            onClick={() => {
              setShowResolved((v) => !v);
              setPage(1);
            }}
          >
            {t("scan.showResolved")}
          </Button>
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

      {/* Empty state — different copy for active vs resolved so the user
          knows whether the list is truly empty or they're just looking at
          the wrong view. */}
      {isEmpty && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ScanLine className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">
            {showResolved ? t("scan.emptyResolvedTitle") : t("scan.emptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {showResolved ? t("scan.emptyResolvedDesc") : t("scan.emptyDesc")}
          </p>
          {!showResolved && (
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
            return (
              <div
                key={finding.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  isResolved
                    ? "bg-muted/20 hover:bg-muted/30 opacity-70"
                    : "hover:bg-muted/30"
                }`}
              >
                {isResolved ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`}
                  />
                )}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${badge} ${
                        isResolved ? "opacity-60" : ""
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
                  </div>
                  <p
                    className={`text-sm font-medium truncate ${
                      isResolved ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {finding.resourceType}/{finding.resourceName}
                    {finding.vhost && finding.vhost !== "/" && (
                      <span className="text-muted-foreground ml-1 no-underline">
                        ({finding.vhost})
                      </span>
                    )}
                  </p>
                </div>
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
    </div>
  );
}
