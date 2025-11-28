import { Agent } from "undici";

import type { RabbitMQCredentials } from "@/types/rabbitmq";

import { captureRabbitMQError } from "../../services/sentry";
import { logger } from "../logger";
import { normalizeTunnelCredentials } from "./tunnel";

// Define extended RequestInit type to include dispatcher
// Alternative: Extend the RequestInit interface (cleaner TypeScript approach)
interface UndiciRequestInit extends RequestInit {
  dispatcher?: Agent;
}

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

    this.vhost = encodeURIComponent(credentials.vhost); // not used
  }

  protected async request(endpoint: string, options?: RequestInit) {
    try {
      // Configure base fetch options
      const fetchOptions: UndiciRequestInit = {
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        ...options,
      };

      logger.info(`Fetching RabbitMQ API endpoint: ${this.baseUrl}${endpoint}`);
      const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);

      if (!response.ok) {
        const payload = await response.json();
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
        return response.json();
      } else {
        // Some endpoints return text or empty responses
        const text = await response.text();
        return text ? { message: text } : {};
      }
    } catch (error) {
      logger.error({ error }, `Error fetching from RabbitMQ API (${endpoint})`);

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
