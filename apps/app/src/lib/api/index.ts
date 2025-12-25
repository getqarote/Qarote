/**
 * API Barrel Export
 * Main entry point for all API functionality
 *
 * NOTE: The apiClient has been migrated to tRPC.
 * All API calls should now use tRPC hooks from apps/app/src/hooks/queries
 */

// DEPRECATED: apiClient has been migrated to tRPC
// Use tRPC hooks instead: apps/app/src/hooks/queries/*
// export { apiClient } from "./client";

// Export all types for external use (types are still needed)
export type * from "./authTypes";
export type * from "./exchangeTypes";
export type * from "./logTypes";
export type * from "./messageTypes";
export type * from "./paymentClient";
export type * from "./planClient";
export type * from "./rabbitmqTypes";
export type * from "./types";
export type * from "./vhostTypes";

// DEPRECATED: Individual client classes have been migrated to tRPC
// Use tRPC hooks instead: apps/app/src/hooks/queries/*
// export { AlertApiClient } from "./alertClient";
// export { AuthApiClient } from "./authClient";
// export { BaseApiClient } from "./baseClient";
// export { LogsApiClient } from "./logsClient";
// export { PaymentApiClient } from "./paymentClient";
// export { PlanApiClient } from "./planClient";
// export { RabbitMQApiClient } from "./rabbitmqClient";
// export { ServerApiClient } from "./serverClient";
// export { WorkspaceApiClient } from "./workspaceClient";

// Export workspace types (still needed)
export type { WorkspaceCreationInfo, WorkspaceInfo } from "./workspaceClient";
