import { Hono } from "hono";
import { logger } from "@/core/logger";
import { createRabbitMQClient } from "./shared";
import { createErrorResponse } from "../shared";

const infrastructureController = new Hono();

/**
 * Get all nodes for a specific server
 * GET /servers/:id/nodes
 */
infrastructureController.get("/servers/:id/nodes", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const client = await createRabbitMQClient(id, user.workspaceId);
    const nodes = await client.getNodes();
    return c.json({ nodes });
  } catch (error) {
    logger.error({ error, id }, "Error fetching nodes for server");

    // Check if this is a 401 Unauthorized error from RabbitMQ API
    if (error instanceof Error && error.message.includes("401")) {
      return c.json(
        {
          error: "insufficient_permissions",
          message:
            "User does not have 'monitor' permissions to view node information. Please contact your RabbitMQ administrator to grant the necessary permissions.",
          code: "RABBITMQ_INSUFFICIENT_PERMISSIONS",
          requiredPermission: "monitor",
        },
        403 // Use 403 Forbidden to indicate authorization issue
      );
    }

    return createErrorResponse(c, error, 500, "Failed to fetch nodes");
  }
});

/**
 * Get all exchanges for a specific server
 * GET /servers/:id/exchanges
 */
infrastructureController.get("/servers/:id/exchanges", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const client = await createRabbitMQClient(id, user.workspaceId);
    const exchanges = await client.getExchanges();
    return c.json({ exchanges });
  } catch (error) {
    logger.error(`Error fetching exchanges for server ${id}:`, error);
    return createErrorResponse(c, error, 500, "Failed to fetch exchanges");
  }
});

/**
 * Create a new exchange
 * POST /servers/:id/exchanges
 */
infrastructureController.post("/servers/:id/exchanges", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const body = await c.req.json();
    const {
      name,
      type,
      durable,
      auto_delete,
      internal,
      arguments: args,
    } = body;

    if (!name || !type) {
      return c.json(
        { error: "Exchange name and type are required" },
        { status: 400 }
      );
    }

    // Validate exchange type
    const validTypes = ["direct", "fanout", "topic", "headers"];
    if (!validTypes.includes(type)) {
      return c.json(
        {
          error: `Invalid exchange type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const client = await createRabbitMQClient(id, user.workspaceId);
    await client.createExchange(name, type, {
      durable: durable ?? true,
      auto_delete: auto_delete ?? false,
      internal: internal ?? false,
      arguments: args ?? {},
    });

    return c.json({
      success: true,
      message: `Exchange "${name}" created successfully`,
      exchange: {
        name,
        type,
        durable: durable ?? true,
        auto_delete: auto_delete ?? false,
        internal: internal ?? false,
        arguments: args ?? {},
      },
    });
  } catch (error) {
    logger.error(`Error creating exchange for server ${id}:`, error);
    return createErrorResponse(c, error, 500, "Failed to create exchange");
  }
});

/**
 * Delete an exchange
 * DELETE /servers/:id/exchanges/:exchangeName
 */
infrastructureController.delete(
  "/servers/:id/exchanges/:exchangeName",
  async (c) => {
    const id = c.req.param("id");
    const exchangeName = c.req.param("exchangeName");
    const user = c.get("user");

    try {
      const url = new URL(c.req.url);
      const ifUnused = url.searchParams.get("if_unused") === "true";

      const client = await createRabbitMQClient(id, user.workspaceId);
      await client.deleteExchange(exchangeName, {
        if_unused: ifUnused,
      });

      return c.json({
        success: true,
        message: `Exchange "${exchangeName}" deleted successfully`,
      });
    } catch (error) {
      logger.error(
        `Error deleting exchange "${exchangeName}" for server ${id}:`,
        error
      );
      return createErrorResponse(c, error, 500, "Failed to delete exchange");
    }
  }
);

/**
 * Get all connections for a specific server
 * GET /servers/:id/connections
 */
infrastructureController.get("/servers/:id/connections", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const client = await createRabbitMQClient(id, user.workspaceId);
    const connections = await client.getConnections();
    return c.json({ connections });
  } catch (error) {
    logger.error(`Error fetching connections for server ${id}:`, error);
    return createErrorResponse(c, error, 500, "Failed to fetch connections");
  }
});

/**
 * Get all channels for a specific server
 * GET /servers/:id/channels
 */
infrastructureController.get("/servers/:id/channels", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const client = await createRabbitMQClient(id, user.workspaceId);
    const channels = await client.getChannels();
    return c.json({ channels });
  } catch (error) {
    logger.error(`Error fetching channels for server ${id}:`, error);
    return createErrorResponse(c, error, 500, "Failed to fetch channels");
  }
});

export default infrastructureController;
