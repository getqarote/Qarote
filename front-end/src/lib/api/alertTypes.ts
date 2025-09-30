/**
 * Alert Management Types
 * Contains interfaces for alert rules, instances, and management
 */

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "error";
  status: "active" | "acknowledged" | "resolved";
  createdAt: string;
  resolvedAt?: string | null;
}

export type AlertType =
  | "QUEUE_DEPTH"
  | "MESSAGE_RATE"
  | "CONSUMER_COUNT"
  | "MEMORY_USAGE"
  | "DISK_USAGE"
  | "CONNECTION_COUNT"
  | "CHANNEL_COUNT"
  | "NODE_DOWN"
  | "EXCHANGE_ERROR";

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type ComparisonOperator =
  | "GREATER_THAN"
  | "LESS_THAN"
  | "EQUALS"
  | "NOT_EQUALS";

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  type: AlertType;
  threshold: number;
  operator: ComparisonOperator;
  severity: AlertSeverity;
  enabled: boolean;
  serverId: string;
  companyId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  server: {
    id: string;
    name: string;
    host: string;
  };
  createdBy: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  _count?: {
    alerts: number;
  };
  alerts?: AlertInstance[];
}

export interface AlertInstance {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  value?: number;
  threshold?: number;
  alertRuleId?: string;
  companyId: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  alertRule?: {
    id: string;
    name: string;
    server: {
      id: string;
      name: string;
      host: string;
    };
  };
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface AlertQuery {
  status?: AlertStatus | AlertStatus[];
  severity?: AlertSeverity | AlertSeverity[];
  serverId?: string;
  limit?: number;
  offset?: number;
}

export interface AlertsResponse {
  alerts: AlertInstance[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  recent: AlertInstance[];
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  type: AlertType;
  threshold: number;
  operator: ComparisonOperator;
  severity: AlertSeverity;
  enabled?: boolean;
  serverId: string;
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  type?: AlertType;
  threshold?: number;
  operator?: ComparisonOperator;
  severity?: AlertSeverity;
  enabled?: boolean;
  serverId?: string;
}
