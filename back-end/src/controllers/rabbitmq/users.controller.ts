import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authenticate, authorize } from "@/core/auth";
import { UserRole } from "@prisma/client";
import { createRabbitMQClient, verifyServerAccess } from "./shared";
import { ServerParamSchema } from "@/schemas/alerts";
import {
  CreateUserSchema,
  SetPermissionsSchema,
  UpdateUserSchema,
} from "@/schemas/rabbitmq";
import { logger } from "@/core/logger";
import { createErrorResponse } from "../shared";

const usersController = new Hono();

// All user management routes require admin access
usersController.use("*", authenticate);
usersController.use("*", authorize([UserRole.ADMIN]));

// Get all users for a server
usersController.get(
  "/servers/:id/users",
  zValidator("param", ServerParamSchema),
  async (c) => {
    try {
      const serverId = c.req.param("id");
      const user = c.get("user");

      if (!user.workspaceId) {
        return c.json({ error: "No workspace assigned" }, 400);
      }

      // Verify server access
      const server = await verifyServerAccess(serverId, user.workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      const users = await client.getUsers();

      return c.json({ users });
    } catch (error: any) {
      logger.error("Error fetching users:", error);
      return createErrorResponse(c, error, 500, "Failed to fetch users");
    }
  }
);

// Get specific user details
usersController.get(
  "/servers/:id/users/:username",
  zValidator("param", ServerParamSchema),
  async (c) => {
    try {
      const serverId = c.req.param("id");
      const username = c.req.param("username");
      const user = c.get("user");

      if (!user.workspaceId) {
        return c.json({ error: "No workspace assigned" }, 400);
      }

      // Verify server access
      const server = await verifyServerAccess(serverId, user.workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      const userDetails = await client.getUser(username);
      const permissions = await client.getUserPermissions(username);

      return c.json({
        user: userDetails,
        permissions,
      });
    } catch (error: any) {
      logger.error("Error fetching user details:", error);
      return createErrorResponse(c, error, 500, "Failed to fetch user details");
    }
  }
);

// Create new user
usersController.post(
  "/servers/:id/users",
  zValidator("param", ServerParamSchema),
  zValidator("json", CreateUserSchema),
  async (c) => {
    try {
      const serverId = c.req.param("id");
      const userData = c.req.valid("json");
      const user = c.get("user");

      if (!user.workspaceId) {
        return c.json({ error: "No workspace assigned" }, 400);
      }

      // Verify server access
      const server = await verifyServerAccess(serverId, user.workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.createUser(userData.username, {
        password: userData.password,
        tags: userData.tags,
      });

      return c.json({ message: "User created successfully" });
    } catch (error: any) {
      logger.error("Error creating user:", error);
      return createErrorResponse(c, error, 500, "Failed to create user");
    }
  }
);

usersController.put(
  "/servers/:id/users/:username",
  zValidator("param", ServerParamSchema),
  zValidator("json", UpdateUserSchema),
  async (c) => {
    try {
      const serverId = c.req.param("id");
      const username = c.req.param("username");
      const updateData = c.req.valid("json");
      const user = c.get("user");

      if (!user.workspaceId) {
        return c.json({ error: "No workspace assigned" }, 400);
      }

      // Verify server access
      const server = await verifyServerAccess(serverId, user.workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, user.workspaceId);

      const payload: any = {};
      if (updateData.tags !== undefined) {
        payload.tags = updateData.tags;
      }
      if (updateData.password) {
        payload.password = updateData.password;
      }
      if (updateData.removePassword) {
        payload.password_hash = "";
      }

      logger.debug("Updating user with payload", {
        username,
        serverId,
        payload,
        updateData,
      });

      await client.updateUser(username, payload);

      return c.json({ message: "User updated successfully" });
    } catch (error: any) {
      // Enhanced error logging
      const errorMessage = error?.message || "Unknown error";
      const errorDetails: any = {
        username: c.req.param("username"),
        serverId: c.req.param("id"),
        updateData: c.req.valid("json"),
        errorMessage,
        errorStack: error?.stack,
      };

      // Extract RabbitMQ API reason from error cause
      if (error?.cause) {
        errorDetails.rabbitMQReason = error.cause;
      }

      logger.error(errorDetails, "Error updating user - detailed error");

      return createErrorResponse(c, error, 500, "Failed to update user");
    }
  }
);

usersController.delete(
  "/servers/:id/users/:username",
  zValidator("param", ServerParamSchema),
  async (c) => {
    try {
      const serverId = c.req.param("id");
      const username = c.req.param("username");
      const user = c.get("user");

      if (!user.workspaceId) {
        return c.json({ error: "No workspace assigned" }, 400);
      }

      // Verify server access
      const server = await verifyServerAccess(serverId, user.workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.deleteUser(username);

      return c.json({ message: "User deleted successfully" });
    } catch (error: any) {
      logger.error("Error deleting user:", error);
      return createErrorResponse(c, error, 500, "Failed to delete user");
    }
  }
);

usersController.put(
  "/servers/:id/users/:username/permissions",
  zValidator("param", ServerParamSchema),
  zValidator("json", SetPermissionsSchema),
  async (c) => {
    try {
      const serverId = c.req.param("id");
      const username = c.req.param("username");
      const permissionData = c.req.valid("json");
      const user = c.get("user");

      if (!user.workspaceId) {
        return c.json({ error: "No workspace assigned" }, 400);
      }

      // Verify server access
      const server = await verifyServerAccess(serverId, user.workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.setUserPermissions(permissionData.vhost, username, {
        user: username,
        configure: permissionData.configure,
        write: permissionData.write,
        read: permissionData.read,
      });

      return c.json({ message: "Permissions set successfully" });
    } catch (error: any) {
      logger.error("Error setting permissions:", error);
      return createErrorResponse(c, error, 500, "Failed to set permissions");
    }
  }
);

usersController.delete(
  "/servers/:id/users/:username/permissions/:vhost",
  zValidator("param", ServerParamSchema),
  async (c) => {
    try {
      const serverId = c.req.param("id");
      const username = c.req.param("username");
      const vhost = c.req.param("vhost");
      const user = c.get("user");

      if (!user.workspaceId) {
        return c.json({ error: "No workspace assigned" }, 400);
      }

      // Verify server access
      const server = await verifyServerAccess(serverId, user.workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.deleteUserPermissions(vhost, username);

      return c.json({ message: "Permissions deleted successfully" });
    } catch (error: any) {
      logger.error("Error deleting permissions:", error);
      return createErrorResponse(c, error, 500, "Failed to delete permissions");
    }
  }
);

export default usersController;
