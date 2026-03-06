import { TRPCError } from "@trpc/server";

import { requirePremiumFeature } from "@/core/feature-flags";

import {
  ServerWorkspaceInputSchema,
  VHostOptionalQuerySchema,
} from "@/schemas/rabbitmq";

import { FEATURES } from "@/config/features";

import {
  BindingMapper,
  ConsumerMapper,
  ExchangeMapper,
  QueueMapper,
} from "@/mappers/rabbitmq";

import { router, workspaceProcedure } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

import { te } from "@/i18n";

export const topologyRouter = router({
  getTopology: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.TOPOLOGY_VISUALIZATION))
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

        const [exchanges, queues, bindings, consumers] = await Promise.all([
          client.getExchanges(vhost),
          client.getQueues(vhost),
          client.getBindings(vhost).catch((err) => {
            ctx.logger.warn(
              { error: err, serverId, vhost },
              "Failed to fetch bindings for topology, continuing without"
            );
            return [];
          }),
          client.getConsumers().catch((err) => {
            ctx.logger.warn(
              { error: err, serverId },
              "Failed to fetch consumers for topology, continuing without"
            );
            return [];
          }),
        ]);

        const filteredConsumers = vhost
          ? consumers.filter((c) => c.queue?.vhost === vhost)
          : consumers;

        const mappedBindings = BindingMapper.toApiResponseArray(bindings);

        // Group bindings by exchange source for ExchangeMapper
        const bindingsMap = new Map<string, typeof mappedBindings>();
        for (const binding of mappedBindings) {
          const key = `${binding.source}@${binding.vhost}`;
          if (!bindingsMap.has(key)) bindingsMap.set(key, []);
          bindingsMap.get(key)!.push(binding);
        }

        return {
          exchanges: ExchangeMapper.toApiResponseArray(exchanges, bindingsMap),
          queues: QueueMapper.toApiResponseArray(queues),
          bindings: mappedBindings,
          consumers: ConsumerMapper.toApiResponseArray(filteredConsumers),
        };
      } catch (error) {
        ctx.logger.error(
          { error, serverId, workspaceId, vhost: vhostParam },
          "Error fetching topology data"
        );

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToFetchTopology"),
        });
      }
    }),
});
