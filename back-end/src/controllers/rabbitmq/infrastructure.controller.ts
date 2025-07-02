import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import { planValidationMiddleware } from "@/middlewares/plan-validation";
import { logger } from "@/core/logger";
import { createRabbitMQClient, createErrorResponse } from "./shared";

const infrastructureController = new Hono();

// Apply authentication and plan validation middleware
infrastructureController.use("*", authenticate);
infrastructureController.use("*", planValidationMiddleware());

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
