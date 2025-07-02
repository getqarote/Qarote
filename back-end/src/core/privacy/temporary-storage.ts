import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import type { CacheStats, CleanupResult } from "./types";
import { logger } from "../logger";

/**
 * PostgreSQL-based temporary storage for non-persistent data with TTL
 */
export class TemporaryStorage {
  /**
   * Clean up expired entries
   */
  private static async cleanupExpired(): Promise<void> {
    try {
      await prisma.tempCache.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      });
    } catch (error) {
      logger.error({ error }, "Error cleaning up expired cache entries");
    }
  }

  static async set(
    key: string,
    value: Prisma.InputJsonValue,
    ttlMinutes: number = 30
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await prisma.tempCache.upsert({
        where: { key },
        update: {
          value: value,
          expiresAt: expiresAt,
          createdAt: new Date(),
        },
        create: {
          key,
          value: value,
          expiresAt: expiresAt,
        },
      });

      // Periodically clean up expired entries (every 100 operations)
      if (Math.random() < 0.01) {
        setImmediate(() => this.cleanupExpired());
      }
    } catch (error) {
      logger.error({ error }, "Error setting cache value");
      throw new Error("Failed to store temporary data");
    }
  }

  static async get(key: string): Promise<Prisma.JsonValue | null> {
    try {
      const cached = await prisma.tempCache.findUnique({
        where: { key },
      });

      if (!cached) {
        return null;
      }

      // Check if expired
      if (cached.expiresAt <= new Date()) {
        // Clean up expired entry
        await prisma.tempCache.delete({
          where: { key },
        });
        return null;
      }

      return cached.value;
    } catch (error) {
      logger.error({ error }, "Error getting cache value");
      return null;
    }
  }

  static async delete(key: string): Promise<boolean> {
    try {
      await prisma.tempCache.delete({
        where: { key },
      });
      return true;
    } catch (error) {
      // Key might not exist
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const cached = await prisma.tempCache.findUnique({
        where: { key },
        select: { expiresAt: true },
      });

      if (!cached) {
        return false;
      }

      // Check if expired
      if (cached.expiresAt <= new Date()) {
        // Clean up expired entry
        await prisma.tempCache.delete({
          where: { key },
        });
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a consistent key for user data
   */
  private static generateKey(
    userId: string,
    dataType: string,
    identifier?: string
  ): string {
    const base = `user:${userId}:${dataType}`;
    return identifier ? `${base}:${identifier}` : base;
  }

  /**
   * Store user-specific data temporarily
   */
  static async setUserData(
    userId: string,
    dataType: string,
    value: Prisma.InputJsonValue,
    ttlMinutes: number = 30,
    identifier?: string
  ): Promise<void> {
    const key = this.generateKey(userId, dataType, identifier);
    return this.set(key, value, ttlMinutes);
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<CacheStats> {
    try {
      const result = await prisma.$queryRaw<
        Array<{
          total_keys: bigint;
          total_size: bigint;
          oldest_entry?: Date;
        }>
      >`
        SELECT 
          COUNT(*) as total_keys,
          SUM(octet_length(value::text)) as total_size,
          MIN(created_at) as oldest_entry
        FROM temp_cache 
        WHERE expires_at > NOW()
      `;

      const stats = result[0];

      return {
        totalKeys: Number(stats.total_keys),
        memoryUsage: `${Math.round(Number(stats.total_size) / 1024)}KB`,
        oldestEntry: stats.oldest_entry,
      };
    } catch (error) {
      logger.error({ error }, "Error getting cache stats");
      return {
        totalKeys: 0,
        memoryUsage: "0KB",
      };
    }
  }

  /**
   * Manual cleanup of expired entries (can be called by a cron job)
   */
  static async cleanup(): Promise<CleanupResult> {
    try {
      const result = await prisma.tempCache.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      });

      return { deletedCount: result.count };
    } catch (error) {
      logger.error({ error }, "Error during manual cleanup");
      return { deletedCount: 0 };
    }
  }

  /**
   * Set TTL for an existing key
   */
  static async setTTL(key: string, ttlMinutes: number): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      const result = await prisma.tempCache.updateMany({
        where: { key },
        data: { expiresAt },
      });

      return result.count > 0;
    } catch (error) {
      logger.error({ error }, "Error setting TTL");
      return false;
    }
  }

  /**
   * Get user-specific data
   */
  static async getUserData(
    userId: string,
    dataType: string,
    identifier?: string
  ): Promise<Prisma.JsonValue | null> {
    const key = this.generateKey(userId, dataType, identifier);
    return this.get(key);
  }

  /**
   * Initialize periodic cleanup (call this once at application startup)
   */
  static startPeriodicCleanup(intervalMinutes: number = 60): NodeJS.Timeout {
    const cleanup = async () => {
      try {
        const result = await this.cleanup();
        if (result.deletedCount > 0) {
          logger.info(
            `Cache cleanup: removed ${result.deletedCount} expired entries`
          );
        }
      } catch (error) {
        logger.error({ error }, "Periodic cache cleanup failed");
      }
    };

    // Run cleanup immediately and then periodically
    cleanup();
    return setInterval(cleanup, intervalMinutes * 60 * 1000);
  }
}
