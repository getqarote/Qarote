import { useState, useEffect, useMemo } from "react";
import { TimeRange } from "@/components/MetricsChart";
import {
  useOverview,
  useQueues,
  useNodes,
  useEnhancedMetrics,
  useTimeSeriesMetrics,
} from "@/hooks/useApi";

interface ChartData {
  time: string;
  messages: number;
}

export const useDashboardData = (selectedServerId: string | null) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("1m");
  const [chartData, setChartData] = useState<ChartData[]>([
    { time: "00:00", messages: 0 },
    { time: "04:00", messages: 0 },
    { time: "08:00", messages: 0 },
    { time: "12:00", messages: 0 },
    { time: "16:00", messages: 0 },
    { time: "20:00", messages: 0 },
  ]);

  // API calls
  const { data: overviewData, isLoading: overviewLoading } =
    useOverview(selectedServerId);
  const { data: queuesData, isLoading: queuesLoading } =
    useQueues(selectedServerId);
  const { data: nodesData, isLoading: nodesLoading } =
    useNodes(selectedServerId);
  const { data: enhancedMetricsData } = useEnhancedMetrics(selectedServerId);
  const { data: timeSeriesData, isLoading: timeSeriesLoading } =
    useTimeSeriesMetrics(selectedServerId || "", selectedTimeRange);

  // Processed data
  const overview = overviewData?.overview;
  const queues = queuesData?.queues || [];
  const nodes = useMemo(() => nodesData?.nodes || [], [nodesData?.nodes]);
  const enhancedMetrics = enhancedMetricsData?.metrics;

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

  // Update chart data from time series API
  useEffect(() => {
    if (timeSeriesData?.timeseries) {
      setChartData(
        timeSeriesData.timeseries.map((point) => ({
          time: point.time,
          messages: point.messages,
        }))
      );
    }
  }, [timeSeriesData]);

  const handleTimeRangeChange = (timeRange: TimeRange) => {
    setSelectedTimeRange(timeRange);
  };

  const isLoading =
    overviewLoading || queuesLoading || nodesLoading || timeSeriesLoading;

  return {
    // Data
    overview,
    queues,
    nodes,
    metrics,
    chartData,

    // Loading states
    isLoading,
    overviewLoading,
    queuesLoading,
    nodesLoading,
    timeSeriesLoading,

    // Chart controls
    selectedTimeRange,
    handleTimeRangeChange,
  };
};
