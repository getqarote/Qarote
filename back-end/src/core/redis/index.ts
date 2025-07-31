import os from "node:os";
import Redis from "ioredis";
import { config, redisConfig } from "@/config";
import { logger } from "@/core/logger";

/**
 * Redis Client for Connection Management
 * Handles distributed coordination across multiple production servers
 */
export class RedisService {
  private redis: Redis;
  private readonly CONNECTION_TTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis(redisConfig.url, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.redis.on("connect", () => {
      logger.info("Redis connected for connection management");
    });

    this.redis.on("error", (error) => {
      logger.error({ error }, "Redis connection error");
    });

    this.redis.on("close", () => {
      logger.warn("Redis connection closed");
    });
  }

  /**
   * Get the current node ID
   */
  private getNodeId(): string {
    return config.NODE_ID || os.hostname();
  }

  /**
   * Get connection key for a server
   */
  private getConnectionKey(serverId: string): string {
    return `rabbitmq:connections:${serverId}`;
  }

  /**
   * Check if we can create a new connection for a server
   */
  async canCreateConnection(
    serverId: string,
    maxConnections: number
  ): Promise<boolean> {
    try {
      const connectionKey = this.getConnectionKey(serverId);
      const activeConnections = await this.redis.hlen(connectionKey);
      return activeConnections < maxConnections;
    } catch (error) {
      logger.warn(
        { error },
        "Failed to check connection limit in Redis, allowing connection"
      );
      return true; // Fail open - allow connection if Redis is down
    }
  }

  /**
   * Get current connection count for a server
   */
  async getConnectionCount(serverId: string): Promise<number> {
    try {
      const connectionKey = this.getConnectionKey(serverId);
      return await this.redis.hlen(connectionKey);
    } catch (error) {
      logger.warn({ error }, "Failed to get connection count from Redis");
      return 0;
    }
  }

  /**
   * Register a new connection in Redis
   */
  async registerConnection(
    serverId: string,
    serverName: string
  ): Promise<void> {
    try {
      const connectionKey = this.getConnectionKey(serverId);
      const nodeId = this.getNodeId();

      await this.redis.hset(
        connectionKey,
        nodeId,
        JSON.stringify({
          nodeId,
          createdAt: new Date().toISOString(),
          serverId,
          serverName,
        })
      );

      // Set TTL for the hash key
      await this.redis.expire(connectionKey, this.CONNECTION_TTL);

      logger.debug("Connection registered in Redis", {
        serverId,
        nodeId,
        serverName,
      });
    } catch (error) {
      logger.warn({ error }, "Failed to register connection in Redis");
      // Don't throw - connection can still work without Redis
    }
  }

  /**
   * Remove a connection from Redis
   */
  async removeConnection(serverId: string): Promise<void> {
    try {
      const connectionKey = this.getConnectionKey(serverId);
      const nodeId = this.getNodeId();

      await this.redis.hdel(connectionKey, nodeId);

      logger.debug("Connection removed from Redis", {
        serverId,
        nodeId,
      });
    } catch (error) {
      logger.warn({ error }, "Failed to remove connection from Redis");
      // Don't throw - this is cleanup
    }
  }

  /**
   * Get connection statistics for a server
   */
  async getConnectionStats(
    serverId: string,
    maxConnections: number
  ): Promise<{
    serverId: string;
    activeConnections: number;
    maxConnections: number;
    connections: Array<{
      nodeId: string;
      createdAt: string;
      serverId: string;
      serverName: string;
    }>;
  }> {
    try {
      const connectionKey = this.getConnectionKey(serverId);
      const connections = await this.redis.hgetall(connectionKey);

      return {
        serverId,
        activeConnections: Object.keys(connections).length,
        maxConnections,
        connections: Object.entries(connections).map(([nodeId, data]) => ({
          nodeId,
          ...JSON.parse(data),
        })),
      };
    } catch (error) {
      logger.warn({ error }, "Failed to get connection stats from Redis");
      return {
        serverId,
        activeConnections: 0,
        maxConnections,
        connections: [],
      };
    }
  }

  /**
   * Clean up all connections for the current node
   */
  async cleanupAllConnections(): Promise<void> {
    try {
      const nodeId = this.getNodeId();
      const pattern = "rabbitmq:connections:*";

      // Get all connection keys
      const keys = await this.redis.keys(pattern);

      // Remove this node from all connection hashes
      const pipeline = this.redis.pipeline();
      for (const key of keys) {
        pipeline.hdel(key, nodeId);
      }

      await pipeline.exec();

      logger.info("Cleaned up all Redis connections for node", { nodeId });
    } catch (error) {
      logger.warn({ error }, "Failed to cleanup Redis connections");
    }
  }

  /**
   * Check Redis health
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.redis.ping();
      return response === "PONG";
    } catch (error) {
      logger.error({ error }, "Redis health check failed");
      return false;
    }
  }

  /**
   * General Redis operations for other services
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      await this.redis.hset(key, field, value);
    } catch (error) {
      logger.error({ error, key, field }, "Redis HSET operation failed");
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.redis.hget(key, field);
    } catch (error) {
      logger.error({ error, key, field }, "Redis HGET operation failed");
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      await this.redis.hdel(key, field);
    } catch (error) {
      logger.error({ error, key, field }, "Redis HDEL operation failed");
      throw error;
    }
  }

  async hkeys(key: string): Promise<string[]> {
    try {
      return await this.redis.hkeys(key);
    } catch (error) {
      logger.error({ error, key }, "Redis HKEYS operation failed");
      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.cleanupAllConnections();
      await this.redis.quit();
      logger.info("Redis connection closed");
    } catch (error) {
      logger.warn({ error }, "Error closing Redis connection");
    }
  }
}

export const redis = new RedisService();
