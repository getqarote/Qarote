/**
 * Server API Client
 * Handles server management operations
 */

import { BaseApiClient } from "./baseClient";
import { Server, SSLConfig } from "./types";

export class ServerApiClient extends BaseApiClient {
  async getServers(): Promise<{ servers: Server[] }> {
    return this.request<{ servers: Server[] }>("/servers");
  }

  async getServer(id: string): Promise<{ server: Server }> {
    return this.request<{ server: Server }>(`/servers/${id}`);
  }

  async createServer(
    server: Omit<Server, "id" | "createdAt" | "updatedAt"> & {
      password: string;
    }
  ): Promise<{ server: Server }> {
    return this.request<{ server: Server }>("/servers", {
      method: "POST",
      body: JSON.stringify(server),
    });
  }

  async updateServer(
    id: string,
    server: Partial<Omit<Server, "id" | "createdAt" | "updatedAt">> & {
      password?: string;
    }
  ): Promise<{ server: Server }> {
    return this.request<{ server: Server }>(`/servers/${id}`, {
      method: "PUT",
      body: JSON.stringify(server),
    });
  }

  async deleteServer(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/servers/${id}`, {
      method: "DELETE",
    });
  }

  async testConnection(credentials: {
    host: string;
    port: number;
    username: string;
    password: string;
    vhost: string;
    useHttps: boolean;
    sslConfig?: SSLConfig;
  }): Promise<{
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
    }>("/servers/test-connection", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }
}
