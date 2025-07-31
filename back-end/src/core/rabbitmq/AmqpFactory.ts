import { logger } from "@/core/logger";
import { redis } from "@/core/redis";
import { AMQPConnectionConfig, RabbitMQAmqpClient } from "./AmqpClient";

/**
 * Factory class to create AMQP clients for different RabbitMQ servers
 * Uses Redis for distributed connection coordination across multiple production servers
 */
export class RabbitMQAmqpClientFactory {
  private static clients = new Map<string, RabbitMQAmqpClient>();
  private static readonly MAX_CONNECTIONS_PER_SERVER = 3;

  /**
   * Create an AMQP client for a specific RabbitMQ server with Redis coordination
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

    // Check global connection count via Redis
    const canCreate = await redis.canCreateConnection(
      serverConfig.id,
      this.MAX_CONNECTIONS_PER_SERVER
    );

    if (!canCreate) {
      const currentCount = await redis.getConnectionCount(serverConfig.id);
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

    // Register in Redis
    await redis.registerConnection(serverConfig.id, serverConfig.name);

    this.clients.set(serverConfig.id, client);

    const activeConnections = await redis.getConnectionCount(serverConfig.id);
    logger.info(`AMQP client created and registered in Redis`, {
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
   * Remove client from cache and Redis (when disconnected)
   */
  static async removeClient(serverId: string): Promise<void> {
    this.clients.delete(serverId);

    // Remove from Redis
    await redis.removeConnection(serverId);

    logger.info(`AMQP client removed from cache and Redis`, {
      serverId,
    });
  }

  /**
   * Cleanup all clients and Redis entries
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

    // Cleanup all Redis connections for this node
    await redis.cleanupAllConnections();
  }

  /**
   * Get connection statistics for a server
   */
  static async getConnectionStats(serverId: string) {
    return await redis.getConnectionStats(
      serverId,
      this.MAX_CONNECTIONS_PER_SERVER
    );
  }
}
