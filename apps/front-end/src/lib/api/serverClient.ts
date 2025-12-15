/**
 * Server API Client
 * Handles server management operations
 */

import { BaseApiClient } from "./baseClient";
import { Server } from "./types";

export class ServerApiClient extends BaseApiClient {
  async getServers(workspaceId: string): Promise<{ servers: Server[] }> {
    return this.request<{ servers: Server[] }>(
      `/workspaces/${workspaceId}/servers`
    );
  }

  async getServer(
    workspaceId: string,
    id: string
  ): Promise<{ server: Server }> {
    return this.request<{ server: Server }>(
      `/workspaces/${workspaceId}/servers/${id}`
    );
  }

  async createServer(
    workspaceId: string,
    server: Omit<Server, "id" | "createdAt" | "updatedAt"> & {
      password: string;
    }
  ): Promise<{ server: Server }> {
    return this.request<{ server: Server }>(
      `/workspaces/${workspaceId}/servers`,
      {
        method: "POST",
        body: JSON.stringify(server),
      }
    );
  }

  async updateServer(
    workspaceId: string,
    id: string,
    server: Partial<Omit<Server, "id" | "createdAt" | "updatedAt">> & {
      password?: string;
    }
  ): Promise<{ server: Server }> {
    return this.request<{ server: Server }>(
      `/workspaces/${workspaceId}/servers/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(server),
      }
    );
  }

  async deleteServer(
    workspaceId: string,
    id: string
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/workspaces/${workspaceId}/servers/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async testConnection(
    workspaceId: string,
    credentials: {
      host: string;
      port: number;
      amqpPort: number;
      username: string;
      password: string;
      vhost: string;
      useHttps: boolean;
    }
  ): Promise<{
    success: boolean;
    message: string;
    version?: string;
    cluster_name?: string;
  }> {
    return this.request<{
      success: boolean;
      message: string;
      version?: string;
      cluster_name?: string;
    }>(`/workspaces/${workspaceId}/servers/test-connection`, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }
}
