import { Hono } from "hono";
import { UserRole } from "@prisma/client";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/core/prisma";
import { RabbitMQClient } from "@/core/rabbitmq";
import { authenticate, authorize } from "@/core/auth";
import { logger } from "@/core/logger";
import { EncryptionService } from "@/services/encryption.service";
import {
  extractMajorMinorVersion,
  getUserPlan,
  getUserResourceCounts,
  validateRabbitMqVersion,
  validateServerCreation,
} from "@/services/plan/plan.service";
import {
  CreateServerSchema,
  UpdateServerSchema,
  RabbitMQCredentialsSchema,
} from "@/schemas/rabbitmq";
import { planValidationMiddleware } from "@/middlewares/plan-validation";

const serverController = new Hono();

// Apply authentication middleware to all routes
serverController.use("*", authenticate);

// Apply plan validation middleware to all routes
serverController.use("*", planValidationMiddleware());

// Get all RabbitMQ servers (filtered by user's workspace)
serverController.get("/", async (c) => {
  try {
    const user = c.get("user");

    // Only return servers that belong to the user's workspace
    const servers = await prisma.rabbitMQServer.findMany({
      where: {
        workspaceId: user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        amqpPort: true,
        username: true,
        vhost: true,
        useHttps: true,
        isOverQueueLimit: true,
        queueCountAtConnect: true,
        overLimitWarningShown: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
      },
    });

    // Transform the response to include sslConfig as a nested object
    // and decrypt sensitive data for display
    const transformedServers = servers.map((server) => ({
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      amqpPort: server.amqpPort,
      username: EncryptionService.decrypt(server.username), // Decrypt for display
      vhost: server.vhost,
      useHttps: server.useHttps,
      isOverQueueLimit: server.isOverQueueLimit,
      queueCountAtConnect: server.queueCountAtConnect,
      overLimitWarningShown: server.overLimitWarningShown,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      workspaceId: server.workspaceId,
    }));

    return c.json({ servers: transformedServers });
  } catch (error) {
    logger.error({ error }, "Error fetching servers");
    return c.json({ error: "Failed to fetch servers" }, 500);
  }
});

// Get a specific server by ID (only if it belongs to user's workspace)
serverController.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        // Ensure the server belongs to the user's workspace
        workspaceId: user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        amqpPort: true,
        username: true,
        vhost: true,
        useHttps: true,
        isOverQueueLimit: true,
        queueCountAtConnect: true,
        overLimitWarningShown: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    // Transform the response to include sslConfig as a nested object
    const transformedServer = {
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      amqpPort: server.amqpPort,
      username: EncryptionService.decrypt(server.username), // Decrypt for display
      vhost: server.vhost,
      useHttps: server.useHttps,
      isOverQueueLimit: server.isOverQueueLimit,
      queueCountAtConnect: server.queueCountAtConnect,
      overLimitWarningShown: server.overLimitWarningShown,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      workspaceId: server.workspaceId,
    };

    return c.json({ server: transformedServer });
  } catch (error) {
    logger.error({ error, id }, "Error fetching server");
    return c.json({ error: "Failed to fetch server" }, 500);
  }
});

// Create a new server (ADMIN ONLY - sensitive operation)
serverController.post(
  "/",
  authorize([UserRole.ADMIN]),
  zValidator("json", CreateServerSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user");

    try {
      if (!user.workspaceId) {
        return c.json({ error: "No workspace assigned" }, 400);
      }

      // Validate plan restrictions for server creation
      const [plan, resourceCounts] = await Promise.all([
        getUserPlan(user.id),
        getUserResourceCounts(user.id),
      ]);

      validateServerCreation(plan, resourceCounts.servers);

      logger.info({ data }, "Creating server with data");

      // Test connection before creating the server (use plain text for testing)
      const client = new RabbitMQClient({
        host: data.host,
        port: data.port,
        amqpPort: data.amqpPort,
        username: data.username,
        password: data.password,
        vhost: data.vhost,
        useHttps: data.useHttps,
      });

      // Attempt to get the overview to validate connection and detect version
      const overview = await client.getOverview();
      const rabbitMqVersion = overview.rabbitmq_version;
      const majorMinorVersion = extractMajorMinorVersion(rabbitMqVersion);

      // Validate RabbitMQ version against plan restrictions
      validateRabbitMqVersion(plan, rabbitMqVersion);

      // Encrypt sensitive data before storing
      const server = await prisma.rabbitMQServer.create({
        data: {
          name: data.name,
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: EncryptionService.encrypt(data.username), // Encrypt username
          password: EncryptionService.encrypt(data.password), // Encrypt password
          vhost: data.vhost,
          useHttps: data.useHttps,
          version: rabbitMqVersion, // Store full version
          versionMajorMinor: majorMinorVersion, // Store major.minor for plan validation
          // Store over-limit information
          overLimitWarningShown: false,
          // Automatically assign server to user's workspace
          workspaceId: user.workspaceId,
        },
      });

      return c.json(
        {
          server: {
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            amqpPort: server.amqpPort,
            username: data.username, // Return original (not encrypted) for UI
            vhost: server.vhost,
            useHttps: server.useHttps,
            workspaceId: server.workspaceId,
            createdAt: server.createdAt,
            updatedAt: server.updatedAt,
          },
        },
        201
      );
    } catch (error) {
      logger.error({ error }, "Error creating server");
      return c.json(
        {
          error: "Failed to create server",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Update a server (ADMIN ONLY - sensitive operation)
serverController.put(
  "/:id",
  authorize([UserRole.ADMIN]),
  zValidator("json", UpdateServerSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const user = c.get("user");

    try {
      // Check if server exists and belongs to user's workspace
      const existingServer = await prisma.rabbitMQServer.findUnique({
        where: {
          id,
          workspaceId: user.workspaceId,
        },
      });

      if (!existingServer) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // If credentials are being updated, test the connection
      if (
        data.host ||
        data.port ||
        data.username ||
        data.password ||
        data.vhost ||
        data.useHttps !== undefined
      ) {
        const client = new RabbitMQClient({
          host: data.host || existingServer.host,
          port: data.port || existingServer.port,
          amqpPort: data.amqpPort || existingServer.amqpPort,
          username: data.username || existingServer.username,
          password: data.password || existingServer.password,
          vhost: data.vhost || existingServer.vhost,
          useHttps: data.useHttps ?? existingServer.useHttps,
        });

        await client.getOverview();
      }

      // Prepare update data with proper encryption
      const updateData: {
        name?: string;
        host?: string;
        port?: number;
        amqpPort?: number;
        username?: string;
        password?: string;
        vhost?: string;
        useHttps?: boolean;
      } = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.host !== undefined) updateData.host = data.host;
      if (data.port !== undefined) updateData.port = data.port;
      if (data.amqpPort !== undefined) updateData.amqpPort = data.amqpPort;
      if (data.username !== undefined)
        updateData.username = EncryptionService.encrypt(data.username);
      if (data.password !== undefined)
        updateData.password = EncryptionService.encrypt(data.password);
      if (data.vhost !== undefined) updateData.vhost = data.vhost;
      if (data.useHttps !== undefined) updateData.useHttps = data.useHttps;

      const server = await prisma.rabbitMQServer.update({
        where: { id },
        data: updateData,
      });

      return c.json({
        server: {
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          amqpPort: server.amqpPort,
          username: EncryptionService.decrypt(server.username), // Decrypt for display
          vhost: server.vhost,
          useHttps: server.useHttps,
          createdAt: server.createdAt,
          updatedAt: server.updatedAt,
        },
      });
    } catch (error) {
      logger.error({ error, id }, "Error updating server");
      return c.json(
        {
          error: "Failed to update server",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Delete a server (ADMIN ONLY - dangerous operation)
serverController.delete("/:id", authorize([UserRole.ADMIN]), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Check if server exists and belongs to user's workspace
    const existingServer = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
    });

    if (!existingServer) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    await prisma.rabbitMQServer.delete({
      where: { id },
    });

    return c.json({ message: "Server deleted successfully" });
  } catch (error) {
    logger.error({ error, id }, "Error deleting server");
    return c.json({ error: "Failed to delete server" }, 500);
  }
});

// Test RabbitMQ connection (ADMIN ONLY - could expose sensitive info)
serverController.post(
  "/test-connection",
  authorize([UserRole.ADMIN]),
  zValidator("json", RabbitMQCredentialsSchema),
  async (c) => {
    const credentials = c.req.valid("json");
    logger.info({ credentials }, "Testing connection with credentials");

    try {
      const client = new RabbitMQClient(credentials);
      logger.info({ client }, "Created RabbitMQ client");
      const overview = await client.getOverview();

      return c.json({
        success: true,
        message: "Connection successful",
        version: overview.rabbitmq_version,
        cluster_name: overview.cluster_name,
      });
    } catch (error) {
      logger.error({ error }, "Connection test failed");
      return c.json(
        {
          success: false,
          error: "Connection failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        400
      );
    }
  }
);

export default serverController;
