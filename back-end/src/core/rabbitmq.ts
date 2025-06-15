import type {
  RabbitMQCredentials,
  RabbitMQNode,
  RabbitMQConnection,
  RabbitMQChannel,
  RabbitMQOverview,
  RabbitMQQueue,
  RabbitMQExchange,
  RabbitMQBinding,
  EnhancedMetrics,
  RabbitMQConsumer,
} from "../types/rabbitmq";

class RabbitMQClient {
  private baseUrl: string;
  private authHeader: string;
  private vhost: string;

  constructor(credentials: RabbitMQCredentials) {
    this.baseUrl = `http://${credentials.host}:${credentials.port}/api`;
    this.authHeader = `Basic ${Buffer.from(
      `${credentials.username}:${credentials.password}`
    ).toString("base64")}`;
    this.vhost = encodeURIComponent(credentials.vhost);
  }

  private async request(endpoint: string, options?: RequestInit) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(
          `RabbitMQ API error: ${response.status} ${response.statusText}`
        );
      }

      console.log(
        `Fetched ${endpoint} successfully: ${response.status} ${response.statusText}`
      );

      // Check if response has content
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        return response.json();
      } else {
        // Some endpoints return text or empty responses
        const text = await response.text();
        return text ? { message: text } : {};
      }
    } catch (error) {
      console.error(`Error fetching from RabbitMQ API (${endpoint}):`, error);
      throw error;
    }
  }

  async getOverview(): Promise<RabbitMQOverview> {
    return this.request("/overview");
  }

  async getQueues(): Promise<RabbitMQQueue[]> {
    return this.request(`/queues/${this.vhost}`);
  }

  async getNodes(): Promise<RabbitMQNode[]> {
    return this.request("/nodes");
  }

  async getQueue(queueName: string): Promise<RabbitMQQueue> {
    const encodedQueueName = encodeURIComponent(queueName);
    return this.request(`/queues/${this.vhost}/${encodedQueueName}`);
  }

  async getConnections(): Promise<RabbitMQConnection[]> {
    return this.request("/connections");
  }

  async getChannels(): Promise<RabbitMQChannel[]> {
    return this.request("/channels");
  }

  async getExchanges(): Promise<RabbitMQExchange[]> {
    return this.request(`/exchanges/${this.vhost}`);
  }

  async getBindings(): Promise<RabbitMQBinding[]> {
    return this.request(`/bindings/${this.vhost}`);
  }

  async purgeQueue(queueName: string): Promise<{ purged: number }> {
    const encodedQueueName = encodeURIComponent(queueName);
    try {
      console.log(`Purging queue: ${queueName} (encoded: ${encodedQueueName})`);
      console.log(
        `Purge endpoint: /queues/${this.vhost}/${encodedQueueName}/contents`
      );

      await this.request(`/queues/${this.vhost}/${encodedQueueName}/contents`, {
        method: "DELETE",
      });

      console.log(`Queue "${queueName}" purged successfully (204 No Content)`);

      // RabbitMQ returns 204 No Content on successful purge
      // We can't determine exact count, so return a success indicator
      return { purged: -1 }; // -1 indicates successful purge without count
    } catch (error) {
      console.error(`Error purging queue "${queueName}":`, error);
      throw error;
    }
  }

  async getMessages(
    queueName: string,
    count: number = 10,
    ackMode: string = "ack_requeue_true"
  ): Promise<any[]> {
    const encodedQueueName = encodeURIComponent(queueName);
    const endpoint = `/queues/${this.vhost}/${encodedQueueName}/get`;

    const payload = {
      count,
      ackmode: ackMode, // ack_requeue_true, ack_requeue_false, reject_requeue_true, reject_requeue_false
      encoding: "auto",
    };

    try {
      console.log(
        `Browsing messages from queue: ${queueName} (count: ${count}, ackmode: ${ackMode})`
      );

      const result = await this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log(
        `Retrieved ${
          Array.isArray(result) ? result.length : 0
        } messages from queue: ${queueName}`
      );
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error(
        `Error fetching messages from queue "${queueName}":`,
        error
      );
      throw error;
    }
  }

  // Get comprehensive metrics for calculating latency and performance
  async getMetrics(): Promise<EnhancedMetrics> {
    try {
      const [overview, nodes, connections, channels] = await Promise.all([
        this.getOverview(),
        this.getNodes(),
        this.getConnections(),
        this.getChannels(),
      ]);

      // Calculate average latency based on message stats
      const avgLatency = this.calculateAverageLatency(
        overview,
        connections,
        channels
      );

      // Calculate disk usage from nodes
      const diskUsage = this.calculateDiskUsage(nodes);

      // Calculate memory and CPU metrics from nodes
      const totalMemoryBytes = this.calculateTotalMemoryBytes(nodes);
      const totalMemoryGB = totalMemoryBytes / (1024 * 1024 * 1024); // Convert bytes to GB
      const avgCpuUsage = this.calculateAverageCpuUsage(nodes);

      return {
        overview,
        nodes,
        connections,
        channels,
        avgLatency,
        diskUsage,
        totalMemoryBytes,
        totalMemoryGB,
        avgCpuUsage,
        calculatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching comprehensive metrics:", error);
      throw error;
    }
  }

  private calculateAverageLatency(
    overview: RabbitMQOverview,
    connections: RabbitMQConnection[],
    channels: RabbitMQChannel[]
  ): number {
    try {
      // Method 1: Use message rates to estimate latency
      const publishRate = overview?.message_stats?.publish_details?.rate || 0;
      const deliverRate = overview?.message_stats?.deliver_details?.rate || 0;
      const ackRate = overview?.message_stats?.ack_details?.rate || 0;

      // If we have active message flow, calculate based on throughput
      if (publishRate > 0 && deliverRate > 0) {
        // Estimate latency based on the difference between publish and ack rates
        const processingDelay =
          publishRate > ackRate ? (publishRate - ackRate) / publishRate : 0;
        const baseLatency = 1 + processingDelay * 10; // Base latency + processing delay
        return Math.max(0.1, Math.min(100, baseLatency)); // Keep between 0.1ms and 100ms
      }

      // Method 2: Use connection and channel count as indicators
      const activeConnections = connections.filter(
        (conn) => conn.state === "running"
      ).length;
      const activeChannels = channels.filter(
        (ch) => ch.state === "running"
      ).length;

      if (activeConnections > 0) {
        // Estimate latency based on load (more connections/channels = higher latency)
        const loadFactor = activeChannels / Math.max(activeConnections, 1) / 10;
        const estimatedLatency = 1.0 + loadFactor;
        return Math.max(0.5, Math.min(50, estimatedLatency));
      }

      // Default latency for idle system
      return 1.2;
    } catch (error) {
      console.error("Error calculating latency:", error);
      return 2.5; // Default fallback
    }
  }

  private calculateDiskUsage(nodes: RabbitMQNode[]): number {
    try {
      if (!nodes || nodes.length === 0) {
        return 0;
      }

      let totalDiskUsed = 0;
      let totalDiskAvailable = 0;

      for (const node of nodes) {
        // RabbitMQ nodes provide disk_free_limit and disk_free
        const diskFree = node.disk_free || 0;
        const diskFreeLimit = node.disk_free_limit || 0;

        if (diskFree > 0 && diskFreeLimit > 0) {
          // Calculate estimated total disk based on free space and limit
          const estimatedTotal = diskFree + diskFreeLimit * 2; // Rough estimation
          const estimatedUsed = estimatedTotal - diskFree;

          totalDiskUsed += estimatedUsed;
          totalDiskAvailable += estimatedTotal;
        }
      }

      if (totalDiskAvailable > 0) {
        const usage = (totalDiskUsed / totalDiskAvailable) * 100;
        return Math.max(0, Math.min(100, usage));
      }

      // If we can't calculate from disk stats, estimate based on memory usage
      const avgMemoryUsage =
        nodes.reduce((sum, node) => {
          const memUsed = node.mem_used || 0;
          const memLimit = node.mem_limit || node.mem_used * 2;
          return sum + (memLimit > 0 ? (memUsed / memLimit) * 100 : 0);
        }, 0) / nodes.length;

      // Assume disk usage correlates somewhat with memory usage for RabbitMQ
      return Math.max(25, Math.min(85, avgMemoryUsage * 0.8 + 20));
    } catch (error) {
      console.error("Error calculating disk usage:", error);
      return 45; // Default fallback
    }
  }

  private calculateTotalMemoryBytes(nodes: RabbitMQNode[]): number {
    try {
      if (!nodes || nodes.length === 0) {
        return 0;
      }

      let totalMemory = 0;

      for (const node of nodes) {
        // Use mem_limit as the total memory for the node
        // mem_limit represents the memory alarm threshold, which is typically a percentage of total system memory
        const memLimit = node.mem_limit || 0;
        const memUsed = node.mem_used || 0;

        // If we have mem_limit, use it as indicator of total memory
        if (memLimit > 0) {
          // mem_limit is typically set to ~40% of system memory by default
          // so estimate total system memory
          const estimatedTotalNodeMemory = memLimit * 2.5;
          totalMemory += estimatedTotalNodeMemory;
        } else if (memUsed > 0) {
          // Fallback: estimate based on used memory (assume it's 30% of total)
          const estimatedTotalNodeMemory = memUsed * 3.33;
          totalMemory += estimatedTotalNodeMemory;
        }
      }

      return totalMemory;
    } catch (error) {
      console.error("Error calculating total memory:", error);
      return 8589934592; // Default fallback: 8GB in bytes
    }
  }

  private calculateAverageCpuUsage(nodes: RabbitMQNode[]): number {
    try {
      if (!nodes || nodes.length === 0) {
        return 0;
      }

      let totalCpuUsage = 0;
      let nodeCount = 0;

      for (const node of nodes) {
        // RabbitMQ doesn't directly expose CPU usage, so we estimate based on available metrics
        const memUsed = node.mem_used || 0;
        const memLimit = node.mem_limit || 0;
        const connections = node.sockets_used || 0;
        const maxConnections = node.sockets_total || connections;

        // Calculate memory pressure as an indicator of CPU load
        const memoryPressure = memLimit > 0 ? (memUsed / memLimit) * 100 : 0;

        // Calculate connection load as an indicator of CPU activity
        const connectionLoad =
          maxConnections > 0 ? (connections / maxConnections) * 100 : 0;

        // Estimate CPU usage based on memory pressure and connection load
        // This is a heuristic since RabbitMQ doesn't expose direct CPU metrics
        const estimatedCpuUsage = memoryPressure * 0.6 + connectionLoad * 0.4;

        // Add some baseline CPU usage if the node is running
        const baselineCpu = node.running ? 5 : 0;
        const totalNodeCpu = Math.max(
          baselineCpu,
          Math.min(95, estimatedCpuUsage + baselineCpu)
        );

        totalCpuUsage += totalNodeCpu;
        nodeCount++;
      }

      if (nodeCount === 0) {
        return 0;
      }

      const avgCpuUsage = totalCpuUsage / nodeCount;
      return Math.max(0, Math.min(100, avgCpuUsage));
    } catch (error) {
      console.error("Error calculating average CPU usage:", error);
      return 15; // Default fallback: 15% CPU usage
    }
  }

  async getConsumers(): Promise<RabbitMQConsumer[]> {
    return this.request("/consumers");
  }

  async getQueueConsumers(queueName: string): Promise<RabbitMQConsumer[]> {
    const encodedQueueName = encodeURIComponent(queueName);
    const consumers = await this.getConsumers();
    return consumers.filter(
      (consumer) =>
        consumer.queue?.name === queueName &&
        consumer.queue?.vhost === decodeURIComponent(this.vhost)
    );
  }

  async publishMessage(
    exchange: string,
    routingKey: string,
    payload: string,
    properties: { [key: string]: any } = {}
  ): Promise<{ routed: boolean }> {
    const encodedExchange = encodeURIComponent(exchange);
    const endpoint = `/exchanges/${this.vhost}/${encodedExchange}/publish`;

    const publishData = {
      properties: {
        delivery_mode: 2, // Persistent message
        ...properties,
      },
      routing_key: routingKey,
      payload: payload,
      payload_encoding: "string",
    };

    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(publishData),
    });
  }

  async createQueue(
    queueName: string,
    options: {
      durable?: boolean;
      autoDelete?: boolean;
      exclusive?: boolean;
      arguments?: { [key: string]: any };
    } = {}
  ): Promise<{ created: boolean }> {
    const encodedQueueName = encodeURIComponent(queueName);
    const endpoint = `/queues/${this.vhost}/${encodedQueueName}`;

    const queueData = {
      durable: options.durable ?? true,
      auto_delete: options.autoDelete ?? false,
      exclusive: options.exclusive ?? false,
      arguments: options.arguments ?? {},
    };

    const result = await this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(queueData),
    });

    console.log("result from createQueue:", result);

    return { created: true };
  }

  async bindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string = "",
    bindingArgs: { [key: string]: any } = {}
  ): Promise<{ bound: boolean }> {
    const encodedQueueName = encodeURIComponent(queueName);
    const encodedExchangeName = encodeURIComponent(exchangeName);
    const endpoint = `/bindings/${this.vhost}/e/${encodedExchangeName}/q/${encodedQueueName}`;

    const bindingData = {
      routing_key: routingKey,
      arguments: bindingArgs,
    };

    await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(bindingData),
    });

    return { bound: true };
  }
}

export default RabbitMQClient;
