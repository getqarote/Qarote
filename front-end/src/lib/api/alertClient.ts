/**
 * Alert API Client
 * Handles alert management operations
 */

import {
  Alert,
  AlertInstance,
  AlertQuery,
  AlertRule,
  AlertsResponse,
  AlertStats,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from "./alertTypes";
import { BaseApiClient } from "./baseClient";

export class AlertApiClient extends BaseApiClient {
  // Legacy alerts
  async getRecentAlerts(): Promise<{ alerts: Alert[] }> {
    return this.request<{ alerts: Alert[] }>("/alerts/recent/day");
  }

  // Alert Rules Management
  async getAlertRules(): Promise<AlertRule[]> {
    return this.request<AlertRule[]>("/alerts/rules");
  }

  async getAlertRule(id: string): Promise<AlertRule> {
    return this.request<AlertRule>(`/alerts/rules/${id}`);
  }

  async createAlertRule(data: CreateAlertRuleInput): Promise<AlertRule> {
    return this.request<AlertRule>("/alerts/rules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAlertRule(
    id: string,
    data: UpdateAlertRuleInput
  ): Promise<AlertRule> {
    return this.request<AlertRule>(`/alerts/rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAlertRule(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/alerts/rules/${id}`, {
      method: "DELETE",
    });
  }

  // Alert Instances Management
  async getAlerts(query?: AlertQuery): Promise<AlertsResponse> {
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

    const url = `/alerts${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    return this.request<AlertsResponse>(url);
  }

  async getAlert(id: string): Promise<AlertInstance> {
    return this.request<AlertInstance>(`/alerts/${id}`);
  }

  async acknowledgeAlert(id: string, note?: string): Promise<AlertInstance> {
    return this.request<AlertInstance>(`/alerts/${id}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  async resolveAlert(id: string, note?: string): Promise<AlertInstance> {
    return this.request<AlertInstance>(`/alerts/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  async getAlertStats(): Promise<AlertStats> {
    return this.request<AlertStats>("/alerts/stats/summary");
  }
}
