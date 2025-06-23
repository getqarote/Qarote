import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.servers,
    queryFn: () => apiClient.getServers(),
    enabled: isAuthenticated, // Only run when authenticated
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useServer = (id: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.server(id),
    queryFn: () => apiClient.getServer(id),
    enabled: !!id && isAuthenticated, // Only run when authenticated and id exists
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
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.overview(serverId),
    queryFn: () => apiClient.getOverview(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useQueues = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.queues(serverId),
    queryFn: () => apiClient.getQueues(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useNodes = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.nodes(serverId),
    queryFn: () => apiClient.getNodes(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useNodeMemoryDetails = (
  serverId: string,
  nodeName: string,
  enabled: boolean = true
) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["nodeMemoryDetails", serverId, nodeName],
    queryFn: () => apiClient.getNodeMemoryDetails(serverId, nodeName),
    enabled: !!serverId && !!nodeName && enabled && isAuthenticated,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useQueue = (serverId: string, queueName: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.queue(serverId, queueName),
    queryFn: () => apiClient.getQueue(serverId, queueName),
    enabled: !!serverId && !!queueName && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useEnhancedMetrics = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.overview(serverId), "enhanced"],
    queryFn: () => apiClient.getEnhancedMetrics(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useBrowseMessages = (
  serverId: string,
  queueName: string,
  count: number = 10
) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["browseMessages", serverId, queueName, count],
    queryFn: () => apiClient.browseQueueMessages(serverId, queueName, count),
    enabled: !!serverId && !!queueName && isAuthenticated,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });
};

// Connections and Channels hooks
export const useConnections = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["connections", serverId],
    queryFn: () => apiClient.getConnections(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useChannels = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["channels", serverId],
    queryFn: () => apiClient.getChannels(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useExchanges = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["exchanges", serverId],
    queryFn: () => apiClient.getExchanges(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useBindings = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["bindings", serverId],
    queryFn: () => apiClient.getBindings(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useQueueConsumers = (serverId: string, queueName: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["queueConsumers", serverId, queueName],
    queryFn: () => apiClient.getQueueConsumers(serverId, queueName),
    enabled: !!serverId && !!queueName && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

// Alerts hooks
export const useAlerts = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: () => apiClient.getAlerts(),
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useRecentAlerts = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.recentAlerts,
    queryFn: () => apiClient.getRecentAlerts(),
    enabled: isAuthenticated,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useTimeSeriesMetrics = (serverId: string, timeRange: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.overview(serverId), "timeseries", timeRange],
    queryFn: () => apiClient.getTimeSeriesMetrics(serverId, timeRange),
    enabled: !!serverId && isAuthenticated,
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

// Profile hooks
export const useProfile = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiClient.getProfile(),
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: Parameters<typeof apiClient.updateProfile>[0]) =>
      apiClient.updateProfile(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyData: Parameters<typeof apiClient.updateCompany>[0]) =>
      apiClient.updateCompany(companyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["companyUsers"] });
    },
  });
};

// Workspace hooks (new workspace API)
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      workspaceData: Parameters<typeof apiClient.updateWorkspace>[0]
    ) => apiClient.updateWorkspace(workspaceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["workspaceUsers"] });
    },
  });
};

export const useCompanyUsers = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["companyUsers"],
    queryFn: () => apiClient.getCompanyUsers(),
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
};

// Workspace users hook (new workspace API)
export const useWorkspaceUsers = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["workspaceUsers"],
    queryFn: () => apiClient.getWorkspaceUsers(),
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
};

export const useInviteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: Parameters<typeof apiClient.inviteUser>[0]) =>
      apiClient.inviteUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyUsers"] });
      queryClient.invalidateQueries({ queryKey: ["workspaceUsers"] });
    },
  });
};
