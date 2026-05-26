import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { CircleCheck, ShieldAlert } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface MetricsStripData {
  messagesPerSec: number;
  activeQueues: number;
  avgLatency: number;
  queueDepth: number;
  connectedNodes: number;
  cpuUsage: number;
  totalMemory: number;
}

/**
 * Classifies the messageId coverage ratio into one of three visual states.
 *
 * "empty" — the broker has no publishes in the observation window
 * "muted" — coverage below 70% (no value judgment in the color, only the
 *   number + popover content carry the band info; per UX review B2 we
 *   deliberately do NOT paint amber on the low end because it competes
 *   with the LOW_MESSAGE_ID_COVERAGE finding severity and reads as
 *   scolding, breaking the "carrot, not stick" framing)
 * "emerald" — coverage at or above 70%, the threshold where firehose
 *   patterns (pipeline inference, time-to-delivery, unrouted detection)
 *   become statistically reliable. Positive confirmation tone.
 *
 * Exported for unit-test coverage — see FE-N5 in
 * docs/internal/server-messageid-coverage-stat.md.
 */
// CoverageBand is intentionally not exported — knip flagged it as
// unused and `ReturnType<typeof classifyCoverageBand>` covers the one
// callsite (the cell render below) without the extra public name.
type CoverageBand = "empty" | "muted" | "emerald";
export const classifyCoverageBand = (
  taggedPublishes: number,
  totalPublishes: number
): CoverageBand => {
  if (totalPublishes <= 0) return "empty";
  const ratio = taggedPublishes / totalPublishes;
  return ratio >= 0.7 ? "emerald" : "muted";
};

interface MetricsStatusStripProps {
  metrics: MetricsStripData;
  isLoading: boolean;
  metricsError?: Error | null;
  nodesError?: Error | null;
  /** Optional diagnosis anomaly count. When provided, renders an extra cell. */
  diagnosisCount?: number;
  /**
   * Optional publisher messageId coverage observation. When provided
   * renders an extra cell. `null` / `undefined` hides the cell entirely
   * (e.g. firehose plugin disabled on this server).
   */
  messageIdCoverage?: {
    taggedPublishes: number;
    totalPublishes: number;
  } | null;
  /**
   * When true, render the coverage cell WITHOUT the "why this matters"
   * popover trigger (the cell still shows the percentage, muted). Set
   * by the parent when LOW_MESSAGE_ID_COVERAGE is firing for this
   * server — the diagnosis finding owns the "why" surface to avoid
   * duplication with the popover content.
   */
  suppressMessageIdPopover?: boolean;
}

/**
 * Compact status strip that replaces the 7-card hero grid.
 *
 * Design intent: "calm baseline, sharp alerts" — quiet by default, the value
 * switches to a status color ONLY when a real threshold is exceeded. This is
 * Qarote's core monitoring contract: color means something.
 *
 * Thresholds are deliberately conservative: warn early, escalate to critical
 * late. Tune per deployment via config in a future pass if needed.
 */
export const MetricsStatusStrip = ({
  metrics,
  isLoading,
  metricsError,
  nodesError,
  diagnosisCount,
  messageIdCoverage,
  suppressMessageIdPopover,
}: MetricsStatusStripProps) => {
  const { t, i18n } = useTranslation("dashboard");

  const formatInt = (n: number) =>
    new Intl.NumberFormat(i18n.language).format(n);
  const formatDecimal = (n: number) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(n);

  const authError =
    (metricsError && isRabbitMQAuthError(metricsError)) ||
    (nodesError && isRabbitMQAuthError(nodesError));

  if (authError) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
        <ShieldAlert className="h-4 w-4 text-warning shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-warning">
            {t("permissionRequired")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("needMonitorPermission")}
          </p>
        </div>
      </div>
    );
  }

  // Threshold helpers — semantic color only when the signal actually warrants it.
  const queueDepthTone =
    metrics.queueDepth >= 1000
      ? "text-destructive"
      : metrics.queueDepth >= 100
        ? "text-warning"
        : "text-foreground";

  const latencyTone =
    metrics.avgLatency >= 500
      ? "text-destructive"
      : metrics.avgLatency >= 100
        ? "text-warning"
        : "text-foreground";

  const cpuTone =
    metrics.cpuUsage >= 90
      ? "text-destructive"
      : metrics.cpuUsage >= 75
        ? "text-warning"
        : "text-foreground";

  const nodesTone =
    metrics.connectedNodes === 0 ? "text-destructive" : "text-foreground";

  const cells: Array<{
    label: string;
    value: string;
    unit?: string;
    tone: string;
  }> = [
    {
      label: t("messagesPerSec"),
      value: formatInt(metrics.messagesPerSec),
      tone: "text-foreground",
    },
    {
      label: t("queuesDepth"),
      value: formatInt(metrics.queueDepth),
      tone: queueDepthTone,
    },
    {
      label: t("avgLatency"),
      value: formatDecimal(metrics.avgLatency),
      unit: "ms",
      tone: latencyTone,
    },
    {
      label: t("activeQueues"),
      value: formatInt(metrics.activeQueues),
      tone: "text-foreground",
    },
    {
      label: t("connectedNodes"),
      value: formatInt(metrics.connectedNodes),
      tone: nodesTone,
    },
    {
      label: t("cpuUsage"),
      value: formatDecimal(metrics.cpuUsage),
      unit: "%",
      tone: cpuTone,
    },
    {
      label: t("memoryUsage"),
      value: formatDecimal(metrics.totalMemory),
      unit: "GB",
      tone: "text-foreground",
    },
  ];

  const diagnosisTone =
    diagnosisCount !== undefined && diagnosisCount > 0
      ? "text-warning"
      : "text-foreground";

  const showCoverageCell = messageIdCoverage != null;
  const coverageBand = messageIdCoverage
    ? classifyCoverageBand(
        messageIdCoverage.taggedPublishes,
        messageIdCoverage.totalPublishes
      )
    : null;
  const coverageRatioPct =
    messageIdCoverage && messageIdCoverage.totalPublishes > 0
      ? Math.round(
          (messageIdCoverage.taggedPublishes /
            messageIdCoverage.totalPublishes) *
            100
        )
      : null;
  const coverageTone =
    coverageBand === "emerald"
      ? "text-emerald-600 dark:text-emerald-500"
      : "text-muted-foreground";

  return (
    <div className="flex flex-wrap items-stretch rounded-md border border-border bg-card overflow-hidden">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={`flex flex-col justify-between flex-1 min-w-[160px] min-h-[88px] px-5 py-3 ${
            i < cells.length - 1 ||
            diagnosisCount !== undefined ||
            showCoverageCell
              ? "border-r border-border"
              : ""
          }`}
        >
          {/* Label — wraps up to 2 lines for long translations (French
              "Profondeur des files d'attente" etc.). leading-tight keeps
              wrapped labels compact. */}
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight line-clamp-2">
            {cell.label}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            {isLoading ? (
              <Skeleton className="h-7 w-14" />
            ) : (
              <>
                <span
                  className={`text-2xl font-semibold font-mono tabular-nums ${cell.tone}`}
                >
                  {cell.value}
                </span>
                {cell.unit && (
                  <span className="text-sm text-muted-foreground font-mono">
                    {cell.unit}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {/* Diagnosis cell — only rendered when the EE feature is active */}
      {diagnosisCount !== undefined && (
        <Link
          to="/diagnosis"
          className={`flex flex-col justify-between flex-1 min-w-[160px] min-h-[88px] px-5 py-3 hover:bg-muted/40 transition-colors ${
            showCoverageCell ? "border-r border-border" : ""
          }`}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">
            {t("anomalies")}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            {isLoading ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <span
                className={`text-2xl font-semibold font-mono tabular-nums ${diagnosisTone}`}
              >
                {formatInt(diagnosisCount)}
              </span>
            )}
          </div>
        </Link>
      )}

      {/* messageId coverage cell — only rendered when firehose is enabled
          on this server. Uses <dl> metric pattern (NOT role="status",
          which would spam screen readers on every 45s poll). The popover
          trigger is suppressed when LOW_MESSAGE_ID_COVERAGE is firing
          for this server — that finding owns the "why this matters"
          surface and we avoid the duplication. */}
      {showCoverageCell && messageIdCoverage && (
        <div className="flex flex-col justify-between flex-1 min-w-[160px] min-h-[88px] px-5 py-3">
          <dl className="contents">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight line-clamp-2">
              {t("messageIdCoverage.label")}
            </dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              {isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : coverageRatioPct === null ? (
                // Empty state — broker has no publishes in window.
                <span className="text-2xl font-semibold font-mono tabular-nums text-muted-foreground">
                  —
                </span>
              ) : (
                <>
                  <span
                    className={`text-2xl font-semibold font-mono tabular-nums ${coverageTone}`}
                  >
                    {coverageRatioPct}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    %
                  </span>
                  {coverageBand === "emerald" && (
                    <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500 ml-0.5" />
                  )}
                  {!suppressMessageIdPopover && (
                    <Popover>
                      <PopoverTrigger
                        aria-label={t("messageIdCoverage.whyAriaLabel")}
                        className="ml-1 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                      >
                        {t("messageIdCoverage.whyThisMatters")}
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="end"
                        className="w-80"
                      >
                        <h4 className="text-sm font-semibold mb-2">
                          {t("messageIdCoverage.popover.heading")}
                        </h4>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                          <dt className="font-mono tabular-nums text-muted-foreground">
                            {t("messageIdCoverage.popover.tier1.range")}
                          </dt>
                          <dd>{t("messageIdCoverage.popover.tier1.desc")}</dd>
                          <dt className="font-mono tabular-nums text-muted-foreground">
                            {t("messageIdCoverage.popover.tier2.range")}
                          </dt>
                          <dd>{t("messageIdCoverage.popover.tier2.desc")}</dd>
                          <dt className="font-mono tabular-nums text-muted-foreground">
                            {t("messageIdCoverage.popover.tier3.range")}
                          </dt>
                          <dd>{t("messageIdCoverage.popover.tier3.desc")}</dd>
                        </dl>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {t("messageIdCoverage.popover.footer")}
                        </p>
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
};
