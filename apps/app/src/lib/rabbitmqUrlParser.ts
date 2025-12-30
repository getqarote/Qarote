import type { AddServerFormData } from "@/schemas";
import { urlValidationSchema } from "@/schemas";

interface ParsedRabbitMQUrl {
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
 * - https://rabbitmq.aws-qarote.com (Management API)
 * - http://localhost:15672 (Management API)
 * - https://user:pass@rabbitmq.example.com:443 (Management API)
 * - https://rabbitmq.example.com/path (Management API with vhost)
 * - amqps://user:pass@host:5671/vhost (AMQP connection string)
 * - amqp://user:pass@host:5672/vhost (AMQP connection string)
 */
export function parseRabbitMQUrl(url: string): ParsedRabbitMQUrl | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    // Validate URL using Zod
    const validationResult = urlValidationSchema.safeParse(url);
    if (!validationResult.success) {
      return null;
    }

    // Trim and prepare URL for parsing
    let urlToParse = url.trim();

    // Check if URL already has a protocol
    if (!urlToParse.match(/^(https?|amqps?):\/\//i)) {
      // No protocol separator - add protocol if it looks like a domain
      if (urlToParse.includes(".") && !urlToParse.includes("://")) {
        urlToParse = `https://${urlToParse}`;
      } else {
        urlToParse = `http://${urlToParse}`;
      }
    }

    const urlObj = new URL(urlToParse);

    // Extract protocol
    const protocol = urlObj.protocol.replace(":", "").toLowerCase();
    const isAmqp = protocol === "amqp" || protocol === "amqps";
    const isAmqps = protocol === "amqps";
    const useHttps = protocol === "https" || isAmqps;

    // Extract hostname
    const host = urlObj.hostname;

    // Extract port and determine management/AMQP ports based on protocol type
    let port: number; // Management API port
    let amqpPort: number; // AMQP protocol port

    if (isAmqp) {
      // This is an AMQP(S) connection string
      // The port in the URL is the AMQP port
      if (urlObj.port) {
        amqpPort = parseInt(urlObj.port, 10);
      } else {
        // Default AMQP ports based on protocol
        amqpPort = isAmqps ? 5671 : 5672;
      }

      // Infer management API port from AMQP protocol
      // AMQPS (5671) → Management HTTPS (443 for cloud)
      // AMQP (5672) → Management HTTP (15672)
      if (isAmqps) {
        port = 443; // HTTPS management port (cloud default)
      } else {
        port = 15672; // HTTP management port
      }
    } else {
      // This is an HTTP(S) management API URL
      // The port in the URL is the management port
      if (urlObj.port) {
        port = parseInt(urlObj.port, 10);
      } else {
        // Default management ports based on protocol
        port = useHttps ? 443 : 15672;
      }

      // Infer AMQP port from management protocol
      // HTTPS management (443) → AMQPS (5671)
      // HTTP management (15672) → AMQP (5672)
      if (useHttps) {
        amqpPort = 5671; // AMQPS
      } else {
        amqpPort = 5672; // AMQP
      }
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
    // Common pattern: username and vhost may be the same (e.g., CloudAMQP)
    let vhost: string | undefined;
    const pathname = urlObj.pathname;
    if (pathname && pathname !== "/" && pathname.length > 1) {
      // Ensure vhost starts with / and remove any trailing slashes or fragments
      let cleanPath = pathname;
      // Remove hash fragments (e.g., /vhost#/ -> /vhost)
      if (cleanPath.includes("#")) {
        cleanPath = cleanPath.split("#")[0];
      }
      // Remove trailing slashes
      cleanPath = cleanPath.replace(/\/+$/, "");
      vhost = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
    }

    // Generate suggested server name from hostname
    let suggestedName: string | undefined;
    if (host) {
      // Extract meaningful parts from hostname
      // e.g., "rabbitmq.aws-qarote.com" -> "AWS RabbitMQ"
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
