/**
 * Main API Client
 * Combines all API clients into a single interface
 */

import { ServerApiClient } from "./serverClient";
import { RabbitMQApiClient } from "./rabbitmqClient";
import { AuthApiClient } from "./authClient";
import { AlertApiClient } from "./alertClient";
import { WorkspaceApiClient } from "./workspaceClient";
import { LogsApiClient } from "./logsClient";
import type { LogQuery, CreateLogRequest, LogExportRequest } from "./logTypes";
import { FeedbackRequest } from "@/types/feedback";

class ApiClient {
  private serverClient: ServerApiClient;
  private rabbitmqClient: RabbitMQApiClient;
  private authClient: AuthApiClient;
  private alertClient: AlertApiClient;
  private workspaceClient: WorkspaceApiClient;
  private logsClient: LogsApiClient;

  constructor(baseUrl?: string) {
    this.serverClient = new ServerApiClient(baseUrl);
    this.rabbitmqClient = new RabbitMQApiClient(baseUrl);
    this.authClient = new AuthApiClient(baseUrl);
    this.alertClient = new AlertApiClient(baseUrl);
    this.workspaceClient = new WorkspaceApiClient(baseUrl);
    this.logsClient = new LogsApiClient(baseUrl);
  }

  // Server methods
  async getServers() {
    return this.serverClient.getServers();
  }

  async getServer(id: string) {
    return this.serverClient.getServer(id);
  }

  async createServer(server: Parameters<ServerApiClient["createServer"]>[0]) {
    return this.serverClient.createServer(server);
  }

  async testConnection(
    credentials: Parameters<ServerApiClient["testConnection"]>[0]
  ) {
    return this.serverClient.testConnection(credentials);
  }

  // RabbitMQ methods
  async getOverview(serverId: string) {
    return this.rabbitmqClient.getOverview(serverId);
  }

  async getQueues(serverId: string) {
    return this.rabbitmqClient.getQueues(serverId);
  }

  async getQueue(serverId: string, queueName: string) {
    return this.rabbitmqClient.getQueue(serverId, queueName);
  }

  async createQueue(params: Parameters<RabbitMQApiClient["createQueue"]>[0]) {
    return this.rabbitmqClient.createQueue(params);
  }

  async purgeQueue(serverId: string, queueName: string) {
    return this.rabbitmqClient.purgeQueue(serverId, queueName);
  }

  async browseQueueMessages(
    serverId: string,
    queueName: string,
    count?: number,
    ackMode?: string
  ) {
    return this.rabbitmqClient.browseQueueMessages(
      serverId,
      queueName,
      count,
      ackMode
    );
  }

  async publishMessage(
    params: Parameters<RabbitMQApiClient["publishMessage"]>[0]
  ) {
    return this.rabbitmqClient.publishMessage(params);
  }

  async getNodes(serverId: string) {
    return this.rabbitmqClient.getNodes(serverId);
  }

  async getEnhancedMetrics(serverId: string) {
    return this.rabbitmqClient.getEnhancedMetrics(serverId);
  }

  async getConnections(serverId: string) {
    return this.rabbitmqClient.getConnections(serverId);
  }

  async getChannels(serverId: string) {
    return this.rabbitmqClient.getChannels(serverId);
  }

  async getExchanges(serverId: string) {
    return this.rabbitmqClient.getExchanges(serverId);
  }

  async getBindings(serverId: string) {
    return this.rabbitmqClient.getBindings(serverId);
  }

  async getQueueConsumers(serverId: string, queueName: string) {
    return this.rabbitmqClient.getQueueConsumers(serverId, queueName);
  }

  async getTimeSeriesMetrics(serverId: string, timeRange?: string) {
    return this.rabbitmqClient.getTimeSeriesMetrics(serverId, timeRange);
  }

  // Authentication methods
  async login(credentials: Parameters<AuthApiClient["login"]>[0]) {
    return this.authClient.login(credentials);
  }

  async register(userData: Parameters<AuthApiClient["register"]>[0]) {
    return this.authClient.register(userData);
  }

  async getProfile() {
    return this.authClient.getProfile();
  }

  async updateProfile(userData: Parameters<AuthApiClient["updateProfile"]>[0]) {
    return this.authClient.updateProfile(userData);
  }

  async updateCompany(
    companyData: Parameters<AuthApiClient["updateCompany"]>[0]
  ) {
    return this.authClient.updateCompany(companyData);
  }

  // New workspace methods
  async updateWorkspace(
    workspaceData: Parameters<AuthApiClient["updateWorkspace"]>[0]
  ) {
    return this.authClient.updateWorkspace(workspaceData);
  }

  async getCompanyUsers() {
    return this.authClient.getCompanyUsers();
  }

  // New workspace users method
  async getWorkspaceUsers() {
    return this.authClient.getWorkspaceUsers();
  }

  async inviteUser(userData: Parameters<AuthApiClient["inviteUser"]>[0]) {
    return this.authClient.inviteUser(userData);
  }

  async logout() {
    return this.authClient.logout();
  }

  // Alert methods
  async getRecentAlerts() {
    return this.alertClient.getRecentAlerts();
  }

  async getAlertRules() {
    return this.alertClient.getAlertRules();
  }

  async getAlertRule(id: string) {
    return this.alertClient.getAlertRule(id);
  }

  async createAlertRule(
    data: Parameters<AlertApiClient["createAlertRule"]>[0]
  ) {
    return this.alertClient.createAlertRule(data);
  }

  async updateAlertRule(
    id: string,
    data: Parameters<AlertApiClient["updateAlertRule"]>[1]
  ) {
    return this.alertClient.updateAlertRule(id, data);
  }

  async deleteAlertRule(id: string) {
    return this.alertClient.deleteAlertRule(id);
  }

  async getAlerts(query?: Parameters<AlertApiClient["getAlerts"]>[0]) {
    return this.alertClient.getAlerts(query);
  }

  async getAlert(id: string) {
    return this.alertClient.getAlert(id);
  }

  async acknowledgeAlert(id: string, note?: string) {
    return this.alertClient.acknowledgeAlert(id, note);
  }

  async resolveAlert(id: string, note?: string) {
    return this.alertClient.resolveAlert(id, note);
  }

  async getAlertStats() {
    return this.alertClient.getAlertStats();
  }

  // Company methods
  async getWorspacePrivacySettings(companyId: string) {
    return this.workspaceClient.getWorkspacePrivacySettings(companyId);
  }

  async updateWorkspacePrivacySettings(
    companyId: string,
    settings: Parameters<
      WorkspaceApiClient["updateWorkspacePrivacySettings"]
    >[1]
  ) {
    return this.workspaceClient.updateWorkspacePrivacySettings(
      companyId,
      settings
    );
  }

  async exportWorkspaceData(companyId: string) {
    return this.workspaceClient.exportWorkspaceData(companyId);
  }

  async deleteWorkspaceData(companyId: string) {
    return this.workspaceClient.deleteWorkspaceData(companyId);
  }

  // Logs methods
  async getLogs(query?: LogQuery) {
    return this.logsClient.getLogs(query);
  }

  async getLog(id: string) {
    return this.logsClient.getLog(id);
  }

  async createLog(data: CreateLogRequest) {
    return this.logsClient.createLog(data);
  }

  async getLogStats(timeRange?: string) {
    return this.logsClient.getLogStats(timeRange);
  }

  async exportLogs(request: LogExportRequest) {
    return this.logsClient.exportLogs(request);
  }

  async getUserLogs(userId: string, limit?: number) {
    return this.logsClient.getUserLogs(userId, limit);
  }

  async getServerLogs(serverId: string, limit?: number) {
    return this.logsClient.getServerLogs(serverId, limit);
  }

  async getRecentActivity(limit?: number) {
    return this.logsClient.getRecentActivity(limit);
  }

  async deleteLogs(olderThan: string) {
    return this.logsClient.deleteLogs(olderThan);
  }

  // Feedback methods
  async submitFeedback(feedbackData: FeedbackRequest) {
    // For now, we'll use a simple fetch until we create a proper feedback client
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`http://localhost:3000/api/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify(feedbackData),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        // If we can't parse the error response, use the generic error
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }
}

export const apiClient = new ApiClient();
