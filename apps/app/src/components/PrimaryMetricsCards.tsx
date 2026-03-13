import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Activity, Clock, MessageSquare, ShieldAlert, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface MetricsData {
  messagesPerSec: number;
  activeQueues: number;
  avgLatency: number;
  queueDepth: number;
}

interface PrimaryMetricsCardsProps {
  metrics: MetricsData;
  isLoading: boolean;
  metricsError?: Error | null;
  overviewFetching?: boolean;
}

export const PrimaryMetricsCards = ({
  metrics,
  isLoading,
  metricsError,
  overviewFetching = false,
}: PrimaryMetricsCardsProps) => {
  const { t } = useTranslation("dashboard");
  const [showOverviewUpdating, setShowOverviewUpdating] = useState(false);

  // Handle delayed updating indicator
  useEffect(() => {
    if (overviewFetching) {
      setShowOverviewUpdating(true);
    } else {
      const timer = setTimeout(() => {
        setShowOverviewUpdating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [overviewFetching]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("messagesPerSec")}
          </CardTitle>
          {metricsError && isRabbitMQAuthError(metricsError) ? (
            <ShieldAlert className="h-5 w-5 text-orange-600" />
          ) : (
            <MessageSquare className="h-5 w-5 text-blue-600" />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : metricsError && isRabbitMQAuthError(metricsError) ? (
            <div>
              <div className="text-lg font-semibold text-orange-600 mb-1">
                {t("permissionRequired")}
              </div>
              <p className="text-xs text-orange-600">
                {t("needMonitorPermission")}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-foreground">
                {metrics.messagesPerSec}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {t("updatesEvery10s")}
                {showOverviewUpdating && ` (${t("updating")})`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("activeQueues")}
          </CardTitle>
          {metricsError && isRabbitMQAuthError(metricsError) ? (
            <ShieldAlert className="h-5 w-5 text-orange-600" />
          ) : (
            <Activity className="h-5 w-5 text-green-600" />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : metricsError && isRabbitMQAuthError(metricsError) ? (
            <div>
              <div className="text-lg font-semibold text-orange-600 mb-1">
                {t("permissionRequired")}
              </div>
              <p className="text-xs text-orange-600">
                {t("needMonitorPermission")}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-foreground">
                {metrics.activeQueues}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t("updatesEvery10s")}
                {showOverviewUpdating && ` (${t("updating")})`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("queuesDepth")}
          </CardTitle>
          {metricsError && isRabbitMQAuthError(metricsError) ? (
            <ShieldAlert className="h-5 w-5 text-orange-600" />
          ) : (
            <Zap className="h-5 w-5 text-orange-600" />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : metricsError && isRabbitMQAuthError(metricsError) ? (
            <div>
              <div className="text-lg font-semibold text-orange-600 mb-1">
                {t("permissionRequired")}
              </div>
              <p className="text-xs text-orange-600">
                {t("needMonitorPermission")}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-foreground">
                {metrics.queueDepth}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {t("updatesEvery10s")}
                {showOverviewUpdating && ` (${t("updating")})`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("avgLatency")}
          </CardTitle>
          {metricsError && isRabbitMQAuthError(metricsError) ? (
            <ShieldAlert className="h-5 w-5 text-orange-600" />
          ) : (
            <Clock className="h-5 w-5 text-purple-600" />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : metricsError && isRabbitMQAuthError(metricsError) ? (
            <div>
              <div className="text-lg font-semibold text-orange-600 mb-1">
                {t("permissionRequired")}
              </div>
              <p className="text-xs text-orange-600">
                {t("needMonitorPermission")}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-foreground">
                {metrics.avgLatency.toFixed(1)}ms
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t("updatesEvery15s")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
