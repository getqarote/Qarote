import { captureRabbitMQError } from "../../services/sentry";
import { logger } from "../logger";
import type { RabbitMQCredentials } from "./rabbitmq.interfaces";
import { normalizeTunnelCredentials } from "./tunnel";

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
  protected version?: string; // Full RabbitMQ version (e.g., "3.12.10", "4.0.1")
  protected versionMajorMinor?: string; // Major.Minor version (e.g., "3.12", "4.0")

  constructor(credentials: RabbitMQCredentials) {
    // Normalize tunnel URLs automatically
    const normalized = normalizeTunnelCredentials(
      credentials.host,
      credentials.port,
      credentials.useHttps
    );

    logger.debug(
      {
        host: credentials.host,
        normalizedHost: normalized.host,
        port: credentials.port,
        normalizedPort: normalized.port,
        username: credentials.username,
        vhost: credentials.vhost,
        useHttps: credentials.useHttps,
        normalizedUseHttps: normalized.useHttps,
      },
      "Initializing RabbitMQBaseClient with credentials"
    );

    const protocol = normalized.useHttps ? "https" : "http";
    // For tunnels, port 443 is implicit in HTTPS URLs
    const port =
      normalized.useHttps && normalized.port === 443
        ? ""
        : `:${normalized.port}`;

    this.baseUrl = `${protocol}://${normalized.host}${port}/api`;

    this.authHeader = `Basic ${Buffer.from(
      `${credentials.username}:${credentials.password}`
    ).toString("base64")}`;

    // Note: this.vhost is only used for server connection/authentication when adding a RabbitMQ server.
    // It should NOT be used for filtering API calls - use dynamic vhost parameter from frontend instead.
    this.vhost = encodeURIComponent(credentials.vhost);
    this.version = credentials.version;
    this.versionMajorMinor = credentials.versionMajorMinor;
  }

  protected async request<T = unknown>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      // Configure base fetch options
      const fetchOptions: RequestInit = {
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        ...options,
      };

      logger.info(`Fetching RabbitMQ API endpoint: ${this.baseUrl}${endpoint}`);
      const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);

      if (!response.ok) {
        const payload = (await response.json()) as { reason?: string };
        const error = new Error(
          `RabbitMQ API error: ${response.status} ${response.statusText}`,
          { cause: payload.reason }
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
        return response.json() as Promise<T>;
      } else {
        // Some endpoints return text or empty responses
        const text = await response.text();
        return (text ? { message: text } : {}) as T;
      }
    } catch (error) {
      logger.error({ error }, `Error fetching from RabbitMQ API (${endpoint})`);

      // Capture network/connection error in Sentry if not already captured
      if (
        Error.isError(error) &&
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
