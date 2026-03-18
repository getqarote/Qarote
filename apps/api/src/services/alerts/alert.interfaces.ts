import { AlertSeverity } from "@/generated/prisma/client";

// Re-export so existing imports of AlertSeverity from this module still work
// during the transition. New code should import directly from Prisma.
export { AlertSeverity };

// Alert categories
export enum AlertCategory {
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
  severity: AlertSeverity;
  category: AlertCategory;
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

export interface MetricThresholds {
  info?: number;
  low?: number;
  medium?: number;
  high?: number;
  critical?: number;
}

export interface AlertThresholds {
  memory: MetricThresholds;
  disk: MetricThresholds;
  fileDescriptors: MetricThresholds;
  sockets: MetricThresholds;
  processes: MetricThresholds;
  queueMessages: MetricThresholds;
  unackedMessages: MetricThresholds;
  consumerUtilization: MetricThresholds;
  runQueue: MetricThresholds;
}

export interface AlertSummary {
  total: number;
  info: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface ClusterHealthSummary {
  clusterHealth: "healthy" | "degraded" | "critical";
  summary: AlertSummary;
  issues: string[];
  timestamp: string;
}

export interface HealthCheck {
  overall: "healthy" | "degraded" | "critical";
  checks: {
    connectivity: {
      status: "healthy" | "warning" | "critical";
      message: string;
    };
    nodes: {
      status: "healthy" | "warning" | "critical";
      message: string;
      details: Record<string, unknown>;
    };
    memory: {
      status: "healthy" | "warning" | "critical";
      message: string;
      // details: any;
    };
    disk: {
      status: "healthy" | "warning" | "critical";
      message: string;
      // details: any;
    };
    queues: {
      status: "healthy" | "warning" | "critical";
      message: string;
      // details: any;
    };
  };
  timestamp: string;
}
