import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatRelativeAgo } from "@/lib/formatRelativeAgo";

import type { DiagnosisRuleType } from "./DiagnosisRuleBadge";
import { DiagnosisRuleBadge } from "./DiagnosisRuleBadge";

interface TimelinePoint {
  timestamp: string;
  messages: number;
  consumerCount: number;
  // publishRate / consumeRate are sent by the API but not rendered in the
  // mini-chart — leave them out of the interface until a line is added.
}

interface DiagnosisCardProps {
  rule: DiagnosisRuleType;
  severity: string;
  queueName: string;
  vhost: string;
  description: string;
  recommendation: string;
  timeline: TimelinePoint[];
  detectedAt: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-muted text-muted-foreground border border-border",
  INFO: "bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400",
};

export function DiagnosisCard({
  rule,
  severity,
  queueName,
  vhost,
  description,
  recommendation,
  timeline,
  detectedAt,
}: DiagnosisCardProps) {
  const { t } = useTranslation("diagnosis");
  const badgeClass =
    SEVERITY_BADGE[severity] ?? "bg-muted text-muted-foreground";

  const chartData = timeline.map((p) => ({
    t: new Date(p.timestamp).getTime(),
    messages: p.messages,
    consumers: p.consumerCount,
  }));

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 bg-muted/20 border-b border-border">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <DiagnosisRuleBadge rule={rule} />
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm ${badgeClass}`}
            >
              {t(`severity.${severity.toLowerCase()}`)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeAgo(detectedAt, t("justNow"))}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground truncate">
            {queueName}
            {vhost !== "/" && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({vhost})
              </span>
            )}
          </p>
        </div>
        <Link
          to={`/queues/${encodeURIComponent(queueName)}`}
          className="text-xs text-primary hover:underline shrink-0"
        >
          {t("card.viewQueue")}
        </Link>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("card.recommendation")}:
          </span>{" "}
          {recommendation}
        </p>

        {timeline.length >= 3 && (
          <div className="h-[60px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded border border-border bg-popover px-2 py-1 text-xs shadow">
                        {payload
                          .filter(
                            (p) =>
                              p != null && p.dataKey != null && p.value != null
                          )
                          .map((p) => (
                            <div key={String(p.dataKey)}>
                              {p.dataKey}: {p.value}
                            </div>
                          ))}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="hsl(var(--primary))"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="consumers"
                  stroke="hsl(var(--muted-foreground))"
                  dot={false}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
