import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

import { getUpgradePath } from "@/lib/featureFlags";

import {
  formatRelativeTime,
  getCategoryIcon,
  getSeverityBadgeVariant,
  getSeverityIcon,
} from "@/components/alerts/alertUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useRabbitMQAlerts } from "@/hooks/queries/useAlerts";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

export const RecentAlerts = () => {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { userPlan } = useUser();

  // Query for recent alerts with limit of 3 (filtered by vhost)
  const {
    data: alertsData,
    isLoading,
    error,
  } = useRabbitMQAlerts(selectedServerId, selectedVHost, {
    limit: 3, // Only fetch 3 most recent alerts
    resolved: false, // Only get active alerts
  });

  const alerts = alertsData?.alerts || [];
  const summary = alertsData?.summary || {
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
  };
  // Already limited to 3 by the API call, but sort by timestamp to ensure newest first
  const recentAlerts = alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Compact healthy state — when there are no active alerts, collapse the
  // entire component to a single thin bar. The dashboard shouldn't spend
  // ~300px of vertical real estate telling the user "nothing is wrong".
  // This is the "quiet baseline" from the design context: big when it
  // matters, small when it doesn't.
  if (!isLoading && !error && summary.total === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <span className="font-medium text-foreground">
            {t("allSystemsNormal")}
          </span>
          <span className="text-muted-foreground truncate">
            — {t("noRecentAlerts")}
          </span>
        </div>
        <Link
          to="/alerts"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          {t("viewAll")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("recentAlerts")}
            <Badge variant="outline">{t("error")}</Badge>
          </h2>
        </div>
        <div className="p-4">
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-sm text-muted-foreground">
              {t("failedToLoadAlerts")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div>
          <h2 className="title-section flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {t("recentAlerts")}
            {isLoading ? (
              <Badge variant="outline">{t("loadingAlerts")}</Badge>
            ) : (
              <Badge variant={summary.total > 0 ? "destructive" : "secondary"}>
                {summary.total}
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("latestNotifications")}
          </p>
        </div>
        <Link
          to="/alerts"
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          {t("viewAll")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 border rounded-lg animate-pulse"
              >
                <div className="h-4 w-4 bg-muted-foreground/20 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted-foreground/20 rounded mb-1"></div>
                  <div className="h-3 bg-border rounded w-3/4"></div>
                </div>
                <div className="h-3 bg-border rounded w-12"></div>
              </div>
            ))}
          </div>
        ) : userPlan === UserPlan.FREE ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("upgradeRequired")}
            </p>
            <Button
              onClick={() => navigate(getUpgradePath())}
              className="btn-primary"
            >
              {t("upgradeNow")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Recent Alerts List - Limited to 3 */}
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <div className="shrink-0 mt-0.5">
                  {getSeverityIcon(alert.severity, {
                    showColors: true,
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">
                      {alert.title}
                    </p>
                    <Badge
                      variant={getSeverityBadgeVariant(alert.severity)}
                      className="text-xs"
                    >
                      {alert.severity}
                    </Badge>
                    {alert.category && (
                      <Badge
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                      >
                        {getCategoryIcon(alert.category, "h-3 w-3")}
                        {alert.category}
                      </Badge>
                    )}
                    {/* Scope tag: vhost for queue alerts, cluster for node alerts */}
                    {(() => {
                      if ("vhost" in alert && alert.vhost) {
                        return (
                          <Badge
                            variant="secondary"
                            className="text-xs flex items-center gap-1"
                          >
                            {t("vhostLabel")}{" "}
                            {alert.vhost === "/"
                              ? t("defaultVhost")
                              : alert.vhost}
                          </Badge>
                        );
                      } else if (
                        alert.source?.type === "node" ||
                        alert.source?.type === "cluster"
                      ) {
                        return (
                          <Badge
                            variant="secondary"
                            className="text-xs flex items-center gap-1"
                          >
                            {t("cluster")}
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.description}
                  </p>
                  {alert.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("currentValue", { value: alert.details.current })}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(alert.timestamp)}
                  </div>
                  {alert.source && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {alert.source.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
