import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authenticate, authorize } from "@/core/auth";
import { UserRole } from "@prisma/client";
import { createRabbitMQClient } from "./shared";

const usersController = new Hono();

// All user management routes require admin access
usersController.use("*", authenticate);
usersController.use("*", authorize([UserRole.ADMIN]));

// Get all users for a server
usersController.get("/servers/:serverId/users", async (c) => {
  try {
    const serverId = c.req.param("serverId");
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
});

// Get specific user details
usersController.get("/servers/:serverId/users/:username", async (c) => {
  try {
    const serverId = c.req.param("serverId");
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
});

// Create user schema
const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required").optional(),
  tags: z.string().optional().default(""),
});

// Create new user
usersController.post(
  "/servers/:serverId/users",
  zValidator("json", createUserSchema),
  async (c) => {
    try {
      const serverId = c.req.param("serverId");
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

// Update user schema
const updateUserSchema = z.object({
  password: z.string().optional(),
  tags: z.string().optional(),
  removePassword: z.boolean().optional(),
});

// Update user
usersController.put(
  "/servers/:serverId/users/:username",
  zValidator("json", updateUserSchema),
  async (c) => {
    try {
      const serverId = c.req.param("serverId");
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

// Delete user
usersController.delete("/servers/:serverId/users/:username", async (c) => {
  try {
    const serverId = c.req.param("serverId");
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
});

// Set user permissions schema
const setPermissionsSchema = z.object({
  vhost: z.string().min(1, "Virtual host is required"),
  configure: z.string().default(".*"),
  write: z.string().default(".*"),
  read: z.string().default(".*"),
});

// Set user permissions
usersController.put(
  "/servers/:serverId/users/:username/permissions",
  zValidator("json", setPermissionsSchema),
  async (c) => {
    try {
      const serverId = c.req.param("serverId");
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

// Delete user permissions
usersController.delete(
  "/servers/:serverId/users/:username/permissions/:vhost",
  async (c) => {
    try {
      const serverId = c.req.param("serverId");
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
