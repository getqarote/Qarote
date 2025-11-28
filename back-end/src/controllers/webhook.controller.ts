import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { authenticate } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { CreateWebhookSchema, UpdateWebhookSchema } from "@/schemas/webhook";

const webhookController = new Hono();

// All webhook routes require authentication
webhookController.use("*", authenticate);

/**
 * Webhook API routes
 * Base path: /api/webhooks/workspaces/:workspaceId/webhooks
 */

// GET /api/webhooks/workspaces/:workspaceId/webhooks
// List all webhooks for a workspace
webhookController.get("/workspaces/:workspaceId/webhooks", async (c) => {
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

    const webhooks = await prisma.webhook.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ webhooks });
  } catch (error) {
    logger.error({ error }, "Error fetching webhooks");
    return c.json({ error: "Failed to fetch webhooks" }, 500);
  }
});

// GET /api/webhooks/workspaces/:workspaceId/webhooks/:id
// Get a specific webhook
webhookController.get("/workspaces/:workspaceId/webhooks/:id", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const webhookId = c.req.param("id");
  const user = c.get("user");

  // Verify workspace access
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        workspaceId,
      },
    });

    if (!webhook) {
      return c.json({ error: "Webhook not found" }, 404);
    }

    return c.json({ webhook });
  } catch (error) {
    logger.error({ error }, "Error fetching webhook");
    return c.json({ error: "Failed to fetch webhook" }, 500);
  }
});

// POST /api/webhooks/workspaces/:workspaceId/webhooks
// Create a new webhook
webhookController.post(
  "/workspaces/:workspaceId/webhooks",
  zValidator("json", CreateWebhookSchema),
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

      const webhook = await prisma.webhook.create({
        data: {
          workspaceId,
          url: data.url,
          enabled: data.enabled ?? true,
          secret: data.secret ?? null,
          version: "v1", // Internal version, always v1
        },
      });

      return c.json({ webhook }, 201);
    } catch (error) {
      logger.error({ error }, "Error creating webhook");
      return c.json({ error: "Failed to create webhook" }, 500);
    }
  }
);

// PUT /api/webhooks/workspaces/:workspaceId/webhooks/:id
// Update a webhook
webhookController.put(
  "/workspaces/:workspaceId/webhooks/:id",
  zValidator("json", UpdateWebhookSchema),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const webhookId = c.req.param("id");
    const user = c.get("user");
    const data = c.req.valid("json");

    // Verify workspace access
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify webhook exists and belongs to workspace
      const existingWebhook = await prisma.webhook.findFirst({
        where: {
          id: webhookId,
          workspaceId,
        },
      });

      if (!existingWebhook) {
        return c.json({ error: "Webhook not found" }, 404);
      }

      const webhook = await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          url: data.url,
          enabled: data.enabled,
          secret: data.secret,
          // version is not updatable, always stays as "v1"
        },
      });

      return c.json({ webhook });
    } catch (error) {
      logger.error({ error }, "Error updating webhook");
      return c.json({ error: "Failed to update webhook" }, 500);
    }
  }
);

// DELETE /api/webhooks/workspaces/:workspaceId/webhooks/:id
// Delete a webhook
webhookController.delete("/workspaces/:workspaceId/webhooks/:id", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const webhookId = c.req.param("id");
  const user = c.get("user");

  // Verify workspace access
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    // Verify webhook exists and belongs to workspace
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        workspaceId,
      },
    });

    if (!existingWebhook) {
      return c.json({ error: "Webhook not found" }, 404);
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    return c.json({ message: "Webhook deleted successfully" });
  } catch (error) {
    logger.error({ error }, "Error deleting webhook");
    return c.json({ error: "Failed to delete webhook" }, 500);
  }
});

export default webhookController;
