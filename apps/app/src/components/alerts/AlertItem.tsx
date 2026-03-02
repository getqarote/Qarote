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
  const severity = alert.severity as RabbitMQAlertSeverity;
  const category = alert.category as RabbitMQAlertCategory;

  return (
    <div
      className={`flex items-start gap-4 p-4 border rounded-lg ${
        isResolved ? "bg-muted/50" : ""
      }`}
    >
      <div className="shrink-0 mt-1">
        {isResolved ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          getSeverityIcon(severity)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{alert.title}</h4>
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
                      vhost: {alert.vhost === "/" ? "Default" : alert.vhost}
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
                      cluster
                    </Badge>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {alert.description}
            </p>
            {alert.details && (
              <div className="text-xs text-muted-foreground space-y-1">
                {alert.details.current !== undefined && (
                  <div>Current: {String(alert.details.current)}</div>
                )}
                {alert.details.threshold !== undefined && (
                  <div>Threshold: {String(alert.details.threshold)}</div>
                )}
                {alert.details.recommended && (
                  <div>Recommended: {String(alert.details.recommended)}</div>
                )}
                {alert.details.affected &&
                  Array.isArray(alert.details.affected) &&
                  alert.details.affected.length > 0 && (
                    <div>Affected: {alert.details.affected.join(", ")}</div>
                  )}
              </div>
            )}
            {isResolved && "firstSeenAt" in alert && alert.firstSeenAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                {alert.duration && (
                  <div>
                    Duration:{" "}
                    {(() => {
                      const durationMinutes = alert.duration
                        ? Math.round(alert.duration / 1000 / 60)
                        : null;
                      const durationHours = durationMinutes
                        ? Math.round(durationMinutes / 60)
                        : null;
                      return durationHours
                        ? `${durationHours} hour${durationHours > 1 ? "s" : ""}`
                        : durationMinutes
                          ? `${durationMinutes} minute${durationMinutes > 1 ? "s" : ""}`
                          : "Unknown";
                    })()}
                  </div>
                )}
                <div>First seen: {formatTimestamp(alert.firstSeenAt)}</div>
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted-foreground">
              {isResolved && "resolvedAt" in alert && alert.resolvedAt
                ? `Resolved: ${formatTimestamp(alert.resolvedAt)}`
                : "timestamp" in alert && alert.timestamp
                  ? formatTimestamp(alert.timestamp)
                  : ""}
            </div>
            {alert.source && (
              <div className="text-xs text-muted-foreground mt-1">
                {alert.source.type}: {alert.source.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
