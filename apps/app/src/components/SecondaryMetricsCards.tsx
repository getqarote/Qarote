import { useEffect, useState } from "react";

import { Cpu, HardDrive, Server, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface SecondaryMetricsData {
  connectedNodes: number;
  cpuUsage: number;
  totalMemory: number;
}

interface SecondaryMetricsCardsProps {
  metrics: SecondaryMetricsData;
  isLoading: boolean;
  metricsError?: Error | null;
  nodesError?: Error | null;
  nodesFetching?: boolean;
  enhancedMetricsFetching?: boolean;
}

export const SecondaryMetricsCards = ({
  metrics,
  isLoading,
  metricsError,
  nodesError,
  nodesFetching = false,
  enhancedMetricsFetching = false,
}: SecondaryMetricsCardsProps) => {
  const [showNodesUpdating, setShowNodesUpdating] = useState(false);
  const [showEnhancedUpdating, setShowEnhancedUpdating] = useState(false);

  // Handle delayed updating indicators
  useEffect(() => {
    if (nodesFetching) {
      setShowNodesUpdating(true);
    } else {
      const timer = setTimeout(() => {
        setShowNodesUpdating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nodesFetching]);

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Connected Nodes
          </CardTitle>
          {nodesError && isRabbitMQAuthError(nodesError) ? (
            <ShieldAlert className="h-5 w-5 text-primary" />
          ) : (
            <Server className="h-5 w-5 text-cyan-600" />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-8" />
          ) : nodesError && isRabbitMQAuthError(nodesError) ? (
            <div>
              <div className="text-lg font-semibold text-primary mb-1">
                Permission Required
              </div>
              <p className="text-xs text-primary">Need 'monitor' permission</p>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-foreground">
                {metrics.connectedNodes}
              </div>
              <p className="text-xs text-green-600 mt-1">
                Updates every 30s{showNodesUpdating && " (updating...)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            CPU Usage
          </CardTitle>
          {metricsError && isRabbitMQAuthError(metricsError) ? (
            <ShieldAlert className="h-5 w-5 text-primary" />
          ) : (
            <Cpu className="h-5 w-5 text-yellow-600" />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : metricsError && isRabbitMQAuthError(metricsError) ? (
            <div>
              <div className="text-lg font-semibold text-primary mb-1">
                Permission Required
              </div>
              <p className="text-xs text-primary">Need 'monitor' permission</p>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-foreground">
                {metrics.cpuUsage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Updates every 15s{showEnhancedUpdating && " (updating...)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Memory Usage
          </CardTitle>
          {metricsError && isRabbitMQAuthError(metricsError) ? (
            <ShieldAlert className="h-5 w-5 text-primary" />
          ) : (
            <HardDrive className="h-5 w-5 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : metricsError && isRabbitMQAuthError(metricsError) ? (
            <div>
              <div className="text-lg font-semibold text-primary mb-1">
                Permission Required
              </div>
              <p className="text-xs text-primary">Need 'monitor' permission</p>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-foreground">
                {metrics.totalMemory.toFixed(1)} GB
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Updates every 15s{showEnhancedUpdating && " (updating...)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
