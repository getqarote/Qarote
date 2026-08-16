import { captureRabbitMQError } from "../../services/sentry";
import { logger } from "../logger";
import type { RabbitMQCredentials } from "./rabbitmq.interfaces";
import { normalizeTunnelCredentials } from "./tunnel";

/**
 * Plain-language hints appended to the raw HTTP status for the common
 * Management-API failures, so "401 Unauthorized" reads as something the
 * operator can act on. The `RabbitMQ API error: <status>` prefix is kept
 * verbatim — `classifyBrokerError` parses the status out of it.
 */
const API_ERROR_HINTS: Record<number, string> = {
  401: "wrong username or password",
  403: "those credentials lack management/monitoring permission",
  404: "endpoint not found — check the management URL and path",
};

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

      logger.debug(
        `Fetching RabbitMQ API endpoint: ${this.baseUrl}${endpoint}`
      );
      const startedAt = process.hrtime.bigint();
      const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);
      const headersAt = process.hrtime.bigint();

      if (!response.ok) {
        const payload = (await response.json()) as { reason?: string };
        const hint = API_ERROR_HINTS[response.status];
        const error = new Error(
          `RabbitMQ API error: ${response.status} ${response.statusText}${
            hint ? ` — ${hint}` : ""
          }`,
          { cause: payload.reason }
        );

        // Capture API error in Sentry
        captureRabbitMQError(error, {
          operation: "api_request",
          serverId: this.baseUrl,
        });

        throw error;
      }

      // Check if response has content
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        // Read then parse, rather than `response.json()`, so transfer and parse
        // are TIMED SEPARATELY. This is the M4 measurement: at 100k brokers the
        // poll fan-out is the dominant cost, and JSON parsing runs on the SAME
        // single thread as everything else — so "how much of a poll is parsing?"
        // decides whether the fix is network-side or CPU-side. Behaviour is
        // unchanged: `response.json()` does exactly this internally.
        const body = await response.text();
        const bodyAt = process.hrtime.bigint();
        const parsed = JSON.parse(body) as T;
        const parsedAt = process.hrtime.bigint();

        const ms = (from: bigint, to: bigint) => Number(to - from) / 1e6;
        logger.debug(
          {
            endpoint,
            status: response.status,
            payloadBytes: Buffer.byteLength(body),
            waitMs: +ms(startedAt, headersAt).toFixed(2),
            transferMs: +ms(headersAt, bodyAt).toFixed(2),
            parseMs: +ms(bodyAt, parsedAt).toFixed(2),
            totalMs: +ms(startedAt, parsedAt).toFixed(2),
          },
          "rabbitmq api request"
        );

        return parsed;
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
