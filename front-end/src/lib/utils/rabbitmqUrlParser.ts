import type { AddServerFormData } from "@/schemas/forms";

export interface ParsedRabbitMQUrl {
  host: string;
  port: number;
  amqpPort: number;
  useHttps: boolean;
  username?: string;
  password?: string;
  vhost?: string;
  suggestedName?: string;
}

/**
 * Parses a RabbitMQ URL and extracts connection details
 * Supports formats like:
 * - https://rabbitmq.aws-rabbithq.com
 * - http://localhost:15672
 * - https://user:pass@rabbitmq.example.com:443
 * - https://rabbitmq.example.com/path
 */
export function parseRabbitMQUrl(url: string): ParsedRabbitMQUrl | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    // Add protocol if missing (default to https for modern setups)
    let urlToParse = url.trim();
    if (!urlToParse.match(/^https?:\/\//i)) {
      // Try to detect if it looks like a domain
      if (urlToParse.includes(".") && !urlToParse.includes("://")) {
        urlToParse = `https://${urlToParse}`;
      } else {
        urlToParse = `http://${urlToParse}`;
      }
    }

    const urlObj = new URL(urlToParse);

    // Extract protocol
    const protocol = urlObj.protocol.replace(":", "").toLowerCase();
    const useHttps = protocol === "https";

    // Extract hostname
    const host = urlObj.hostname;

    // Extract port (if specified, otherwise use defaults)
    let port: number;
    if (urlObj.port) {
      port = parseInt(urlObj.port, 10);
    } else {
      // Default ports based on protocol
      port = useHttps ? 443 : 15672;
    }

    // Determine AMQP port based on protocol and management port
    // If HTTPS is used, AMQP typically uses 5671 (AMQPS)
    // If HTTP is used, AMQP typically uses 5672
    let amqpPort: number;
    if (useHttps) {
      // For HTTPS, check if management port is 443 (cloud) or 15671 (self-hosted)
      if (port === 443) {
        amqpPort = 5671; // AMQPS for cloud
      } else if (port === 15671) {
        amqpPort = 5671; // AMQPS for self-hosted HTTPS
      } else {
        amqpPort = 5671; // Default to AMQPS for HTTPS
      }
    } else {
      amqpPort = 5672; // Default AMQP port for HTTP
    }

    // Extract username and password from URL if present
    let username: string | undefined;
    let password: string | undefined;
    if (urlObj.username) {
      username = decodeURIComponent(urlObj.username);
    }
    if (urlObj.password) {
      password = decodeURIComponent(urlObj.password);
    }

    // Extract vhost from path if present
    // RabbitMQ vhosts are typically like /vhostname
    let vhost: string | undefined;
    const pathname = urlObj.pathname;
    if (pathname && pathname !== "/" && pathname.length > 1) {
      // Remove leading slash
      vhost = pathname.startsWith("/") ? pathname : `/${pathname}`;
    }

    // Generate suggested server name from hostname
    let suggestedName: string | undefined;
    if (host) {
      // Extract meaningful parts from hostname
      // e.g., "rabbitmq.aws-rabbithq.com" -> "AWS RabbitMQ"
      const parts = host.split(".");
      if (parts.length > 0) {
        const firstPart = parts[0];
        // Check if hostname contains provider hints
        if (host.includes("aws") || host.includes("amazon")) {
          suggestedName = "AWS RabbitMQ";
        } else if (host.includes("gcp") || host.includes("google")) {
          suggestedName = "GCP RabbitMQ";
        } else if (host.includes("azure")) {
          suggestedName = "Azure RabbitMQ";
        } else if (host.includes("cloudamqp")) {
          suggestedName = "CloudAMQP";
        } else if (firstPart === "rabbitmq") {
          // Try to extract provider from domain
          const domain = parts.slice(-2).join(".");
          if (domain.includes("aws")) {
            suggestedName = "AWS RabbitMQ";
          } else if (domain.includes("gcp")) {
            suggestedName = "GCP RabbitMQ";
          } else {
            suggestedName = "RabbitMQ Server";
          }
        } else {
          // Capitalize first part
          suggestedName =
            firstPart.charAt(0).toUpperCase() +
            firstPart.slice(1) +
            " RabbitMQ";
        }
      }
    }

    return {
      host,
      port,
      amqpPort,
      useHttps,
      username,
      password,
      vhost,
      suggestedName,
    };
  } catch (error) {
    // Invalid URL
    return null;
  }
}

/**
 * Applies parsed URL data to form fields
 */
export function applyParsedUrlToForm(
  parsed: ParsedRabbitMQUrl,
  form: {
    setValue: (
      name: keyof AddServerFormData,
      value: string | number | boolean
    ) => void;
  }
): void {
  form.setValue("host", parsed.host);
  form.setValue("port", parsed.port);
  form.setValue("amqpPort", parsed.amqpPort);
  form.setValue("useHttps", parsed.useHttps);

  if (parsed.username) {
    form.setValue("username", parsed.username);
  }

  if (parsed.password) {
    form.setValue("password", parsed.password);
  }

  if (parsed.vhost) {
    form.setValue("vhost", parsed.vhost);
  }

  if (parsed.suggestedName) {
    form.setValue("name", parsed.suggestedName);
  }
}
