import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";

import { queryKeys } from "@/hooks/useApi";
import { useWorkspace } from "@/hooks/useWorkspace";

// Update server mutation
export function useUpdateServer() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      host: string;
      port: number;
      username: string;
      password?: string;
      vhost: string;
      useSSL: boolean;
      managementPort: number;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      const serverData = {
        name: data.name,
        host: data.host,
        port: data.port,
        username: data.username,
        vhost: data.vhost,
        sslConfig: data.useSSL
          ? { enabled: true, verifyPeer: false }
          : undefined,
        ...(data.password && { password: data.password }),
      };

      const response = await apiClient.updateServer(
        workspace.id,
        data.id,
        serverData
      );
      return response.server;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
  });
}

// Delete server mutation
export function useDeleteServer() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: async (serverId: string) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      await apiClient.deleteServer(workspace.id, serverId);
      return serverId;
    },
    onSuccess: (deletedServerId) => {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
  });
}

// Test connection mutation
export function useTestConnection() {
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: async (credentials: {
      host: string;
      port: number;
      username: string;
      password: string;
      vhost: string;
      useHttps: boolean;
      amqpPort: number;
    }) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return await apiClient.testConnection(workspace.id, credentials);
    },
  });
}
