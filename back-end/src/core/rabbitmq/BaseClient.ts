import { Agent } from "undici";
import type { RabbitMQCredentials, SSLConfig } from "@/types/rabbitmq";
import { logger } from "../logger";
import { captureRabbitMQError } from "../sentry";

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
  protected sslConfig?: SSLConfig;

  constructor(credentials: RabbitMQCredentials) {
    logger.debug(
      {
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        vhost: credentials.vhost,
        useHttps: credentials.useHttps,
        sslConfig: credentials.sslConfig,
      },
      "Initializing RabbitMQBaseClient with credentials"
    );
    const protocol = credentials.useHttps ? "https" : "http";
    this.baseUrl = `${protocol}://${credentials.host}:${credentials.port}/api`;

    this.authHeader = `Basic ${Buffer.from(
      `${credentials.username}:${credentials.password}`
    ).toString("base64")}`;

    this.vhost = encodeURIComponent(credentials.vhost); // not used
    this.sslConfig = credentials.sslConfig;
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

      // Configure SSL options if HTTPS is enabled and we have SSL config
      if (this.sslConfig && this.baseUrl.startsWith("https")) {
        const agent = new Agent({
          connect: {
            // Client certificate (PEM format)
            cert: this.sslConfig.clientCertContent,
            // Client private key (PEM format)
            key: this.sslConfig.clientKeyContent,
            // Certificate Authority (PEM format)
            ca: this.sslConfig.caCertContent,
            // Optional: reject unauthorized certificates (default: true)
            rejectUnauthorized: this.sslConfig.verifyPeer,
          },
        });

        fetchOptions.dispatcher = agent;

        logger.debug(
          `SSL enabled for HTTPS connection. verifyPeer: ${this.sslConfig.verifyPeer}, ` +
            `CA cert: ${this.sslConfig.caCertContent ? "provided" : "not provided"}, ` +
            `Client cert: ${this.sslConfig.clientCertContent ? "provided" : "not provided"}`
        );
      }

      logger.info(`Fetching RabbitMQ API endpoint: ${this.baseUrl}${endpoint}`);
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
