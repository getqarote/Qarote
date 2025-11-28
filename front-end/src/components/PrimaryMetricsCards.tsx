import { useEffect, useState } from "react";

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
  enhancedMetricsFetching?: boolean;
}

export const PrimaryMetricsCards = ({
  metrics,
  isLoading,
  metricsError,
  overviewFetching = false,
  enhancedMetricsFetching = false,
}: PrimaryMetricsCardsProps) => {
  const [showOverviewUpdating, setShowOverviewUpdating] = useState(false);
  const [showEnhancedUpdating, setShowEnhancedUpdating] = useState(false);

  // Handle delayed updating indicators
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

  useEffect(() => {
    if (enhancedMetricsFetching) {
      setShowEnhancedUpdating(true);
    } else {
      const timer = setTimeout(() => {
        setShowEnhancedUpdating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [enhancedMetricsFetching]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Messages/sec
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
                Permission Required
              </div>
              <p className="text-xs text-orange-600">
                Need 'monitor' permission
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-foreground">
                {metrics.messagesPerSec}
              </div>
              <p className="text-xs text-green-600 mt-1">
                Updates every 10s{showOverviewUpdating && " (updating...)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Queues
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
                Permission Required
              </div>
              <p className="text-xs text-orange-600">
                Need 'monitor' permission
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-foreground">
                {metrics.activeQueues}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Updates every 10s{showOverviewUpdating && " (updating...)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Queues Depth
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
                Permission Required
              </div>
              <p className="text-xs text-orange-600">
                Need 'monitor' permission
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-foreground">
                {metrics.queueDepth}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Updates every 10s{showOverviewUpdating && " (updating...)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Latency
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
                Permission Required
              </div>
              <p className="text-xs text-orange-600">
                Need 'monitor' permission
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-foreground">
                {metrics.avgLatency.toFixed(1)}ms
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Updates every 15s{showEnhancedUpdating && " (updating...)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
