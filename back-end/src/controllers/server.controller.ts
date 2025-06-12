import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import prisma from "../core/prisma";
import RabbitMQClient from "../core/rabbitmq";
import {
  CreateServerSchema,
  UpdateServerSchema,
  RabbitMQCredentialsSchema,
} from "../schemas/rabbitmq";

const serverController = new Hono();

// Get all RabbitMQ servers
serverController.get("/", async (c) => {
  try {
    const servers = await prisma.rabbitMQServer.findMany({
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        vhost: true,
        createdAt: true,
        updatedAt: true,
        // Don't include password in response
      },
    });
    return c.json({ servers });
  } catch (error) {
    console.error("Error fetching servers:", error);
    return c.json({ error: "Failed to fetch servers" }, 500);
  }
});

// Get a specific server by ID
serverController.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        vhost: true,
        createdAt: true,
        updatedAt: true,
        // Don't include password in response
      },
    });

    if (!server) {
      return c.json({ error: "Server not found" }, 404);
    }

    return c.json({ server });
  } catch (error) {
    console.error(`Error fetching server ${id}:`, error);
    return c.json({ error: "Failed to fetch server" }, 500);
  }
});

// Create a new server
serverController.post(
  "/",
  zValidator("json", CreateServerSchema),
  async (c) => {
    const data = c.req.valid("json");

    try {
      // Test connection before creating the server
      const client = new RabbitMQClient({
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        vhost: data.vhost,
      });

      // Attempt to get the overview to validate connection
      await client.getOverview();

      const server = await prisma.rabbitMQServer.create({
        data,
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

// Update a server
serverController.put(
  "/:id",
  zValidator("json", UpdateServerSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");

    try {
      // Check if server exists
      const existingServer = await prisma.rabbitMQServer.findUnique({
        where: { id },
      });

      if (!existingServer) {
        return c.json({ error: "Server not found" }, 404);
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

// Delete a server
serverController.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    // Check if server exists
    const existingServer = await prisma.rabbitMQServer.findUnique({
      where: { id },
    });

    if (!existingServer) {
      return c.json({ error: "Server not found" }, 404);
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

    try {
      const client = new RabbitMQClient(credentials);
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
