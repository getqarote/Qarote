import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { logger } from "@/core/logger";

import { ServerParamSchema } from "@/schemas/alerts";
import {
  VHostOptionalQuerySchema,
  VHostRequiredQuerySchema,
} from "@/schemas/rabbitmq";

import { NodesResponse } from "@/types/api-responses";

import { BindingMapper, ExchangeMapper, NodeMapper } from "@/mappers/rabbitmq";

import { createErrorResponse, getWorkspaceId } from "../shared";
import { createRabbitMQClient, verifyServerAccess } from "./shared";

const infrastructureController = new Hono();

/**
 * Get all nodes for a specific server
 * GET /workspaces/:workspaceId/servers/:id/nodes
 */
infrastructureController.get(
  "/servers/:id/nodes",
  zValidator("param", ServerParamSchema),
  async (c) => {
    const id = c.req.param("id");
    const workspaceId = getWorkspaceId(c);
    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(id, workspaceId);
      const nodes = await client.getNodes();

      // Map nodes to API response format (only include fields used by front-end)
      const mappedNodes = NodeMapper.toApiResponseArray(nodes);

      return c.json({ nodes: mappedNodes });
    } catch (error) {
      logger.error({ error, id }, "Error fetching nodes for server");

      // Check if this is a 401 Unauthorized error from RabbitMQ API
      if (error instanceof Error && error.message.includes("401")) {
        return c.json({
          nodes: null,
          permissionStatus: {
            hasPermission: false,
            requiredPermission: "monitor",
            message:
              "User does not have 'monitor' permissions to view node information. Please contact your RabbitMQ administrator to grant the necessary permissions.",
          },
        } satisfies NodesResponse);
      }

      return createErrorResponse(c, error, 500, "Failed to fetch nodes");
    }
  }
);

/**
 * Get all exchanges for a specific server
 * GET /workspaces/:workspaceId/servers/:id/exchanges
 */
infrastructureController.get(
  "/servers/:id/exchanges",
  zValidator("param", ServerParamSchema),
  zValidator("query", VHostOptionalQuerySchema),
  async (c) => {
    const id = c.req.param("id");
    const workspaceId = getWorkspaceId(c);
    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(id, workspaceId);
      // Get vhost from validated query (optional)
      const { vhost: vhostParam } = c.req.valid("query");
      const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
      const [exchanges, bindings] = await Promise.all([
        client.getExchanges(vhost),
        client.getBindings(vhost).catch(() => []),
      ]);

      // Map all bindings for the response
      const mappedBindings = BindingMapper.toApiResponseArray(bindings);

      // Group mapped bindings by exchange (source@vhost)
      const bindingsMap = new Map<string, typeof mappedBindings>();
      for (const binding of mappedBindings) {
        const key = `${binding.source}@${binding.vhost}`;
        if (!bindingsMap.has(key)) {
          bindingsMap.set(key, []);
        }
        bindingsMap.get(key)!.push(binding);
      }

      // Map exchanges to API response format (only include fields used by front-end)
      const mappedExchanges = ExchangeMapper.toApiResponseArray(
        exchanges,
        bindingsMap
      );

      // Calculate exchange type counts
      const exchangeTypes = {
        direct: mappedExchanges.filter((e) => e.type === "direct").length,
        fanout: mappedExchanges.filter((e) => e.type === "fanout").length,
        topic: mappedExchanges.filter((e) => e.type === "topic").length,
        headers: mappedExchanges.filter((e) => e.type === "headers").length,
      };

      return c.json({
        success: true,
        exchanges: mappedExchanges,
        bindings: mappedBindings,
        totalExchanges: mappedExchanges.length,
        totalBindings: mappedBindings.length,
        exchangeTypes,
      });
    } catch (error) {
      logger.error({ error }, `Error fetching exchanges for server ${id}`);
      return createErrorResponse(c, error, 500, "Failed to fetch exchanges");
    }
  }
);

/**
 * Create a new exchange
 * POST /workspaces/:workspaceId/servers/:id/exchanges
 */
infrastructureController.post(
  "/servers/:id/exchanges",
  zValidator("param", ServerParamSchema),
  zValidator("query", VHostRequiredQuerySchema),
  async (c) => {
    const id = c.req.param("id");
    const workspaceId = getWorkspaceId(c);

    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

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

      // Get vhost from validated query (required for exchange operations)
      const { vhost: vhostParam } = c.req.valid("query");
      const vhost = decodeURIComponent(vhostParam);

      const client = await createRabbitMQClient(id, workspaceId);
      await client.createExchange(name, type, vhost, {
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
      logger.error({ error }, `Error creating exchange for server ${id}`);
      return createErrorResponse(c, error, 500, "Failed to create exchange");
    }
  }
);

/**
 * Delete an exchange
 * DELETE /workspaces/:workspaceId/servers/:id/exchanges/:exchangeName
 */
infrastructureController.delete(
  "/servers/:id/exchanges/:exchangeName",
  zValidator("param", ServerParamSchema),
  zValidator("query", VHostRequiredQuerySchema),
  async (c) => {
    const id = c.req.param("id");
    const exchangeName = c.req.param("exchangeName");
    const { vhost: vhostParam } = c.req.valid("query");
    const workspaceId = getWorkspaceId(c);
    const url = new URL(c.req.url);
    const ifUnused = url.searchParams.get("if_unused") === "true";

    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Decode vhost (already validated by schema)
      const vhost = decodeURIComponent(vhostParam);

      const client = await createRabbitMQClient(id, workspaceId);
      await client.deleteExchange(exchangeName, vhost, {
        if_unused: ifUnused,
      });

      return c.json({
        success: true,
        message: `Exchange "${exchangeName}" deleted successfully`,
      });
    } catch (error) {
      logger.error(
        { error },
        `Error deleting exchange "${exchangeName}" for server ${id}`
      );

      // Check if this is a 400 error indicating the exchange is in use
      if (error instanceof Error && error.message.includes("400")) {
        return c.json(
          {
            error: ifUnused
              ? `Cannot delete exchange "${exchangeName}" because it has bindings or is being used. Try force delete to remove it anyway.`
              : `Failed to delete exchange "${exchangeName}". It may be in use or there may be a configuration issue.`,
            code: "EXCHANGE_IN_USE",
          },
          { status: 400 }
        );
      }

      return createErrorResponse(c, error, 500, "Failed to delete exchange");
    }
  }
);

/**
 * Get all connections for a specific server
 * GET /workspaces/:workspaceId/servers/:id/connections
 */
infrastructureController.get(
  "/servers/:id/connections",
  zValidator("param", ServerParamSchema),
  async (c) => {
    const id = c.req.param("id");
    const workspaceId = getWorkspaceId(c);

    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(id, workspaceId);
      const connections = await client.getConnections();
      const channels = await client.getChannels();

      // Calculate totals for the overview cards
      const totalConnections = connections.length;
      const totalChannels = channels.length;

      return c.json({
        success: true,
        connections,
        totalConnections,
        totalChannels,
      });
    } catch (error) {
      logger.error({ error }, `Error fetching connections for server ${id}`);
      return createErrorResponse(c, error, 500, "Failed to fetch connections");
    }
  }
);

/**
 * Get all channels for a specific server
 * GET /workspaces/:workspaceId/servers/:id/channels
 */
infrastructureController.get(
  "/servers/:id/channels",
  zValidator("param", ServerParamSchema),
  async (c) => {
    const id = c.req.param("id");
    const workspaceId = getWorkspaceId(c);

    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(id, workspaceId);
      const channels = await client.getChannels();

      return c.json({
        success: true,
        channels,
        totalChannels: channels.length,
      });
    } catch (error) {
      logger.error({ error }, `Error fetching channels for server ${id}`);
      return createErrorResponse(c, error, 500, "Failed to fetch channels");
    }
  }
);

export default infrastructureController;
