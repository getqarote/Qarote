/**
 * Main API Client
 * Combines all API clients into a single interface
 */

import { AlertThresholds } from "@/types/alerts";
import type { FeedbackRequest } from "@/types/feedback";

import { AlertApiClient } from "./alertClient";
import { AuthApiClient } from "./authClient";
import { DiscordApiClient } from "./discordClient";
import type { FeedbackFilters, UpdateFeedbackRequest } from "./feedbackClient";
import { FeedbackApiClient } from "./feedbackClient";
import { LogsApiClient } from "./logsClient";
import type { CreateLogRequest, LogExportRequest, LogQuery } from "./logTypes";
import { PasswordApiClient } from "./passwordClient";
import { PaymentApiClient } from "./paymentClient";
import { PlanApiClient } from "./planClient";
import { RabbitMQApiClient } from "./rabbitmqClient";
import { ServerApiClient } from "./serverClient";
import type {
  CreateSlackConfigRequest,
  UpdateSlackConfigRequest,
} from "./slackClient";
import { SlackApiClient } from "./slackClient";
import type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
} from "./webhookClient";
import { WebhookApiClient } from "./webhookClient";
import { WorkspaceApiClient } from "./workspaceClient";

class ApiClient {
  private serverClient: ServerApiClient;
  private rabbitmqClient: RabbitMQApiClient;
  private authClient: AuthApiClient;
  private alertClient: AlertApiClient;
  private workspaceClient: WorkspaceApiClient;
  private logsClient: LogsApiClient;
  private feedbackClient: FeedbackApiClient;
  private planClient: PlanApiClient;
  private paymentClient: PaymentApiClient;
  private passwordClient: PasswordApiClient;
  private discordClient: DiscordApiClient;
  private webhookClient: WebhookApiClient;
  private slackClient: SlackApiClient;

  constructor(baseUrl?: string) {
    this.serverClient = new ServerApiClient(baseUrl);
    this.rabbitmqClient = new RabbitMQApiClient(baseUrl);
    this.authClient = new AuthApiClient(baseUrl);
    this.alertClient = new AlertApiClient(baseUrl);
    this.workspaceClient = new WorkspaceApiClient(baseUrl);
    this.logsClient = new LogsApiClient(baseUrl);
    this.feedbackClient = new FeedbackApiClient(baseUrl);
    this.planClient = new PlanApiClient(baseUrl);
    this.paymentClient = new PaymentApiClient(baseUrl);
    this.passwordClient = new PasswordApiClient(baseUrl);
    this.discordClient = new DiscordApiClient(baseUrl);
    this.webhookClient = new WebhookApiClient(baseUrl);
    this.slackClient = new SlackApiClient(baseUrl);
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

  async updateServer(
    id: string,
    server: Parameters<ServerApiClient["updateServer"]>[1]
  ) {
    return this.serverClient.updateServer(id, server);
  }

  async deleteServer(id: string) {
    return this.serverClient.deleteServer(id);
  }

  async testConnection(
    credentials: Parameters<ServerApiClient["testConnection"]>[0]
  ) {
    return this.serverClient.testConnection(credentials);
  }

  // RabbitMQ methods
  async getOverview(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getOverview(serverId, workspaceId);
  }

  async getQueues(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getQueues(serverId, workspaceId);
  }

  async getQueue(serverId: string, queueName: string, workspaceId: string) {
    return this.rabbitmqClient.getQueue(serverId, queueName, workspaceId);
  }

  async createQueue(params: Parameters<RabbitMQApiClient["createQueue"]>[0]) {
    return this.rabbitmqClient.createQueue(params);
  }

  async purgeQueue(serverId: string, queueName: string, workspaceId: string) {
    return this.rabbitmqClient.purgeQueue(serverId, queueName, workspaceId);
  }

  async deleteQueue(
    serverId: string,
    queueName: string,
    workspaceId: string,
    options: {
      if_unused?: boolean;
      if_empty?: boolean;
    } = {}
  ) {
    return this.rabbitmqClient.deleteQueue(
      serverId,
      queueName,
      workspaceId,
      options
    );
  }

  async pauseQueue(serverId: string, queueName: string, workspaceId: string) {
    return this.rabbitmqClient.pauseQueue(serverId, queueName, workspaceId);
  }

  async resumeQueue(serverId: string, queueName: string, workspaceId: string) {
    return this.rabbitmqClient.resumeQueue(serverId, queueName, workspaceId);
  }

  async getQueuePauseStatus(
    serverId: string,
    queueName: string,
    workspaceId: string
  ) {
    return this.rabbitmqClient.getQueuePauseStatus(
      serverId,
      queueName,
      workspaceId
    );
  }

  async publishMessage(
    params: Parameters<RabbitMQApiClient["publishMessage"]>[0]
  ) {
    return this.rabbitmqClient.publishMessage(params);
  }

  async getNodes(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getNodes(serverId, workspaceId);
  }

  async getNodeMemoryDetails(
    serverId: string,
    nodeName: string,
    workspaceId: string
  ) {
    return this.rabbitmqClient.getNodeMemoryDetails(
      serverId,
      nodeName,
      workspaceId
    );
  }

  async getMetrics(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getMetrics(serverId, workspaceId);
  }

  async getConnections(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getConnections(serverId, workspaceId);
  }

  async getChannels(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getChannels(serverId, workspaceId);
  }

  async getExchanges(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getExchanges(serverId, workspaceId);
  }

  async createExchange(
    serverId: string,
    exchangeData: Parameters<RabbitMQApiClient["createExchange"]>[2],
    workspaceId: string
  ) {
    return this.rabbitmqClient.createExchange(
      serverId,
      workspaceId,
      exchangeData
    );
  }

  async deleteExchange(
    serverId: string,
    exchangeName: string,
    workspaceId: string,
    options: Parameters<RabbitMQApiClient["deleteExchange"]>[3] = {}
  ) {
    return this.rabbitmqClient.deleteExchange(
      serverId,
      exchangeName,
      workspaceId,
      options
    );
  }

  async getBindings(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getBindings(serverId, workspaceId);
  }

  async getQueueConsumers(
    serverId: string,
    queueName: string,
    workspaceId: string
  ) {
    return this.rabbitmqClient.getQueueConsumers(
      serverId,
      queueName,
      workspaceId
    );
  }

  async getQueueBindings(
    serverId: string,
    queueName: string,
    workspaceId: string
  ) {
    return this.rabbitmqClient.getQueueBindings(
      serverId,
      queueName,
      workspaceId
    );
  }

  async getLiveRatesMetrics(
    serverId: string,
    workspaceId: string,
    timeRange: "1m" | "10m" | "1h" | "8h" | "1d" = "1m"
  ) {
    return this.rabbitmqClient.getLiveRatesMetrics(
      serverId,
      workspaceId,
      timeRange
    );
  }

  async getQueueLiveRates(
    serverId: string,
    queueName: string,
    workspaceId: string,
    timeRange: "1m" | "10m" | "1h" | "8h" | "1d" = "1m"
  ) {
    return this.rabbitmqClient.getQueueLiveRates(
      serverId,
      queueName,
      workspaceId,
      timeRange
    );
  }

  // VHost Management (Admin Only)
  async getVHosts(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getVHosts(serverId, workspaceId);
  }

  async getVHost(serverId: string, vhostName: string, workspaceId: string) {
    return this.rabbitmqClient.getVHost(serverId, vhostName, workspaceId);
  }

  async createVHost(
    serverId: string,
    data: Parameters<RabbitMQApiClient["createVHost"]>[1],
    workspaceId: string
  ) {
    return this.rabbitmqClient.createVHost(serverId, data, workspaceId);
  }

  async updateVHost(
    serverId: string,
    vhostName: string,
    data: Parameters<RabbitMQApiClient["updateVHost"]>[2],
    workspaceId: string
  ) {
    return this.rabbitmqClient.updateVHost(
      serverId,
      vhostName,
      data,
      workspaceId
    );
  }

  async deleteVHost(serverId: string, vhostName: string, workspaceId: string) {
    return this.rabbitmqClient.deleteVHost(serverId, vhostName, workspaceId);
  }

  async setVHostPermissions(
    serverId: string,
    vhostName: string,
    username: string,
    permissions: Parameters<RabbitMQApiClient["setVHostPermissions"]>[3],
    workspaceId: string
  ) {
    return this.rabbitmqClient.setVHostPermissions(
      serverId,
      vhostName,
      username,
      permissions,
      workspaceId
    );
  }

  async deleteVHostPermissions(
    serverId: string,
    vhostName: string,
    username: string,
    workspaceId: string
  ) {
    return this.rabbitmqClient.deleteVHostPermissions(
      serverId,
      vhostName,
      username,
      workspaceId
    );
  }

  async setVHostLimit(
    serverId: string,
    vhostName: string,
    limitType: string,
    data: Parameters<RabbitMQApiClient["setVHostLimit"]>[3],
    workspaceId: string
  ) {
    return this.rabbitmqClient.setVHostLimit(
      serverId,
      vhostName,
      limitType,
      data,
      workspaceId
    );
  }

  async deleteVHostLimit(
    serverId: string,
    vhostName: string,
    limitType: string,
    workspaceId: string
  ) {
    return this.rabbitmqClient.deleteVHostLimit(
      serverId,
      vhostName,
      limitType,
      workspaceId
    );
  }

  // User Management (Admin Only)
  async getUsers(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getUsers(serverId, workspaceId);
  }

  async getUser(serverId: string, username: string, workspaceId: string) {
    return this.rabbitmqClient.getUser(serverId, username, workspaceId);
  }

  async getUserPermissions(
    serverId: string,
    username: string,
    workspaceId: string
  ) {
    return this.rabbitmqClient.getUserPermissions(
      serverId,
      username,
      workspaceId
    );
  }

  async createUser(
    serverId: string,
    data: Parameters<RabbitMQApiClient["createUser"]>[1],
    workspaceId: string
  ) {
    return this.rabbitmqClient.createUser(serverId, data, workspaceId);
  }

  async updateUser(
    serverId: string,
    username: string,
    data: Parameters<RabbitMQApiClient["updateUser"]>[2],
    workspaceId: string
  ) {
    return this.rabbitmqClient.updateUser(
      serverId,
      username,
      data,
      workspaceId
    );
  }

  async deleteUser(serverId: string, username: string, workspaceId: string) {
    return this.rabbitmqClient.deleteUser(serverId, username, workspaceId);
  }

  async setUserPermissions(
    serverId: string,
    username: string,
    data: Parameters<RabbitMQApiClient["setUserPermissions"]>[2],
    workspaceId: string
  ) {
    return this.rabbitmqClient.setUserPermissions(
      serverId,
      username,
      data,
      workspaceId
    );
  }

  async deleteUserPermissions(
    serverId: string,
    username: string,
    vhost: string,
    workspaceId: string
  ) {
    return this.rabbitmqClient.deleteUserPermissions(
      serverId,
      username,
      vhost,
      workspaceId
    );
  }

  // Authentication methods
  async login(credentials: Parameters<AuthApiClient["login"]>[0]) {
    return this.authClient.login(credentials);
  }

  async googleLogin(credential: Parameters<AuthApiClient["googleLogin"]>[0]) {
    return this.authClient.googleLogin(credential);
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

  async removeUserFromWorkspace(userId: string) {
    return this.workspaceClient.removeUserFromWorkspace(userId);
  }

  async logout() {
    // return this.authClient.logout();
  }

  // Email verification methods
  async verifyEmail(token: string) {
    return this.authClient.verifyEmail(token);
  }

  async resendVerificationEmail(type?: "SIGNUP" | "EMAIL_CHANGE") {
    return this.authClient.resendVerificationEmail(type);
  }

  async getVerificationStatus() {
    return this.authClient.getVerificationStatus();
  }

  // Password methods
  async changePassword(
    data: Parameters<PasswordApiClient["changePassword"]>[0]
  ) {
    return this.passwordClient.changePassword(data);
  }

  async requestPasswordReset(
    data: Parameters<PasswordApiClient["requestPasswordReset"]>[0]
  ) {
    return this.passwordClient.requestPasswordReset(data);
  }

  async resetPassword(data: Parameters<PasswordApiClient["resetPassword"]>[0]) {
    return this.passwordClient.resetPassword(data);
  }

  // Email verification and change methods
  async requestEmailChange(
    data: Parameters<AuthApiClient["requestEmailChange"]>[0]
  ) {
    return this.authClient.requestEmailChange(data);
  }

  async cancelEmailChange() {
    return this.authClient.cancelEmailChange();
  }

  // Invitation methods
  async getInvitations() {
    return this.authClient.getInvitations();
  }

  async sendInvitation(
    invitationData: Parameters<AuthApiClient["sendInvitation"]>[0]
  ) {
    return this.authClient.sendInvitation(invitationData);
  }

  async revokeInvitation(invitationId: string) {
    return this.authClient.revokeInvitation(invitationId);
  }

  async getInvitationDetails(token: string) {
    return this.authClient.getInvitationDetails(token);
  }

  async acceptInvitation(token: string) {
    return this.authClient.acceptInvitation(token);
  }

  async acceptInvitationWithRegistration(
    token: string,
    registrationData: {
      password: string;
      firstName: string;
      lastName: string;
    }
  ) {
    return this.authClient.acceptInvitationWithRegistration(
      token,
      registrationData
    );
  }

  async acceptInvitationWithGoogle(token: string, credential: string) {
    return this.authClient.acceptInvitationWithGoogle(token, credential);
  }

  // Alert methods
  async getAlerts(query?: Parameters<AlertApiClient["getAlerts"]>[0]) {
    return this.alertClient.getAlerts(query);
  }

  // Alert Rules methods
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

  // Workspace methods
  async getCurrentWorkspace() {
    return this.workspaceClient.getCurrentWorkspace();
  }

  // Workspace management methods
  async getUserWorkspaces() {
    return this.workspaceClient.getUserWorkspaces();
  }

  async getWorkspaceCreationInfo() {
    return this.workspaceClient.getWorkspaceCreationInfo();
  }

  async createWorkspace(data: { name: string; contactEmail?: string }) {
    return this.workspaceClient.createWorkspace(data);
  }

  async updateWorkspaceById(
    id: string,
    data: { name: string; contactEmail?: string }
  ) {
    return this.workspaceClient.updateWorkspace(id, data);
  }

  async deleteWorkspace(id: string) {
    return this.workspaceClient.deleteWorkspace(id);
  }

  async switchWorkspace(id: string) {
    return this.workspaceClient.switchWorkspace(id);
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
    return this.feedbackClient.submitFeedback(feedbackData);
  }

  async getFeedback(filters?: FeedbackFilters) {
    return this.feedbackClient.getFeedback(filters);
  }

  async getFeedbackById(id: string) {
    return this.feedbackClient.getFeedbackById(id);
  }

  async updateFeedback(id: string, data: UpdateFeedbackRequest) {
    return this.feedbackClient.updateFeedback(id, data);
  }

  async deleteFeedback(id: string) {
    return this.feedbackClient.deleteFeedback(id);
  }

  async getFeedbackStats(workspaceId?: string) {
    return this.feedbackClient.getFeedbackStats(workspaceId);
  }

  // Plan methods
  async getAllPlans() {
    return this.planClient.getAllPlans();
  }

  async getCurrentPlan() {
    return this.planClient.getCurrentPlan();
  }

  // Payment methods
  async createCheckoutSession(
    data: Parameters<PaymentApiClient["createCheckoutSession"]>[0]
  ) {
    return this.paymentClient.createCheckoutSession(data);
  }

  async createPortalSession() {
    return this.paymentClient.createPortalSession();
  }

  async getSubscription() {
    return this.paymentClient.getSubscription();
  }

  async getPaymentHistory(limit?: number, offset?: number) {
    return this.paymentClient.getPaymentHistory(limit, offset);
  }

  async getBillingOverview() {
    return this.paymentClient.getBillingOverview();
  }

  async createBillingPortalSession() {
    return this.paymentClient.createBillingPortalSession();
  }

  async cancelSubscription(
    data: Parameters<PaymentApiClient["cancelSubscription"]>[0]
  ) {
    return this.paymentClient.cancelSubscription(data);
  }

  async renewSubscription(
    plan: Parameters<PaymentApiClient["renewSubscription"]>[0],
    billingInterval?: Parameters<PaymentApiClient["renewSubscription"]>[1]
  ) {
    return this.paymentClient.renewSubscription(plan, billingInterval);
  }

  // RabbitMQ Alert methods
  async getRabbitMQAlerts(
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
  ) {
    return this.alertClient.getServerAlerts(
      serverId,
      workspaceId,
      thresholds,
      options
    );
  }

  async getRabbitMQAlertsSummary(serverId: string, workspaceId: string) {
    return this.alertClient.getServerAlertsSummary(serverId, workspaceId);
  }

  async getResolvedAlerts(
    serverId: string,
    workspaceId: string,
    options?: {
      limit?: number;
      offset?: number;
      severity?: string;
      category?: string;
    }
  ) {
    return this.alertClient.getResolvedAlerts(serverId, workspaceId, options);
  }

  async getRabbitMQHealth(serverId: string, workspaceId: string) {
    return this.rabbitmqClient.getServerHealth(serverId, workspaceId);
  }

  // Alert Threshold methods
  async getWorkspaceThresholds(workspaceId: string) {
    return this.alertClient.getWorkspaceThresholds(workspaceId);
  }

  async updateWorkspaceThresholds(
    thresholds: AlertThresholds,
    workspaceId: string
  ) {
    return this.alertClient.updateWorkspaceThresholds(thresholds, workspaceId);
  }

  // Alert Notification Settings methods
  async getAlertNotificationSettings(workspaceId: string) {
    return this.alertClient.getAlertNotificationSettings(workspaceId);
  }

  async updateAlertNotificationSettings(
    workspaceId: string,
    settings: {
      emailNotificationsEnabled?: boolean;
      contactEmail?: string | null;
      notificationSeverities?: string[];
      browserNotificationsEnabled?: boolean;
      browserNotificationSeverities?: string[];
    }
  ) {
    return this.alertClient.updateAlertNotificationSettings(
      workspaceId,
      settings
    );
  }

  // Webhook methods
  async getWebhooks(workspaceId: string) {
    return this.webhookClient.getWebhooks(workspaceId);
  }

  async getWebhook(workspaceId: string, webhookId: string) {
    return this.webhookClient.getWebhook(workspaceId, webhookId);
  }

  async createWebhook(workspaceId: string, data: CreateWebhookRequest) {
    return this.webhookClient.createWebhook(workspaceId, data);
  }

  async updateWebhook(
    workspaceId: string,
    webhookId: string,
    data: UpdateWebhookRequest
  ) {
    return this.webhookClient.updateWebhook(workspaceId, webhookId, data);
  }

  async deleteWebhook(workspaceId: string, webhookId: string) {
    return this.webhookClient.deleteWebhook(workspaceId, webhookId);
  }

  // Slack methods
  async getSlackConfigs(workspaceId: string) {
    return this.slackClient.getSlackConfigs(workspaceId);
  }

  async getSlackConfig(workspaceId: string, slackConfigId: string) {
    return this.slackClient.getSlackConfig(workspaceId, slackConfigId);
  }

  async createSlackConfig(workspaceId: string, data: CreateSlackConfigRequest) {
    return this.slackClient.createSlackConfig(workspaceId, data);
  }

  async updateSlackConfig(
    workspaceId: string,
    slackConfigId: string,
    data: UpdateSlackConfigRequest
  ) {
    return this.slackClient.updateSlackConfig(workspaceId, slackConfigId, data);
  }

  async deleteSlackConfig(workspaceId: string, slackConfigId: string) {
    return this.slackClient.deleteSlackConfig(workspaceId, slackConfigId);
  }

  // Discord methods
  async markDiscordJoined() {
    return this.discordClient.markJoined();
  }

  async getDiscordStatus() {
    return this.discordClient.getStatus();
  }
}

export const apiClient = new ApiClient();
