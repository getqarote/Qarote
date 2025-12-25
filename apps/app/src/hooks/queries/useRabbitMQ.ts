import { trpc } from "@/lib/trpc/client";

import { TimeRange } from "@/components/TimeRangeSelector";

import { useWorkspace } from "../ui/useWorkspace";

/**
 * RabbitMQ data hooks
 * Handles overview, queues, nodes, metrics, connections, channels, exchanges, bindings, and queue operations
 */

export const useOverview = (serverId: string | null) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.overview.getOverview.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  );

  return query;
};

export const useQueues = (serverId: string | null, vhost?: string | null) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.queues.getQueues.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhost: vhost ? encodeURIComponent(vhost) : undefined,
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  );

  return query;
};

export const useNodes = (serverId: string | null) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.infrastructure.getNodes.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 10000, // 10 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return query;
};

export const useNodeMemoryDetails = (
  serverId: string,
  nodeName: string,
  enabled: boolean = true
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.memory.getNodeMemory.useQuery(
    {
      serverId,
      workspaceId: workspace?.id || "",
      nodeName,
    },
    {
      enabled: !!serverId && !!nodeName && !!workspace?.id && enabled,
      staleTime: 10000, // 10 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return query;
};

export const useQueue = (
  serverId: string,
  queueName: string,
  vhost?: string | null
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.queues.getQueue.useQuery(
    {
      serverId,
      workspaceId: workspace?.id || "",
      queueName,
      vhost: vhost ? encodeURIComponent(vhost) : encodeURIComponent("/"),
    },
    {
      enabled: !!serverId && !!queueName && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  );

  return query;
};

export const useMetrics = (serverId: string | null) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.metrics.getMetrics.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 15000, // Refetch every 15 seconds
    }
  );

  return query;
};

// Connections and Channels hooks
export const useConnections = (serverId: string | null) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.infrastructure.getConnections.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  );

  return query;
};

export const useChannels = (serverId: string | null) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.infrastructure.getChannels.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 15000, // Refetch every 15 seconds
    }
  );

  return query;
};

export const useExchanges = (
  serverId: string | null,
  vhost?: string | null
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.infrastructure.getExchanges.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhost: vhost ? encodeURIComponent(vhost) : undefined,
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 0, // Always consider data stale for immediate updates
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return query;
};

export const useCreateExchange = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.infrastructure.createExchange.useMutation({
    onSuccess: async () => {
      // Invalidate exchanges list
      await utils.rabbitmq.infrastructure.getExchanges.invalidate();
    },
  });

  return mutation;
};

export const useDeleteExchange = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.infrastructure.deleteExchange.useMutation({
    onSuccess: async () => {
      // Invalidate exchanges list
      await utils.rabbitmq.infrastructure.getExchanges.invalidate();
    },
  });

  return mutation;
};

export const useBindings = (serverId: string | null) => {
  const { workspace } = useWorkspace();

  // Bindings are included in getExchanges response
  const exchangesQuery = trpc.rabbitmq.infrastructure.getExchanges.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 10000, // 10 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return {
    ...exchangesQuery,
    data: exchangesQuery.data
      ? {
          ...exchangesQuery.data,
          bindings: exchangesQuery.data.bindings || [],
        }
      : undefined,
  };
};

export const useQueueConsumers = (
  serverId: string,
  queueName: string,
  vhost?: string | null
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.queues.getQueueConsumers.useQuery(
    {
      serverId,
      workspaceId: workspace?.id || "",
      queueName,
      vhost: vhost ? encodeURIComponent(vhost) : encodeURIComponent("/"),
    },
    {
      enabled: !!serverId && !!queueName && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  );

  return {
    ...query,
    data: query.data
      ? {
          ...query.data,
          consumers: query.data.consumers || [],
        }
      : undefined,
  };
};

export const useQueueBindings = (
  serverId: string,
  queueName: string,
  vhost?: string | null
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.queues.getQueueBindings.useQuery(
    {
      serverId,
      workspaceId: workspace?.id || "",
      queueName,
      vhost: vhost ? encodeURIComponent(vhost) : encodeURIComponent("/"),
    },
    {
      enabled: !!serverId && !!queueName && !!workspace?.id,
      staleTime: 10000, // 10 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return query;
};

export const useLiveRatesMetrics = (
  serverId: string | null,
  timeRange: TimeRange = "1d"
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.metrics.getRates.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      timeRange,
    },
    {
      enabled: !!serverId && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  );

  return query;
};

export const useQueueLiveRates = (
  serverId: string,
  queueName: string,
  timeRange: "1m" | "10m" | "1h" | "8h" | "1d" = "1d",
  vhost?: string | null
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.metrics.getQueueRates.useQuery(
    {
      serverId,
      workspaceId: workspace?.id || "",
      queueName,
      timeRange,
      vhost: vhost ? encodeURIComponent(vhost) : encodeURIComponent("/"),
    },
    {
      enabled: !!serverId && !!queueName && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: 5000, // Refresh every 5 seconds for live data
    }
  );

  return query;
};

export const usePublishMessage = () => {
  return trpc.rabbitmq.messages.publishMessage.useMutation();
};

export const useCreateQueue = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.queues.createQueue.useMutation({
    onSuccess: () => {
      // Invalidate queues list
      utils.rabbitmq.queues.getQueues.invalidate();
    },
  });

  return mutation;
};

export const useDeleteQueue = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.queues.deleteQueue.useMutation({
    onSuccess: () => {
      // Invalidate queues list and specific queue
      utils.rabbitmq.queues.getQueues.invalidate();
      utils.rabbitmq.queues.getQueue.invalidate();
    },
  });

  return mutation;
};

export const usePurgeQueue = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.queues.purgeQueue.useMutation({
    onSuccess: () => {
      // Invalidate queues list and specific queue to refresh message counts
      utils.rabbitmq.queues.getQueues.invalidate();
      utils.rabbitmq.queues.getQueue.invalidate();
    },
  });

  return mutation;
};

export const usePauseQueue = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.queues.pauseQueue.useMutation({
    onSuccess: () => {
      // Invalidate queues list and specific queue data
      utils.rabbitmq.queues.getQueues.invalidate();
      utils.rabbitmq.queues.getQueue.invalidate();
      utils.rabbitmq.queues.getQueueConsumers.invalidate();
    },
  });

  return mutation;
};

export const useResumeQueue = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.queues.resumeQueue.useMutation({
    onSuccess: () => {
      // Invalidate queues list and specific queue data
      utils.rabbitmq.queues.getQueues.invalidate();
      utils.rabbitmq.queues.getQueue.invalidate();
      utils.rabbitmq.queues.getQueueConsumers.invalidate();
    },
  });

  return mutation;
};

export const useQueuePauseStatus = (serverId: string, queueName: string) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.queues.getPauseStatus.useQuery(
    {
      serverId,
      workspaceId: workspace?.id || "",
      queueName,
    },
    {
      enabled: !!serverId && !!queueName && !!workspace?.id,
      staleTime: 5000, // 5 seconds
      refetchInterval: false, // Don't auto-refetch, let mutations handle updates
    }
  );

  return query;
};
