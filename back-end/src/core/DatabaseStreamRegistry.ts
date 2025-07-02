import { prisma } from "./prisma";
import { logger } from "./logger";

interface StreamInfo {
  id: string;
  userId: string;
  serverId: string;
  queueName: string;
  startTime: Date;
  serverInstance: string;
  lastHeartbeat: Date;
  status: "ACTIVE" | "STOPPING" | "STOPPED";
  duration: number;
}

class DatabaseStreamRegistry {
  private serverInstanceId: string;
  private heartbeatInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;
  private localCleanupFunctions = new Map<string, () => void>();

  constructor() {
    this.serverInstanceId = `server-${process.pid}-${Date.now()}`;

    // Heartbeat every 30 seconds to show this server instance is alive
    this.heartbeatInterval = setInterval(() => {
      this.updateHeartbeat();
    }, 30000);

    // Clean up stale streams every 2 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupStaleStreams();
      },
      2 * 60 * 1000
    );

    logger.info(
      `DatabaseStreamRegistry initialized with instance ID: ${this.serverInstanceId}`
    );
  }

  async register(
    streamId: string,
    cleanup: () => void,
    userId: string,
    serverId: string,
    queueName: string
  ): Promise<boolean> {
    try {
      // Store in database
      await prisma.activeStream.create({
        data: {
          id: streamId,
          userId,
          serverId,
          queueName,
          serverInstance: this.serverInstanceId,
          startTime: new Date(),
          lastHeartbeat: new Date(),
          status: "ACTIVE",
        },
      });

      // Store cleanup function locally (can't serialize functions to database)
      this.localCleanupFunctions.set(streamId, cleanup);

      const activeCount = await this.getActiveStreamCount();
      logger.info(
        `Stream registered in DB: ${streamId}, total active: ${activeCount}`
      );

      return true;
    } catch (error) {
      logger.error(`Error registering stream ${streamId}:`, error);
      return false;
    }
  }

  async stop(streamId: string): Promise<boolean> {
    try {
      // Find the stream in database
      const stream = await prisma.activeStream.findUnique({
        where: { id: streamId },
      });

      if (!stream) {
        logger.info(`Stream not found in DB: ${streamId}`);
        return false;
      }

      logger.info(
        `Stopping stream: ${streamId} (status: ${stream.status}, instance: ${stream.serverInstance})`
      );

      // Mark as stopping first
      await prisma.activeStream.update({
        where: { id: streamId },
        data: { status: "STOPPING" },
      });

      // If this stream belongs to our server instance, clean it up locally
      if (stream.serverInstance === this.serverInstanceId) {
        const cleanup = this.localCleanupFunctions.get(streamId);
        if (cleanup) {
          logger.info(`Executing local cleanup for stream: ${streamId}`);
          cleanup();
          this.localCleanupFunctions.delete(streamId);
        }
      } else {
        logger.info(
          `Stream ${streamId} belongs to different server instance: ${stream.serverInstance}`
        );
        // For cross-server cleanup, we could use PostgreSQL LISTEN/NOTIFY
        // or just rely on the stale stream cleanup mechanism
      }

      // Remove from database
      await prisma.activeStream.delete({
        where: { id: streamId },
      });

      logger.info(`Stream stopped and removed from DB: ${streamId}`);
      return true;
    } catch (error) {
      logger.error(`Error stopping stream ${streamId}:`, error);
      return false;
    }
  }

  async stopUserStreams(userId: string): Promise<number> {
    try {
      // Find all active streams for the user
      const userStreams = await prisma.activeStream.findMany({
        where: {
          userId,
          status: "ACTIVE",
        },
      });

      let stopped = 0;
      for (const stream of userStreams) {
        if (await this.stop(stream.id)) {
          stopped++;
        }
      }

      logger.info(`Stopped ${stopped} streams for user: ${userId}`);
      return stopped;
    } catch (error) {
      logger.error(`Error stopping user streams for ${userId}:`, error);
      return 0;
    }
  }

  async stopServerStreams(serverId: string): Promise<number> {
    try {
      const serverStreams = await prisma.activeStream.findMany({
        where: {
          serverId,
          status: "ACTIVE",
        },
      });

      let stopped = 0;
      for (const stream of serverStreams) {
        if (await this.stop(stream.id)) {
          stopped++;
        }
      }

      logger.info(`Stopped ${stopped} streams for server: ${serverId}`);
      return stopped;
    } catch (error) {
      logger.error(`Error stopping server streams for ${serverId}:`, error);
      return 0;
    }
  }

  async stopInstanceStreams(serverInstance?: string): Promise<number> {
    try {
      const instanceId = serverInstance || this.serverInstanceId;
      const instanceStreams = await prisma.activeStream.findMany({
        where: {
          serverInstance: instanceId,
          status: "ACTIVE",
        },
      });

      let stopped = 0;
      for (const stream of instanceStreams) {
        if (await this.stop(stream.id)) {
          stopped++;
        }
      }

      logger.info(
        `Stopped ${stopped} streams for server instance: ${instanceId}`
      );
      return stopped;
    } catch (error) {
      logger.error(
        `Error stopping instance streams for ${serverInstance}:`,
        error
      );
      return 0;
    }
  }

  async getActiveStreams(): Promise<StreamInfo[]> {
    try {
      const streams = await prisma.activeStream.findMany({
        where: { status: "ACTIVE" },
        orderBy: { startTime: "desc" },
      });

      const now = Date.now();
      return streams.map((stream) => ({
        id: stream.id,
        userId: stream.userId,
        serverId: stream.serverId,
        queueName: stream.queueName,
        startTime: stream.startTime,
        serverInstance: stream.serverInstance,
        lastHeartbeat: stream.lastHeartbeat,
        status: stream.status as "ACTIVE" | "STOPPING" | "STOPPED",
        duration: now - stream.startTime.getTime(),
      }));
    } catch (error) {
      logger.error({ error }, "Error fetching active streams");
      return [];
    }
  }

  async getUserStreams(userId: string): Promise<StreamInfo[]> {
    try {
      const streams = await prisma.activeStream.findMany({
        where: {
          userId,
          status: "ACTIVE",
        },
        orderBy: { startTime: "desc" },
      });

      const now = Date.now();
      return streams.map((stream) => ({
        id: stream.id,
        userId: stream.userId,
        serverId: stream.serverId,
        queueName: stream.queueName,
        startTime: stream.startTime,
        serverInstance: stream.serverInstance,
        lastHeartbeat: stream.lastHeartbeat,
        status: stream.status as "ACTIVE" | "STOPPING" | "STOPPED",
        duration: now - stream.startTime.getTime(),
      }));
    } catch (error) {
      logger.error(`Error fetching user streams for ${userId}:`, error);
      return [];
    }
  }

  async getActiveStreamCount(): Promise<number> {
    try {
      return await prisma.activeStream.count({
        where: { status: "ACTIVE" },
      });
    } catch (error) {
      logger.error({ error }, "Error counting active streams");
      return 0;
    }
  }

  async getStreamsByServer(): Promise<Record<string, StreamInfo[]>> {
    try {
      const streams = await this.getActiveStreams();

      return streams.reduce(
        (acc, stream) => {
          if (!acc[stream.serverId]) {
            acc[stream.serverId] = [];
          }
          acc[stream.serverId].push(stream);
          return acc;
        },
        {} as Record<string, StreamInfo[]>
      );
    } catch (error) {
      logger.error({ error }, "Error grouping streams by server");
      return {};
    }
  }

  private async updateHeartbeat() {
    try {
      // Update heartbeat for all streams on this server instance
      const updated = await prisma.activeStream.updateMany({
        where: {
          serverInstance: this.serverInstanceId,
          status: "ACTIVE",
        },
        data: {
          lastHeartbeat: new Date(),
        },
      });

      if (updated.count > 0) {
        logger.info(
          `Updated heartbeat for ${updated.count} streams on instance ${this.serverInstanceId}`
        );
      }
    } catch (error) {
      logger.error({ error }, "Error updating heartbeat");
    }
  }

  private async cleanupStaleStreams() {
    try {
      // Consider streams stale if no heartbeat for 5 minutes
      const staleTime = new Date(Date.now() - 5 * 60 * 1000);

      const staleStreams = await prisma.activeStream.findMany({
        where: {
          lastHeartbeat: { lt: staleTime },
          status: "ACTIVE",
        },
      });

      let cleanedUp = 0;
      for (const stream of staleStreams) {
        logger.info(
          `Cleaning up stale stream: ${stream.id} (last heartbeat: ${stream.lastHeartbeat})`
        );

        // If it's our stream, clean up locally too
        if (stream.serverInstance === this.serverInstanceId) {
          const cleanup = this.localCleanupFunctions.get(stream.id);
          if (cleanup) {
            cleanup();
            this.localCleanupFunctions.delete(stream.id);
          }
        }

        // Remove from database
        await prisma.activeStream.delete({
          where: { id: stream.id },
        });

        cleanedUp++;
      }

      if (cleanedUp > 0) {
        logger.info(`Cleaned up ${cleanedUp} stale streams`);
      }
    } catch (error) {
      logger.error({ error }, "Error cleaning up stale streams");
    }
  }

  async getHealthStats() {
    try {
      const [
        totalActive,
        totalStopping,
        myInstanceStreams,
        serverInstances,
        oldestStream,
        allActiveStreams,
      ] = await Promise.all([
        prisma.activeStream.count({ where: { status: "ACTIVE" } }),
        prisma.activeStream.count({ where: { status: "STOPPING" } }),
        prisma.activeStream.count({
          where: {
            serverInstance: this.serverInstanceId,
            status: "ACTIVE",
          },
        }),
        prisma.activeStream.groupBy({
          by: ["serverInstance"],
          where: { status: "ACTIVE" },
          _count: { serverInstance: true },
        }),
        prisma.activeStream.findFirst({
          where: { status: "ACTIVE" },
          orderBy: { startTime: "asc" },
        }),
        // Get average start time for duration calculation
        prisma.activeStream.findMany({
          where: { status: "ACTIVE" },
          select: { startTime: true },
        }),
      ]);

      const now = Date.now();

      // Calculate average duration from all active streams
      let avgDuration = 0;
      if (allActiveStreams.length > 0) {
        const totalDuration = allActiveStreams.reduce((sum, stream) => {
          return sum + (now - stream.startTime.getTime());
        }, 0);
        avgDuration = totalDuration / allActiveStreams.length;
      }

      return {
        totalActiveStreams: totalActive,
        totalStoppingStreams: totalStopping,
        myInstanceStreams,
        serverInstanceCount: serverInstances.length,
        serverInstances: serverInstances.map((si) => ({
          instance: si.serverInstance,
          streamCount: si._count.serverInstance,
        })),
        oldestStreamAge: oldestStream
          ? now - oldestStream.startTime.getTime()
          : 0,
        averageStreamDuration: avgDuration,
        myInstanceId: this.serverInstanceId,
      };
    } catch (error) {
      logger.error({ error }, "Error getting health stats");
      return null;
    }
  }

  async cleanup() {
    logger.info("Cleaning up DatabaseStreamRegistry...");

    try {
      // Stop intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Clean up all streams for this server instance
      const stoppedCount = await this.stopInstanceStreams();
      logger.info(
        `DatabaseStreamRegistry cleanup complete: stopped ${stoppedCount} streams`
      );
    } catch (error) {
      logger.error({ error }, "Error during DatabaseStreamRegistry cleanup");
    }
  }
}

export const streamRegistry = new DatabaseStreamRegistry();
