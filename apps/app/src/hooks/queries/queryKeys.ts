/**
 * Shared query keys for React Query
 */
export const queryKeys = {
  servers: (workspaceId?: string) => ["servers", workspaceId] as const,
  server: (workspaceId: string | undefined, id: string) =>
    ["servers", workspaceId, id] as const,
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
