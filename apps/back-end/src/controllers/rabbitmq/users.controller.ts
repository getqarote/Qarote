import { zValidator } from "@hono/zod-validator";
import { UserRole } from "@prisma/client";
import { Hono } from "hono";

import { logger } from "@/core/logger";

import { authenticate, authorize } from "@/middlewares/auth";

import { ServerParamSchema } from "@/schemas/alerts";
import {
  CreateUserSchema,
  SetPermissionsSchema,
  UpdateUserSchema,
} from "@/schemas/rabbitmq";

import { UserMapper } from "@/mappers/rabbitmq/UserMapper";

import { createErrorResponse, getWorkspaceId } from "../shared";
import { createRabbitMQClient, verifyServerAccess } from "./shared";

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
      const workspaceId = getWorkspaceId(c);

      // Verify server belongs to the workspace
      const verifiedServer = await verifyServerAccess(serverId, workspaceId);
      if (!verifiedServer) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      const users = await client.getUsers();

      // Map users to API response format (only include fields used by front-end)
      const mappedUsers = UserMapper.toApiResponseArray(users);

      return c.json({ users: mappedUsers });
    } catch (error: unknown) {
      logger.error({ error }, "Error fetching users:");
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
      const workspaceId = getWorkspaceId(c);

      // Verify server belongs to the workspace
      const verifiedServer = await verifyServerAccess(serverId, workspaceId);
      if (!verifiedServer) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      const userDetails = await client.getUser(username);
      const permissions = await client.getUserPermissions(username);

      // Map user to API response format (only include fields used by front-end)
      const mappedUser = UserMapper.toApiResponse(userDetails);

      return c.json({
        user: mappedUser,
        permissions,
      });
    } catch (error: unknown) {
      logger.error({ error }, "Error fetching user details:");
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
      const workspaceId = getWorkspaceId(c);

      // Verify server belongs to the workspace
      const verifiedServer = await verifyServerAccess(serverId, workspaceId);
      if (!verifiedServer) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.createUser(userData.username, {
        password: userData.password,
        tags: userData.tags,
      });

      return c.json({ message: "User created successfully" });
    } catch (error: unknown) {
      logger.error({ error }, "Error creating user:");
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
      const workspaceId = getWorkspaceId(c);

      // Verify server belongs to the workspace
      const verifiedServer = await verifyServerAccess(serverId, workspaceId);
      if (!verifiedServer) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);

      const payload: {
        tags?: string;
        password?: string;
        password_hash?: string;
      } = {};
      if (updateData.tags !== undefined) {
        payload.tags = updateData.tags;
      }
      if (updateData.password) {
        payload.password = updateData.password;
      }
      if (updateData.removePassword) {
        payload.password_hash = "";
      }

      logger.debug(
        {
          username,
          serverId,
          payload,
          updateData,
        },
        "Updating user with payload"
      );

      await client.updateUser(username, payload);

      return c.json({ message: "User updated successfully" });
    } catch (error: unknown) {
      // Enhanced error logging
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorDetails: {
        username: string;
        serverId: string;
        updateData: unknown;
        errorMessage: string;
        errorStack?: string;
        rabbitMQReason?: unknown;
      } = {
        username: c.req.param("username"),
        serverId: c.req.param("id"),
        updateData: c.req.valid("json"),
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
      };

      // Extract RabbitMQ API reason from error cause
      if (error instanceof Error && "cause" in error) {
        errorDetails.rabbitMQReason = (
          error as Error & { cause?: unknown }
        ).cause;
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
      const workspaceId = getWorkspaceId(c);

      // Verify server belongs to the workspace
      const verifiedServer = await verifyServerAccess(serverId, workspaceId);
      if (!verifiedServer) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.deleteUser(username);

      return c.json({ message: "User deleted successfully" });
    } catch (error: unknown) {
      logger.error({ error }, "Error deleting user:");
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
      const workspaceId = getWorkspaceId(c);

      // Verify server belongs to the workspace
      const verifiedServer = await verifyServerAccess(serverId, workspaceId);
      if (!verifiedServer) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.setUserPermissions(permissionData.vhost, username, {
        user: username,
        configure: permissionData.configure,
        write: permissionData.write,
        read: permissionData.read,
      });

      return c.json({ message: "Permissions set successfully" });
    } catch (error: unknown) {
      logger.error({ error }, "Error setting permissions:");
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
      const workspaceId = getWorkspaceId(c);

      // Verify server belongs to the workspace
      const verifiedServer = await verifyServerAccess(serverId, workspaceId);
      if (!verifiedServer) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.deleteUserPermissions(vhost, username);

      return c.json({ message: "Permissions deleted successfully" });
    } catch (error: unknown) {
      logger.error({ error }, "Error deleting permissions:");
      return createErrorResponse(c, error, 500, "Failed to delete permissions");
    }
  }
);

export default usersController;
