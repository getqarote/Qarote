import { useMemo } from "react";

import { TimeRange } from "@/components/TimeRangeSelector";

import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { RabbitMQAuthorizationError } from "@/types/apiErrors";

import {
  useConnections,
  useLiveRatesMetrics,
  useMetrics,
  useNodes,
  useOverview,
  useQueues,
} from "../queries/useRabbitMQ";

interface ChartData {
  time: string;
  published: number;
  consumed: number;
}

const INITIAL_CHART_DATA: ChartData[] = [
  { time: "00:00", published: 0, consumed: 0 },
  { time: "04:00", published: 0, consumed: 0 },
  { time: "08:00", published: 0, consumed: 0 },
  { time: "12:00", published: 0, consumed: 0 },
  { time: "16:00", published: 0, consumed: 0 },
  { time: "20:00", published: 0, consumed: 0 },
];

export const useDashboardData = (
  selectedServerId: string | null,
  timeRange: TimeRange = "1d"
) => {
  const { selectedVHost } = useVHostContext();

  // API calls
  const {
    data: overviewData,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
  } = useOverview(selectedServerId);
  const { data: queuesData, isLoading: queuesLoading } = useQueues(
    selectedServerId,
    selectedVHost
  );
  const {
    data: nodesData,
    isLoading: nodesLoading,
    isFetching: nodesFetching,
  } = useNodes(selectedServerId);
  const { data: enhancedMetricsData, isLoading: metricsLoading } =
    useMetrics(selectedServerId);
  const { data: liveRatesData, isLoading: liveRatesLoading } =
    useLiveRatesMetrics(selectedServerId, timeRange);
  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    isFetching: connectionsFetching,
  } = useConnections(selectedServerId);

  // Processed data
  const overview = overviewData?.overview;
  const queues = useMemo(() => queuesData?.queues || [], [queuesData?.queues]);
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
  const metrics = useMemo(() => {
    // Calculate activeQueues and queueDepth from filtered queues data (respects vhost selection)
    const activeQueues = queues.length;
    const queueDepth = queues.reduce(
      (sum, queue) => sum + (queue.messages || 0),
      0
    );

    // Calculate messagesPerSec from live rates data (most recent data point)
    const latestRate =
      liveRatesData?.messagesRates && liveRatesData.messagesRates.length > 0
        ? liveRatesData.messagesRates[liveRatesData.messagesRates.length - 1]
        : null;
    const messagesPerSec = latestRate
      ? Math.round((latestRate.publish || 0) + (latestRate.deliver || 0))
      : 0;

    return {
      messagesPerSec,
      activeQueues,
      avgLatency: enhancedMetrics?.avgLatency || 0,
      queueDepth,
      connectedNodes: nodes.length,
      totalMemory: enhancedMetrics?.totalMemoryGB || 0,
      cpuUsage: enhancedMetrics?.avgCpuUsage || 0,
      diskUsage: enhancedMetrics?.diskUsage || 0,
    };
  }, [enhancedMetrics, nodes, queues, liveRatesData]);

  // Derive chart data from live rates API
  const chartData = useMemo<ChartData[]>(() => {
    if (
      !liveRatesData?.messagesRates ||
      liveRatesData.messagesRates.length <= 1
    ) {
      return INITIAL_CHART_DATA;
    }

    // Filter out data points where both published and consumed are 0
    const filteredData = liveRatesData.messagesRates.filter((point) => {
      return (point.publish || 0) > 0 || (point.deliver || 0) > 0;
    });

    if (filteredData.length === 0) {
      return INITIAL_CHART_DATA;
    }

    return filteredData.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString("en", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      published: Math.round((point.publish || 0) * 100) / 100,
      consumed: Math.round((point.deliver || 0) * 100) / 100,
    }));
  }, [liveRatesData]);

  // For live data, we don't need time range selection
  const availableTimeRanges = ["live"] as const;

  const isLoading =
    overviewLoading ||
    queuesLoading ||
    nodesLoading ||
    metricsLoading ||
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

    // Fetching states (query-based hooks only; subscriptions are always live)
    connectionsFetching,
    overviewFetching,
    nodesFetching,

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
