import { useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "../ui/useWorkspace";

/**
 * Server management hooks
 */
export const useServers = () => {
  const { workspace } = useWorkspace();

  return trpc.rabbitmq.server.getServers.useQuery(
    { workspaceId: workspace?.id ?? "" },
    {
      enabled: !!workspace?.id,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refetch every minute
    }
  );
};

export const useServer = (id: string) => {
  const { workspace } = useWorkspace();

  return trpc.rabbitmq.server.getServer.useQuery(
    { workspaceId: workspace?.id ?? "", id },
    {
      enabled: !!id && !!workspace?.id,
      staleTime: 60000, // 1 minute
    }
  );
};

export const useCreateServer = () => {
  const { workspace } = useWorkspace();
  const utils = trpc.useUtils();

  return trpc.rabbitmq.server.createServer.useMutation({
    onSuccess: () => {
      utils.rabbitmq.server.getServers.invalidate({
        workspaceId: workspace?.id ?? "",
      });
    },
  });
};

export const useUpdateServer = () => {
  const { workspace } = useWorkspace();
  const utils = trpc.useUtils();

  return trpc.rabbitmq.server.updateServer.useMutation({
    onSuccess: () => {
      if (workspace?.id) {
        utils.rabbitmq.server.getServers.invalidate({
          workspaceId: workspace.id,
        });
      }
    },
  });
};

export const useDeleteServer = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const utils = trpc.useUtils();

  return trpc.rabbitmq.server.deleteServer.useMutation({
    onSuccess: (_, variables) => {
      const deletedServerId = variables.id;

      // First, cancel any in-flight queries for the deleted server
      queryClient.cancelQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          if (!Array.isArray(queryKey)) return false;

          // Check if the query key array contains the deleted serverId
          // Also check stringified version for nested objects or different formats
          const keyString = JSON.stringify(queryKey);
          return (
            queryKey.includes(deletedServerId) ||
            keyString.includes(deletedServerId)
          );
        },
      });

      // Remove all queries related to the deleted server to prevent 500 errors
      // This includes queries with refetchInterval that would continue fetching
      // We use a comprehensive predicate that checks multiple ways the serverId might appear
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          if (!Array.isArray(queryKey)) return false;

          // Direct check if serverId is in the array
          if (queryKey.includes(deletedServerId)) return true;

          // Check stringified version for nested objects or different formats
          const keyString = JSON.stringify(queryKey);
          if (keyString.includes(deletedServerId)) return true;

          // Check if any key in the array is a string containing the serverId
          return queryKey.some(
            (key) => typeof key === "string" && key.includes(deletedServerId)
          );
        },
      });

      // Clear selectedServerId from localStorage immediately to prevent any new queries
      if (typeof window !== "undefined") {
        const currentSelectedId = localStorage.getItem("selectedServerId");
        if (currentSelectedId === deletedServerId) {
          localStorage.removeItem("selectedServerId");
        }
      }

      // Invalidate servers list to refresh the UI
      if (workspace?.id) {
        utils.rabbitmq.server.getServers.invalidate({
          workspaceId: workspace.id,
        });
      }
    },
  });
};

export const useTestConnection = () => {
  return trpc.rabbitmq.server.testConnection.useMutation();
};

