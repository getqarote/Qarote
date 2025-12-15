import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";

import { TimeRange } from "@/components/TimeRangeSelector";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { AlertThresholds } from "@/types/alerts";

import { useWorkspace } from "./useWorkspace";

// Query keys
export const queryKeys = {
  servers: ["servers"] as const,
  server: (id: string) => ["servers", id] as const,
  overview: (serverId: string) => ["overview", serverId] as const,
  queues: (serverId: string, vhost?: string) =>
    ["queues", serverId, vhost || ""] as const,
  queue: (serverId: string, queueName: string, vhost?: string | null) =>
    ["queue", serverId, queueName, vhost || ""] as const,
  queueLiveRates: (serverId: string, queueName: string, timeRange?: string) =>
    ["queueLiveRates", serverId, queueName, timeRange] as const,
  exchanges: (serverId: string, vhost?: string) =>
    ["exchanges", serverId, vhost || ""] as const,
  nodes: (serverId: string) => ["nodes", serverId] as const,
  alerts: ["alerts"] as const,
};

// Server hooks
export const useServers = () => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.servers,
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getServers(workspace.id);
    },
    enabled: isAuthenticated && !!workspace?.id, // Only run when authenticated and workspace exists
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useServer = (id: string) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.server(id),
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getServer(workspace.id, id);
    },
    enabled: !!id && isAuthenticated && !!workspace?.id, // Only run when authenticated, id exists, and workspace exists
    staleTime: 60000, // 1 minute
  });
};

export const useCreateServer = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (server: Parameters<typeof apiClient.createServer>[1]) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.createServer(workspace.id, server);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
  });
};

export const useTestConnection = () => {
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (
      credentials: Parameters<typeof apiClient.testConnection>[1]
    ) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.testConnection(workspace.id, credentials);
    },
  });
};

// RabbitMQ data hooks
export const useOverview = (serverId: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: queryKeys.overview(serverId || ""),
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getOverview(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 10000 : false, // Only refetch if enabled
  });
};

export const useQueues = (serverId: string | null, vhost?: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: queryKeys.queues(serverId || "", vhost || undefined),
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getQueues(serverId, workspace.id, vhost || undefined);
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 5000 : false, // Only refetch if enabled
  });
};

export const useNodes = (serverId: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: queryKeys.nodes(serverId),
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getNodes(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 10000, // 10 seconds
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

export const useNodeMemoryDetails = (
  serverId: string,
  nodeName: string,
  enabled: boolean = true
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["nodeMemoryDetails", serverId, nodeName],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getNodeMemoryDetails(serverId, nodeName, workspace.id);
    },
    enabled:
      !!serverId && !!nodeName && !!workspace?.id && enabled && isAuthenticated,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useQueue = (
  serverId: string,
  queueName: string,
  vhost?: string | null
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.queue(serverId, queueName, vhost),
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getQueue(
        serverId,
        queueName,
        workspace.id,
        vhost || undefined
      );
    },
    enabled: !!serverId && !!queueName && !!workspace?.id && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useMetrics = (serverId: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: [...queryKeys.overview(serverId || ""), "metrics"],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getMetrics(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 15000 : false, // Only refetch if enabled
  });
};

// Connections and Channels hooks
export const useConnections = (serverId: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: ["connections", serverId || ""],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getConnections(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 5000 : false, // Only refetch if enabled
  });
};

export const useChannels = (serverId: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: ["channels", serverId || ""],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getChannels(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 15000 : false, // Only refetch if enabled
  });
};

export const useExchanges = (
  serverId: string | null,
  vhost?: string | null
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: queryKeys.exchanges(serverId || "", vhost || undefined),
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getExchanges(serverId, workspace.id, vhost || undefined);
    },
    enabled: isEnabled,
    staleTime: 0, // Always consider data stale for immediate updates
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

export const useCreateExchange = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      exchangeData,
    }: {
      serverId: string;
      exchangeData: Parameters<typeof apiClient.createExchange>[1];
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.createExchange(serverId, exchangeData, workspace.id);
    },
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
  const { workspace } = useWorkspace();
  const { selectedVHost } = useVHostContext();

  return useMutation({
    mutationFn: ({
      serverId,
      exchangeName,
      options,
    }: {
      serverId: string;
      exchangeName: string;
      options?: Parameters<typeof apiClient.deleteExchange>[3];
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteExchange(
        serverId,
        exchangeName,
        workspace.id,
        options,
        selectedVHost || undefined
      );
    },
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

export const useBindings = (serverId: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: ["bindings", serverId],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getBindings(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 10000, // 10 seconds
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

export const useQueueConsumers = (
  serverId: string,
  queueName: string,
  vhost?: string | null
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["queueConsumers", serverId, queueName, vhost || ""],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getQueueConsumers(
        serverId,
        queueName,
        workspace.id,
        vhost || undefined
      );
    },
    enabled: !!serverId && !!queueName && !!workspace?.id && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useQueueBindings = (
  serverId: string,
  queueName: string,
  vhost?: string | null
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["queueBindings", serverId, queueName, vhost || ""],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getQueueBindings(
        serverId,
        queueName,
        workspace.id,
        vhost || undefined
      );
    },
    enabled: !!serverId && !!queueName && !!workspace?.id && isAuthenticated,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Alert Rules hooks
export const useAlertRules = (enabled: boolean = true) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["alertRules", workspace?.id],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getAlertRules(workspace.id);
    },
    enabled: isAuthenticated && !!workspace?.id && enabled,
    staleTime: 30000, // 30 seconds
  });
};

export const useAlertRule = (id: string | null, enabled: boolean = true) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["alertRule", workspace?.id, id],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getAlertRule(workspace.id, id!);
    },
    enabled: isAuthenticated && !!id && !!workspace?.id && enabled,
    staleTime: 30000,
  });
};

export const useCreateAlertRule = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createAlertRule>[1]) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.createAlertRule(workspace.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertRules"] });
    },
  });
};

export const useUpdateAlertRule = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof apiClient.updateAlertRule>[2];
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.updateAlertRule(workspace.id, id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["alertRules"] });
      queryClient.invalidateQueries({ queryKey: ["alertRule", variables.id] });
    },
  });
};

export const useDeleteAlertRule = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (id: string) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteAlertRule(workspace.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertRules"] });
    },
  });
};

export const useLiveRatesMetrics = (
  serverId: string | null,
  timeRange: TimeRange = "1d"
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: ["liveRates", serverId, timeRange],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getLiveRatesMetrics(serverId, workspace.id, timeRange);
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 5000 : false, // Only refetch if enabled
  });
};

export const useQueueLiveRates = (
  serverId: string,
  queueName: string,
  timeRange: "1m" | "10m" | "1h" | "8h" | "1d" = "1d",
  vhost?: string | null
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.queueLiveRates(serverId, queueName, timeRange),
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getQueueLiveRates(
        serverId,
        queueName,
        workspace.id,
        timeRange,
        vhost || undefined
      );
    },
    enabled: !!serverId && !!queueName && !!workspace?.id && isAuthenticated,
    staleTime: 5000, // 5 seconds
    refetchInterval: 5000, // Refresh every 5 seconds for live data
  });
};

export const usePublishMessage = () => {
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (
      params: Omit<
        Parameters<typeof apiClient.publishMessage>[0],
        "workspaceId"
      >
    ) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.publishMessage({ ...params, workspaceId: workspace.id });
    },
  });
};

export const useCreateQueue = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (
      params: Omit<Parameters<typeof apiClient.createQueue>[0], "workspaceId">
    ) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.createQueue({ ...params, workspaceId: workspace.id });
    },
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
  const { workspace } = useWorkspace();
  const { selectedVHost } = useVHostContext();

  return useMutation({
    mutationFn: ({
      serverId,
      queueName,
      options,
    }: {
      serverId: string;
      queueName: string;
      options?: Parameters<typeof apiClient.deleteQueue>[3];
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteQueue(
        serverId,
        queueName,
        workspace.id,
        options,
        selectedVHost || undefined
      );
    },
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
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      queueName,
    }: {
      serverId: string;
      queueName: string;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.pauseQueue(serverId, queueName, workspace.id);
    },
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
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      queueName,
    }: {
      serverId: string;
      queueName: string;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.resumeQueue(serverId, queueName, workspace.id);
    },
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
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["queuePauseStatus", serverId, queueName],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getQueuePauseStatus(serverId, queueName, workspace.id);
    },
    enabled: !!serverId && !!queueName && !!workspace?.id && isAuthenticated,
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

export const useRemoveUserFromWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => apiClient.removeUserFromWorkspace(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceUsers"] });
    },
  });
};

// RabbitMQ Alert hooks
export const useRabbitMQAlerts = (
  serverId: string | null,
  vhost: string | null,
  options?: {
    limit?: number;
    offset?: number;
    severity?: string;
    category?: string;
    resolved?: boolean;
  }
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && !!vhost && isAuthenticated;

  return useQuery({
    queryKey: [
      "rabbitmqAlerts",
      serverId || "",
      vhost || "",
      options?.limit,
      options?.offset,
      options?.severity,
      options?.category,
      options?.resolved,
    ],
    queryFn: () => {
      if (!workspace?.id || !serverId || !vhost) {
        throw new Error("Workspace ID, Server ID, and VHost are required");
      }
      return apiClient.getRabbitMQAlerts(serverId, workspace.id, {
        vhost,
        ...options,
      });
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

export const useResolvedAlerts = (
  serverId: string | null,
  vhost: string | null,
  options?: {
    limit?: number;
    offset?: number;
    severity?: string;
    category?: string;
  }
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && !!vhost && isAuthenticated;

  return useQuery({
    queryKey: [
      "resolvedAlerts",
      serverId || "",
      vhost || "",
      options?.limit,
      options?.offset,
      options?.severity,
      options?.category,
    ],
    queryFn: () => {
      if (!workspace?.id || !serverId || !vhost) {
        throw new Error("Workspace ID, Server ID, and VHost are required");
      }
      return apiClient.getResolvedAlerts(serverId, workspace.id, {
        vhost,
        ...options,
      });
    },
    enabled: isEnabled,
    staleTime: 30000, // 30 seconds
    refetchInterval: isEnabled ? 60000 : false, // Refetch every minute
  });
};

export const useRabbitMQAlertsSummary = (serverId: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: ["rabbitmqAlertsSummary", serverId],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getRabbitMQAlertsSummary(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

export const useRabbitMQHealth = (serverId: string | null) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled = !!serverId && !!workspace?.id && isAuthenticated;

  return useQuery({
    queryKey: ["rabbitmqHealth", serverId],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getRabbitMQHealth(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 5000, // 5 seconds
    refetchInterval: isEnabled ? 10000 : false, // Only refetch if enabled
  });
};

// RabbitMQ Threshold hooks
export const useWorkspaceThresholds = (enabled: boolean = true) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["workspaceThresholds", workspace?.id],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getWorkspaceThresholds(workspace.id);
    },
    enabled: !!workspace?.id && isAuthenticated && enabled,
    staleTime: 30000, // 30 seconds
  });
};

export const useUpdateWorkspaceThresholds = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (thresholds: AlertThresholds) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.updateWorkspaceThresholds(thresholds, workspace.id);
    },
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

// Alert Notification Settings hooks
export const useAlertNotificationSettings = (enabled: boolean = true) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["alertNotificationSettings", workspace?.id],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getAlertNotificationSettings(workspace.id);
    },
    enabled: !!workspace?.id && isAuthenticated && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: {
      success: true,
      settings: {
        emailNotificationsEnabled: true,
        contactEmail: null,
        notificationSeverities: ["critical", "warning", "info"],
        browserNotificationsEnabled: false,
        browserNotificationSeverities: ["critical", "warning", "info"],
      },
    },
  });
};

export const useUpdateAlertNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (settings: {
      emailNotificationsEnabled?: boolean;
      contactEmail?: string | null;
      notificationSeverities?: string[];
      browserNotificationsEnabled?: boolean;
      browserNotificationSeverities?: string[];
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.updateAlertNotificationSettings(workspace.id, settings);
    },
    onSuccess: () => {
      // Invalidate and refetch notification settings
      queryClient.invalidateQueries({
        queryKey: ["alertNotificationSettings"],
      });
    },
  });
};

// Webhook hooks
export const useWebhooks = (enabled: boolean = true) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["webhooks", workspace?.id],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getWebhooks(workspace.id);
    },
    enabled: !!workspace?.id && isAuthenticated && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateWebhook = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (data: {
      url: string;
      enabled?: boolean;
      secret?: string | null;
      version?: string;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.createWebhook(workspace.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["webhooks"],
      });
    },
  });
};

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      webhookId,
      data,
    }: {
      webhookId: string;
      data: {
        url?: string;
        enabled?: boolean;
        secret?: string | null;
        version?: string;
      };
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.updateWebhook(workspace.id, webhookId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["webhooks"],
      });
    },
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (webhookId: string) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteWebhook(workspace.id, webhookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["webhooks"],
      });
    },
  });
};

// Slack hooks
export const useSlackConfigs = (enabled: boolean = true) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["slackConfigs", workspace?.id],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getSlackConfigs(workspace.id);
    },
    enabled: !!workspace?.id && isAuthenticated && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSlackConfig = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (data: {
      webhookUrl: string;
      customValue?: string | null;
      enabled?: boolean;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.createSlackConfig(workspace.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["slackConfigs"],
      });
    },
  });
};

export const useUpdateSlackConfig = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      slackConfigId,
      data,
    }: {
      slackConfigId: string;
      data: {
        webhookUrl?: string;
        customValue?: string | null;
        enabled?: boolean;
      };
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.updateSlackConfig(workspace.id, slackConfigId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["slackConfigs"],
      });
    },
  });
};

export const useDeleteSlackConfig = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: (slackConfigId: string) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteSlackConfig(workspace.id, slackConfigId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["slackConfigs"],
      });
    },
  });
};

// RabbitMQ Users hooks
export const useUsers = (
  serverId: string | null,
  serverExists: boolean = true
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled =
    !!serverId && !!workspace?.id && isAuthenticated && serverExists;

  return useQuery({
    queryKey: ["users", serverId || ""],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getUsers(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 10000, // 10 seconds
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

export const useUser = (
  serverId: string | null,
  username: string,
  serverExists: boolean = true
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled =
    !!serverId &&
    !!username &&
    !!workspace?.id &&
    isAuthenticated &&
    serverExists;

  return useQuery({
    queryKey: ["user", serverId || "", username],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getUser(serverId, username, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 10000, // 10 seconds
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

// RabbitMQ VHosts hooks
export const useVHosts = (
  serverId: string | null,
  serverExists: boolean = true
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled =
    !!serverId && !!workspace?.id && isAuthenticated && serverExists;

  return useQuery({
    queryKey: ["vhosts", serverId || ""],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getVHosts(serverId, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 10000, // 10 seconds
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

export const useVHost = (
  serverId: string | null,
  vhostName: string,
  serverExists: boolean = true
) => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();
  const isEnabled =
    !!serverId &&
    !!vhostName &&
    !!workspace?.id &&
    isAuthenticated &&
    serverExists;

  return useQuery({
    queryKey: ["vhost", serverId || "", vhostName],
    queryFn: () => {
      if (!workspace?.id || !serverId) {
        throw new Error("Workspace ID and Server ID are required");
      }
      return apiClient.getVHost(serverId, vhostName, workspace.id);
    },
    enabled: isEnabled,
    staleTime: 10000, // 10 seconds
    refetchInterval: isEnabled ? 30000 : false, // Only refetch if enabled
  });
};

// RabbitMQ User mutations
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      username,
    }: {
      serverId: string;
      username: string;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteUser(serverId, username, workspace.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["users", variables.serverId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.serverId, variables.username],
      });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      username,
      data,
    }: {
      serverId: string;
      username: string;
      data: {
        password?: string;
        tags?: string;
        removePassword?: boolean;
      };
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.updateUser(serverId, username, data, workspace.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.serverId, variables.username],
      });
      queryClient.invalidateQueries({
        queryKey: ["users", variables.serverId],
      });
    },
  });
};

export const useSetUserPermissions = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      username,
      data,
    }: {
      serverId: string;
      username: string;
      data: {
        vhost: string;
        configure: string;
        write: string;
        read: string;
      };
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.setUserPermissions(
        serverId,
        username,
        data,
        workspace.id
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.serverId, variables.username],
      });
    },
  });
};

export const useDeleteUserPermissions = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      username,
      vhost,
    }: {
      serverId: string;
      username: string;
      vhost: string;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteUserPermissions(
        serverId,
        username,
        vhost,
        workspace.id
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.serverId, variables.username],
      });
    },
  });
};

// RabbitMQ VHost mutations
export const useDeleteVHost = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      vhostName,
    }: {
      serverId: string;
      vhostName: string;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteVHost(serverId, vhostName, workspace.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vhosts", variables.serverId],
      });
      queryClient.invalidateQueries({
        queryKey: ["vhost", variables.serverId, variables.vhostName],
      });
    },
  });
};

export const useSetVHostPermissions = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      vhostName,
      username,
      permissions,
    }: {
      serverId: string;
      vhostName: string;
      username: string;
      permissions: {
        username: string;
        configure: string;
        write: string;
        read: string;
      };
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.setVHostPermissions(
        serverId,
        vhostName,
        username,
        permissions,
        workspace.id
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vhost", variables.serverId, variables.vhostName],
      });
    },
  });
};

export const useDeleteVHostPermissions = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      vhostName,
      username,
    }: {
      serverId: string;
      vhostName: string;
      username: string;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteVHostPermissions(
        serverId,
        vhostName,
        username,
        workspace.id
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vhost", variables.serverId, variables.vhostName],
      });
    },
  });
};

export const useSetVHostLimit = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: ({
      serverId,
      vhostName,
      limitType,
      data,
    }: {
      serverId: string;
      vhostName: string;
      limitType: "max-connections" | "max-queues";
      data: {
        value: number;
        limitType: "max-connections" | "max-queues";
      };
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.setVHostLimit(
        serverId,
        vhostName,
        limitType,
        data,
        workspace.id
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vhost", variables.serverId, variables.vhostName],
      });
    },
  });
};
