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
import { FeedbackApiClient } from "./feedbackClient";
import { PlanApiClient } from "./planClient";
import { PaymentApiClient } from "./paymentClient";
import { PasswordApiClient } from "./passwordClient";
import type { LogQuery, CreateLogRequest, LogExportRequest } from "./logTypes";
import type { FeedbackRequest } from "@/types/feedback";
import type { FeedbackFilters, UpdateFeedbackRequest } from "./feedbackClient";

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

  async deleteQueue(
    serverId: string,
    queueName: string,
    options: {
      if_unused?: boolean;
      if_empty?: boolean;
    } = {}
  ) {
    return this.rabbitmqClient.deleteQueue(serverId, queueName, options);
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

  async stopMessageStreaming(serverId: string, queueName: string) {
    return this.rabbitmqClient.stopMessageStreaming(serverId, queueName);
  }

  async publishMessage(
    params: Parameters<RabbitMQApiClient["publishMessage"]>[0]
  ) {
    return this.rabbitmqClient.publishMessage(params);
  }

  async getNodes(serverId: string) {
    return this.rabbitmqClient.getNodes(serverId);
  }

  async getNodeMemoryDetails(serverId: string, nodeName: string) {
    return this.rabbitmqClient.getNodeMemoryDetails(serverId, nodeName);
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

  async createExchange(
    serverId: string,
    exchangeData: Parameters<RabbitMQApiClient["createExchange"]>[1]
  ) {
    return this.rabbitmqClient.createExchange(serverId, exchangeData);
  }

  async deleteExchange(
    serverId: string,
    exchangeName: string,
    options: Parameters<RabbitMQApiClient["deleteExchange"]>[2] = {}
  ) {
    return this.rabbitmqClient.deleteExchange(serverId, exchangeName, options);
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
  async getVerificationStatus() {
    return this.authClient.getVerificationStatus();
  }

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
  async getCurrentWorkspace() {
    return this.workspaceClient.getCurrentWorkspace();
  }

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

  async getCurrentWorkspaceMonthlyMessageCount() {
    return this.workspaceClient.getCurrentWorkspaceMonthlyMessageCount();
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
}

export const apiClient = new ApiClient();
