import { TRPCError } from "@trpc/server";

import {
  CreateExchangeSchema,
  DeleteExchangeSchema,
  ServerWorkspaceInputSchema,
  VHostOptionalQuerySchema,
  VHostRequiredQuerySchema,
} from "@/schemas/rabbitmq";

import { BindingMapper, ExchangeMapper, NodeMapper } from "@/mappers/rabbitmq";

import { authorize, router, workspaceProcedure } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

import { UserRole } from "@/generated/prisma/client";

/**
 * Infrastructure router
 * Handles RabbitMQ infrastructure operations (nodes, connections, channels, exchanges)
 */
export const infrastructureRouter = router({
  /**
   * Get all nodes for a specific server (ALL USERS)
   */
  getNodes: workspaceProcedure
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        const nodes = await client.getNodes();

        // Map nodes to API response format (only include fields used by web)
        const mappedNodes = NodeMapper.toApiResponseArray(nodes);

        return { nodes: mappedNodes };
      } catch (error) {
        ctx.logger.error(
          { error, serverId },
          "Error fetching nodes for server"
        );

        // Check if this is a 401 Unauthorized error from RabbitMQ API
        if (error instanceof Error && error.message.includes("401")) {
          return {
            nodes: null,
            permissionStatus: {
              hasPermission: false,
              requiredPermission: "monitor",
              message:
                "User does not have 'monitor' permissions to view node information. Please contact your RabbitMQ administrator to grant the necessary permissions.",
            },
          };
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch nodes",
        });
      }
    }),

  /**
   * Get all connections for a specific server (ALL USERS)
   */
  getConnections: workspaceProcedure
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        const connections = await client.getConnections();
        const channels = await client.getChannels();

        // Calculate totals for the overview cards
        const totalConnections = connections.length;
        const totalChannels = channels.length;

        return {
          success: true,
          connections,
          totalConnections,
          totalChannels,
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error fetching connections for server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch connections",
        });
      }
    }),

  /**
   * Get all channels for a specific server (ALL USERS)
   */
  getChannels: workspaceProcedure
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        const channels = await client.getChannels();

        return {
          success: true,
          channels,
          totalChannels: channels.length,
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error fetching channels for server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch channels",
        });
      }
    }),

  /**
   * Get all exchanges for a specific server (ALL USERS)
   */
  getExchanges: workspaceProcedure
    .input(ServerWorkspaceInputSchema.merge(VHostOptionalQuerySchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhost: vhostParam } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        // Get vhost from validated input (optional)
        const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
        const [exchanges, bindings] = await Promise.all([
          client.getExchanges(vhost),
          client.getBindings(vhost).catch(() => []),
        ]);

        // Map all bindings for the response
        const mappedBindings = BindingMapper.toApiResponseArray(bindings);

        // Group mapped bindings by exchange (source@vhost)
        const bindingsMap = new Map<string, typeof mappedBindings>();
        for (const binding of mappedBindings) {
          const key = `${binding.source}@${binding.vhost}`;
          if (!bindingsMap.has(key)) {
            bindingsMap.set(key, []);
          }
          bindingsMap.get(key)!.push(binding);
        }

        // Map exchanges to API response format (only include fields used by web)
        const mappedExchanges = ExchangeMapper.toApiResponseArray(
          exchanges,
          bindingsMap
        );

        // Calculate exchange type counts
        const exchangeTypes = {
          direct: mappedExchanges.filter((e) => e.type === "direct").length,
          fanout: mappedExchanges.filter((e) => e.type === "fanout").length,
          topic: mappedExchanges.filter((e) => e.type === "topic").length,
          headers: mappedExchanges.filter((e) => e.type === "headers").length,
        };

        return {
          success: true,
          exchanges: mappedExchanges,
          bindings: mappedBindings,
          totalExchanges: mappedExchanges.length,
          totalBindings: mappedBindings.length,
          exchangeTypes,
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error fetching exchanges for server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch exchanges",
        });
      }
    }),

  /**
   * Create a new exchange (ADMIN ONLY)
   */
  createExchange: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(CreateExchangeSchema).merge(
        VHostRequiredQuerySchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        vhost: vhostParam,
        name,
        type,
        durable,
        auto_delete,
        internal,
        arguments: args,
      } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Validate exchange type
        const validTypes = ["direct", "fanout", "topic", "headers"];
        if (!validTypes.includes(type)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid exchange type. Must be one of: ${validTypes.join(", ")}`,
          });
        }

        // Get vhost from validated input (required for exchange operations)
        const vhost = decodeURIComponent(vhostParam);

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.createExchange(name, type, vhost, {
          durable: durable ?? true,
          auto_delete: auto_delete ?? false,
          internal: internal ?? false,
          arguments: args ?? {},
        });

        return {
          success: true,
          message: `Exchange "${name}" created successfully`,
          exchange: {
            name,
            type,
            durable: durable ?? true,
            auto_delete: auto_delete ?? false,
            internal: internal ?? false,
            arguments: args ?? {},
          },
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error creating exchange for server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create exchange",
        });
      }
    }),

  /**
   * Delete an exchange (ADMIN ONLY)
   */
  deleteExchange: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(DeleteExchangeSchema).merge(
        VHostRequiredQuerySchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        exchangeName,
        ifUnused,
        vhost: vhostParam,
      } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Decode vhost (already validated by schema)
        const vhost = decodeURIComponent(vhostParam);

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.deleteExchange(exchangeName, vhost, {
          if_unused: ifUnused,
        });

        return {
          success: true,
          message: `Exchange "${exchangeName}" deleted successfully`,
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error deleting exchange "${exchangeName}" for server ${serverId}`
        );

        // Check if this is a 400 error indicating the exchange is in use
        if (error instanceof Error && error.message.includes("400")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ifUnused
              ? `Cannot delete exchange "${exchangeName}" because it has bindings or is being used. Try force delete to remove it anyway.`
              : `Failed to delete exchange "${exchangeName}". It may be in use or there may be a configuration issue.`,
            cause: "EXCHANGE_IN_USE",
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete exchange",
        });
      }
    }),
});
