/**
 * API Barrel Export
 * Main entry point for all API functionality
 */

// Export the main client
export { apiClient } from "./client";

// Export all types for external use
export type * from "./authTypes";
export type * from "./exchangeTypes";
export type * from "./logTypes";
export type * from "./messageTypes";
export type * from "./paymentClient";
export type * from "./planClient";
export type * from "./rabbitmqTypes";
export type * from "./types";
export type * from "./vhostTypes";

// Export individual clients for advanced usage
export { AlertApiClient } from "./alertClient";
export { AuthApiClient } from "./authClient";
export { BaseApiClient } from "./baseClient";
export { LogsApiClient } from "./logsClient";
export { PaymentApiClient } from "./paymentClient";
export { PlanApiClient } from "./planClient";
export { RabbitMQApiClient } from "./rabbitmqClient";
export { ServerApiClient } from "./serverClient";
export type { WorkspaceCreationInfo, WorkspaceInfo } from "./workspaceClient";
export { WorkspaceApiClient } from "./workspaceClient";
