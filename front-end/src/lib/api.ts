const API_BASE_URL = "http://localhost:3000/api";

export interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  vhost: string;
  createdAt: string;
  updatedAt: string;
}

export interface Queue {
  name: string;
  vhost: string;
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  consumers: number;
  memory: number;
  backing_queue_status?: {
    mode: string;
  };
  message_stats?: {
    publish_details?: { rate: number };
    deliver_details?: { rate: number };
  };
  auto_delete: boolean;
  durable: boolean;
}

export interface Node {
  name: string;
  type: string;
  running: boolean;
  mem_used: number;
  mem_limit: number;
  mem_alarm: boolean;
  disk_free: number;
  disk_free_limit: number;
  disk_free_alarm: boolean;
  proc_used: number;
  proc_total: number;
  uptime: number;
  run_queue: number;
  processors: number;
  os_pid: string;
  fd_used: number;
  fd_total: number;
  sockets_used: number;
  sockets_total: number;
  net_ticktime: number;
  enabled_plugins: string[];
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "error";
  status: "active" | "acknowledged" | "resolved";
  createdAt: string;
  resolvedAt?: string | null;
}

export interface Overview {
  management_version: string;
  rates_mode: string;
  rabbitmq_version: string;
  cluster_name: string;
  erlang_version: string;
  erlang_full_version: string;
  message_stats?: {
    publish_details?: { rate: number };
    deliver_details?: { rate: number };
  };
  queue_totals?: {
    messages: number;
    messages_ready: number;
    messages_unacknowledged: number;
  };
  object_totals?: {
    connections: number;
    channels: number;
    exchanges: number;
    queues: number;
    consumers: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Server management
  async getServers(): Promise<{ servers: Server[] }> {
    return this.request<{ servers: Server[] }>("/servers");
  }

  async getServer(id: string): Promise<{ server: Server }> {
    return this.request<{ server: Server }>(`/servers/${id}`);
  }

  async createServer(
    server: Omit<Server, "id" | "createdAt" | "updatedAt"> & {
      password: string;
    }
  ): Promise<{ server: Server }> {
    return this.request<{ server: Server }>("/servers", {
      method: "POST",
      body: JSON.stringify(server),
    });
  }

  async testConnection(credentials: {
    host: string;
    port: number;
    username: string;
    password: string;
    vhost: string;
  }): Promise<{
    success: boolean;
    message: string;
    version?: string;
    cluster_name?: string;
  }> {
    return this.request<{
      success: boolean;
      message: string;
      version?: string;
      cluster_name?: string;
    }>("/servers/test-connection", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  // RabbitMQ data
  async getOverview(serverId: string): Promise<{ overview: Overview }> {
    return this.request<{ overview: Overview }>(
      `/rabbitmq/servers/${serverId}/overview`
    );
  }

  async getQueues(serverId: string): Promise<{ queues: Queue[] }> {
    return this.request<{ queues: Queue[] }>(
      `/rabbitmq/servers/${serverId}/queues`
    );
  }

  async getNodes(serverId: string): Promise<{ nodes: Node[] }> {
    return this.request<{ nodes: Node[] }>(
      `/rabbitmq/servers/${serverId}/nodes`
    );
  }

  async getQueue(
    serverId: string,
    queueName: string
  ): Promise<{ queue: Queue }> {
    return this.request<{ queue: Queue }>(
      `/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(queueName)}`
    );
  }

  // Alerts
  async getAlerts(): Promise<{ alerts: Alert[] }> {
    return this.request<{ alerts: Alert[] }>("/alerts");
  }

  async getRecentAlerts(): Promise<{ alerts: Alert[] }> {
    return this.request<{ alerts: Alert[] }>("/alerts/recent/day");
  }
}

export const apiClient = new ApiClient();
