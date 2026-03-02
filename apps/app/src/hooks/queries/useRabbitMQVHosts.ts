import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "../ui/useWorkspace";

/**
 * RabbitMQ VHosts hooks and mutations
 */

// RabbitMQ VHosts hooks
export const useVHosts = (
  serverId: string | null,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.vhost.getVHosts.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!serverId && !!workspace?.id && serverExists,
      staleTime: 10000, // 10 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return query;
};

export const useVHost = (
  serverId: string | null,
  vhostName: string,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.vhost.getVHost.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhostName,
    },
    {
      enabled: !!serverId && !!vhostName && !!workspace?.id && serverExists,
      staleTime: 10000, // 10 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return query;
};

// RabbitMQ VHost mutations
export const useDeleteVHost = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.vhost.deleteVHost.useMutation({
    onSuccess: () => {
      // Invalidate vhosts list and specific vhost
      utils.rabbitmq.vhost.getVHosts.invalidate();
      utils.rabbitmq.vhost.getVHost.invalidate();
    },
  });
};

export const useSetVHostPermissions = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.vhost.setPermissions.useMutation({
    onSuccess: () => {
      // Invalidate vhost data to refresh permissions
      utils.rabbitmq.vhost.getVHost.invalidate();
    },
  });
};

export const useDeleteVHostPermissions = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.vhost.deletePermissions.useMutation({
    onSuccess: () => {
      // Invalidate vhost data to refresh permissions
      utils.rabbitmq.vhost.getVHost.invalidate();
    },
  });
};

export const useSetVHostLimit = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.vhost.setLimit.useMutation({
    onSuccess: () => {
      // Invalidate vhost data to refresh limits
      utils.rabbitmq.vhost.getVHost.invalidate();
      utils.rabbitmq.vhost.getVHosts.invalidate();
    },
  });
};

export const useCreateVHost = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.vhost.createVHost.useMutation({
    onSuccess: () => {
      // Invalidate vhosts list
      utils.rabbitmq.vhost.getVHosts.invalidate();
    },
  });
};

export const useUpdateVHost = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.vhost.updateVHost.useMutation({
    onSuccess: () => {
      // Invalidate vhost data
      utils.rabbitmq.vhost.getVHost.invalidate();
      utils.rabbitmq.vhost.getVHosts.invalidate();
    },
  });
};
