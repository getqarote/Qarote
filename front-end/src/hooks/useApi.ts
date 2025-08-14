import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AlertThresholds } from "@/types/alerts";

// Query keys
export const queryKeys = {
  servers: ["servers"] as const,
  server: (id: string) => ["servers", id] as const,
  overview: (serverId: string) => ["overview", serverId] as const,
  queues: (serverId: string) => ["queues", serverId] as const,
  queue: (serverId: string, queueName: string) =>
    ["queue", serverId, queueName] as const,
  queueLiveRates: (serverId: string, queueName: string) =>
    ["queueLiveRates", serverId, queueName] as const,
  exchanges: (serverId: string) => ["exchanges", serverId] as const,
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

export const useMetrics = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.overview(serverId), "metrics"],
    queryFn: () => apiClient.getMetrics(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
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
    queryKey: queryKeys.exchanges(serverId),
    queryFn: () => apiClient.getExchanges(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 0, // Always consider data stale for immediate updates
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useCreateExchange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serverId,
      exchangeData,
    }: {
      serverId: string;
      exchangeData: Parameters<typeof apiClient.createExchange>[1];
    }) => apiClient.createExchange(serverId, exchangeData),
    onSuccess: async (_, variables) => {
      // Invalidate and refetch exchanges list for the specific server
      await queryClient.invalidateQueries({
        queryKey: queryKeys.exchanges(variables.serverId),
      });

      // Force refetch to ensure immediate update
      await queryClient.refetchQueries({
        queryKey: queryKeys.exchanges(variables.serverId),
      });
    },
  });
};

export const useDeleteExchange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serverId,
      exchangeName,
      options,
    }: {
      serverId: string;
      exchangeName: string;
      options?: Parameters<typeof apiClient.deleteExchange>[2];
    }) => apiClient.deleteExchange(serverId, exchangeName, options),
    onSuccess: async (_, variables) => {
      // Invalidate and refetch exchanges list for the specific server
      await queryClient.invalidateQueries({
        queryKey: queryKeys.exchanges(variables.serverId),
      });

      // Force refetch to ensure immediate update
      await queryClient.refetchQueries({
        queryKey: queryKeys.exchanges(variables.serverId),
      });
    },
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

export const useQueueBindings = (serverId: string, queueName: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["queueBindings", serverId, queueName],
    queryFn: () => apiClient.getQueueBindings(serverId, queueName),
    enabled: !!serverId && !!queueName && isAuthenticated,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
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

export const useTimeSeriesMetrics = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["liveRates", serverId],
    queryFn: () => apiClient.getTimeSeriesMetrics(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 5000, // Refresh every 5 seconds for live data
  });
};

export const useQueueLiveRates = (serverId: string, queueName: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.queueLiveRates(serverId, queueName),
    queryFn: () => apiClient.getQueueLiveRates(serverId, queueName),
    enabled: !!serverId && !!queueName && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 5000, // Refresh every 5 seconds for live data
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

export const useDeleteQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serverId,
      queueName,
      options,
    }: {
      serverId: string;
      queueName: string;
      options?: Parameters<typeof apiClient.deleteQueue>[2];
    }) => apiClient.deleteQueue(serverId, queueName, options),
    onSuccess: (_, variables) => {
      // Invalidate queues list for the specific server
      queryClient.invalidateQueries({
        queryKey: queryKeys.queues(variables.serverId),
      });
      // Also invalidate the specific queue data
      queryClient.invalidateQueries({
        queryKey: queryKeys.queue(variables.serverId, variables.queueName),
      });
    },
  });
};

export const usePauseQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serverId,
      queueName,
    }: {
      serverId: string;
      queueName: string;
    }) => apiClient.pauseQueue(serverId, queueName),
    onSuccess: (_, variables) => {
      // Invalidate queues list and specific queue data to refresh consumer counts
      queryClient.invalidateQueries({
        queryKey: queryKeys.queues(variables.serverId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.queue(variables.serverId, variables.queueName),
      });
      queryClient.invalidateQueries({
        queryKey: ["queueConsumers", variables.serverId, variables.queueName],
      });
      // Also invalidate pause status to refresh button state
      queryClient.invalidateQueries({
        queryKey: ["queuePauseStatus", variables.serverId, variables.queueName],
      });
    },
  });
};

export const useResumeQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serverId,
      queueName,
    }: {
      serverId: string;
      queueName: string;
    }) => apiClient.resumeQueue(serverId, queueName),
    onSuccess: (_, variables) => {
      // Invalidate queues list and specific queue data
      queryClient.invalidateQueries({
        queryKey: queryKeys.queues(variables.serverId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.queue(variables.serverId, variables.queueName),
      });
      queryClient.invalidateQueries({
        queryKey: ["queueConsumers", variables.serverId, variables.queueName],
      });
      // Also invalidate pause status to refresh button state
      queryClient.invalidateQueries({
        queryKey: ["queuePauseStatus", variables.serverId, variables.queueName],
      });
    },
  });
};

export const useQueuePauseStatus = (serverId: string, queueName: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["queuePauseStatus", serverId, queueName],
    queryFn: () => apiClient.getQueuePauseStatus(serverId, queueName),
    enabled: !!serverId && !!queueName && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: false, // Don't auto-refetch, let mutations handle updates
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

// Password change hook
export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.changePassword>[0]) =>
      apiClient.changePassword(data),
  });
};

// Email change hooks
export const useRequestEmailChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.requestEmailChange>[0]) =>
      apiClient.requestEmailChange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["verificationStatus"] });
    },
  });
};

export const useCancelEmailChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.cancelEmailChange(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["verificationStatus"] });
    },
  });
};

// Email verification status hook
export const useVerificationStatus = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["verificationStatus"],
    queryFn: () => apiClient.getVerificationStatus(),
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
};

// Password reset hooks
export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.requestPasswordReset>[0]) =>
      apiClient.requestPasswordReset(data),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.resetPassword>[0]) =>
      apiClient.resetPassword(data),
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

// Monthly message count hook
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

// New invitation hooks
export const useInvitations = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["invitations"],
    queryFn: () => apiClient.getInvitations(),
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });
};

export const useSendInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      invitationData: Parameters<typeof apiClient.sendInvitation>[0]
    ) => apiClient.sendInvitation(invitationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["workspaceUsers"] });
    },
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.revokeInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
};

export const useInvitationDetails = (token: string) => {
  return useQuery({
    queryKey: ["invitationDetails", token],
    queryFn: () => apiClient.getInvitationDetails(token),
    enabled: !!token,
    staleTime: 300000, // 5 minutes
  });
};

export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: (data: {
      token: string;
      password: string;
      firstName: string;
      lastName: string;
    }) =>
      apiClient.acceptInvitationWithRegistration(data.token, {
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      }),
  });
};

// RabbitMQ Alert hooks
export const useRabbitMQAlerts = (
  serverId: string,
  thresholds?: AlertThresholds
) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["rabbitmqAlerts", serverId, thresholds],
    queryFn: () => apiClient.getRabbitMQAlerts(serverId, thresholds),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useRabbitMQAlertsSummary = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["rabbitmqAlertsSummary", serverId],
    queryFn: () => apiClient.getRabbitMQAlertsSummary(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useRabbitMQHealth = (serverId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["rabbitmqHealth", serverId],
    queryFn: () => apiClient.getRabbitMQHealth(serverId),
    enabled: !!serverId && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

// RabbitMQ Threshold hooks
export const useWorkspaceThresholds = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["workspaceThresholds"],
    queryFn: () => apiClient.getWorkspaceThresholds(),
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });
};

export const useUpdateWorkspaceThresholds = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (thresholds: AlertThresholds) =>
      apiClient.updateWorkspaceThresholds(thresholds),
    onSuccess: () => {
      // Invalidate and refetch threshold data
      queryClient.invalidateQueries({
        queryKey: ["workspaceThresholds"],
      });
      // Also invalidate alerts since thresholds affect alert calculations
      queryClient.invalidateQueries({
        queryKey: ["rabbitmqAlerts"],
      });
    },
  });
};
