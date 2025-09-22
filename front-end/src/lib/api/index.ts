/**
 * API Barrel Export
 * Main entry point for all API functionality
 */

// Export the main client
export { apiClient } from "./client";

// Export all types for external use
export type * from "./types";
export type * from "./rabbitmqTypes";
export type * from "./exchangeTypes";
export type * from "./messageTypes";
export type * from "./authTypes";
export type * from "./logTypes";
export type * from "./vhostTypes";
export type * from "./planClient";
export type * from "./paymentClient";

// Export individual clients for advanced usage
export { ServerApiClient } from "./serverClient";
export { RabbitMQApiClient } from "./rabbitmqClient";
export { AuthApiClient } from "./authClient";
export { AlertApiClient } from "./alertClient";
export { WorkspaceApiClient } from "./workspaceClient";
export type { WorkspaceInfo, WorkspaceCreationInfo } from "./workspaceClient";
export { LogsApiClient } from "./logsClient";
export { BaseApiClient } from "./baseClient";
export { PlanApiClient } from "./planClient";
export { PaymentApiClient } from "./paymentClient";
