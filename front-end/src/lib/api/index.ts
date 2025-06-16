/**
 * API Barrel Export
 * Main entry point for all API functionality
 */

// Export the main client
export { apiClient } from "./client";

// Export all types for external use
export type * from "./types";
export type * from "./rabbitmq-types";
export type * from "./exchange-types";
export type * from "./message-types";
export type * from "./auth-types";
export type * from "./alert-types";
export type * from "./log-types";

// Export individual clients for advanced usage
export { ServerApiClient } from "./server-client";
export { RabbitMQApiClient } from "./rabbitmq-client";
export { AuthApiClient } from "./auth-client";
export { AlertApiClient } from "./alert-client";
export { CompanyApiClient } from "./company-client";
export { LogsApiClient } from "./logs-client";
export { BaseApiClient } from "./base-client";
