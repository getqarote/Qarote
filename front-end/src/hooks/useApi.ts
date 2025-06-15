import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// Query keys
export const queryKeys = {
  servers: ["servers"] as const,
  server: (id: string) => ["servers", id] as const,
  overview: (serverId: string) => ["overview", serverId] as const,
  queues: (serverId: string) => ["queues", serverId] as const,
  queue: (serverId: string, queueName: string) =>
    ["queue", serverId, queueName] as const,
  nodes: (serverId: string) => ["nodes", serverId] as const,
  alerts: ["alerts"] as const,
  recentAlerts: ["alerts", "recent"] as const,
};

// Server hooks
export const useServers = () => {
  return useQuery({
    queryKey: queryKeys.servers,
    queryFn: () => apiClient.getServers(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useServer = (id: string) => {
  return useQuery({
    queryKey: queryKeys.server(id),
    queryFn: () => apiClient.getServer(id),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
};

export const useCreateServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (server: Parameters<typeof apiClient.createServer>[0]) =>
      apiClient.createServer(server),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
  });
};

export const useTestConnection = () => {
  return useMutation({
    mutationFn: (credentials: Parameters<typeof apiClient.testConnection>[0]) =>
      apiClient.testConnection(credentials),
  });
};

// RabbitMQ data hooks
export const useOverview = (serverId: string) => {
  return useQuery({
    queryKey: queryKeys.overview(serverId),
    queryFn: () => apiClient.getOverview(serverId),
    enabled: !!serverId,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useQueues = (serverId: string) => {
  return useQuery({
    queryKey: queryKeys.queues(serverId),
    queryFn: () => apiClient.getQueues(serverId),
    enabled: !!serverId,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useNodes = (serverId: string) => {
  return useQuery({
    queryKey: queryKeys.nodes(serverId),
    queryFn: () => apiClient.getNodes(serverId),
    enabled: !!serverId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useQueue = (serverId: string, queueName: string) => {
  return useQuery({
    queryKey: queryKeys.queue(serverId, queueName),
    queryFn: () => apiClient.getQueue(serverId, queueName),
    enabled: !!serverId && !!queueName,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useEnhancedMetrics = (serverId: string) => {
  return useQuery({
    queryKey: [...queryKeys.overview(serverId), "enhanced"],
    queryFn: () => apiClient.getEnhancedMetrics(serverId),
    enabled: !!serverId,
    staleTime: 5000, // 5 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useBrowseMessages = (
  serverId: string,
  queueName: string,
  count: number = 10
) => {
  return useQuery({
    queryKey: ["browseMessages", serverId, queueName, count],
    queryFn: () => apiClient.browseQueueMessages(serverId, queueName, count),
    enabled: !!serverId && !!queueName,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });
};

// Connections and Channels hooks
export const useConnections = (serverId: string) => {
  return useQuery({
    queryKey: ["connections", serverId],
    queryFn: () => apiClient.getConnections(serverId),
    enabled: !!serverId,
    staleTime: 5000, // 5 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useChannels = (serverId: string) => {
  return useQuery({
    queryKey: ["channels", serverId],
    queryFn: () => apiClient.getChannels(serverId),
    enabled: !!serverId,
    staleTime: 5000, // 5 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useExchanges = (serverId: string) => {
  return useQuery({
    queryKey: ["exchanges", serverId],
    queryFn: () => apiClient.getExchanges(serverId),
    enabled: !!serverId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useBindings = (serverId: string) => {
  return useQuery({
    queryKey: ["bindings", serverId],
    queryFn: () => apiClient.getBindings(serverId),
    enabled: !!serverId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useQueueConsumers = (serverId: string, queueName: string) => {
  return useQuery({
    queryKey: ["queueConsumers", serverId, queueName],
    queryFn: () => apiClient.getQueueConsumers(serverId, queueName),
    enabled: !!serverId && !!queueName,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

// Alerts hooks
export const useAlerts = () => {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: () => apiClient.getAlerts(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useRecentAlerts = () => {
  return useQuery({
    queryKey: queryKeys.recentAlerts,
    queryFn: () => apiClient.getRecentAlerts(),
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useTimeSeriesMetrics = (serverId: string, timeRange: string) => {
  return useQuery({
    queryKey: [...queryKeys.overview(serverId), "timeseries", timeRange],
    queryFn: () => apiClient.getTimeSeriesMetrics(serverId, timeRange),
    enabled: !!serverId,
    staleTime: 1000, // 1 second
    refetchInterval:
      timeRange === "1m" ? 2000 : timeRange === "10m" ? 5000 : 10000, // More frequent refresh for all ranges
  });
};

export const usePublishMessage = () => {
  return useMutation({
    mutationFn: (params: Parameters<typeof apiClient.publishMessage>[0]) =>
      apiClient.publishMessage(params),
  });
};

export const useCreateQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof apiClient.createQueue>[0]) =>
      apiClient.createQueue(params),
    onSuccess: (_, variables) => {
      // Invalidate queues list for the specific server
      queryClient.invalidateQueries({
        queryKey: queryKeys.queues(variables.serverId),
      });
    },
  });
};
