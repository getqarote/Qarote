import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// Types for message history
export interface HistoricalMessage {
  id: string;
  queueName: string;
  exchangeName?: string;
  routingKey?: string;
  payload: string;
  properties?: Record<string, unknown>;
  capturedAt: string;
  redelivered: boolean;
  payloadSize: number;
  contentType?: string;
}

export interface MessageHistoryResponse {
  messages: HistoricalMessage[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  planLimits: {
    canAccessMessageHistory: boolean;
    availableRetentionPeriods: number[];
    maxMessageHistoryStorage: number;
    canConfigureRetention: boolean;
  };
}

export interface MessageHistoryStats {
  totalMessages: number;
  messagesByState: {
    acked: number;
    nacked: number;
    rejected: number;
    returned: number;
  };
  uniqueQueues: number;
  avgPayloadSize: number;
  timeRange: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

export interface MessageHistoryStatsResponse {
  stats: MessageHistoryStats;
  planLimits: {
    canAccessMessageHistory: boolean;
    availableRetentionPeriods: number[];
    maxMessageHistoryStorage: number;
    canConfigureRetention: boolean;
  };
}

export interface MessageHistorySearchParams {
  serverId: string;
  queueName?: string;
  startDate?: string;
  endDate?: string;
  content?: string;
  routingKey?: string;
  exchange?: string;
  limit?: number;
  offset?: number;
  sortBy?: "timestamp" | "queue_name" | "routing_key" | "exchange";
  sortOrder?: "asc" | "desc";
}

// Custom hook for searching message history
export function useMessageHistory(params: MessageHistorySearchParams) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["messageHistory", params],
    queryFn: async (): Promise<MessageHistoryResponse> => {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(
        `http://localhost:3000/api/message-history/search?${searchParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch message history");
      }

      return response.json();
    },
    enabled: !!token && !!params.serverId,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for message history statistics
export function useMessageHistoryStats(
  serverId: string,
  queueName?: string,
  days: number = 7
) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["messageHistoryStats", serverId, queueName, days],
    queryFn: async (): Promise<MessageHistoryStatsResponse> => {
      const searchParams = new URLSearchParams({
        serverId,
        days: days.toString(),
      });

      if (queueName) {
        searchParams.append("queueName", queueName);
      }

      const response = await fetch(
        `http://localhost:3000/api/message-history/stats?${searchParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch message history stats"
        );
      }

      return response.json();
    },
    enabled: !!token && !!serverId,
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to check if user has access to message history
export function useMessageHistoryAccess(serverId: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["messageHistoryAccess", serverId],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:3000/api/message-history/stats?serverId=${serverId}&days=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          return { canAccessMessageHistory: false };
        }
        throw new Error("Failed to check message history access");
      }

      const data = await response.json();
      return {
        canAccessMessageHistory:
          data.planLimits?.canAccessMessageHistory || false,
        planLimits: data.planLimits,
      };
    },
    enabled: !!token && !!serverId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Export the hook to maintain existing pattern
export { useMessageHistory as useMessageHistorySearch };
