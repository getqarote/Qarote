/**
 * RabbitMQ Alert Types
 * Contains interfaces related to RabbitMQ monitoring and alerting
 */

// Alert severity levels
export enum AlertSeverity {
  CRITICAL = "critical",
  WARNING = "warning",
  INFO = "info",
}

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
  source: {
    type: "node" | "queue" | "cluster";
    name: string;
  };
}

export interface AlertThresholds {
  memory: {
    warning: number;
    critical: number;
  };
  disk: {
    warning: number;
    critical: number;
  };
  fileDescriptors: {
    warning: number;
    critical: number;
  };
  queueMessages: {
    warning: number;
    critical: number;
  };
  connections: {
    warning: number;
    critical: number;
  };
}

export interface AlertsResponse {
  success: boolean;
  alerts: RabbitMQAlert[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  thresholds: AlertThresholds;
  timestamp: string;
}

export interface AlertsSummaryResponse {
  success: boolean;
  clusterHealth: "healthy" | "warning" | "critical";
  summary: {
    critical: number;
    warning: number;
    total: number;
  };
  issues: string[];
  timestamp: string;
}

export interface HealthCheckResponse {
  success: boolean;
  health: {
    overall: "healthy" | "degraded" | "critical";
    checks: {
      connectivity: {
        status: "healthy" | "warning" | "critical";
        message: string;
      };
      nodes: {
        status: "healthy" | "warning" | "critical";
        message: string;
        details: any;
      };
      memory: {
        status: "healthy" | "warning" | "critical";
        message: string;
        details: any;
      };
      disk: {
        status: "healthy" | "warning" | "critical";
        message: string;
        details: any;
      };
      queues: {
        status: "healthy" | "warning" | "critical";
        message: string;
        details: any;
      };
    };
    timestamp: string;
  };
}

// Health Status Response (extending existing type)
export interface HealthStatus {
  overall: "healthy" | "warning" | "critical";
  components: {
    nodes: {
      status: "healthy" | "warning" | "critical";
      message: string;
      details: Record<string, unknown>;
    };
    memory: {
      status: "healthy" | "warning" | "critical";
      message: string;
      details: Record<string, unknown>;
    };
    disk: {
      status: "healthy" | "warning" | "critical";
      message: string;
      details: Record<string, unknown>;
    };
    queues: {
      status: "healthy" | "warning" | "critical";
      message: string;
      details: Record<string, unknown>;
    };
  };
  timestamp: string;
}

// Health Response API wrapper
export interface HealthResponse {
  success: boolean;
  health: {
    overall: "healthy" | "degraded" | "critical";
    checks: {
      connectivity: {
        status: "healthy" | "warning" | "critical";
        message: string;
      };
      nodes: {
        status: "healthy" | "warning" | "critical";
        message: string;
        details?: {
          running: number;
          total: number;
          nodes: Array<{
            name: string;
            running: boolean;
            mem_alarm: boolean;
            disk_free_alarm: boolean;
          }>;
        };
      };
      memory: {
        status: "healthy" | "warning" | "critical";
        message: string;
        details?: Record<string, unknown>;
      };
      disk: {
        status: "healthy" | "warning" | "critical";
        message: string;
        details?: Record<string, unknown>;
      };
      queues: {
        status: "healthy" | "warning" | "critical";
        message: string;
        details?: Record<string, unknown>;
      };
    };
    timestamp: string;
  };
}

export interface ThresholdsResponse {
  success: boolean;
  thresholds: AlertThresholds;
  canModify: boolean;
  defaults: AlertThresholds;
}

export interface UpdateThresholdsResponse {
  success: boolean;
  message: string;
  thresholds: AlertThresholds;
}
