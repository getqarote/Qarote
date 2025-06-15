import type { RabbitMQCredentials, SSLConfig } from "../../types/rabbitmq";

/**
 * Base RabbitMQ client with connection management and request handling
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

      const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);

      if (!response.ok) {
        throw new Error(
          `RabbitMQ API error: ${response.status} ${response.statusText}`
        );
      }

      console.log(
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
      console.error(`Error fetching from RabbitMQ API (${endpoint}):`, error);
      throw error;
    }
  }
}
