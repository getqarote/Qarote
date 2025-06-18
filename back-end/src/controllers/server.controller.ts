import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import prisma from "../core/prisma";
import RabbitMQClient from "../core/rabbitmq";
import { authenticate } from "../core/auth";
import {
  CreateServerSchema,
  UpdateServerSchema,
  RabbitMQCredentialsSchema,
} from "../schemas/rabbitmq";
import { validateServerCreation } from "../services/plan-validation.service";
import {
  getWorkspacePlan,
  getWorkspaceResourceCounts,
  planValidationMiddleware,
} from "../middlewares/plan-validation";

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
    // If user has no workspace, they can only see servers with no workspace (personal servers)
    const servers = await prisma.rabbitMQServer.findMany({
      where: {
        workspaceId: user.workspaceId || null,
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
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
        // Don't include password in response
      },
    });

    // Transform the response to include sslConfig as a nested object
    const transformedServers = servers.map((server) => ({
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      username: server.username,
      vhost: server.vhost,
      sslConfig: {
        enabled: server.sslEnabled,
        verifyPeer: server.sslVerifyPeer,
        caCertPath: server.sslCaCertPath,
        clientCertPath: server.sslClientCertPath,
        clientKeyPath: server.sslClientKeyPath,
      },
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      workspaceId: server.workspaceId,
    }));

    return c.json({ servers: transformedServers });
  } catch (error) {
    console.error("Error fetching servers:", error);
    return c.json({ error: "Failed to fetch servers" }, 500);
  }
});

// Get a specific server by ID (only if it belongs to user's company)
serverController.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        // Ensure the server belongs to the user's workspace
        workspaceId: user.workspaceId || null,
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
      username: server.username,
      vhost: server.vhost,
      sslConfig: {
        enabled: server.sslEnabled,
        verifyPeer: server.sslVerifyPeer,
        caCertPath: server.sslCaCertPath,
        clientCertPath: server.sslClientCertPath,
        clientKeyPath: server.sslClientKeyPath,
      },
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      workspaceId: server.workspaceId,
    };

    return c.json({ server: transformedServer });
  } catch (error) {
    console.error(`Error fetching server ${id}:`, error);
    return c.json({ error: "Failed to fetch server" }, 500);
  }
});

// Create a new server (automatically assigned to user's company)
serverController.post(
  "/",
  zValidator("json", CreateServerSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user");

    try {
      // Validate plan restrictions for server creation
      if (user.workspaceId) {
        const [plan, resourceCounts] = await Promise.all([
          getWorkspacePlan(user.workspaceId),
          getWorkspaceResourceCounts(user.workspaceId),
        ]);

        validateServerCreation(plan, resourceCounts.servers);
      }

      console.log("Creating server with data:", data);
      // Test connection before creating the server
      const client = new RabbitMQClient({
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        vhost: data.vhost,
        sslConfig: data.sslConfig,
      });

      // Attempt to get the overview to validate connection
      await client.getOverview();

      const server = await prisma.rabbitMQServer.create({
        data: {
          name: data.name,
          host: data.host,
          port: data.port,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          sslEnabled: data.sslConfig?.enabled || false,
          sslVerifyPeer: data.sslConfig?.verifyPeer || true,
          sslCaCertPath: data.sslConfig?.caCertPath,
          sslClientCertPath: data.sslConfig?.clientCertPath,
          sslClientKeyPath: data.sslConfig?.clientKeyPath,
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
            username: server.username,
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
      console.error("Error creating server:", error);
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

// Update a server (only if it belongs to user's company)
serverController.put(
  "/:id",
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
          workspaceId: user.workspaceId || null,
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
      console.error(`Error updating server ${id}:`, error);
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

// Delete a server (only if it belongs to user's company)
serverController.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Check if server exists and belongs to user's workspace
    const existingServer = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        workspaceId: user.workspaceId || null,
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
    console.error(`Error deleting server ${id}:`, error);
    return c.json({ error: "Failed to delete server" }, 500);
  }
});

// Test RabbitMQ connection
serverController.post(
  "/test-connection",
  zValidator("json", RabbitMQCredentialsSchema),
  async (c) => {
    const credentials = c.req.valid("json");
    console.log("Testing connection with credentials:", credentials);

    try {
      const client = new RabbitMQClient(credentials);
      console.log("Created RabbitMQ client:", client);
      const overview = await client.getOverview();

      return c.json({
        success: true,
        message: "Connection successful",
        version: overview.rabbitmq_version,
        cluster_name: overview.cluster_name,
      });
    } catch (error) {
      console.error("Connection test failed:", error);
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
