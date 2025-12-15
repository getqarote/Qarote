/**
 * Alert API Client
 * Handles alert management operations including RabbitMQ alerts and alert rules
 */

import {
  AlertInstance,
  AlertNotificationSettings,
  AlertQuery,
  AlertRule,
  AlertsResponse,
  AlertsSummaryResponse,
  AlertStats,
  AlertThresholds,
  CreateAlertRuleInput,
  RabbitMQAlertsResponse,
  ResolvedAlertsResponse,
  ThresholdsResponse,
  UpdateAlertNotificationSettingsRequest,
  UpdateAlertRuleInput,
  UpdateThresholdsResponse,
} from "./alertTypes";
import { BaseApiClient } from "./baseClient";

export class AlertApiClient extends BaseApiClient {
  // Alert Rules Management
  async getAlertRules(workspaceId: string): Promise<AlertRule[]> {
    return this.request<AlertRule[]>(`/workspaces/${workspaceId}/alerts/rules`);
  }

  async getAlertRule(workspaceId: string, id: string): Promise<AlertRule> {
    return this.request<AlertRule>(
      `/workspaces/${workspaceId}/alerts/rules/${id}`
    );
  }

  async createAlertRule(
    workspaceId: string,
    data: CreateAlertRuleInput
  ): Promise<AlertRule> {
    return this.request<AlertRule>(`/workspaces/${workspaceId}/alerts/rules`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAlertRule(
    workspaceId: string,
    id: string,
    data: UpdateAlertRuleInput
  ): Promise<AlertRule> {
    return this.request<AlertRule>(
      `/workspaces/${workspaceId}/alerts/rules/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteAlertRule(
    workspaceId: string,
    id: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/workspaces/${workspaceId}/alerts/rules/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  // Alert Instances Management (Legacy)
  async getAlerts(
    workspaceId: string,
    query?: AlertQuery
  ): Promise<AlertsResponse> {
    const searchParams = new URLSearchParams();

    if (query) {
      if (query.status) {
        if (Array.isArray(query.status)) {
          query.status.forEach((status) =>
            searchParams.append("status", status)
          );
        } else {
          searchParams.append("status", query.status);
        }
      }

      if (query.severity) {
        if (Array.isArray(query.severity)) {
          query.severity.forEach((severity) =>
            searchParams.append("severity", severity)
          );
        } else {
          searchParams.append("severity", query.severity);
        }
      }

      if (query.serverId) {
        searchParams.append("serverId", query.serverId);
      }

      if (query.limit) {
        searchParams.append("limit", query.limit.toString());
      }

      if (query.offset) {
        searchParams.append("offset", query.offset.toString());
      }
    }

    const url = `/workspaces/${workspaceId}/alerts${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    return this.request<AlertsResponse>(url);
  }

  async getAlert(workspaceId: string, id: string): Promise<AlertInstance> {
    return this.request<AlertInstance>(
      `/workspaces/${workspaceId}/alerts/${id}`
    );
  }

  async acknowledgeAlert(
    workspaceId: string,
    id: string,
    note?: string
  ): Promise<AlertInstance> {
    return this.request<AlertInstance>(
      `/workspaces/${workspaceId}/alerts/${id}/acknowledge`,
      {
        method: "POST",
        body: JSON.stringify({ note }),
      }
    );
  }

  async resolveAlert(
    workspaceId: string,
    id: string,
    note?: string
  ): Promise<AlertInstance> {
    return this.request<AlertInstance>(
      `/workspaces/${workspaceId}/alerts/${id}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ note }),
      }
    );
  }

  async getAlertStats(workspaceId: string): Promise<AlertStats> {
    return this.request<AlertStats>(
      `/workspaces/${workspaceId}/alerts/stats/summary`
    );
  }

  // RabbitMQ Alert Management
  async getServerAlerts(
    serverId: string,
    workspaceId: string,
    options: {
      limit?: number;
      offset?: number;
      severity?: string;
      category?: string;
      resolved?: boolean;
      vhost: string; // Required - must specify vhost
    }
  ): Promise<RabbitMQAlertsResponse> {
    const params = new URLSearchParams();

    // vhost is required
    params.append("vhost", encodeURIComponent(options.vhost));

    // Add optional query options
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

    const queryString = params.toString();
    const url = `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/alerts?${queryString}`;
    return this.request<RabbitMQAlertsResponse>(url);
  }

  async getResolvedAlerts(
    serverId: string,
    workspaceId: string,
    options: {
      limit?: number;
      offset?: number;
      severity?: string;
      category?: string;
      vhost: string; // Required - must specify vhost
    }
  ): Promise<ResolvedAlertsResponse> {
    const params = new URLSearchParams();

    // vhost is required
    params.append("vhost", encodeURIComponent(options.vhost));

    // Add optional query options
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

    const queryString = params.toString();
    const url = `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/alerts/resolved?${queryString}`;
    return this.request(url);
  }

  async getServerAlertsSummary(
    serverId: string,
    workspaceId: string
  ): Promise<AlertsSummaryResponse> {
    return this.request<AlertsSummaryResponse>(
      `/rabbitmq/workspaces/${workspaceId}/servers/${serverId}/alerts/summary`
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
  async getAlertNotificationSettings(
    workspaceId: string
  ): Promise<AlertNotificationSettings> {
    const url = `/rabbitmq/workspaces/${workspaceId}/alert-settings`;
    return this.request<AlertNotificationSettings>(url);
  }

  async updateAlertNotificationSettings(
    workspaceId: string,
    settings: UpdateAlertNotificationSettingsRequest
  ): Promise<AlertNotificationSettings> {
    const url = `/rabbitmq/workspaces/${workspaceId}/alert-settings`;
    return this.request<AlertNotificationSettings>(url, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }
}
