import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { getUpgradePath } from "@/lib/featureFlags";

import {
  formatRelativeTime,
  getSeverityColor,
} from "@/components/alerts/alertUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useRabbitMQAlerts } from "@/hooks/queries/useAlerts";
import { useDiagnosis } from "@/hooks/queries/useDiagnosis";
import { useUser } from "@/hooks/ui/useUser";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

import { UserPlan } from "@/types/plans";

export const RecentAlerts = () => {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { userPlan } = useUser();
  const { hasFeature } = useFeatureFlags();
  const hasDiagnosisFeature = hasFeature("incident_diagnosis");

  const { data: diagnosisData } = useDiagnosis(selectedServerId, 120, {
    enabled: hasDiagnosisFeature,
  });
  const diagnosisCount = diagnosisData?.diagnoses?.length ?? 0;

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
  // Only show "all systems normal" when both alerts AND diagnosis are clean, so
  // we never hide active anomalies behind a false-healthy state.
  if (!isLoading && !error && summary.total === 0 && diagnosisCount === 0) {
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
          <PixelChevronRight className="h-3 shrink-0" />
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
          <PixelChevronRight className="h-3 shrink-0" />
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
          <div className="space-y-1">
            {recentAlerts.map((alert) => {
              const { dot, badge: badgeClass } = getSeverityColor(
                alert.severity
              );
              const sourceName =
                alert.source?.name ||
                ("vhost" in alert && alert.vhost
                  ? alert.vhost === "/"
                    ? t("defaultVhost")
                    : alert.vhost
                  : null);
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-3 bg-muted/10 rounded-md"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {alert.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[sourceName, formatRelativeTime(alert.timestamp)]
                        .filter(Boolean)
                        .join(" — ")}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 shrink-0 ${badgeClass}`}
                  >
                    {alert.severity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {/* Diagnosis teaser — only shown when anomalies are active so that
            the link only appears when there is something actionable. Hiding it
            in the healthy-zero case keeps "color/links mean something" intact. */}
        {hasDiagnosisFeature && diagnosisCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <Link
              to="/diagnosis"
              className="flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                {t("diagnosisTeaser")}
              </span>
              <PixelChevronRight className="h-3 shrink-0" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
