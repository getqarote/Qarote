import { logger } from "@/core/logger";
import { AMQPConnectionConfig, RabbitMQAmqpClient } from "./AmqpClient";

/**
 * Factory class to create AMQP clients for different RabbitMQ servers
 * Uses local connection management and coordination
 */
export class RabbitMQAmqpClientFactory {
  private static clients = new Map<string, RabbitMQAmqpClient>();
  private static connectionCounts = new Map<string, number>();
  private static readonly MAX_CONNECTIONS_PER_SERVER = 3;

  /**
   * Create an AMQP client for a specific RabbitMQ server with local connection management
   */
  static async createClient(serverConfig: {
    id: string;
    name: string;
    host: string;
    port: number;
    amqpPort: number;
    username: string;
    password: string;
    vhost: string;
    sslEnabled: boolean;
  }): Promise<RabbitMQAmqpClient> {
    // Check local cache first
    const existingClient = this.clients.get(serverConfig.id);
    if (existingClient && existingClient.isConnectionActive()) {
      return existingClient;
    }

    // Check local connection count
    const currentCount = this.connectionCounts.get(serverConfig.id) || 0;
    if (currentCount >= this.MAX_CONNECTIONS_PER_SERVER) {
      throw new Error(
        `Max connections (${this.MAX_CONNECTIONS_PER_SERVER}) reached for server ${serverConfig.id}. Current: ${currentCount}`
      );
    }

    const config: AMQPConnectionConfig = {
      protocol: serverConfig.sslEnabled ? "amqps" : "amqp",
      hostname: serverConfig.host,
      port: serverConfig.amqpPort, // Use AMQP port for the connection
      username: serverConfig.username,
      password: serverConfig.password,
      vhost: serverConfig.vhost,
      serverId: serverConfig.id,
      serverName: serverConfig.name,
      connectionTimeout: 30_000,
      heartbeat: 60, // heartbeat interval
    };

    // Create new client
    const client = new RabbitMQAmqpClient(config);
    await client.connect();

    // Register locally
    this.connectionCounts.set(serverConfig.id, currentCount + 1);
    this.clients.set(serverConfig.id, client);

    const activeConnections = this.connectionCounts.get(serverConfig.id) || 0;
    logger.info(`AMQP client created and registered locally`, {
      serverId: serverConfig.id,
      serverName: serverConfig.name,
      activeConnections,
    });

    return client;
  }

  /**
   * Get existing client for a server
   */
  static getClient(serverId: string): RabbitMQAmqpClient | null {
    return this.clients.get(serverId) || null;
  }

  /**
   * Remove client from cache and local tracking (when disconnected)
   */
  static async removeClient(serverId: string): Promise<void> {
    this.clients.delete(serverId);

    // Remove from local tracking
    const currentCount = this.connectionCounts.get(serverId) || 0;
    if (currentCount > 0) {
      this.connectionCounts.set(serverId, currentCount - 1);
    }

    logger.info(`AMQP client removed from cache and local tracking`, {
      serverId,
    });
  }

  /**
   * Cleanup all clients and local tracking
   */
  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.clients.entries()).map(
      async ([serverId, client]) => {
        try {
          await client.cleanup();
          await this.removeClient(serverId);
        } catch (error) {
          logger.warn("Error cleaning up AMQP client:", error);
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.clients.clear();
    this.connectionCounts.clear();
  }

  /**
   * Get connection statistics for a server
   */
  static async getConnectionStats(serverId: string) {
    const currentCount = this.connectionCounts.get(serverId) || 0;
    return {
      serverId,
      currentConnections: currentCount,
      maxConnections: this.MAX_CONNECTIONS_PER_SERVER,
      hasClient: this.clients.has(serverId),
      clientActive: this.clients.get(serverId)?.isConnectionActive() || false,
    };
  }
}
