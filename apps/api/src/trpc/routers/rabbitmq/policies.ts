import { TRPCError } from "@trpc/server";

import {
  CreateOrUpdatePolicySchema,
  DeletePolicySchema,
  ServerWorkspaceInputSchema,
  VHostOptionalQuerySchema,
  VHostRequiredQuerySchema,
} from "@/schemas/rabbitmq";

import { authorize, router, workspaceProcedure } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

import { UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Policies router
 * Handles RabbitMQ policy operations (list, create/update, delete)
 */
export const policiesRouter = router({
  /**
   * Get all policies for a server, optionally filtered by vhost (ALL USERS)
   */
  getPolicies: workspaceProcedure
    .input(ServerWorkspaceInputSchema.merge(VHostOptionalQuerySchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhost: vhostParam } = input;

      try {
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
        const policies = await client.getPolicies(vhost);

        return {
          success: true,
          policies,
          totalPolicies: policies.length,
        };
      } catch (error) {
        ctx.logger.error(
          { error, serverId },
          "Error fetching policies for server"
        );

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToFetchPolicies"),
        });
      }
    }),

  /**
   * Create or update a policy (ADMIN ONLY)
   * RabbitMQ uses PUT for both create and update — idempotent upsert.
   */
  createOrUpdatePolicy: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(VHostRequiredQuerySchema).merge(
        CreateOrUpdatePolicySchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        vhost: vhostParam,
        name,
        pattern,
        applyTo,
        definition,
        priority,
      } = input;

      try {
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const vhost = decodeURIComponent(vhostParam);
        const client = await createRabbitMQClient(serverId, workspaceId);

        await client.createOrUpdatePolicy(vhost, name, {
          pattern,
          "apply-to": applyTo,
          definition,
          priority,
        });

        return {
          success: true,
        };
      } catch (error) {
        ctx.logger.error(
          { error, serverId },
          `Error saving policy "${input.name}" for server ${serverId}`
        );

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToSavePolicy"),
        });
      }
    }),

  /**
   * Delete a policy (ADMIN ONLY)
   */
  deletePolicy: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(VHostRequiredQuerySchema).merge(
        DeletePolicySchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhost: vhostParam, policyName } = input;

      try {
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const vhost = decodeURIComponent(vhostParam);
        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.deletePolicy(vhost, policyName);

        return {
          success: true,
        };
      } catch (error) {
        ctx.logger.error(
          { error, serverId },
          `Error deleting policy "${input.policyName}" for server ${serverId}`
        );

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToDeletePolicy"),
        });
      }
    }),
});
