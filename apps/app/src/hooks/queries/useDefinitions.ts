import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "../ui/useWorkspace";

/**
 * Definitions hooks
 * Handles broker definitions export and import
 */

export const useExportDefinitions = (
  serverId: string | null,
  vhost?: string | null,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.definitions.getDefinitions.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhost: vhost ? encodeURIComponent(vhost) : undefined,
    },
    {
      enabled: !!serverId && !!workspace?.id && serverExists,
      staleTime: 0,
      retry: false,
    }
  );

  return query;
};

export const useImportDefinitions = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.rabbitmq.definitions.importDefinitions.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.rabbitmq.users.getUsers.invalidate(),
        utils.rabbitmq.vhost.getVHosts.invalidate(),
        utils.rabbitmq.infrastructure.getExchanges.invalidate(),
        utils.rabbitmq.queues.getQueues.invalidate(),
        utils.rabbitmq.policies.getPolicies.invalidate(),
      ]);
    },
  });

  const mutate: typeof mutation.mutate = (input, options) =>
    mutation.mutate(
      {
        ...input,
        vhost: input.vhost ? encodeURIComponent(input.vhost) : undefined,
      },
      options
    );

  const mutateAsync: typeof mutation.mutateAsync = (input, options) =>
    mutation.mutateAsync(
      {
        ...input,
        vhost: input.vhost ? encodeURIComponent(input.vhost) : undefined,
      },
      options
    );

  return { ...mutation, mutate, mutateAsync };
};
