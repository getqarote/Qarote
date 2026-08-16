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
  /**
   * Diagnosis anomaly count for the permanent "Anomalies" cell. `undefined`
   * (still resolving) renders a dash; `0` renders a calm zero; `> 0` renders
   * the count in the warning tone.
   */
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

// Shared cell styling (prototype `.metric` / `.metric__k` / `.metric__v` / `.u`)
// — each cell paints bg-card over the border-colored grid backplate so the 1px
// gaps read as hairlines. Value uses Space Grotesk (font-heading) at a compact
// 18px/600, NOT an oversized heading; the unit is small, muted mono.
const CELL_CLASS = "flex min-w-0 flex-col gap-[3px] bg-card px-[13px] py-3";
const LABEL_CLASS =
  "truncate font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground";
const VALUE_CLASS =
  "font-heading text-[18px] font-semibold tracking-[-0.01em] leading-none";
const UNIT_CLASS = "font-mono text-[11px] font-normal text-muted-foreground";

/**
 * Compact status strip that replaces the 7-card hero grid.
 *
 * Design intent: "calm baseline, sharp alerts" — quiet by default, the value
 * switches to a status color ONLY during an incident (≥1 anomaly). This is
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

  // Accent appears ONLY during an incident (≥1 anomaly); calm is fully neutral
  // — the prototype's "color means something's wrong" rule. Within an incident
  // the per-metric thresholds still decide which cells light up.
  const isIncident = diagnosisCount !== undefined && diagnosisCount > 0;
  const accent = (tone: string) => (isIncident ? tone : "text-foreground");

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
    /** Red ↑ on queue-depth when it's climbing during an incident. */
    arrow?: boolean;
  }> = [
    {
      label: t("strip.msgsPerSec"),
      value: formatInt(metrics.messagesPerSec),
      tone: "text-foreground",
    },
    {
      label: t("strip.queueDepth"),
      value: formatInt(metrics.queueDepth),
      tone: accent(queueDepthTone),
      arrow: isIncident && metrics.queueDepth >= 100,
    },
    {
      label: t("strip.avgLatency"),
      value: formatDecimal(metrics.avgLatency),
      unit: "ms",
      tone: accent(latencyTone),
    },
    {
      label: t("strip.activeQueues"),
      value: formatInt(metrics.activeQueues),
      tone: "text-foreground",
    },
    {
      label: t("strip.nodes"),
      value: formatInt(metrics.connectedNodes),
      tone: accent(nodesTone),
    },
    {
      label: t("strip.cpu"),
      value: formatDecimal(metrics.cpuUsage),
      unit: "%",
      tone: accent(cpuTone),
    },
    {
      label: t("strip.memory"),
      value: formatDecimal(metrics.totalMemory),
      unit: "GB",
      tone: "text-foreground",
    },
  ];

  // Anomalies is now a PERMANENT 8th cell. Red-leaning tone when there is at
  // least one anomaly; neutral when calm (0) or still resolving (undefined →
  // shown as a dash).
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

  // Prototype responsive: 8 cols (or 9 with coverage) > 1080px, 4 cols ≤1080px,
  // 2 cols ≤560px. Hairline dividers come from a 1px grid gap over a
  // border-colored backplate — each cell paints its own bg-card on top, so the
  // gaps read as 1px lines (no per-cell borders). overflow-hidden + the rounded
  // container clip the corners cleanly at every breakpoint.
  const lgCols =
    cells.length + 1 + (showCoverageCell ? 1 : 0) === 9
      ? "min-[1080px]:grid-cols-9"
      : "min-[1080px]:grid-cols-8";

  return (
    <div
      className={`grid grid-cols-2 min-[560px]:grid-cols-4 ${lgCols} gap-px overflow-hidden rounded-lg border border-border bg-border`}
    >
      {cells.map((cell) => (
        <div key={cell.label} className={CELL_CLASS}>
          {/* Label — single mono line; truncates rather than wrapping or
              breaking the grid for long translations. */}
          <div className={LABEL_CLASS}>{cell.label}</div>
          <div className="flex items-baseline gap-[3px]">
            {isLoading ? (
              <Skeleton className="h-[18px] w-12" />
            ) : (
              <>
                <span className={`${VALUE_CLASS} ${cell.tone}`}>
                  {cell.value}
                </span>
                {cell.unit && <span className={UNIT_CLASS}>{cell.unit}</span>}
                {cell.arrow && (
                  <span
                    className="text-[12px] leading-none text-destructive"
                    aria-hidden="true"
                  >
                    ↑
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {/* Anomalies — a permanent 8th cell. Shows the diagnosis count (0 when
          calm), a dash while the count is still resolving (undefined), and a
          skeleton while metrics load. */}
      <Link
        to="/diagnosis"
        className={`${CELL_CLASS} transition-colors hover:bg-muted/40`}
      >
        <div className={LABEL_CLASS}>{t("anomalies")}</div>
        <div className="flex items-baseline gap-[3px]">
          {isLoading ? (
            <Skeleton className="h-[18px] w-8" />
          ) : diagnosisCount === undefined ? (
            <span className={`${VALUE_CLASS} text-muted-foreground`}>—</span>
          ) : (
            <span className={`${VALUE_CLASS} ${diagnosisTone}`}>
              {formatInt(diagnosisCount)}
            </span>
          )}
        </div>
      </Link>

      {/* messageId coverage cell — only rendered when firehose is enabled
          on this server. Uses <dl> metric pattern (NOT role="status",
          which would spam screen readers on every 45s poll). The popover
          trigger is suppressed when LOW_MESSAGE_ID_COVERAGE is firing
          for this server — that finding owns the "why this matters"
          surface and we avoid the duplication. */}
      {showCoverageCell && messageIdCoverage && (
        <div className={CELL_CLASS}>
          <dl className="contents">
            <dt className={LABEL_CLASS}>{t("messageIdCoverage.label")}</dt>
            <dd className="flex items-baseline gap-[3px]">
              {isLoading ? (
                <Skeleton className="h-[18px] w-12" />
              ) : coverageRatioPct === null ? (
                // Empty state — broker has no publishes in window.
                <span className={`${VALUE_CLASS} text-muted-foreground`}>
                  —
                </span>
              ) : (
                <>
                  <span className={`${VALUE_CLASS} ${coverageTone}`}>
                    {coverageRatioPct}
                  </span>
                  <span className={UNIT_CLASS}>%</span>
                  {coverageBand === "emerald" && (
                    <CircleCheck className="ml-0.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
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
