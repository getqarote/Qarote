import { TRPCError } from "@trpc/server";

import { prisma } from "@/core/prisma";
import { RabbitMQClient } from "@/core/rabbitmq";

import { EncryptionService } from "@/services/encryption.service";
import {
  extractMajorMinorVersion,
  getUserPlan,
  getUserResourceCounts,
  validateRabbitMqVersion,
  validateServerCreation,
} from "@/services/plan/plan.service";

import {
  CreateServerWithWorkspaceSchema,
  DeleteServerInputSchema,
  GetServerInputSchema,
  GetServersInputSchema,
  TestConnectionWithWorkspaceSchema,
  UpdateServerWithWorkspaceSchema,
} from "@/schemas/rabbitmq";

import {
  adminPlanValidationProcedure,
  authorize,
  router,
  workspaceProcedure,
} from "@/trpc/trpc";

import { UserRole } from "@/generated/prisma/client";

/**
 * Server router
 * Handles RabbitMQ server management operations
 */
export const serverRouter = router({
  /**
   * Get all RabbitMQ servers for a workspace (ALL USERS)
   */
  getServers: workspaceProcedure
    .input(GetServersInputSchema)
    .query(async ({ input, ctx }) => {
      const { workspaceId } = input;

      try {
        // Only return servers that belong to the workspace
        const servers = await prisma.rabbitMQServer.findMany({
          where: {
            workspaceId,
          },
          select: {
            id: true,
            name: true,
            host: true,
            port: true,
            amqpPort: true,
            username: true,
            vhost: true,
            useHttps: true,
            isOverQueueLimit: true,
            queueCountAtConnect: true,
            overLimitWarningShown: true,
            createdAt: true,
            updatedAt: true,
            workspaceId: true,
          },
        });

        // Transform the response to decrypt sensitive data for display
        const transformedServers = servers.map((server) => ({
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          amqpPort: server.amqpPort,
          username: EncryptionService.decrypt(server.username), // Decrypt for display
          vhost: server.vhost,
          useHttps: server.useHttps,
          isOverQueueLimit: server.isOverQueueLimit,
          queueCountAtConnect: server.queueCountAtConnect,
          overLimitWarningShown: server.overLimitWarningShown,
          createdAt: server.createdAt.toISOString(),
          updatedAt: server.updatedAt.toISOString(),
          workspaceId: server.workspaceId,
        }));

        return {
          servers: transformedServers,
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error fetching servers");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch servers",
        });
      }
    }),

  /**
   * Get a specific server by ID (ALL USERS)
   */
  getServer: workspaceProcedure
    .input(GetServerInputSchema)
    .query(async ({ input, ctx }) => {
      const { id, workspaceId } = input;

      try {
        const server = await prisma.rabbitMQServer.findUnique({
          where: {
            id,
            // Ensure the server belongs to the workspace
            workspaceId,
          },
          select: {
            id: true,
            name: true,
            host: true,
            port: true,
            amqpPort: true,
            username: true,
            vhost: true,
            useHttps: true,
            isOverQueueLimit: true,
            queueCountAtConnect: true,
            overLimitWarningShown: true,
            createdAt: true,
            updatedAt: true,
            workspaceId: true,
          },
        });

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Transform the response to decrypt sensitive data for display
        const transformedServer = {
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          amqpPort: server.amqpPort,
          username: EncryptionService.decrypt(server.username), // Decrypt for display
          vhost: server.vhost,
          useHttps: server.useHttps,
          isOverQueueLimit: server.isOverQueueLimit,
          queueCountAtConnect: server.queueCountAtConnect,
          overLimitWarningShown: server.overLimitWarningShown,
          createdAt: server.createdAt.toISOString(),
          updatedAt: server.updatedAt.toISOString(),
          workspaceId: server.workspaceId,
        };

        return {
          server: transformedServer,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error, id }, "Error fetching server");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch server",
        });
      }
    }),

  /**
   * Create a new server (ADMIN ONLY - sensitive operation with plan validation)
   */
  createServer: adminPlanValidationProcedure
    .input(CreateServerWithWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, ...data } = input;

      try {
        // Validate plan restrictions for server creation
        const [plan, resourceCounts] = await Promise.all([
          getUserPlan(ctx.user.id),
          getUserResourceCounts(ctx.user.id),
        ]);

        validateServerCreation(plan, resourceCounts.servers);

        ctx.logger.info({ data }, "Creating server with data");

        // Test connection before creating the server (use plain text for testing)
        const client = new RabbitMQClient({
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          useHttps: data.useHttps,
        });

        // Attempt to get the overview to validate connection and detect version
        const overview = await client.getOverview();
        const rabbitMqVersion = overview.rabbitmq_version;
        const majorMinorVersion = extractMajorMinorVersion(rabbitMqVersion);

        // Validate RabbitMQ version against plan restrictions
        validateRabbitMqVersion(plan, rabbitMqVersion);

        // Encrypt sensitive data before storing
        const server = await prisma.rabbitMQServer.create({
          data: {
            name: data.name,
            host: data.host,
            port: data.port,
            amqpPort: data.amqpPort,
            username: EncryptionService.encrypt(data.username), // Encrypt username
            password: EncryptionService.encrypt(data.password), // Encrypt password
            vhost: data.vhost,
            useHttps: data.useHttps,
            version: rabbitMqVersion, // Store full version
            versionMajorMinor: majorMinorVersion, // Store major.minor for plan validation
            // Store over-limit information
            overLimitWarningShown: false,
            // Assign server to workspace
            workspaceId,
          },
        });

        return {
          server: {
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            amqpPort: server.amqpPort,
            username: data.username, // Return original (not encrypted) for UI
            vhost: server.vhost,
            useHttps: server.useHttps,
            workspaceId: server.workspaceId,
            createdAt: server.createdAt.toISOString(),
            updatedAt: server.updatedAt.toISOString(),
          },
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error creating server");
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create server",
        });
      }
    }),

  /**
   * Update a server (ADMIN ONLY - sensitive operation)
   */
  updateServer: authorize([UserRole.ADMIN])
    .input(UpdateServerWithWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, workspaceId, ...data } = input;

      try {
        // Check if server exists and belongs to workspace
        const existingServer = await prisma.rabbitMQServer.findUnique({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // If credentials are being updated, test the connection
        if (
          data.host ||
          data.port ||
          data.username ||
          data.password ||
          data.vhost ||
          data.useHttps !== undefined
        ) {
          const client = new RabbitMQClient({
            host: data.host || existingServer.host,
            port: data.port || existingServer.port,
            amqpPort: data.amqpPort || existingServer.amqpPort,
            username: data.username || existingServer.username,
            password: data.password || existingServer.password,
            vhost: data.vhost || existingServer.vhost,
            useHttps: data.useHttps ?? existingServer.useHttps,
            version: existingServer.version ?? undefined,
            versionMajorMinor: existingServer.versionMajorMinor ?? undefined,
          });

          await client.getOverview();
        }

        // Prepare update data with proper encryption
        const updateData: {
          name?: string;
          host?: string;
          port?: number;
          amqpPort?: number;
          username?: string;
          password?: string;
          vhost?: string;
          useHttps?: boolean;
        } = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.host !== undefined) updateData.host = data.host;
        if (data.port !== undefined) updateData.port = data.port;
        if (data.amqpPort !== undefined) updateData.amqpPort = data.amqpPort;
        if (data.username !== undefined)
          updateData.username = EncryptionService.encrypt(data.username);
        if (data.password !== undefined)
          updateData.password = EncryptionService.encrypt(data.password);
        if (data.vhost !== undefined) updateData.vhost = data.vhost;
        if (data.useHttps !== undefined) updateData.useHttps = data.useHttps;

        const server = await prisma.rabbitMQServer.update({
          where: { id },
          data: updateData,
        });

        return {
          server: {
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            amqpPort: server.amqpPort,
            username: EncryptionService.decrypt(server.username), // Decrypt for display
            vhost: server.vhost,
            useHttps: server.useHttps,
            createdAt: server.createdAt.toISOString(),
            updatedAt: server.updatedAt.toISOString(),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error, id }, "Error updating server");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update server",
        });
      }
    }),

  /**
   * Delete a server (ADMIN ONLY - dangerous operation)
   */
  deleteServer: authorize([UserRole.ADMIN])
    .input(DeleteServerInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, workspaceId } = input;

      try {
        // Check if server exists and belongs to workspace
        const existingServer = await prisma.rabbitMQServer.findUnique({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        await prisma.rabbitMQServer.delete({
          where: { id },
        });

        return {
          message: "Server deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error, id }, "Error deleting server");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete server",
        });
      }
    }),

  /**
   * Test RabbitMQ connection (ADMIN ONLY - could expose sensitive info)
   */
  testConnection: authorize([UserRole.ADMIN])
    .input(TestConnectionWithWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      // Extract connection credentials (exclude workspaceId which is only for validation)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { workspaceId, ...credentials } = input;

      ctx.logger.info({ credentials }, "Testing connection with credentials");

      try {
        const client = new RabbitMQClient(credentials);
        ctx.logger.info({ client }, "Created RabbitMQ client");
        const overview = await client.getOverview();

        return {
          success: true,
          message: "Connection successful",
          version: overview.rabbitmq_version,
          cluster_name: overview.cluster_name,
        };
      } catch (error) {
        ctx.logger.error({ error }, "Connection test failed");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Connection failed",
        });
      }
    }),
});
