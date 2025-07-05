import { Hono } from "hono";
import { authorize } from "@/core/auth";
import { UserRole } from "@prisma/client";
import { streamRegistry } from "@/core/DatabaseStreamRegistry";
import { logger } from "@/core/logger";
import { createErrorResponse } from "../shared";

const adminController = new Hono();

// Apply authentication and plan validation middleware
adminController.use("*", authorize([UserRole.ADMIN]));

/**
 * Enhanced admin endpoints for monitoring (ADMIN ONLY)
 * GET /admin/streams
 */
adminController.get("/admin/streams", async (c) => {
  const user = c.get("user");

  try {
    const [activeStreams, userStreams, streamsByServer, healthStats] =
      await Promise.all([
        streamRegistry.getActiveStreams(),
        streamRegistry.getUserStreams(user.id),
        streamRegistry.getStreamsByServer(),
        streamRegistry.getHealthStats(),
      ]);

    return c.json({
      success: true,
      summary: {
        totalStreams: activeStreams.length,
        userStreams: userStreams.length,
        serverCount: Object.keys(streamsByServer).length,
        ...healthStats,
      },
      userStreams: userStreams.map((stream) => ({
        streamId: stream.id.split(":").slice(-1)[0], // Only timestamp
        serverId: stream.serverId,
        queueName: stream.queueName,
        duration: stream.duration,
        serverInstance: stream.serverInstance,
        lastHeartbeat: stream.lastHeartbeat,
      })),
      streamsByServer: Object.entries(streamsByServer).map(
        ([serverId, streams]) => ({
          serverId,
          streamCount: streams.length,
          streams: streams.map((s) => ({
            queueName: s.queueName,
            userId: s.userId,
            duration: s.duration,
            serverInstance: s.serverInstance,
          })),
        })
      ),
    });
  } catch (error) {
    logger.error({ error }, "Error fetching active streams");
    return createErrorResponse(c, error, 500, "Failed to fetch active streams");
  }
});

/**
 * Stop all user streams (ADMIN ONLY)
 * POST /streams/stop-all
 */
adminController.post("/streams/stop-all", async (c) => {
  const user = c.get("user");

  try {
    const stoppedCount = await streamRegistry.stopUserStreams(user.id);
    const remainingStreams = await streamRegistry.getActiveStreamCount();

    logger.info(
      `Stopped all streams for user: ${user.id}, count: ${stoppedCount}`
    );

    return c.json({
      success: true,
      message: `Stopped ${stoppedCount} active streams`,
      stoppedStreams: stoppedCount,
      remainingStreams,
    });
  } catch (error) {
    logger.error({ error }, "Error stopping all user streams");
    return createErrorResponse(c, error, 500, "Failed to stop all streams");
  }
});

/**
 * Health check endpoint
 * Stream health monitoring (ADMIN ONLY)
 * GET /streams/health
 */
adminController.get("/streams/health", async (c) => {
  try {
    const healthStats = await streamRegistry.getHealthStats();

    return c.json({
      success: true,
      health: healthStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, "Error fetching stream health");
    return createErrorResponse(c, error, 500, "Failed to fetch stream health");
  }
});

export default adminController;
