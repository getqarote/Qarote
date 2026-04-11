import { useTranslation } from "react-i18next";

import { CheckCircle } from "lucide-react";

import {
  RabbitMQAlert,
  RabbitMQAlertCategory,
  RabbitMQAlertSeverity,
} from "@/lib/api/alertTypes";

import { Badge } from "@/components/ui/badge";

import {
  formatTimestamp,
  getCategoryIcon,
  getSeverityBadgeVariant,
  getSeverityIcon,
} from "./alertUtils";

interface AlertItemProps {
  alert: RabbitMQAlert | ResolvedAlertItem;
  isResolved?: boolean;
}

interface ResolvedAlertItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  details?: {
    current?: number | string;
    threshold?: number;
    recommended?: string;
    affected?: string[];
  };
  timestamp?: string;
  firstSeenAt?: string;
  resolvedAt?: string;
  duration?: number;
  vhost?: string; // Virtual host for queue-related alerts
  source?: {
    type: string;
    name: string;
  };
}

export const AlertItem = ({ alert, isResolved = false }: AlertItemProps) => {
  const { t } = useTranslation("alerts");
  const severity = alert.severity as RabbitMQAlertSeverity;
  const category = alert.category as RabbitMQAlertCategory;
  const hasDetails = !!alert.details;

  return (
    <div
      className={`flex items-start gap-4 px-4 py-3 ${
        isResolved ? "bg-muted/20" : ""
      }`}
    >
      <div className="shrink-0 mt-1">
        {isResolved ? (
          <CheckCircle className="h-5 w-5 text-success" />
        ) : (
          getSeverityIcon(severity)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium leading-snug">{alert.title}</h4>
              <Badge variant={getSeverityBadgeVariant(severity)}>
                {alert.severity}
              </Badge>
              {category && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {getCategoryIcon(category)}
                  {category}
                </Badge>
              )}
              {/* Scope tag: vhost for queue alerts, cluster for node alerts */}
              {(() => {
                if ("vhost" in alert && alert.vhost) {
                  return (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {t("item.scope.vhost", {
                        vhost:
                          alert.vhost === "/"
                            ? t("item.scope.defaultVhost")
                            : alert.vhost,
                      })}
                    </Badge>
                  );
                } else if (
                  alert.source?.type === "node" ||
                  alert.source?.type === "cluster"
                ) {
                  return (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {t("item.scope.cluster")}
                    </Badge>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {alert.description}
            </p>
            {hasDetails && (
              <div className="mt-3 rounded-md border bg-background/40 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {alert.details?.current !== undefined && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {t("item.detail.current")}
                      </span>
                      <span className="font-mono tabular-nums text-foreground">
                        {String(alert.details.current)}
                      </span>
                    </div>
                  )}
                  {alert.details?.threshold !== undefined && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {t("item.detail.threshold")}
                      </span>
                      <span className="font-mono tabular-nums text-foreground">
                        {String(alert.details.threshold)}
                      </span>
                    </div>
                  )}
                  {alert.details?.affected &&
                    Array.isArray(alert.details.affected) &&
                    alert.details.affected.length > 0 && (
                      <div className="sm:col-span-2 flex items-start justify-between gap-2">
                        <span className="text-muted-foreground">
                          {t("item.detail.affected")}
                        </span>
                        <span className="text-foreground text-right">
                          {alert.details.affected.join(", ")}
                        </span>
                      </div>
                    )}
                </div>
                {alert.details?.recommended && (
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">
                      {t("item.detail.recommended")}
                    </span>
                    <p className="text-foreground mt-1">
                      {String(alert.details.recommended)}
                    </p>
                  </div>
                )}
              </div>
            )}
            {isResolved && "firstSeenAt" in alert && alert.firstSeenAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                {alert.duration && (
                  <div>
                    {t("item.meta.duration")}:{" "}
                    {(() => {
                      const durationMinutes = alert.duration
                        ? Math.round(alert.duration / 1000 / 60)
                        : null;
                      const durationHours = durationMinutes
                        ? Math.round(durationMinutes / 60)
                        : null;
                      return durationHours
                        ? t("item.meta.durationHours", { count: durationHours })
                        : durationMinutes
                          ? t("item.meta.durationMinutes", {
                              count: durationMinutes,
                            })
                          : t("item.meta.unknown");
                    })()}
                  </div>
                )}
                <div>
                  {t("item.meta.firstSeen")}:{" "}
                  {formatTimestamp(alert.firstSeenAt)}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted-foreground">
              {isResolved && "resolvedAt" in alert && alert.resolvedAt
                ? `${t("item.meta.resolved")}: ${formatTimestamp(alert.resolvedAt)}`
                : "timestamp" in alert && alert.timestamp
                  ? formatTimestamp(alert.timestamp)
                  : ""}
            </div>
            {alert.source && (
              <div className="text-xs text-muted-foreground mt-1">
                {t("item.meta.source", {
                  type: alert.source.type,
                  name: alert.source.name,
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
