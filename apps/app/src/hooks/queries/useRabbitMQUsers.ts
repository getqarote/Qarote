import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "../ui/useWorkspace";

/**
 * RabbitMQ Users hooks and mutations
 */

export const useUsers = (
  serverId: string | null,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.users.getUsers.useQuery(
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

export const useUser = (
  serverId: string | null,
  username: string,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.users.getUser.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      username,
    },
    {
      enabled: !!serverId && !!username && !!workspace?.id && serverExists,
      staleTime: 10000, // 10 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return query;
};

// RabbitMQ User mutations
export const useDeleteUser = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.users.deleteUser.useMutation({
    onSuccess: () => {
      // Invalidate users list and specific user
      utils.rabbitmq.users.getUsers.invalidate();
      utils.rabbitmq.users.getUser.invalidate();
    },
  });
};

export const useUpdateUser = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.users.updateUser.useMutation({
    onSuccess: () => {
      // Invalidate users list and specific user
      utils.rabbitmq.users.getUsers.invalidate();
      utils.rabbitmq.users.getUser.invalidate();
    },
  });
};

export const useSetUserPermissions = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.users.setPermissions.useMutation({
    onSuccess: () => {
      // Invalidate user data to refresh permissions
      utils.rabbitmq.users.getUser.invalidate();
    },
  });
};

export const useDeleteUserPermissions = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.users.deletePermissions.useMutation({
    onSuccess: () => {
      // Invalidate user data to refresh permissions
      utils.rabbitmq.users.getUser.invalidate();
    },
  });
};

export const useCreateUser = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.users.createUser.useMutation({
    onSuccess: () => {
      // Invalidate users list
      utils.rabbitmq.users.getUsers.invalidate();
    },
  });
};
