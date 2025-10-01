import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authenticate, authorize } from "@/core/auth";
import { UserRole } from "@prisma/client";
import { createRabbitMQClient } from "./shared";
import { ServerParamSchema } from "@/schemas/alerts";
import {
  CreateUserSchema,
  SetPermissionsSchema,
  UpdateUserSchema,
} from "@/schemas/rabbitmq";

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

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      const users = await client.getUsers();

      return c.json({ users });
    } catch (error: any) {
      console.error("Error fetching users:", error);
      return c.json({ error: error.message }, 500);
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

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      const userDetails = await client.getUser(username);
      const permissions = await client.getUserPermissions(username);

      return c.json({
        user: userDetails,
        permissions,
      });
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      return c.json({ error: error.message }, 500);
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

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.createUser(userData.username, {
        password: userData.password,
        tags: userData.tags,
      });

      return c.json({ message: "User created successfully" });
    } catch (error: any) {
      console.error("Error creating user:", error);
      return c.json({ error: error.message }, 500);
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

      await client.updateUser(username, payload);

      return c.json({ message: "User updated successfully" });
    } catch (error: any) {
      console.error("Error updating user:", error);
      return c.json({ error: error.message }, 500);
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

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.deleteUser(username);

      return c.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      return c.json({ error: error.message }, 500);
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

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.setUserPermissions(permissionData.vhost, username, {
        user: username,
        configure: permissionData.configure,
        write: permissionData.write,
        read: permissionData.read,
      });

      return c.json({ message: "Permissions set successfully" });
    } catch (error: any) {
      console.error("Error setting permissions:", error);
      return c.json({ error: error.message }, 500);
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

      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.deleteUserPermissions(vhost, username);

      return c.json({ message: "Permissions deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting permissions:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

export default usersController;
