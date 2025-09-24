import { useMemo, useState, useEffect } from "react";
import {
  useOverview,
  useQueues,
  useNodes,
  useMetrics,
  useLiveRatesMetrics,
  useConnections,
} from "./useApi";
import { RabbitMQAuthorizationError } from "@/types/apiErrors";
import { TimeRange } from "@/components/TimeRangeSelector";

interface ChartData {
  time: string;
  published: number;
  consumed: number;
}

export const useDashboardData = (
  selectedServerId: string | null,
  timeRange: TimeRange = "1d"
) => {
  const [chartData, setChartData] = useState<ChartData[]>([
    { time: "00:00", published: 0, consumed: 0 },
    { time: "04:00", published: 0, consumed: 0 },
    { time: "08:00", published: 0, consumed: 0 },
    { time: "12:00", published: 0, consumed: 0 },
    { time: "16:00", published: 0, consumed: 0 },
    { time: "20:00", published: 0, consumed: 0 },
  ]);

  // API calls
  const {
    data: overviewData,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
  } = useOverview(selectedServerId);
  const {
    data: queuesData,
    isLoading: queuesLoading,
    isFetching: queuesFetching,
  } = useQueues(selectedServerId);
  const {
    data: nodesData,
    isLoading: nodesLoading,
    isFetching: nodesFetching,
  } = useNodes(selectedServerId);
  const { data: enhancedMetricsData, isFetching: enhancedMetricsFetching } =
    useMetrics(selectedServerId);
  const {
    data: liveRatesData,
    isLoading: liveRatesLoading,
    isFetching: liveRatesFetching,
  } = useLiveRatesMetrics(selectedServerId, timeRange);
  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    isFetching: connectionsFetching,
  } = useConnections(selectedServerId);

  // Processed data
  const overview = overviewData?.overview;
  const queues = queuesData?.queues || [];
  const nodes = useMemo(() => nodesData?.nodes || [], [nodesData?.nodes]);
  const enhancedMetrics = enhancedMetricsData?.metrics;
  const connections = connectionsData?.connections || [];

  // Check for permission status instead of errors
  const metricsPermissionStatus = enhancedMetricsData?.permissionStatus;
  const liveRatesPermissionStatus = liveRatesData?.permissionStatus;
  const nodesPermissionStatus = nodesData?.permissionStatus;
  // Note: connections endpoint doesn't return permissionStatus, so we'll handle errors differently

  // Create error objects for backward compatibility with UI components
  const metricsError =
    metricsPermissionStatus && !metricsPermissionStatus.hasPermission
      ? new RabbitMQAuthorizationError({
          error: "insufficient_permissions",
          message: metricsPermissionStatus.message,
          code: "RABBITMQ_INSUFFICIENT_PERMISSIONS",
          requiredPermission: metricsPermissionStatus.requiredPermission,
        })
      : null;

  const liveRatesError =
    liveRatesPermissionStatus && !liveRatesPermissionStatus.hasPermission
      ? new RabbitMQAuthorizationError({
          error: "insufficient_permissions",
          message: liveRatesPermissionStatus.message,
          code: "RABBITMQ_INSUFFICIENT_PERMISSIONS",
          requiredPermission: liveRatesPermissionStatus.requiredPermission,
        })
      : null;

  const nodesError =
    nodesPermissionStatus && !nodesPermissionStatus.hasPermission
      ? new RabbitMQAuthorizationError({
          error: "insufficient_permissions",
          message: nodesPermissionStatus.message,
          code: "RABBITMQ_INSUFFICIENT_PERMISSIONS",
          requiredPermission: nodesPermissionStatus.requiredPermission,
        })
      : null;

  // For connections, we'll use the error from the API call directly
  const connectionsError = null; // connectionsData doesn't have permissionStatus, so we handle errors at the component level

  // Calculate metrics
  const metrics = useMemo(
    () => ({
      messagesPerSec: Math.round(
        (overview?.message_stats?.publish_details?.rate || 0) +
          (overview?.message_stats?.deliver_details?.rate || 0)
      ),
      activeQueues: overview?.object_totals?.queues || 0,
      avgLatency: enhancedMetrics?.avgLatency || 0,
      queueDepth: overview?.queue_totals?.messages || 0,
      connectedNodes: nodes.length,
      totalMemory: enhancedMetrics?.totalMemoryGB || 0,
      cpuUsage: enhancedMetrics?.avgCpuUsage || 0,
      diskUsage: enhancedMetrics?.diskUsage || 0,
    }),
    [overview, enhancedMetrics, nodes]
  );

  // Update chart data from live rates API
  useEffect(() => {
    if (
      liveRatesData?.messagesRates &&
      liveRatesData.messagesRates.length > 1
    ) {
      // Filter out data points where both published and consumed are 0
      const filteredData = liveRatesData.messagesRates.filter((point) => {
        return (point.publish || 0) > 0 || (point.deliver || 0) > 0;
      });

      // Only update chart data if we have actual activity
      if (filteredData.length > 0) {
        const formattedData = filteredData.map((point) => ({
          time: new Date(point.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          published: Math.round((point.publish || 0) * 100) / 100,
          consumed: Math.round((point.deliver || 0) * 100) / 100,
        }));

        setChartData(formattedData);
      } else {
        // If no activity, show empty chart data
        setChartData([]);
      }
    }
  }, [liveRatesData]);

  // For live data, we don't need time range selection
  const availableTimeRanges = ["live"] as const;

  const isLoading =
    overviewLoading ||
    queuesLoading ||
    nodesLoading ||
    liveRatesLoading ||
    connectionsLoading;

  return {
    // Data
    overview,
    queues,
    nodes,
    metrics,
    chartData,
    liveRates: liveRatesData?.liveRates,
    liveRatesData,
    queueTotals: liveRatesData?.queueTotals,
    connections,

    // Loading states
    isLoading,
    overviewLoading,
    queuesLoading,
    nodesLoading,
    liveRatesLoading,
    connectionsLoading,

    // Fetching states
    liveRatesFetching,
    connectionsFetching,
    queuesFetching,
    overviewFetching,
    nodesFetching,
    enhancedMetricsFetching,

    // Error states
    metricsError,
    liveRatesError,
    nodesError,
    connectionsError,

    // Chart controls - simplified for live data
    selectedTimeRange: "live" as const,
    handleTimeRangeChange: () => {}, // No-op for live data
    availableTimeRanges,
  };
};
