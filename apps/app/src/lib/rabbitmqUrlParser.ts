import type { AddServerFormData } from "@/schemas";
import { urlValidationSchema } from "@/schemas";

/**
 * Where a parsed field's value came from:
 *   - `detected`  → read verbatim from the URL the user pasted,
 *   - `inferred`  → derived from a *different* part of the URL (e.g. the
 *                   AMQP port computed from an HTTPS management URL),
 *   - `defaulted` → a fallback because the URL gave no signal.
 * Surfaced as chips so the user can tell a confident value from a guess.
 */
export type Provenance = "detected" | "inferred" | "defaulted";

export interface ParsedRabbitMQUrl {
  host: string;
  port: number;
  amqpPort: number;
  useHttps: boolean;
  username?: string;
  password?: string;
  vhost?: string;
  suggestedName?: string;
  /**
   * Per-field provenance for every field the parser shapes. `username` and
   * `vhost` are only present when the URL actually carried them — an absent
   * key means "the URL gave no signal", which the UI renders as no chip.
   */
  provenance: {
    host: Provenance;
    port: Provenance;
    amqpPort: Provenance;
    useHttps: Provenance;
    username?: Provenance;
    vhost?: Provenance;
  };
}

/**
 * Provider-aware display name from a hostname (e.g. `*.cloudamqp.com`
 * → "CloudAMQP"). Pure helper, exported for reuse/testing.
 */
export function suggestServerName(host: string): string | undefined {
  if (!host) return undefined;
  const parts = host.split(".");
  if (parts.length === 0) return undefined;
  const firstPart = parts[0];
  if (host.includes("aws") || host.includes("amazon")) return "AWS RabbitMQ";
  if (host.includes("gcp") || host.includes("google")) return "GCP RabbitMQ";
  if (host.includes("azure")) return "Azure RabbitMQ";
  if (host.includes("cloudamqp")) return "CloudAMQP";
  if (firstPart === "rabbitmq") {
    const domain = parts.slice(-2).join(".");
    if (domain.includes("aws")) return "AWS RabbitMQ";
    if (domain.includes("gcp")) return "GCP RabbitMQ";
    return "RabbitMQ Server";
  }
  return `${firstPart.charAt(0).toUpperCase()}${firstPart.slice(1)} RabbitMQ`;
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

    // Whether the user typed an explicit scheme. When they did, the
    // HTTPS/TLS choice was read verbatim from the URL ("detected"); when we
    // synthesise one below, the TLS flag is a fallback ("defaulted").
    const hasExplicitScheme = /^(https?|amqps?):\/\//i.test(urlToParse);

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

    let portProvenance: Provenance;
    let amqpPortProvenance: Provenance;

    if (isAmqp) {
      // AMQP(S) connection string — the URL's port IS the AMQP port; the
      // management port is inferred from the AMQP protocol.
      if (urlObj.port) {
        amqpPort = parseInt(urlObj.port, 10);
        amqpPortProvenance = "detected";
      } else {
        amqpPort = isAmqps ? 5671 : 5672;
        amqpPortProvenance = "defaulted";
      }
      // AMQPS (5671) → Management HTTPS (443); AMQP (5672) → HTTP (15672).
      port = isAmqps ? 443 : 15672;
      portProvenance = "inferred";
    } else {
      // HTTP(S) management URL — the URL's port IS the management port; the
      // AMQP port is inferred from the management protocol.
      if (urlObj.port) {
        port = parseInt(urlObj.port, 10);
        portProvenance = "detected";
      } else {
        port = useHttps ? 443 : 15672;
        portProvenance = "defaulted";
      }
      // HTTPS management → AMQPS (5671); HTTP management → AMQP (5672).
      amqpPort = useHttps ? 5671 : 5672;
      amqpPortProvenance = "inferred";
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

    const suggestedName = suggestServerName(host);

    return {
      host,
      port,
      amqpPort,
      useHttps,
      username,
      password,
      vhost,
      suggestedName,
      provenance: {
        host: "detected",
        port: portProvenance,
        amqpPort: amqpPortProvenance,
        // TLS choice is "detected" only when the user typed the scheme;
        // otherwise we guessed https-for-domains / http-for-the-rest.
        useHttps: hasExplicitScheme ? "detected" : "defaulted",
        // Credentials and vhost are only ever read straight from the URL,
        // so when present they are always "detected"; absent → key omitted.
        ...(username ? { username: "detected" as const } : {}),
        ...(vhost ? { vhost: "detected" as const } : {}),
      },
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
