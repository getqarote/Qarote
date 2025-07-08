import type { RabbitMQCredentials, SSLConfig } from "@/interfaces/rabbitmq";
import { logger } from "../logger";
import { captureRabbitMQError } from "../sentry";

/**
 * Base RabbitMQ Client
 *
 * Provides foundational HTTP client functionality for RabbitMQ Management API.
 *
 * Features:
 * - HTTP/HTTPS connection management
 * - Authentication handling (Basic Auth)
 * - SSL/TLS configuration support
 * - Request/response processing
 *
 * Monitoring:
 * - Sentry error tracking for connection failures
 * - API response error tracking
 * - Network-level error detection
 * - SSL/TLS connection monitoring
 */
export class RabbitMQBaseClient {
  protected baseUrl: string;
  protected authHeader: string;
  protected vhost: string;
  protected sslConfig?: SSLConfig;

  constructor(credentials: RabbitMQCredentials) {
    // Use HTTPS if SSL is enabled, otherwise use HTTP
    const protocol = credentials.sslConfig?.enabled ? "https" : "http";
    this.baseUrl = `${protocol}://${credentials.host}:${credentials.port}/api`;
    this.authHeader = `Basic ${Buffer.from(
      `${credentials.username}:${credentials.password}`
    ).toString("base64")}`;
    this.vhost = encodeURIComponent(credentials.vhost);
    this.sslConfig = credentials.sslConfig;
  }

  protected async request(endpoint: string, options?: RequestInit) {
    try {
      // Configure SSL options if SSL is enabled
      const fetchOptions: RequestInit = {
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        ...options,
      };

      // For Node.js environments, we might need to configure SSL options
      // This is a simplified implementation - in production, you'd want more sophisticated SSL handling
      if (this.sslConfig?.enabled && !this.sslConfig.verifyPeer) {
        // Note: This is for development only. In production, proper certificate validation should be used.
        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
      }

      logger.debug(
        `Fetching RabbitMQ API endpoint: ${this.baseUrl}${endpoint}`
      );

      const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);

      if (!response.ok) {
        const error = new Error(
          `RabbitMQ API error: ${response.status} ${response.statusText}`
        );

        // Capture API error in Sentry
        captureRabbitMQError(error, {
          operation: "api_request",
          serverId: this.baseUrl,
        });

        throw error;
      }

      logger.info(
        `Fetched ${endpoint} successfully: ${response.status} ${response.statusText}`
      );

      // Check if response has content
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        return response.json();
      } else {
        // Some endpoints return text or empty responses
        const text = await response.text();
        return text ? { message: text } : {};
      }
    } catch (error) {
      logger.error(`Error fetching from RabbitMQ API (${endpoint}):`, error);

      // Capture network/connection error in Sentry if not already captured
      if (
        error instanceof Error &&
        !error.message.includes("RabbitMQ API error:")
      ) {
        captureRabbitMQError(error, {
          operation: "api_connection",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }
}
