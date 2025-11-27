/**
 * Tunnel Detection Utility
 *
 * Detects and normalizes tunnel URLs (ngrok, localtunnel, etc.)
 * to automatically configure RabbitMQ connections for localhost servers.
 */

import type { TunnelConfig } from "@/types/rabbitmq";

// Re-export type for convenience
export type { TunnelConfig } from "@/types/rabbitmq";

/**
 * Detects if a host URL is a tunnel service
 */
export function detectTunnel(host: string, port?: number): TunnelConfig {
  const lowerHost = host.toLowerCase().trim();

  // Remove protocol if present
  const cleanHost = lowerHost.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // ngrok detection (e.g., abc123.ngrok-free.app, abc123.ngrok.io)
  if (
    cleanHost.includes("ngrok") ||
    cleanHost.includes(".ngrok-free.app") ||
    cleanHost.includes(".ngrok.io") ||
    cleanHost.includes(".ngrok.app")
  ) {
    return {
      isTunnel: true,
      tunnelType: "ngrok",
      originalHost: host,
      normalizedHost: cleanHost,
      shouldUseHttps: true,
      recommendedPort: port || 443, // ngrok always uses HTTPS
    };
  }

  // localtunnel detection (e.g., abc123.loca.lt, abc123.localtunnel.me)
  if (
    cleanHost.includes("loca.lt") ||
    cleanHost.includes("localtunnel.me") ||
    cleanHost.includes("localtunnel")
  ) {
    return {
      isTunnel: true,
      tunnelType: "localtunnel",
      originalHost: host,
      normalizedHost: cleanHost,
      shouldUseHttps: true,
      recommendedPort: port || 443,
    };
  }

  // Generic localhost detection
  if (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost.startsWith("127.0.0.1:") ||
    cleanHost.startsWith("localhost:")
  ) {
    // Not a tunnel, but localhost - user might need tunnel instructions
    return {
      isTunnel: false,
      originalHost: host,
      normalizedHost: cleanHost,
      shouldUseHttps: false,
      recommendedPort: port || 15672,
    };
  }

  // Not a tunnel
  return {
    isTunnel: false,
    originalHost: host,
    normalizedHost: cleanHost,
    shouldUseHttps: port === 443 || port === 15671 || port === 8443,
    recommendedPort: port || 15672,
  };
}

/**
 * Normalizes credentials for tunnel connections
 */
export function normalizeTunnelCredentials(
  host: string,
  port?: number,
  useHttps?: boolean
): { host: string; port: number; useHttps: boolean } {
  const tunnelConfig = detectTunnel(host, port);

  if (tunnelConfig.isTunnel) {
    return {
      host: tunnelConfig.normalizedHost,
      port: tunnelConfig.recommendedPort,
      useHttps: true, // Tunnels always use HTTPS
    };
  }

  return {
    host: tunnelConfig.normalizedHost,
    port: port || tunnelConfig.recommendedPort,
    useHttps: useHttps ?? tunnelConfig.shouldUseHttps,
  };
}
