import { MessageSquare, Clock, Activity, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsData {
  messagesPerSec: number;
  activeQueues: number;
  avgLatency: number;
  queueDepth: number;
}

interface PrimaryMetricsCardsProps {
  metrics: MetricsData;
  isLoading: boolean;
}

export const PrimaryMetricsCards = ({
  metrics,
  isLoading,
}: PrimaryMetricsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Messages/sec
          </CardTitle>
          <MessageSquare className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {metrics.messagesPerSec.toLocaleString()}
            </div>
          )}
          <p className="text-xs text-green-600 mt-1">Real-time data</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Active Queues
          </CardTitle>
          <Activity className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {metrics.activeQueues}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Across all vhosts</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Queue Depth
          </CardTitle>
          <Zap className="h-5 w-5 text-orange-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {metrics.queueDepth.toLocaleString()}
            </div>
          )}
          <p className="text-xs text-orange-600 mt-1">Total pending messages</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Avg Latency
          </CardTitle>
          <Clock className="h-5 w-5 text-purple-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {metrics.avgLatency.toFixed(1)}ms
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Estimated latency</p>
        </CardContent>
      </Card>
    </div>
  );
};
