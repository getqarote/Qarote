import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/core/prisma";
import { authenticate } from "@/core/auth";
import { logger } from "@/core/logger";
import {
  messageHistorySearchSchema,
  messageHistoryStatsSchema,
} from "@/schemas/message-history";
import {
  PlanValidationError,
  getPlanLimits,
} from "@/services/plan-validation.service";

const messageHistoryController = new Hono();

// Apply authentication middleware
messageHistoryController.use("*", authenticate);

// Get message history with advanced search
messageHistoryController.get(
  "/search",
  zValidator("query", messageHistorySearchSchema),
  async (c) => {
    const user = c.get("user");
    const {
      serverId,
      queueName,
      startDate,
      endDate,
      content,
      routingKey,
      exchange,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = c.req.valid("query");

    try {
      // Get user's workspace and plan
      const userData = await prisma.user.findFirst({
        where: { id: user.id },
        include: { workspace: true },
      });

      if (!userData || !userData.workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const planLimits = getPlanLimits(userData.workspace.plan);

      // Check if user has access to message history
      if (!planLimits.canAccessMessageHistory) {
        throw new PlanValidationError(
          "Message History",
          userData.workspace.plan,
          "FREELANCE or higher"
        );
      }

      // Verify server belongs to workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id: serverId,
          workspaceId: userData.workspaceId,
        },
      });

      if (!server) {
        return c.json({ error: "Server not found" }, 404);
      }

      // TODO: Once migration is applied, replace this with actual database query
      // For now, return empty results with proper structure
      const messages: any[] = [];
      const totalCount = 0;

      return c.json({
        messages,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        planLimits: {
          canAccessMessageHistory: planLimits.canAccessMessageHistory,
          availableRetentionPeriods: planLimits.availableRetentionPeriods,
          maxMessageHistoryStorage: planLimits.maxMessageHistoryStorage,
          canConfigureRetention: planLimits.canConfigureRetention,
        },
      });
    } catch (error) {
      if (error instanceof PlanValidationError) {
        return c.json(
          {
            error: error.message,
            feature: error.feature,
            currentPlan: error.currentPlan,
            requiredPlan: error.requiredPlan,
          },
          403
        );
      }

      logger.error("Error searching message history:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

// Get message history statistics
messageHistoryController.get(
  "/stats",
  zValidator("query", messageHistoryStatsSchema),
  async (c) => {
    const user = c.get("user");
    const { serverId, queueName, days } = c.req.valid("query");

    try {
      // Get user's workspace and plan
      const userData = await prisma.user.findFirst({
        where: { id: user.id },
        include: { workspace: true },
      });

      if (!userData || !userData.workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const planLimits = getPlanLimits(userData.workspace.plan);

      // Check if user has access to message history
      if (!planLimits.canAccessMessageHistory) {
        throw new PlanValidationError(
          "Message History",
          userData.workspace.plan,
          "FREELANCE or higher"
        );
      }

      // Verify server belongs to workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id: serverId,
          workspaceId: userData.workspaceId,
        },
      });

      if (!server) {
        return c.json({ error: "Server not found" }, 404);
      }

      // TODO: Once migration is applied, replace this with actual database queries
      const stats = {
        totalMessages: 0,
        messagesByState: {
          acked: 0,
          nacked: 0,
          rejected: 0,
          returned: 0,
        },
        uniqueQueues: 0,
        avgPayloadSize: 0,
        timeRange: {
          startDate: new Date(
            Date.now() - days * 24 * 60 * 60 * 1000
          ).toISOString(),
          endDate: new Date().toISOString(),
          days,
        },
      };

      return c.json({
        stats,
        planLimits: {
          canAccessMessageHistory: planLimits.canAccessMessageHistory,
          availableRetentionPeriods: planLimits.availableRetentionPeriods,
          maxMessageHistoryStorage: planLimits.maxMessageHistoryStorage,
          canConfigureRetention: planLimits.canConfigureRetention,
        },
      });
    } catch (error) {
      if (error instanceof PlanValidationError) {
        return c.json(
          {
            error: error.message,
            feature: error.feature,
            currentPlan: error.currentPlan,
            requiredPlan: error.requiredPlan,
          },
          403
        );
      }

      logger.error("Error getting message history stats:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

export { messageHistoryController };
