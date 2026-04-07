import { useTranslation } from "react-i18next";

import { Activity, MessageSquare, ShieldAlert, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface ResourceUsageProps {
  overview?: {
    object_totals?: {
      connections: number;
      channels: number;
      consumers: number;
      exchanges: number;
    };
  };
  overviewError?: Error | null;
}

/**
 * Cluster object totals — connections, channels, consumers.
 *
 * This panel used to show CPU/memory/disk/latency too, but after /distill
 * those moved to the dashboard status strip with threshold-driven semantic
 * color. This component is now the "how much stuff is going on in the cluster"
 * reference panel, which the strip doesn't cover.
 *
 * Max values are conservative defaults for the progress bar visualization —
 * they're just rendering hints, not hard limits.
 */
export const ResourceUsage = ({
  overview,
  overviewError,
}: ResourceUsageProps) => {
  const { t } = useTranslation("dashboard");

  const hasError = overviewError && isRabbitMQAuthError(overviewError);

  // Semantic progress bar color based on utilization percentage. Healthy by
  // default, warning above 50%, critical above 80%. These thresholds are
  // intentionally relaxed for count-based metrics — a cluster at 60% of its
  // nominal channel budget isn't in trouble.
  const getCountTone = (count: number, max: number) => {
    const pct = (count / max) * 100;
    if (pct >= 80) return "bg-destructive";
    if (pct >= 50) return "bg-warning";
    return "bg-success";
  };

  const resources = [
    {
      name: t("connectionsCount"),
      value: overview?.object_totals?.connections ?? 0,
      icon: Activity,
      max: 100,
      tooltip:
        "Total number of active client connections to the RabbitMQ cluster",
    },
    {
      name: t("channelsCount"),
      value: overview?.object_totals?.channels ?? 0,
      icon: Zap,
      max: 200,
      tooltip:
        "Total number of AMQP channels across all connections in the cluster",
    },
    {
      name: t("consumersCount"),
      value: overview?.object_totals?.consumers ?? 0,
      icon: MessageSquare,
      max: 50,
      tooltip:
        "Total number of active message consumers across all queues in the cluster",
    },
  ];

  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-xs">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          {t("resourceUsage")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("resourceUsageSubtitle")}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {resources.map((resource) => {
          const Icon = resource.icon;
          const pct = Math.min((resource.value / resource.max) * 100, 100);

          return (
            <div
              key={resource.name}
              className="space-y-2 group relative"
              title={hasError ? undefined : resource.tooltip}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasError ? (
                    <ShieldAlert className="w-4 h-4 text-warning" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {resource.name}
                  </span>
                </div>
                {hasError ? (
                  <span className="text-sm font-medium text-warning">
                    {t("permissionRequired")}
                  </span>
                ) : (
                  <span className="text-sm font-semibold font-mono tabular-nums text-foreground">
                    {resource.value.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                {hasError ? (
                  <div className="h-2 bg-warning/30 w-0" />
                ) : (
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getCountTone(
                      resource.value,
                      resource.max
                    )}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
