import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { authenticate } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import {
  CreateSlackConfigSchema,
  UpdateSlackConfigSchema,
} from "@/schemas/slack";

const slackController = new Hono();

// All Slack routes require authentication
slackController.use("*", authenticate);

/**
 * Slack API routes
 * Base path: /api/slack/workspaces/:workspaceId/slack-configs
 */

// GET /api/slack/workspaces/:workspaceId/slack-configs
// List all Slack configurations for a workspace
slackController.get("/workspaces/:workspaceId/slack-configs", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user");

  // Verify workspace access
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    const slackConfigs = await prisma.slackConfig.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ slackConfigs });
  } catch (error) {
    logger.error({ error }, "Error fetching Slack configurations");
    return c.json({ error: "Failed to fetch Slack configurations" }, 500);
  }
});

// GET /api/slack/workspaces/:workspaceId/slack-configs/:id
// Get a specific Slack configuration
slackController.get("/workspaces/:workspaceId/slack-configs/:id", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const slackConfigId = c.req.param("id");
  const user = c.get("user");

  // Verify workspace access
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    const slackConfig = await prisma.slackConfig.findFirst({
      where: {
        id: slackConfigId,
        workspaceId,
      },
    });

    if (!slackConfig) {
      return c.json({ error: "Slack configuration not found" }, 404);
    }

    return c.json({ slackConfig });
  } catch (error) {
    logger.error({ error }, "Error fetching Slack configuration");
    return c.json({ error: "Failed to fetch Slack configuration" }, 500);
  }
});

// POST /api/slack/workspaces/:workspaceId/slack-configs
// Create a new Slack configuration
slackController.post(
  "/workspaces/:workspaceId/slack-configs",
  zValidator("json", CreateSlackConfigSchema),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");
    const data = c.req.valid("json");

    // Verify workspace access
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const slackConfig = await prisma.slackConfig.create({
        data: {
          workspaceId,
          webhookUrl: data.webhookUrl,
          customValue: data.customValue ?? null,
          enabled: data.enabled ?? true,
        },
      });

      return c.json({ slackConfig }, 201);
    } catch (error) {
      logger.error({ error }, "Error creating Slack configuration");
      return c.json({ error: "Failed to create Slack configuration" }, 500);
    }
  }
);

// PUT /api/slack/workspaces/:workspaceId/slack-configs/:id
// Update a Slack configuration
slackController.put(
  "/workspaces/:workspaceId/slack-configs/:id",
  zValidator("json", UpdateSlackConfigSchema),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const slackConfigId = c.req.param("id");
    const user = c.get("user");
    const data = c.req.valid("json");

    // Verify workspace access
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify Slack config exists and belongs to workspace
      const existingConfig = await prisma.slackConfig.findFirst({
        where: {
          id: slackConfigId,
          workspaceId,
        },
      });

      if (!existingConfig) {
        return c.json({ error: "Slack configuration not found" }, 404);
      }

      const slackConfig = await prisma.slackConfig.update({
        where: { id: slackConfigId },
        data: {
          ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl }),
          ...(data.customValue !== undefined && {
            customValue: data.customValue,
          }),
          ...(data.enabled !== undefined && { enabled: data.enabled }),
        },
      });

      return c.json({ slackConfig });
    } catch (error) {
      logger.error({ error }, "Error updating Slack configuration");
      return c.json({ error: "Failed to update Slack configuration" }, 500);
    }
  }
);

// DELETE /api/slack/workspaces/:workspaceId/slack-configs/:id
// Delete a Slack configuration
slackController.delete(
  "/workspaces/:workspaceId/slack-configs/:id",
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const slackConfigId = c.req.param("id");
    const user = c.get("user");

    // Verify workspace access
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify Slack config exists and belongs to workspace
      const existingConfig = await prisma.slackConfig.findFirst({
        where: {
          id: slackConfigId,
          workspaceId,
        },
      });

      if (!existingConfig) {
        return c.json({ error: "Slack configuration not found" }, 404);
      }

      await prisma.slackConfig.delete({
        where: { id: slackConfigId },
      });

      return c.json({ message: "Slack configuration deleted successfully" });
    } catch (error) {
      logger.error({ error }, "Error deleting Slack configuration");
      return c.json({ error: "Failed to delete Slack configuration" }, 500);
    }
  }
);

export default slackController;
