import { useTranslation } from "react-i18next";

import { ShieldAlert } from "lucide-react";

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

interface MetricsStatusStripProps {
  metrics: MetricsStripData;
  isLoading: boolean;
  metricsError?: Error | null;
  nodesError?: Error | null;
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

  return (
    <div className="flex flex-wrap items-stretch rounded-md border border-border bg-card overflow-hidden">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={`flex flex-col justify-between flex-1 min-w-[160px] min-h-[88px] px-5 py-3 ${
            i < cells.length - 1 ? "border-r border-border last:border-r-0" : ""
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
    </div>
  );
};
