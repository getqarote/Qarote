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
    warning: number; // 80%
    critical: number; // 95%
  };
  disk: {
    warning: number; // 15% free
    critical: number; // 10% free
  };
  fileDescriptors: {
    warning: number; // 80%
    critical: number; // 90%
  };
  sockets: {
    warning: number; // 80%
    critical: number; // 90%
  };
  processes: {
    warning: number; // 80%
    critical: number; // 90%
  };
  queueMessages: {
    warning: number; // 10,000 messages
    critical: number; // 50,000 messages
  };
  unackedMessages: {
    warning: number; // 1,000 messages
    critical: number; // 5,000 messages
  };
  consumerUtilization: {
    warning: number; // 10%
  };
  connections: {
    warning: number; // 80% of limit
    critical: number; // 95% of limit
  };
  runQueue: {
    warning: number; // 10
    critical: number; // 20
  };
}

export interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
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
      details: any;
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
