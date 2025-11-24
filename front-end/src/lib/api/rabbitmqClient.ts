/**
 * RabbitMQ API Client
 * Handles RabbitMQ-specific operations like queues, exchanges, connections
 */

import { BaseApiClient } from "./baseClient";
import { Queue } from "./types";
import {
  Overview,
  NodesResponse,
  MetricsResponse,
  Connection,
  Channel,
  LiveRatesResponse,
  NodeMemoryDetailsResponse,
} from "./rabbitmqTypes";
import { Exchange, Binding, Consumer } from "./exchangeTypes";
import {
  PublishMessageRequest,
  PublishMessageResponse,
  CreateQueueRequest,
  CreateQueueResponse,
} from "./messageTypes";
import {
  VHostsResponse,
  VHostDetailsResponse,
  VHostActionResponse,
  CreateVHostRequest,
  UpdateVHostRequest,
  SetVHostPermissionsRequest,
  SetVHostLimitRequest,
} from "./vhostTypes";
import {
  RabbitMQUser,
  RabbitMQUserPermission,
  CreateUserRequest,
  UpdateUserRequest,
  SetUserPermissionRequest,
  UserDetailsResponse,
} from "./userTypes";
import {
  AlertThresholds,
  AlertsResponse,
  AlertsSummaryResponse,
  ThresholdsResponse,
  UpdateThresholdsResponse,
  HealthResponse,
} from "@/types/alerts";
import { TimeRange } from "@/components/TimeRangeSelector";

export class RabbitMQApiClient extends BaseApiClient {
  // Overview and Metrics
  async getOverview(
    serverId: string,
    workspaceId: string
  ): Promise<{ overview: Overview }> {
    return this.request<{ overview: Overview }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/overview`
    );
  }

  async getMetrics(
    serverId: string,
    workspaceId: string
  ): Promise<MetricsResponse> {
    return this.request<MetricsResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/metrics`
    );
  }

  async getLiveRatesMetrics(
    serverId: string,
    workspaceId: string,
    timeRange: TimeRange = "1d"
  ): Promise<LiveRatesResponse> {
    const params = new URLSearchParams({ timeRange });
    return this.request<LiveRatesResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/metrics/rates?${params.toString()}`
    );
  }

  async getQueueLiveRates(
    serverId: string,
    queueName: string,
    workspaceId: string,
    timeRange: TimeRange = "1d"
  ): Promise<LiveRatesResponse> {
    const encodedQueueName = encodeURIComponent(queueName);
    const params = new URLSearchParams({ timeRange });
    return this.request<LiveRatesResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodedQueueName}/metrics/rates?${params.toString()}`
    );
  }

  // Queue Management
  async getQueues(
    serverId: string,
    workspaceId: string
  ): Promise<{ queues: Queue[] }> {
    return this.request<{ queues: Queue[] }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues`
    );
  }

  async getQueue(
    serverId: string,
    queueName: string,
    workspaceId: string
  ): Promise<{ queue: Queue }> {
    return this.request<{ queue: Queue }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(queueName)}`
    );
  }

  async createQueue(
    params: CreateQueueRequest & { workspaceId: string }
  ): Promise<CreateQueueResponse> {
    const { serverId, workspaceId, ...queueData } = params;
    return this.request<CreateQueueResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues`,
      {
        method: "POST",
        body: JSON.stringify(queueData),
      }
    );
  }

  async purgeQueue(
    serverId: string,
    queueName: string,
    workspaceId: string
  ): Promise<{ success: boolean; message: string; purged: number }> {
    return this.request<{ success: boolean; message: string; purged: number }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(
        queueName
      )}/messages`,
      {
        method: "DELETE",
      }
    );
  }

  async deleteQueue(
    serverId: string,
    queueName: string,
    workspaceId: string,
    options: {
      if_unused?: boolean;
      if_empty?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string }> {
    const queryParams = new URLSearchParams();
    if (options.if_unused !== undefined) {
      queryParams.append("if_unused", options.if_unused.toString());
    }
    if (options.if_empty !== undefined) {
      queryParams.append("if_empty", options.if_empty.toString());
    }

    const queryString = queryParams.toString();
    const url = `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(queueName)}${queryString ? `?${queryString}` : ""}`;

    return this.request<{ success: boolean; message: string }>(url, {
      method: "DELETE",
    });
  }

  async pauseQueue(
    serverId: string,
    queueName: string,
    workspaceId: string
  ): Promise<{
    success: boolean;
    message: string;
    cancelledConsumers: number;
  }> {
    return this.request<{
      success: boolean;
      message: string;
      cancelledConsumers: number;
    }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(queueName)}/pause`,
      {
        method: "POST",
      }
    );
  }

  async resumeQueue(
    serverId: string,
    queueName: string,
    workspaceId: string
  ): Promise<{ success: boolean; message: string; note: string }> {
    return this.request<{ success: boolean; message: string; note: string }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(queueName)}/resume`,
      {
        method: "POST",
      }
    );
  }

  async getQueuePauseStatus(
    serverId: string,
    queueName: string,
    workspaceId: string
  ) {
    return this.request<{
      success: boolean;
      queueName: string;
      pauseState: {
        isPaused: boolean;
        pausedAt?: string;
        resumedAt?: string;
        pausedConsumers: string[];
      };
    }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(queueName)}/pause-status`
    );
  }

  // Message Management
  async publishMessage(
    params: PublishMessageRequest & { workspaceId: string }
  ): Promise<PublishMessageResponse> {
    const { serverId, queueName, workspaceId, ...publishData } = params;
    return this.request<PublishMessageResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(queueName)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(publishData),
      }
    );
  }

  // Node Management
  async getNodes(
    serverId: string,
    workspaceId: string
  ): Promise<NodesResponse> {
    return this.request<NodesResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/nodes`
    );
  }

  async getNodeMemoryDetails(
    serverId: string,
    nodeName: string,
    workspaceId: string
  ): Promise<NodeMemoryDetailsResponse> {
    return this.request(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/nodes/${encodeURIComponent(
        nodeName
      )}/memory`
    );
  }

  // Connection and Channel Management
  async getConnections(
    serverId: string,
    workspaceId: string
  ): Promise<{
    success: boolean;
    connections: Connection[];
    totalConnections: number;
    totalChannels: number;
  }> {
    return this.request<{
      success: boolean;
      connections: Connection[];
      totalConnections: number;
      totalChannels: number;
    }>(`/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/connections`);
  }

  async getChannels(
    serverId: string,
    workspaceId: string
  ): Promise<{
    success: boolean;
    channels: Channel[];
    totalChannels: number;
  }> {
    return this.request<{
      success: boolean;
      channels: Channel[];
      totalChannels: number;
    }>(`/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/channels`);
  }

  // Exchange and Binding Management
  async getExchanges(
    serverId: string,
    workspaceId: string
  ): Promise<{
    success: boolean;
    exchanges: Exchange[];
    bindings: Binding[];
    totalExchanges: number;
    totalBindings: number;
    exchangeTypes: {
      direct: number;
      fanout: number;
      topic: number;
      headers: number;
    };
  }> {
    return this.request<{
      success: boolean;
      exchanges: Exchange[];
      bindings: Binding[];
      totalExchanges: number;
      totalBindings: number;
      exchangeTypes: {
        direct: number;
        fanout: number;
        topic: number;
        headers: number;
      };
    }>(`/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/exchanges`);
  }

  async createExchange(
    serverId: string,
    workspaceId: string,
    exchangeData: {
      name: string;
      type: string;
      durable?: boolean;
      auto_delete?: boolean;
      internal?: boolean;
      arguments?: { [key: string]: unknown };
    }
  ): Promise<{
    success: boolean;
    message: string;
    exchange: {
      name: string;
      type: string;
      durable: boolean;
      auto_delete: boolean;
      internal: boolean;
      arguments: { [key: string]: unknown };
    };
  }> {
    return this.request<{
      success: boolean;
      message: string;
      exchange: {
        name: string;
        type: string;
        durable: boolean;
        auto_delete: boolean;
        internal: boolean;
        arguments: { [key: string]: unknown };
      };
    }>(`/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/exchanges`, {
      method: "POST",
      body: JSON.stringify(exchangeData),
    });
  }

  async deleteExchange(
    serverId: string,
    exchangeName: string,
    workspaceId: string,
    options: {
      if_unused?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const queryParams = new URLSearchParams();
    if (options.if_unused !== undefined) {
      queryParams.append("if_unused", options.if_unused.toString());
    }

    const queryString = queryParams.toString();
    const url = `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/exchanges/${encodeURIComponent(exchangeName)}${queryString ? `?${queryString}` : ""}`;

    return this.request<{
      success: boolean;
      message: string;
    }>(url, {
      method: "DELETE",
    });
  }

  async getBindings(
    serverId: string,
    workspaceId: string
  ): Promise<{
    success: boolean;
    bindings: Binding[];
    totalBindings: number;
  }> {
    return this.request<{
      success: boolean;
      bindings: Binding[];
      totalBindings: number;
    }>(`/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/bindings`);
  }

  // Consumer Management
  async getQueueConsumers(
    serverId: string,
    queueName: string,
    workspaceId: string
  ): Promise<{
    success: boolean;
    consumers: Consumer[];
    totalConsumers: number;
    queueName: string;
  }> {
    return this.request<{
      success: boolean;
      consumers: Consumer[];
      totalConsumers: number;
      queueName: string;
    }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(
        queueName
      )}/consumers`
    );
  }

  // Queue Bindings Management
  async getQueueBindings(
    serverId: string,
    queueName: string,
    workspaceId: string
  ): Promise<{
    success: boolean;
    bindings: Binding[];
    totalBindings: number;
    queueName: string;
  }> {
    return this.request<{
      success: boolean;
      bindings: Binding[];
      totalBindings: number;
      queueName: string;
    }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/queues/${encodeURIComponent(
        queueName
      )}/bindings`
    );
  }

  // VHost Management (Admin Only)
  async getVHosts(
    serverId: string,
    workspaceId: string
  ): Promise<VHostsResponse> {
    return this.request<VHostsResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts`
    );
  }

  async getVHost(
    serverId: string,
    vhostName: string,
    workspaceId: string
  ): Promise<VHostDetailsResponse> {
    return this.request<VHostDetailsResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts/${encodeURIComponent(vhostName)}`
    );
  }

  async createVHost(
    serverId: string,
    data: CreateVHostRequest,
    workspaceId: string
  ): Promise<VHostActionResponse> {
    return this.request<VHostActionResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateVHost(
    serverId: string,
    vhostName: string,
    data: UpdateVHostRequest,
    workspaceId: string
  ): Promise<VHostActionResponse> {
    return this.request<VHostActionResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts/${encodeURIComponent(vhostName)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteVHost(
    serverId: string,
    vhostName: string,
    workspaceId: string
  ): Promise<VHostActionResponse> {
    return this.request<VHostActionResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts/${encodeURIComponent(vhostName)}`,
      {
        method: "DELETE",
      }
    );
  }

  async setVHostPermissions(
    serverId: string,
    vhostName: string,
    username: string,
    permissions: SetVHostPermissionsRequest,
    workspaceId: string
  ): Promise<VHostActionResponse> {
    return this.request<VHostActionResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts/${encodeURIComponent(
        vhostName
      )}/permissions/${encodeURIComponent(username)}`,
      {
        method: "PUT",
        body: JSON.stringify(permissions),
      }
    );
  }

  async deleteVHostPermissions(
    serverId: string,
    vhostName: string,
    username: string,
    workspaceId: string
  ): Promise<VHostActionResponse> {
    return this.request<VHostActionResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts/${encodeURIComponent(
        vhostName
      )}/permissions/${encodeURIComponent(username)}`,
      {
        method: "DELETE",
      }
    );
  }

  async setVHostLimit(
    serverId: string,
    vhostName: string,
    limitType: string,
    data: SetVHostLimitRequest,
    workspaceId: string
  ): Promise<VHostActionResponse> {
    return this.request<VHostActionResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts/${encodeURIComponent(
        vhostName
      )}/limits/${limitType}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteVHostLimit(
    serverId: string,
    vhostName: string,
    limitType: string,
    workspaceId: string
  ): Promise<VHostActionResponse> {
    return this.request<VHostActionResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/vhosts/${encodeURIComponent(
        vhostName
      )}/limits/${limitType}`,
      {
        method: "DELETE",
      }
    );
  }

  // User Management (Admin Only)
  async getUsers(
    serverId: string,
    workspaceId: string
  ): Promise<{ users: RabbitMQUser[] }> {
    const response = await this.request<{ users: RabbitMQUser[] }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/users`
    );

    // Fetch permissions for each user to determine accessible vhosts
    const usersWithPermissions = await Promise.all(
      response.users.map(async (user) => {
        try {
          const userDetails = await this.getUser(
            serverId,
            user.name,
            workspaceId
          );
          const accessibleVhosts = userDetails.permissions.map((p) => p.vhost);
          // Preserve the original user data (including password_hash) and add accessibleVhosts
          return { ...user, accessibleVhosts };
        } catch {
          return { ...user, accessibleVhosts: [] };
        }
      })
    );

    return { users: usersWithPermissions };
  }

  async getUserPermissions(
    serverId: string,
    username: string,
    workspaceId: string
  ): Promise<RabbitMQUserPermission[]> {
    const userDetails = await this.getUser(serverId, username, workspaceId);
    return userDetails.permissions;
  }

  async getUser(
    serverId: string,
    username: string,
    workspaceId: string
  ): Promise<UserDetailsResponse> {
    return this.request<UserDetailsResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/users/${encodeURIComponent(username)}`
    );
  }

  async createUser(
    serverId: string,
    data: CreateUserRequest,
    workspaceId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/users`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateUser(
    serverId: string,
    username: string,
    data: UpdateUserRequest,
    workspaceId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/users/${encodeURIComponent(username)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteUser(
    serverId: string,
    username: string,
    workspaceId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/users/${encodeURIComponent(username)}`,
      {
        method: "DELETE",
      }
    );
  }

  async setUserPermissions(
    serverId: string,
    username: string,
    data: SetUserPermissionRequest,
    workspaceId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/users/${encodeURIComponent(username)}/permissions`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteUserPermissions(
    serverId: string,
    username: string,
    vhost: string,
    workspaceId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/users/${encodeURIComponent(username)}/permissions/${encodeURIComponent(vhost)}`,
      {
        method: "DELETE",
      }
    );
  }

  // Alert Management
  async getServerAlerts(
    serverId: string,
    workspaceId: string,
    thresholds?: AlertThresholds,
    options?: {
      limit?: number;
      offset?: number;
      severity?: string;
      category?: string;
      resolved?: boolean;
    }
  ): Promise<AlertsResponse> {
    const params = new URLSearchParams();

    // Add threshold parameters
    if (thresholds) {
      Object.entries(thresholds).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    // Add query options
    if (options) {
      if (options.limit !== undefined) {
        params.append("limit", options.limit.toString());
      }
      if (options.offset !== undefined) {
        params.append("offset", options.offset.toString());
      }
      if (options.severity) {
        params.append("severity", options.severity);
      }
      if (options.category) {
        params.append("category", options.category);
      }
      if (options.resolved !== undefined) {
        params.append("resolved", options.resolved.toString());
      }
    }

    const queryString = params.toString();
    const url = `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/alerts${queryString ? `?${queryString}` : ""}`;
    return this.request<AlertsResponse>(url);
  }

  async getServerAlertsSummary(
    serverId: string,
    workspaceId: string
  ): Promise<AlertsSummaryResponse> {
    return this.request<AlertsSummaryResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/alerts/summary`
    );
  }

  async getServerHealth(
    serverId: string,
    workspaceId: string
  ): Promise<HealthResponse> {
    return this.request<HealthResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/health`
    );
  }

  // Threshold Management
  async getWorkspaceThresholds(
    workspaceId: string
  ): Promise<ThresholdsResponse> {
    return this.request<ThresholdsResponse>(
      `/rabbitmq/workspaces/${workspaceId}/thresholds`
    );
  }

  async updateWorkspaceThresholds(
    thresholds: Partial<AlertThresholds>,
    workspaceId: string
  ): Promise<UpdateThresholdsResponse> {
    return this.request<UpdateThresholdsResponse>(
      `/rabbitmq/workspaces/${workspaceId}/thresholds`,
      {
        method: "PUT",
        body: JSON.stringify({ thresholds }),
      }
    );
  }

  // Alert Notification Settings
  async getAlertNotificationSettings(workspaceId: string): Promise<{
    success: boolean;
    settings: {
      emailNotificationsEnabled: boolean;
      contactEmail: string | null;
      notificationSeverities?: string[];
    };
  }> {
    const url = `/rabbitmq/workspaces/${workspaceId}/alert-settings`;
    return this.request<{
      success: boolean;
      settings: {
        emailNotificationsEnabled: boolean;
        contactEmail: string | null;
        notificationSeverities?: string[];
      };
    }>(url);
  }

  async updateAlertNotificationSettings(
    workspaceId: string,
    settings: {
      emailNotificationsEnabled?: boolean;
      contactEmail?: string | null;
      notificationSeverities?: string[];
    }
  ): Promise<{
    success: boolean;
    settings: {
      emailNotificationsEnabled: boolean;
      contactEmail: string | null;
      notificationSeverities?: string[];
    };
  }> {
    const url = `/rabbitmq/workspaces/${workspaceId}/alert-settings`;
    return this.request<{
      success: boolean;
      settings: {
        emailNotificationsEnabled: boolean;
        contactEmail: string | null;
        notificationSeverities?: string[];
      };
    }>(url, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }
}
