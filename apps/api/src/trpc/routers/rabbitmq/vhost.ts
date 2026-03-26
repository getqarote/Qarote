import { TRPCError } from "@trpc/server";

import {
  ServerWorkspaceInputSchema,
  ServerWorkspaceWithVHostNameSchema,
} from "@/schemas/rabbitmq";
import {
  CreateVHostSchema,
  SetPermissionSchema,
  UpdateVHostSchema,
  UsernameParamSchema,
  VHostLimitTypeSchema,
  VHostLimitValueSchema,
} from "@/schemas/vhost";

import { VHostMapper } from "@/mappers/rabbitmq";

import { authorize, router } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

import { UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * VHost router
 * Handles RabbitMQ virtual host management operations
 */
export const vhostRouter = router({
  /**
   * Get all virtual hosts for a server
   */
  getVHosts: authorize([UserRole.ADMIN, UserRole.MEMBER])
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify server access
        const result = await verifyServerAccess(serverId, workspaceId);
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        const [vhosts, allQueues] = await Promise.all([
          client.getVHosts(),
          client.getQueues(undefined).catch(() => []), // Get all queues across all vhosts
        ]);

        // Enhance vhost data with additional details
        const enhancedVHosts = await Promise.all(
          vhosts.map(async (vhost) => {
            try {
              const [permissions, limits] = await Promise.all([
                client.getVHostPermissions(vhost.name).catch(() => []),
                client.getVHostLimits(vhost.name).catch(() => ({})),
              ]);

              // Calculate message stats by aggregating queue data for this vhost
              const vhostQueues = allQueues.filter(
                (q) => q.vhost === vhost.name
              );
              const messageStats = vhostQueues.reduce(
                (acc, queue) => ({
                  messages: acc.messages + (queue.messages || 0),
                  messages_ready:
                    acc.messages_ready + (queue.messages_ready || 0),
                  messages_unacknowledged:
                    acc.messages_unacknowledged +
                    (queue.messages_unacknowledged || 0),
                }),
                { messages: 0, messages_ready: 0, messages_unacknowledged: 0 }
              );

              return {
                ...vhost,
                messages: vhost.messages ?? messageStats.messages,
                messages_ready:
                  vhost.messages_ready ?? messageStats.messages_ready,
                messages_unacknowledged:
                  vhost.messages_unacknowledged ??
                  messageStats.messages_unacknowledged,
                permissions: permissions || [],
                limits: limits || {},
                permissionCount: (permissions || []).length,
                limitCount: Object.keys(limits || {}).length,
              };
            } catch (error) {
              ctx.logger.warn(
                { error },
                `Failed to get details for vhost ${vhost.name}:`
              );
              return {
                ...vhost,
                messages: vhost.messages || 0,
                messages_ready: vhost.messages_ready || 0,
                messages_unacknowledged: vhost.messages_unacknowledged || 0,
                permissions: [],
                limits: {},
                permissionCount: 0,
                limitCount: 0,
              };
            }
          })
        );

        // Map vhosts to API response format (only include fields used by web)
        const mappedVhosts = VHostMapper.toApiResponseArray(enhancedVHosts);

        return {
          success: true,
          vhosts: mappedVhosts,
          total: mappedVhosts.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error fetching vhosts for server ${serverId}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToFetchVhosts"),
        });
      }
    }),

  /**
   * Get a specific virtual host details
   */
  getVHost: authorize([UserRole.ADMIN, UserRole.MEMBER])
    .input(ServerWorkspaceWithVHostNameSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhostName } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);

        const [
          vhost,
          permissions,
          limits,
          allQueues,
          allExchanges,
          allConnections,
        ] = await Promise.all([
          client.getVHost(vhostName),
          client.getVHostPermissions(vhostName).catch(() => []),
          client.getVHostLimits(vhostName).catch(() => ({})),
          client.getQueues(undefined).catch(() => []), // Get all queues across all vhosts
          client.getExchanges(undefined).catch(() => []), // Get all exchanges across all vhosts
          client.getConnections().catch(() => []),
        ]);

        // Filter by vhost
        const queues = allQueues.filter((q) => q.vhost === vhostName);
        const exchanges = allExchanges.filter((e) => e.vhost === vhostName);
        const connections = allConnections.filter((c) => c.vhost === vhostName);

        const stats = {
          queueCount: queues.length,
          exchangeCount: exchanges.length,
          connectionCount: connections.length,
          totalMessages: queues.reduce((sum, q) => sum + (q.messages || 0), 0),
          totalConsumers: queues.reduce(
            (sum, q) => sum + (q.consumers || 0),
            0
          ),
        };

        // Enhance vhost with permissions, limits, and stats
        const enhancedVhost = {
          ...vhost,
          permissions: permissions || [],
          limits: limits || {},
          stats,
        };

        // Map vhost to API response format (only include fields used by Web)
        const mappedVhost = VHostMapper.toApiResponse(enhancedVhost);

        return {
          success: true,
          vhost: mappedVhost,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error fetching vhost ${vhostName} for server ${serverId}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToFetchVhost"),
        });
      }
    }),

  /**
   * Delete a virtual host (ADMIN ONLY)
   */
  deleteVHost: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceWithVHostNameSchema)
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhostName } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        // Prevent deletion of default vhost
        if (vhostName === "/") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "rabbitmq.cannotDeleteDefaultVhost"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.deleteVHost(vhostName);

        ctx.logger.info(
          `VHost ${vhostName} deleted by user ${ctx.user.id} on server ${serverId}`
        );

        return {
          success: true,
          message: `Virtual host "${vhostName}" deleted successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error deleting vhost ${vhostName} on server ${serverId}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToDeleteVhost"),
        });
      }
    }),

  /**
   * Set user permissions for a virtual host (ADMIN ONLY)
   */
  setPermissions: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceWithVHostNameSchema.merge(UsernameParamSchema).merge(
        SetPermissionSchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        vhostName,
        username,
        configure,
        write,
        read,
      } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.setUserPermissions(vhostName, username, {
          user: username,
          configure,
          write,
          read,
        });

        ctx.logger.info(
          `Permissions set for user ${username} on vhost ${vhostName} by admin ${ctx.user.id}`
        );

        return {
          success: true,
          message: `Permissions set for user "${username}" on virtual host "${vhostName}"`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error setting permissions for user ${username} on vhost ${vhostName}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToSetPermissions"),
        });
      }
    }),

  /**
   * Delete user permissions for a virtual host (ADMIN ONLY)
   */
  deletePermissions: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceWithVHostNameSchema.merge(UsernameParamSchema))
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhostName, username } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.deleteUserPermissions(vhostName, username);

        ctx.logger.info(
          `Permissions deleted for user ${username} on vhost ${vhostName} by admin ${ctx.user.id}`
        );

        return {
          success: true,
          message: `Permissions deleted for user "${username}" on virtual host "${vhostName}"`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error deleting permissions for user ${username} on vhost ${vhostName}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToDeletePermissions"),
        });
      }
    }),

  /**
   * Create a new virtual host (ADMIN ONLY)
   */
  createVHost: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceInputSchema.merge(CreateVHostSchema))
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        name,
        description,
        default_queue_type,
        tracing,
      } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.createVHost({
          name,
          description,
          default_queue_type,
          tracing,
        });

        ctx.logger.info(
          `VHost ${name} created by user ${ctx.user.id} on server ${serverId}`
        );

        return {
          success: true,
          message: `Virtual host "${name}" created successfully`,
          vhost: {
            name,
            description,
            tracing,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error creating vhost ${name} on server ${serverId}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToCreateVhost"),
        });
      }
    }),

  /**
   * Update a virtual host (ADMIN ONLY)
   */
  updateVHost: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceWithVHostNameSchema.merge(UpdateVHostSchema))
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhostName, ...updateData } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.updateVHost(vhostName, updateData);

        ctx.logger.info(
          `VHost ${vhostName} updated by user ${ctx.user.id} on server ${serverId}`
        );

        return {
          success: true,
          message: `Virtual host "${vhostName}" updated successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error updating vhost ${vhostName} on server ${serverId}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToUpdateVhost"),
        });
      }
    }),

  /**
   * Set virtual host limit (ADMIN ONLY)
   */
  setLimit: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceWithVHostNameSchema.extend({
        limitType: VHostLimitTypeSchema,
        value: VHostLimitValueSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhostName, limitType, value } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.setVHostLimit(vhostName, limitType, {
          value,
        });

        ctx.logger.info(
          `Limit ${limitType} set to ${value} for vhost ${vhostName} by admin ${ctx.user.id}`
        );

        return {
          success: true,
          message: `Limit "${limitType}" set to ${value} for virtual host "${vhostName}"`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error setting limit ${limitType} for vhost ${vhostName}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToSetLimit"),
        });
      }
    }),

  /**
   * Delete virtual host limit (ADMIN ONLY)
   */
  deleteLimit: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceWithVHostNameSchema.extend({
        limitType: VHostLimitTypeSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhostName, limitType } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.deleteVHostLimit(vhostName, limitType);

        ctx.logger.info(
          `Limit ${limitType} deleted for vhost ${vhostName} by admin ${ctx.user.id}`
        );

        return {
          success: true,
          message: `Limit "${limitType}" deleted for virtual host "${vhostName}"`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error deleting limit ${limitType} for vhost ${vhostName}:`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToDeleteLimit"),
        });
      }
    }),
});
