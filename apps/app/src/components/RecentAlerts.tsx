import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { AlertTriangle, ArrowRight } from "lucide-react";

import { getUpgradePath } from "@/lib/featureFlags";

import {
  formatRelativeTime,
  getCategoryIcon,
  getSeverityBadgeVariant,
  getSeverityIcon,
} from "@/components/alerts/alertUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  if (error) {
    return (
      <Card className="border-0 shadow-md bg-card backdrop-blur-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t("recentAlerts")}
              <Badge variant="outline">Error</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t("failedToLoadAlerts")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              {t("recentAlerts")}
              {isLoading ? (
                <Badge variant="outline">{t("loadingAlerts")}</Badge>
              ) : (
                <Badge
                  variant={summary.total > 0 ? "destructive" : "secondary"}
                >
                  {summary.total}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("latestNotifications")}
            </p>
          </div>
          <Link
            to="/alerts"
            className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 transition-colors font-medium"
          >
            {t("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 border rounded-lg animate-pulse"
              >
                <div className="h-4 w-4 bg-gray-300 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        ) : summary.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <AlertTriangle className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">
              {t("noRecentAlerts")}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t("allSystemsNormal")}
            </p>
          </div>
        ) : userPlan === UserPlan.FREE ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
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
                            vhost:{" "}
                            {alert.vhost === "/" ? "Default" : alert.vhost}
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
                            cluster
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
                      Current: {alert.details.current}
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
      </CardContent>
    </Card>
  );
};
