/**
 * Alert Management Types
 * Contains interfaces for alert rules, instances, RabbitMQ alerts, and management
 */

// ============================================================================
// Alert Rules System Types
// ============================================================================

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
type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type ComparisonOperator =
  | "GREATER_THAN"
  | "LESS_THAN"
  | "EQUALS"
  | "NOT_EQUALS";

export interface AlertRule {
  id: string;
  name: string;
  description?: string | null;
  type: AlertType;
  threshold: number;
  operator: ComparisonOperator;
  severity: AlertSeverity;
  enabled: boolean;
  serverId: string;
  workspaceId: string;
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
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  _count?: {
    alerts: number;
  };
  alerts?: AlertInstance[];
}

interface AlertInstance {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  value?: number | null;
  threshold?: number | null;
  alertRuleId?: string | null;
  workspaceId: string;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  acknowledgedAt?: string | null;
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
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
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

// ============================================================================
// RabbitMQ Alert Types
// ============================================================================

// Alert severity levels
export enum RabbitMQAlertSeverity {
  CRITICAL = "critical",
  WARNING = "warning",
  INFO = "info",
}

// Alert categories
export enum RabbitMQAlertCategory {
  MEMORY = "memory",
  DISK = "disk",
  CONNECTION = "connection",
  QUEUE = "queue",
  NODE = "node",
  PERFORMANCE = "performance",
}

export interface RabbitMQAlert {
  id: string;
  serverId: string;
  serverName: string;
  severity: RabbitMQAlertSeverity;
  category: RabbitMQAlertCategory;
  title: string;
  description: string;
  details: {
    current: number | string;
    threshold?: number;
    recommended?: string;
    affected?: string[];
  };
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  vhost?: string; // Virtual host for queue-related alerts
  source: {
    type: "node" | "queue" | "cluster";
    name: string;
  };
}
