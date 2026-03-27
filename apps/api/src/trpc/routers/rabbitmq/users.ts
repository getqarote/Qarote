import { TRPCError } from "@trpc/server";

import { EncryptionService } from "@/services/encryption.service";

import {
  CreateUserSchema,
  ServerWorkspaceInputSchema,
  SetPermissionsSchema,
  UpdateUserSchema,
} from "@/schemas/rabbitmq";
import { UsernameParamSchema } from "@/schemas/vhost";

import { UserMapper } from "@/mappers/rabbitmq";

import { authorize, router } from "@/trpc/trpc";

import { createRabbitMQClientFromServer, verifyServerAccess } from "./shared";

import { UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = createRabbitMQClientFromServer(verifiedServer);
        const users = await client.getUsers();

        // Fetch permissions with limited concurrency to avoid overwhelming the RabbitMQ API
        const CONCURRENCY_LIMIT = 10;
        const permissionsResults: PromiseSettledResult<
          Awaited<ReturnType<typeof client.getUserPermissions>>
        >[] = [];
        for (let i = 0; i < users.length; i += CONCURRENCY_LIMIT) {
          const batch = users
            .slice(i, i + CONCURRENCY_LIMIT)
            .map((user) => client.getUserPermissions(user.name));
          const batchResults = await Promise.allSettled(batch);
          permissionsResults.push(...batchResults);
        }

        const accessibleVhostsMap = new Map<string, string[]>();
        users.forEach((user, index) => {
          const result = permissionsResults[index];
          if (result.status === "fulfilled" && result.value) {
            accessibleVhostsMap.set(
              user.name,
              result.value.map((p) => p.vhost)
            );
          }
        });

        // Map users to API response format (only include fields used by web)
        const mappedUsers = UserMapper.toApiResponseArray(
          users,
          accessibleVhostsMap
        );

        return { users: mappedUsers };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error fetching users:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToFetchUsers"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = createRabbitMQClientFromServer(verifiedServer);
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
          message: te(ctx.locale, "rabbitmq.failedToFetchUserDetails"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = createRabbitMQClientFromServer(verifiedServer);
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
          message: te(ctx.locale, "rabbitmq.failedToCreateUser"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        // Prevent modifying the connection user (the user Qarote uses to connect)
        const connectionUsername = EncryptionService.decrypt(
          verifiedServer.username
        );
        if (username === connectionUsername) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "rabbitmq.cannotModifyConnectionUser"),
          });
        }

        const client = createRabbitMQClientFromServer(verifiedServer);

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
        } else if (removePassword) {
          payload.password_hash = "";
        } else {
          // Preserve existing password by fetching the current hash
          // RabbitMQ PUT /users/{name} is a full replacement, so omitting
          // password/password_hash would remove the existing password
          const existingUser = await client.getUser(username);
          if (existingUser?.password_hash) {
            payload.password_hash = existingUser.password_hash;
          }
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
        const reason =
          error instanceof Error && typeof error.cause === "string"
            ? error.cause
            : undefined;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: reason
            ? `${te(ctx.locale, "rabbitmq.failedToUpdateUser")}: ${reason}`
            : te(ctx.locale, "rabbitmq.failedToUpdateUser"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        // Prevent deleting the connection user (the user Qarote uses to connect)
        const connectionUsername = EncryptionService.decrypt(
          verifiedServer.username
        );
        if (username === connectionUsername) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "rabbitmq.cannotModifyConnectionUser"),
          });
        }

        const client = createRabbitMQClientFromServer(verifiedServer);
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
          message: te(ctx.locale, "rabbitmq.failedToDeleteUser"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = createRabbitMQClientFromServer(verifiedServer);
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
          message: te(ctx.locale, "rabbitmq.failedToSetPermissions"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = createRabbitMQClientFromServer(verifiedServer);
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
          message: te(ctx.locale, "rabbitmq.failedToDeletePermissions"),
        });
      }
    }),
});
