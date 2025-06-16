/**
 * Logs API Client
 * Handles activity logging and audit trail operations
 * NOTE: This is prepared for future backend implementation
 */

import { BaseApiClient } from "./base-client";
import {
  ActivityLog,
  LogQuery,
  LogsResponse,
  LogStats,
  CreateLogRequest,
  LogExportRequest,
} from "./log-types";

export class LogsApiClient extends BaseApiClient {
  // Get activity logs with filtering and pagination
  async getLogs(query?: LogQuery): Promise<LogsResponse> {
    const searchParams = new URLSearchParams();

    if (query) {
      if (query.userId) {
        searchParams.append("userId", query.userId);
      }

      if (query.action) {
        if (Array.isArray(query.action)) {
          query.action.forEach((action) =>
            searchParams.append("action", action)
          );
        } else {
          searchParams.append("action", query.action);
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

      if (query.startDate) {
        searchParams.append("startDate", query.startDate);
      }

      if (query.endDate) {
        searchParams.append("endDate", query.endDate);
      }

      if (query.search) {
        searchParams.append("search", query.search);
      }

      if (query.limit) {
        searchParams.append("limit", query.limit.toString());
      }

      if (query.offset) {
        searchParams.append("offset", query.offset.toString());
      }

      if (query.sortBy) {
        searchParams.append("sortBy", query.sortBy);
      }

      if (query.sortOrder) {
        searchParams.append("sortOrder", query.sortOrder);
      }
    }

    const url = `/logs${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    return this.request<LogsResponse>(url);
  }

  // Get a specific log entry by ID
  async getLog(id: string): Promise<ActivityLog> {
    return this.request<ActivityLog>(`/logs/${id}`);
  }

  // Create a new log entry (for internal system use)
  async createLog(data: CreateLogRequest): Promise<ActivityLog> {
    return this.request<ActivityLog>("/logs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Get log statistics and summary
  async getLogStats(timeRange?: string): Promise<LogStats> {
    const url = timeRange
      ? `/logs/stats?timeRange=${timeRange}`
      : "/logs/stats";
    return this.request<LogStats>(url);
  }

  // Export logs in various formats
  async exportLogs(request: LogExportRequest): Promise<Blob> {
    const searchParams = new URLSearchParams();
    searchParams.append("format", request.format);

    if (request.query) {
      Object.entries(request.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }

    return this.requestBlob(`/logs/export?${searchParams.toString()}`, {
      method: "GET",
    });
  }

  // Get logs for a specific user
  async getUserLogs(userId: string, limit?: number): Promise<ActivityLog[]> {
    const url = limit
      ? `/logs/users/${userId}?limit=${limit}`
      : `/logs/users/${userId}`;
    return this.request<ActivityLog[]>(url);
  }

  // Get logs for a specific server
  async getServerLogs(
    serverId: string,
    limit?: number
  ): Promise<ActivityLog[]> {
    const url = limit
      ? `/logs/servers/${serverId}?limit=${limit}`
      : `/logs/servers/${serverId}`;
    return this.request<ActivityLog[]>(url);
  }

  // Get recent activity (last 24 hours)
  async getRecentActivity(limit: number = 50): Promise<ActivityLog[]> {
    return this.request<ActivityLog[]>(`/logs/recent?limit=${limit}`);
  }

  // Delete old logs (admin only)
  async deleteLogs(olderThan: string): Promise<{ deletedCount: number }> {
    return this.request<{ deletedCount: number }>("/logs/cleanup", {
      method: "DELETE",
      body: JSON.stringify({ olderThan }),
    });
  }
}
