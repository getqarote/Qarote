import { UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import {
  CreateUserSchema,
  ServerWorkspaceInputSchema,
  SetPermissionsSchema,
  UpdateUserSchema,
} from "@/schemas/rabbitmq";
import { UsernameParamSchema } from "@/schemas/vhost";

import { UserMapper } from "@/mappers/rabbitmq/UserMapper";

import { authorize, router } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

/**
 * Users router
 * Handles RabbitMQ user management operations (ADMIN ONLY)
 */
export const usersRouter = router({
  /**
   * Get all users for a server (ADMIN ONLY)
   */
  getUsers: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify server belongs to the workspace
        const verifiedServer = await verifyServerAccess(serverId, workspaceId);
        if (!verifiedServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        const users = await client.getUsers();

        // Map users to API response format (only include fields used by web)
        const mappedUsers = UserMapper.toApiResponseArray(users);

        return { users: mappedUsers };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error fetching users:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users",
        });
      }
    }),

  /**
   * Get specific user details (ADMIN ONLY)
   */
  getUser: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceInputSchema.merge(UsernameParamSchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, username } = input;

      try {
        // Verify server belongs to the workspace
        const verifiedServer = await verifyServerAccess(serverId, workspaceId);
        if (!verifiedServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        const userDetails = await client.getUser(username);
        const permissions = await client.getUserPermissions(username);

        // Map user to API response format (only include fields used by Web)
        const mappedUser = UserMapper.toApiResponse(userDetails);

        return {
          user: mappedUser,
          permissions,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error fetching user details:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user details",
        });
      }
    }),

  /**
   * Create new user (ADMIN ONLY)
   */
  createUser: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceInputSchema.merge(CreateUserSchema))
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, username, password, tags } = input;

      try {
        // Verify server belongs to the workspace
        const verifiedServer = await verifyServerAccess(serverId, workspaceId);
        if (!verifiedServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.createUser(username, {
          password,
          tags,
        });

        ctx.logger.info(
          `User ${username} created on server ${serverId} by admin ${ctx.user.id}`
        );

        return { message: "User created successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error creating user:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }
    }),

  /**
   * Update user (ADMIN ONLY)
   */
  updateUser: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(UsernameParamSchema).merge(
        UpdateUserSchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        username,
        tags,
        password,
        removePassword,
      } = input;

      try {
        // Verify server belongs to the workspace
        const verifiedServer = await verifyServerAccess(serverId, workspaceId);
        if (!verifiedServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);

        const payload: {
          tags?: string;
          password?: string;
          password_hash?: string;
        } = {};
        if (tags !== undefined) {
          payload.tags = tags;
        }
        if (password) {
          payload.password = password;
        }
        if (removePassword) {
          payload.password_hash = "";
        }

        ctx.logger.debug(
          {
            username,
            serverId,
            payload,
            updateData: input,
          },
          "Updating user with payload"
        );

        await client.updateUser(username, payload);

        ctx.logger.info(
          `User ${username} updated on server ${serverId} by admin ${ctx.user.id}`
        );

        return { message: "User updated successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error updating user:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user",
        });
      }
    }),

  /**
   * Delete user (ADMIN ONLY)
   */
  deleteUser: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceInputSchema.merge(UsernameParamSchema))
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, username } = input;

      try {
        // Verify server belongs to the workspace
        const verifiedServer = await verifyServerAccess(serverId, workspaceId);
        if (!verifiedServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.deleteUser(username);

        ctx.logger.info(
          `User ${username} deleted from server ${serverId} by admin ${ctx.user.id}`
        );

        return { message: "User deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error deleting user:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete user",
        });
      }
    }),

  /**
   * Set user permissions (ADMIN ONLY)
   */
  setPermissions: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(UsernameParamSchema).merge(
        SetPermissionsSchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, username, vhost, configure, write, read } =
        input;

      try {
        // Verify server belongs to the workspace
        const verifiedServer = await verifyServerAccess(serverId, workspaceId);
        if (!verifiedServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.setUserPermissions(vhost, username, {
          user: username,
          configure,
          write,
          read,
        });

        ctx.logger.info(
          `Permissions set for user ${username} on vhost ${vhost} by admin ${ctx.user.id}`
        );

        return { message: "Permissions set successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error setting permissions:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set permissions",
        });
      }
    }),

  /**
   * Delete user permissions (ADMIN ONLY)
   */
  deletePermissions: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(UsernameParamSchema).merge(
        SetPermissionsSchema.pick({ vhost: true })
      )
    )
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, username, vhost } = input;

      try {
        // Verify server belongs to the workspace
        const verifiedServer = await verifyServerAccess(serverId, workspaceId);
        if (!verifiedServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.deleteUserPermissions(vhost, username);

        ctx.logger.info(
          `Permissions deleted for user ${username} on vhost ${vhost} by admin ${ctx.user.id}`
        );

        return { message: "Permissions deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error deleting permissions:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete permissions",
        });
      }
    }),
});
