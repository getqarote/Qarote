/**
 * Logs and Activity Tracking Types
 * Contains interfaces for user activity logging and audit trails
 * NOTE: This is for future backend implementation - currently using mock data
 */

export type LogAction =
  | "SEND_MESSAGE"
  | "CREATE_QUEUE"
  | "DELETE_QUEUE"
  | "PURGE_QUEUE"
  | "CREATE_EXCHANGE"
  | "DELETE_EXCHANGE"
  | "CREATE_BINDING"
  | "DELETE_BINDING"
  | "CREATE_ALERT"
  | "UPDATE_ALERT"
  | "DELETE_ALERT"
  | "ACKNOWLEDGE_ALERT"
  | "RESOLVE_ALERT"
  | "CREATE_SERVER"
  | "UPDATE_SERVER"
  | "DELETE_SERVER"
  | "LOGIN"
  | "LOGOUT"
  | "VIEW_QUEUE"
  | "VIEW_EXCHANGE"
  | "VIEW_MESSAGES"
  | "BROWSE_MESSAGES"
  | "PUBLISH_MESSAGE"
  | "CONSUME_MESSAGE"
  | "CREATE_CONNECTION"
  | "CLOSE_CONNECTION"
  | "CREATE_CHANNEL"
  | "CLOSE_CHANNEL"
  | "UPDATE_PRIVACY_SETTINGS"
  | "EXPORT_DATA"
  | "DELETE_DATA";

export type LogSeverity = "info" | "warning" | "error" | "critical";

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: LogAction;
  resource: string;
  resourceId?: string;
  details: string;
  severity: LogSeverity;
  serverId?: string;
  serverName?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  companyId: string;
  metadata?: Record<string, unknown>;
}

export interface LogQuery {
  userId?: string;
  action?: LogAction | LogAction[];
  severity?: LogSeverity | LogSeverity[];
  serverId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: "timestamp" | "action" | "severity" | "user";
  sortOrder?: "asc" | "desc";
}

export interface LogsResponse {
  logs: ActivityLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    totalEvents: number;
    uniqueUsers: number;
    criticalActions: number;
    timeRange: string;
  };
}

export interface LogStats {
  totalEvents: number;
  eventsByAction: Record<LogAction, number>;
  eventsBySeverity: Record<LogSeverity, number>;
  eventsByUser: Array<{
    userId: string;
    userName: string;
    eventCount: number;
  }>;
  eventsByServer: Array<{
    serverId: string;
    serverName: string;
    eventCount: number;
  }>;
  recentActivity: ActivityLog[];
  timeRange: string;
}

export interface CreateLogRequest {
  action: LogAction;
  resource: string;
  resourceId?: string;
  details: string;
  severity?: LogSeverity;
  serverId?: string;
  metadata?: Record<string, unknown>;
}

export interface LogExportRequest {
  format: "json" | "csv" | "xlsx";
  query?: LogQuery;
}
