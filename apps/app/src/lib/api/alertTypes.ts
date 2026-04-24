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
  | "UNACKED_MESSAGES"
  | "CONSUMER_COUNT"
  | "CONSUMER_UTILIZATION"
  | "MEMORY_USAGE"
  | "DISK_USAGE"
  | "CONNECTION_COUNT"
  | "CHANNEL_COUNT"
  | "FILE_DESCRIPTOR_USAGE"
  | "NODE_DOWN"
  | "EXCHANGE_ERROR"
  | "SOCKET_USAGE"
  | "PROCESS_USAGE"
  | "RUN_QUEUE_LENGTH"
  | "CONNECTION_CHURN_RATE"
  | "CHANNEL_CHURN_RATE"
  | "QUEUE_CHURN_RATE"
  | "MEMORY_ALARM"
  | "DISK_ALARM"
  | "DLQ_MESSAGES"
  | "NO_CONSUMERS";

export type AlertSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
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
  isDefault: boolean;
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

// Alert severity levels (matches Prisma AlertSeverity enum)
export enum RabbitMQAlertSeverity {
  INFO = "INFO",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
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
