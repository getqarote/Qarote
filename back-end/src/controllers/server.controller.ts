import { Hono } from "hono";
import { UserRole } from "@prisma/client";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/core/prisma";
import RabbitMQClient from "@/core/rabbitmq";
import { authenticate, authorize } from "@/core/auth";
import { logger } from "@/core/logger";
import { EncryptionService } from "@/services/encryption.service";
import {
  extractMajorMinorVersion,
  getWorkspacePlan,
  getWorkspaceResourceCounts,
  isServerOverQueueLimit,
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
        username: true,
        vhost: true,
        sslEnabled: true,
        sslVerifyPeer: true,
        sslCaCertPath: true,
        sslClientCertPath: true,
        sslClientKeyPath: true,
        isOverQueueLimit: true,
        queueCountAtConnect: true,
        overLimitWarningShown: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
        // Don't include password in response
      },
    });

    // Transform the response to include sslConfig as a nested object
    // and decrypt sensitive data for display
    const transformedServers = servers.map((server) => ({
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      username: EncryptionService.decrypt(server.username), // Decrypt for display
      vhost: server.vhost,
      sslConfig: {
        enabled: server.sslEnabled,
        verifyPeer: server.sslVerifyPeer,
        caCertPath: server.sslCaCertPath,
        clientCertPath: server.sslClientCertPath,
        clientKeyPath: server.sslClientKeyPath,
      },
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
        username: true,
        vhost: true,
        sslEnabled: true,
        sslVerifyPeer: true,
        sslCaCertPath: true,
        sslClientCertPath: true,
        sslClientKeyPath: true,
        isOverQueueLimit: true,
        queueCountAtConnect: true,
        overLimitWarningShown: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
        // Don't include password in response
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
      username: EncryptionService.decrypt(server.username), // Decrypt for display
      vhost: server.vhost,
      sslConfig: {
        enabled: server.sslEnabled,
        verifyPeer: server.sslVerifyPeer,
        caCertPath: server.sslCaCertPath,
        clientCertPath: server.sslClientCertPath,
        clientKeyPath: server.sslClientKeyPath,
      },
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
      // Validate plan restrictions for server creation
      const [plan, resourceCounts] = await Promise.all([
        getWorkspacePlan(user.workspaceId),
        getWorkspaceResourceCounts(user.workspaceId),
      ]);

      validateServerCreation(plan, resourceCounts.servers);

      logger.info({ data }, "Creating server with data");

      // Test connection before creating the server (use plain text for testing)
      const client = new RabbitMQClient({
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        vhost: data.vhost,
        sslConfig: data.sslConfig,
      });

      // Attempt to get the overview to validate connection and detect version
      const overview = await client.getOverview();
      const rabbitMqVersion = overview.rabbitmq_version;
      const majorMinorVersion = extractMajorMinorVersion(rabbitMqVersion);

      // Validate RabbitMQ version against plan restrictions
      validateRabbitMqVersion(plan, rabbitMqVersion);

      // Check queue count for over-limit detection
      let queueCount = 0;
      let isOverLimit = false;

      try {
        const queues = await client.getQueues();
        queueCount = queues.length;

        // Check if this server exceeds the user's plan queue limit
        isOverLimit = isServerOverQueueLimit(plan, queueCount);
      } catch (queueError) {
        logger.warn(
          "Could not fetch queues during server creation:",
          queueError
        );
        // Continue with server creation even if queue fetch fails
      }

      // Encrypt sensitive data before storing
      const server = await prisma.rabbitMQServer.create({
        data: {
          name: data.name,
          host: data.host,
          port: data.port,
          username: EncryptionService.encrypt(data.username), // Encrypt username
          password: EncryptionService.encrypt(data.password), // Encrypt password
          vhost: data.vhost,
          sslEnabled: data.sslConfig?.enabled || false,
          sslVerifyPeer: data.sslConfig?.verifyPeer || true,
          sslCaCertPath: data.sslConfig?.caCertPath,
          sslClientCertPath: data.sslConfig?.clientCertPath,
          sslClientKeyPath: data.sslConfig?.clientKeyPath,
          version: rabbitMqVersion, // Store full version
          versionMajorMinor: majorMinorVersion, // Store major.minor for plan validation
          // Store over-limit information
          isOverQueueLimit: isOverLimit,
          queueCountAtConnect: queueCount,
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
            username: data.username, // Return original (not encrypted) for UI
            vhost: server.vhost,
            sslConfig: {
              enabled: server.sslEnabled,
              verifyPeer: server.sslVerifyPeer,
              caCertPath: server.sslCaCertPath,
              clientCertPath: server.sslClientCertPath,
              clientKeyPath: server.sslClientKeyPath,
            },
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
        data.vhost
      ) {
        const client = new RabbitMQClient({
          host: data.host || existingServer.host,
          port: data.port || existingServer.port,
          username: data.username || existingServer.username,
          password: data.password || existingServer.password,
          vhost: data.vhost || existingServer.vhost,
        });

        await client.getOverview();
      }

      const server = await prisma.rabbitMQServer.update({
        where: { id },
        data,
      });

      return c.json({
        server: {
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          username: server.username,
          vhost: server.vhost,
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

// Mark over-limit warning as shown for a server (ADMIN ONLY - modifies server state)
serverController.put(
  "/:id/warning-shown",
  authorize([UserRole.ADMIN]),
  async (c) => {
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

      // Update warning shown status
      await prisma.rabbitMQServer.update({
        where: { id },
        data: {
          overLimitWarningShown: true,
        },
      });

      return c.json({ message: "Warning status updated successfully" });
    } catch (error) {
      logger.error({ error, id }, "Error updating warning status for server");
      return c.json({ error: "Failed to update warning status" }, 500);
    }
  }
);

export default serverController;
