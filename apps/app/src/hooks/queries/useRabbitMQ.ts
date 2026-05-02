import { useCallback, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { SubData } from "@/lib/trpc/types";

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

export const useQueues = (
  serverId: string | null,
  vhost?: string | null,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();
  const enabled = serverExists && !!serverId && !!workspace?.id;

  const [data, setData] = useState<
    SubData<typeof trpc.rabbitmq.queues.watchQueues> | undefined
  >();
  const [error, setError] = useState<Error | null>(null);

  trpc.rabbitmq.queues.watchQueues.useSubscription(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhost: vhost ? encodeURIComponent(vhost) : undefined,
    },
    {
      enabled,
      onData: (d) => {
        setError(null);
        setData(d);
      },
      onError: setError,
    }
  );

  return { data, error, isLoading: enabled && !data, isError: !!error };
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

export const useMetrics = (
  serverId: string | null,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();
  const enabled = serverExists && !!serverId && !!workspace?.id;

  const [data, setData] = useState<
    SubData<typeof trpc.rabbitmq.metrics.watchMetrics> | undefined
  >();
  const [error, setError] = useState<Error | null>(null);

  trpc.rabbitmq.metrics.watchMetrics.useSubscription(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
    },
    {
      enabled,
      onData: (d) => {
        setError(null);
        setData(d);
      },
      onError: setError,
    }
  );

  return { data, error, isLoading: enabled && !data, isError: !!error };
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
  timeRange: TimeRange = "1d",
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();
  const enabled = serverExists && !!serverId && !!workspace?.id;

  const [data, setData] = useState<
    SubData<typeof trpc.rabbitmq.metrics.watchRates> | undefined
  >();
  const [error, setError] = useState<Error | null>(null);

  trpc.rabbitmq.metrics.watchRates.useSubscription(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      timeRange,
    },
    {
      enabled,
      onData: (d) => {
        setError(null);
        setData(d);
      },
      onError: setError,
    }
  );

  return { data, error, isLoading: enabled && !data, isError: !!error };
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

export const usePolicies = (
  serverId: string | null,
  vhost?: string | null,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.policies.getPolicies.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhost: vhost ? encodeURIComponent(vhost) : undefined,
    },
    {
      enabled: !!serverId && !!workspace?.id && serverExists,
      staleTime: 0,
      refetchInterval: 10000,
    }
  );

  return query;
};

export const useCreateOrUpdatePolicy = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.policies.createOrUpdatePolicy.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.rabbitmq.policies.getPolicies.invalidate(),
        utils.rabbitmq.queues.getQueues.invalidate(),
        utils.rabbitmq.infrastructure.getExchanges.invalidate(),
      ]);
    },
  });

  return mutation;
};

export const useDeletePolicy = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.policies.deletePolicy.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.rabbitmq.policies.getPolicies.invalidate(),
        utils.rabbitmq.queues.getQueues.invalidate(),
        utils.rabbitmq.infrastructure.getExchanges.invalidate(),
      ]);
    },
  });

  return mutation;
};

export const useSetClusterName = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.overview.setClusterName.useMutation({
    onSuccess: () => {
      utils.rabbitmq.overview.getOverview.invalidate();
    },
  });

  return mutation;
};

export const useTopology = (
  serverId: string | null,
  vhost?: string | null,
  featureEnabled = true
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.topology.getTopology.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhost: vhost ? encodeURIComponent(vhost) : undefined,
    },
    {
      enabled: !!serverId && !!workspace?.id && featureEnabled,
      staleTime: 10000,
      refetchInterval: 30000,
    }
  );

  return query;
};

// --- Spy on Queue ---

interface SpyMessage {
  id: string;
  timestamp: string;
  exchange: string;
  routingKey: string;
  headers: Record<string, unknown>;
  contentType: string | undefined;
  payload: string;
  payloadBytes: number;
  truncated: boolean;
  isBinary: boolean;
  redelivered: boolean;
  messageId?: string;
  correlationId?: string;
  appId?: string;
}

export type { SpyMessage };

const MAX_SPY_MESSAGES = 200;

export const useSpyOnQueue = (
  serverId: string,
  queueName: string,
  vhost: string,
  enabled: boolean
) => {
  const { workspace } = useWorkspace();
  const [messages, setMessages] = useState<SpyMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [spyInfo, setSpyInfo] = useState<{
    spyQueueName: string;
    bindingCount: number;
  } | null>(null);
  // Set when backend emits preview_limit — no further messages will arrive for free users.
  const [isPreviewLimited, setIsPreviewLimited] = useState(false);
  // Set when backend emits duration_limit — the 30 min hard cap on tap
  // sessions has fired. No further messages will arrive; the user must
  // reconnect to resume.
  const [isDurationLimited, setIsDurationLimited] = useState(false);
  // Backend cumulative dropped count (BoundedBuffer overflow on the server).
  const [dropped, setDropped] = useState(0);
  // Cumulative count of messages evicted client-side when the ring buffer
  // exceeds MAX_SPY_MESSAGES. Without this, the displayed dropped value would
  // only reflect backend overflow and the user could silently lose rows under
  // sustained traffic.
  const [clientDropped, setClientDropped] = useState(0);
  // Total of (dropped + clientDropped) at the moment the user last clicked
  // Clear. Subtracted from the live total so the displayed value resets to 0
  // on clear, even though both backend and client counters keep incrementing.
  const [droppedBaseline, setDroppedBaseline] = useState(0);
  // Monotonically increasing count of every message received over the lifetime
  // of this spy session. Unlike `messages.length` which is capped at
  // MAX_SPY_MESSAGES, this keeps incrementing — consumers (e.g. the "N new
  // messages" indicator in QueueSpy) need a counter that doesn't freeze when
  // the ring buffer is full.
  const [totalReceived, setTotalReceived] = useState(0);

  // RAF batching: accumulate messages in a ref, flush on animation frame.
  // Mirrors the messages array in a ref so flushPending can compute evictions
  // synchronously without depending on React state (which would require
  // calling setState from inside another updater — not allowed).
  const pendingRef = useRef<SpyMessage[]>([]);
  const rafRef = useRef<number | null>(null);
  const messagesRef = useRef<SpyMessage[]>([]);
  // Counts messages evicted from pendingRef before a RAF flush ever ran —
  // e.g. when the browser tab is backgrounded and RAFs are throttled. Without
  // this cap, pendingRef could grow arbitrarily large and bypass the 200-row
  // display cap entirely. Folded into clientDropped on the next flush.
  const pendingEvictedRef = useRef(0);

  const flushPending = useCallback(() => {
    rafRef.current = null;
    const pending = pendingRef.current;
    const pendingEvicted = pendingEvictedRef.current;
    if (pending.length === 0 && pendingEvicted === 0) return;
    pendingRef.current = [];
    pendingEvictedRef.current = 0;

    const combined = [...messagesRef.current, ...pending];
    const evicted = Math.max(0, combined.length - MAX_SPY_MESSAGES);
    const next = evicted > 0 ? combined.slice(-MAX_SPY_MESSAGES) : combined;

    messagesRef.current = next;
    setMessages(next);
    const totalEvicted = evicted + pendingEvicted;
    if (totalEvicted > 0) {
      setClientDropped((prev) => prev + totalEvicted);
    }
    // totalReceived tracks every message we observed, including the ones
    // we had to drop from pendingRef before they ever reached the display.
    setTotalReceived((prev) => prev + pending.length + pendingEvicted);
  }, []);

  const isActive = !!serverId && !!queueName && !!workspace?.id && enabled;

  trpc.messages.tap.subscribe.useSubscription(
    {
      serverId,
      workspaceId: workspace?.id || "",
      queueName,
      vhost: encodeURIComponent(vhost),
    },
    {
      enabled: isActive,
      onData: (data) => {
        if (data.type === "started") {
          setSpyInfo({
            spyQueueName: data.spyQueueName,
            bindingCount: data.bindingCount,
          });
          setError(null);
        } else if (data.type === "messages") {
          setDropped(data.dropped);
          // Buffer messages and flush on RAF. Cap pendingRef at
          // MAX_SPY_MESSAGES: if the tab is backgrounded the RAF may not
          // fire for minutes and pendingRef would otherwise grow without
          // bound. Anything beyond the cap is tracked as a client-side
          // eviction and folded into clientDropped on the next flush.
          pendingRef.current.push(...data.messages);
          if (pendingRef.current.length > MAX_SPY_MESSAGES) {
            const overflow = pendingRef.current.length - MAX_SPY_MESSAGES;
            pendingRef.current = pendingRef.current.slice(-MAX_SPY_MESSAGES);
            pendingEvictedRef.current += overflow;
          }
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(flushPending);
          }
        } else if (data.type === "preview_limit") {
          // Backend has soft-capped the stream — no further messages will arrive.
          setIsPreviewLimited(true);
        } else if (data.type === "duration_limit") {
          // 30 min hard cap reached — terminal event. UI shows a
          // "session ended after 30 minutes" notice with a Reconnect
          // affordance.
          setIsDurationLimited(true);
        } else if (data.type === "error") {
          setError(data.message);
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    }
  );

  const clearMessages = useCallback(() => {
    setDroppedBaseline(dropped + clientDropped);
    setMessages([]);
    messagesRef.current = [];
    pendingRef.current = [];
    pendingEvictedRef.current = 0;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPreviewLimited(false);
    setIsDurationLimited(false);
  }, [dropped, clientDropped]);

  return {
    messages,
    error,
    spyInfo,
    dropped: Math.max(0, dropped + clientDropped - droppedBaseline),
    totalReceived,
    isPreviewLimited,
    isDurationLimited,
    isLoading: isActive && !spyInfo && !error,
    clearMessages,
  };
};
