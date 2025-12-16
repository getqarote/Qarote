import { zValidator } from "@hono/zod-validator";
import { UserRole } from "@prisma/client";
import { Hono } from "hono";

import { logger } from "@/core/logger";

import { authorize } from "@/middlewares/auth";

import {
  CreateVHostSchema,
  SetLimitSchema,
  SetPermissionSchema,
  UpdateVHostSchema,
} from "@/schemas/vhost";

import { VHostMapper } from "@/mappers/rabbitmq/VHostMapper";

import { createErrorResponse, getWorkspaceId } from "../shared";
import { createRabbitMQClient, verifyServerAccess } from "./shared";

const vhostController = new Hono();

// All vhost operations require ADMIN role
vhostController.use("*", authorize([UserRole.ADMIN]));

/**
 * Get all virtual hosts for a server (ADMIN ONLY)
 * GET /workspaces/:workspaceId/servers/:serverId/vhosts
 */
vhostController.get("/servers/:serverId/vhosts", async (c) => {
  const serverId = c.req.param("serverId");
  const workspaceId = getWorkspaceId(c);

  try {
    // Verify server access
    const result = await verifyServerAccess(serverId, workspaceId);
    if (!result) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = await createRabbitMQClient(serverId, workspaceId);
    const [vhosts, allQueues] = await Promise.all([
      client.getVHosts(),
      client.getQueues(undefined).catch(() => []), // Get all queues across all vhosts
    ]);

    // Enhance vhost data with additional details
    const enhancedVHosts = await Promise.all(
      vhosts.map(async (vhost) => {
        try {
          const [permissions, limits] = await Promise.all([
            client.getVHostPermissions(vhost.name).catch(() => []),
            client.getVHostLimits(vhost.name).catch(() => ({})),
          ]);

          // Calculate message stats by aggregating queue data for this vhost
          const vhostQueues = allQueues.filter((q) => q.vhost === vhost.name);
          const messageStats = vhostQueues.reduce(
            (acc, queue) => ({
              messages: acc.messages + (queue.messages || 0),
              messages_ready: acc.messages_ready + (queue.messages_ready || 0),
              messages_unacknowledged:
                acc.messages_unacknowledged +
                (queue.messages_unacknowledged || 0),
            }),
            { messages: 0, messages_ready: 0, messages_unacknowledged: 0 }
          );

          return {
            ...vhost,
            messages: vhost.messages ?? messageStats.messages,
            messages_ready: vhost.messages_ready ?? messageStats.messages_ready,
            messages_unacknowledged:
              vhost.messages_unacknowledged ??
              messageStats.messages_unacknowledged,
            permissions: permissions || [],
            limits: limits || {},
            permissionCount: (permissions || []).length,
            limitCount: Object.keys(limits || {}).length,
          };
        } catch (error) {
          logger.warn(
            { error },
            `Failed to get details for vhost ${vhost.name}:`
          );
          return {
            ...vhost,
            messages: vhost.messages || 0,
            messages_ready: vhost.messages_ready || 0,
            messages_unacknowledged: vhost.messages_unacknowledged || 0,
            permissions: [],
            limits: {},
            permissionCount: 0,
            limitCount: 0,
          };
        }
      })
    );

    // Map vhosts to API response format (only include fields used by front-end)
    const mappedVhosts = VHostMapper.toApiResponseArray(enhancedVHosts);

    return c.json({
      success: true,
      vhosts: mappedVhosts,
      total: mappedVhosts.length,
    });
  } catch (error) {
    logger.error({ error }, `Error fetching vhosts for server ${serverId}:`);
    return createErrorResponse(c, error, 500, "Failed to fetch virtual hosts");
  }
});

/**
 * Get a specific virtual host details (ADMIN ONLY)
 * GET /servers/:serverId/vhosts/:vhostName
 */
vhostController.get("/servers/:serverId/vhosts/:vhostName", async (c) => {
  const serverId = c.req.param("serverId");
  const vhostName = decodeURIComponent(c.req.param("vhostName"));
  const workspaceId = getWorkspaceId(c);

  try {
    // Verify server access
    const server = await verifyServerAccess(serverId, workspaceId);
    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = await createRabbitMQClient(serverId, workspaceId);

    const [
      vhost,
      permissions,
      limits,
      allQueues,
      allExchanges,
      allConnections,
    ] = await Promise.all([
      client.getVHost(vhostName),
      client.getVHostPermissions(vhostName).catch(() => []),
      client.getVHostLimits(vhostName).catch(() => ({})),
      client.getQueues(undefined).catch(() => []), // Get all queues across all vhosts
      client.getExchanges(undefined).catch(() => []), // Get all exchanges across all vhosts
      client.getConnections().catch(() => []),
    ]);

    // Filter by vhost
    const queues = allQueues.filter((q) => q.vhost === vhostName);
    const exchanges = allExchanges.filter((e) => e.vhost === vhostName);
    const connections = allConnections.filter((c) => c.vhost === vhostName);

    const stats = {
      queueCount: queues.length,
      exchangeCount: exchanges.length,
      connectionCount: connections.length,
      totalMessages: queues.reduce((sum, q) => sum + (q.messages || 0), 0),
      totalConsumers: queues.reduce((sum, q) => sum + (q.consumers || 0), 0),
    };

    // Enhance vhost with permissions, limits, and stats
    const enhancedVhost = {
      ...vhost,
      permissions: permissions || [],
      limits: limits || {},
      stats,
    };

    // Map vhost to API response format (only include fields used by front-end)
    const mappedVhost = VHostMapper.toApiResponse(enhancedVhost);

    return c.json({
      success: true,
      vhost: mappedVhost,
    });
  } catch (error) {
    logger.error(
      { error },
      `Error fetching vhost ${vhostName} for server ${serverId}:`
    );
    return createErrorResponse(c, error, 500, "Failed to fetch virtual host");
  }
});

/**
 * Create a new virtual host (ADMIN ONLY)
 * POST /servers/:serverId/vhosts
 */
vhostController.post(
  "/servers/:serverId/vhosts",
  zValidator("json", CreateVHostSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const workspaceId = getWorkspaceId(c);
    const vhostData = c.req.valid("json");
    const user = c.get("user");

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.createVHost({
        name: vhostData.name,
        description: vhostData.description,
        tracing: vhostData.tracing,
      });

      logger.info(
        `VHost ${vhostData.name} created by user ${user.id} on server ${serverId}`
      );

      return c.json({
        success: true,
        message: `Virtual host "${vhostData.name}" created successfully`,
        vhost: {
          name: vhostData.name,
          description: vhostData.description,
          tracing: vhostData.tracing,
        },
      });
    } catch (error) {
      logger.error(
        { error },
        `Error creating vhost ${vhostData.name} on server ${serverId}:`
      );
      return createErrorResponse(
        c,
        error,
        500,
        "Failed to create virtual host"
      );
    }
  }
);

/**
 * Update a virtual host (ADMIN ONLY)
 * PUT /servers/:serverId/vhosts/:vhostName
 */
vhostController.put(
  "/servers/:serverId/vhosts/:vhostName",
  zValidator("json", UpdateVHostSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const vhostName = decodeURIComponent(c.req.param("vhostName"));
    const workspaceId = getWorkspaceId(c);
    const vhostData = c.req.valid("json");
    const user = c.get("user");

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.updateVHost(vhostName, vhostData);

      logger.info(
        `VHost ${vhostName} updated by user ${user.id} on server ${serverId}`
      );

      return c.json({
        success: true,
        message: `Virtual host "${vhostName}" updated successfully`,
      });
    } catch (error) {
      logger.error(
        { error },
        `Error updating vhost ${vhostName} on server ${serverId}:`
      );
      return createErrorResponse(
        c,
        error,
        500,
        "Failed to update virtual host"
      );
    }
  }
);

/**
 * Delete a virtual host (ADMIN ONLY)
 * DELETE /servers/:serverId/vhosts/:vhostName
 */
vhostController.delete("/servers/:serverId/vhosts/:vhostName", async (c) => {
  const serverId = c.req.param("serverId");
  const vhostName = decodeURIComponent(c.req.param("vhostName"));
  const workspaceId = getWorkspaceId(c);
  const user = c.get("user");

  try {
    // Verify server access
    const server = await verifyServerAccess(serverId, workspaceId);
    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    // Prevent deletion of default vhost
    if (vhostName === "/") {
      return c.json(
        {
          success: false,
          error: "Cannot delete the default virtual host",
        },
        400
      );
    }

    const client = await createRabbitMQClient(serverId, workspaceId);
    await client.deleteVHost(vhostName);

    logger.info(
      `VHost ${vhostName} deleted by user ${user.id} on server ${serverId}`
    );

    return c.json({
      success: true,
      message: `Virtual host "${vhostName}" deleted successfully`,
    });
  } catch (error) {
    logger.error(
      { error },
      `Error deleting vhost ${vhostName} on server ${serverId}:`
    );
    return createErrorResponse(c, error, 500, "Failed to delete virtual host");
  }
});

/**
 * Set user permissions for a virtual host (ADMIN ONLY)
 * PUT /servers/:serverId/vhosts/:vhostName/permissions/:username
 */
vhostController.put(
  "/servers/:serverId/vhosts/:vhostName/permissions/:username",
  zValidator("json", SetPermissionSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const vhostName = decodeURIComponent(c.req.param("vhostName"));
    const username = c.req.param("username");
    const workspaceId = getWorkspaceId(c);
    const permissionData = c.req.valid("json");
    const user = c.get("user");

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.setUserPermissions(vhostName, username, {
        user: username,
        configure: permissionData.configure,
        write: permissionData.write,
        read: permissionData.read,
      });

      logger.info(
        `Permissions set for user ${username} on vhost ${vhostName} by admin ${user.id}`
      );

      return c.json({
        success: true,
        message: `Permissions set for user "${username}" on virtual host "${vhostName}"`,
      });
    } catch (error) {
      logger.error(
        { error },
        `Error setting permissions for user ${username} on vhost ${vhostName}:`
      );
      return createErrorResponse(c, error, 500, "Failed to set permissions");
    }
  }
);

/**
 * Delete user permissions for a virtual host (ADMIN ONLY)
 * DELETE /servers/:serverId/vhosts/:vhostName/permissions/:username
 */
vhostController.delete(
  "/servers/:serverId/vhosts/:vhostName/permissions/:username",
  async (c) => {
    const serverId = c.req.param("serverId");
    const vhostName = decodeURIComponent(c.req.param("vhostName"));
    const username = c.req.param("username");
    const workspaceId = getWorkspaceId(c);
    const user = c.get("user");

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.deleteUserPermissions(vhostName, username);

      logger.info(
        `Permissions deleted for user ${username} on vhost ${vhostName} by admin ${user.id}`
      );

      return c.json({
        success: true,
        message: `Permissions deleted for user "${username}" on virtual host "${vhostName}"`,
      });
    } catch (error) {
      logger.error(
        { error },
        `Error deleting permissions for user ${username} on vhost ${vhostName}:`
      );
      return createErrorResponse(c, error, 500, "Failed to delete permissions");
    }
  }
);

/**
 * Set virtual host limits (ADMIN ONLY)
 * PUT /servers/:serverId/vhosts/:vhostName/limits/:limitType
 */
vhostController.put(
  "/servers/:serverId/vhosts/:vhostName/limits/:limitType",
  zValidator("json", SetLimitSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const vhostName = decodeURIComponent(c.req.param("vhostName"));
    const limitType = c.req.param("limitType");
    const workspaceId = getWorkspaceId(c);
    const limitData = c.req.valid("json");
    const user = c.get("user");

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.setVHostLimit(vhostName, limitType, {
        value: limitData.value,
      });

      logger.info(
        `Limit ${limitType} set to ${limitData.value} for vhost ${vhostName} by admin ${user.id}`
      );

      return c.json({
        success: true,
        message: `Limit "${limitType}" set to ${limitData.value} for virtual host "${vhostName}"`,
      });
    } catch (error) {
      logger.error(
        { error },
        `Error setting limit ${limitType} for vhost ${vhostName}:`
      );
      return createErrorResponse(c, error, 500, "Failed to set limit");
    }
  }
);

/**
 * Delete virtual host limit (ADMIN ONLY)
 * DELETE /servers/:serverId/vhosts/:vhostName/limits/:limitType
 */
vhostController.delete(
  "/servers/:serverId/vhosts/:vhostName/limits/:limitType",
  async (c) => {
    const serverId = c.req.param("serverId");
    const vhostName = decodeURIComponent(c.req.param("vhostName"));
    const limitType = c.req.param("limitType");
    const workspaceId = getWorkspaceId(c);
    const user = c.get("user");

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.deleteVHostLimit(vhostName, limitType);

      logger.info(
        `Limit ${limitType} deleted for vhost ${vhostName} by admin ${user.id}`
      );

      return c.json({
        success: true,
        message: `Limit "${limitType}" deleted for virtual host "${vhostName}"`,
      });
    } catch (error) {
      logger.error(
        { error },
        `Error deleting limit ${limitType} for vhost ${vhostName}:`
      );
      return createErrorResponse(c, error, 500, "Failed to delete limit");
    }
  }
);

export default vhostController;
