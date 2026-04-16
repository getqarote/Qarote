import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckCircle } from "lucide-react";

import { RabbitMQAlert, RabbitMQAlertSeverity } from "@/lib/api/alertTypes";

import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";

import {
  formatRelativeTime,
  formatTimestamp,
  getSeverityColor,
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
  vhost?: string;
  source?: {
    type: string;
    name: string;
  };
}

export const AlertItem = ({ alert, isResolved = false }: AlertItemProps) => {
  const { t } = useTranslation("alerts");
  const severity = alert.severity as RabbitMQAlertSeverity;
  const hasDetails = !!alert.details;
  const [expanded, setExpanded] = useState(false);

  const { dot, badge: badgeClass } = getSeverityColor(severity);

  // Build subtitle: source + time
  const sourcePart = alert.source
    ? `${alert.source.name}`
    : "vhost" in alert && alert.vhost
      ? alert.vhost === "/"
        ? t("item.scope.defaultVhost")
        : alert.vhost
      : null;

  const timePart =
    isResolved && "resolvedAt" in alert && alert.resolvedAt
      ? formatRelativeTime(alert.resolvedAt)
      : "timestamp" in alert && alert.timestamp
        ? formatRelativeTime(alert.timestamp)
        : null;

  const subtitle = [sourcePart, timePart].filter(Boolean).join(" — ");

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        isResolved ? "bg-muted/20" : ""
      } ${hasDetails ? "cursor-pointer" : ""}`}
      onClick={hasDetails ? () => setExpanded(!expanded) : undefined}
    >
      {/* Severity dot or resolved check */}
      <div className="shrink-0">
        {isResolved ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <div className={`w-2 h-2 rounded-full ${dot}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {alert.title}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        )}

        {/* Expandable details */}
        {expanded && hasDetails && (
          <div className="mt-2 rounded-md border bg-muted/20 p-3">
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
            {isResolved && "firstSeenAt" in alert && alert.firstSeenAt && (
              <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground space-y-0.5">
                {alert.duration && (
                  <div>
                    {t("item.meta.duration")}:{" "}
                    {(() => {
                      const durationMinutes = Math.round(
                        alert.duration / 1000 / 60
                      );
                      const durationHours = Math.round(durationMinutes / 60);
                      return durationHours
                        ? t("item.meta.durationHours", {
                            count: durationHours,
                          })
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
                {"resolvedAt" in alert && alert.resolvedAt && (
                  <div>
                    {t("item.meta.resolved")}:{" "}
                    {formatTimestamp(alert.resolvedAt)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: badge + expand chevron */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 ${badgeClass}`}>
          {alert.severity}
        </span>
        {hasDetails && (
          <PixelChevronRight
            className={`h-2.5 shrink-0 text-muted-foreground transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        )}
      </div>
    </div>
  );
};
