import { MessageSquare, Clock, Activity, Zap, ShieldAlert } from "lucide-react";
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
}

export const PrimaryMetricsCards = ({
  metrics,
  isLoading,
  metricsError,
}: PrimaryMetricsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card-unified backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
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
              <div className="text-3xl font-bold text-gray-900">
                {metrics.messagesPerSec}
              </div>
              <p className="text-xs text-green-600 mt-1">Real-time data</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card-unified backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
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
              <div className="text-3xl font-bold text-gray-900">
                {metrics.activeQueues}
              </div>
              <p className="text-xs text-gray-500 mt-1">Across all vhosts</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card-unified backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
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
              <div className="text-3xl font-bold text-gray-900">
                {metrics.queueDepth}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Total pending messages
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card-unified backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
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
              <div className="text-3xl font-bold text-gray-900">
                {metrics.avgLatency.toFixed(1)}ms
              </div>
              <p className="text-xs text-gray-500 mt-1">Estimated latency</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
