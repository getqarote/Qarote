import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  ServerWorkspaceInputSchema,
  VHostOptionalQuerySchema,
} from "@/schemas/rabbitmq";

import { authorize, router } from "@/trpc/trpc";

import { createRabbitMQClientFromServer, verifyServerAccess } from "./shared";

import { UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

export const definitionsRouter = router({
  getDefinitions: authorize([UserRole.ADMIN])
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

        const client = createRabbitMQClientFromServer(server);
        const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
        const definitions = await client.getDefinitions(vhost);

        return definitions;
      } catch (error) {
        ctx.logger.error(
          { error, serverId, workspaceId, vhost: vhostParam },
          "Error fetching RabbitMQ definitions"
        );

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToFetchDefinitions"),
        });
      }
    }),

  importDefinitions: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(VHostOptionalQuerySchema).extend({
        definitions: z.unknown(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhost: vhostParam, definitions } = input;

      try {
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = createRabbitMQClientFromServer(server);
        const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
        await client.uploadDefinitions(definitions, vhost);
      } catch (error) {
        ctx.logger.error(
          { error, serverId, workspaceId, vhost: vhostParam },
          "Error importing RabbitMQ definitions"
        );

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToImportDefinitions"),
        });
      }
    }),
});
