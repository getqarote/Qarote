#!/usr/bin/env tsx

/**
 * RabbitMQ Field Discovery Script
 *
 * This script fetches all RabbitMQ Management API endpoints and compares
 * the response structures against our TypeScript type definitions.
 *
 * Usage:
 *   tsx scripts/rabbitmq/discover-rabbitmq-fields.ts <host> <port> <username> <password> <vhost> [useHttps]
 *
 * Example:
 *   tsx scripts/rabbitmq/discover-rabbitmq-fields.ts localhost 15672 guest guest / false
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { RabbitMQClient } from "../../src/core/rabbitmq/RabbitClient";
import { ResponseValidator } from "../../src/core/rabbitmq/ResponseValidator";
import type { RabbitMQCredentials } from "../../src/core/rabbitmq/rabbitmq.interfaces";

interface DiscoveryReport {
  server: {
    host: string;
    port: number;
    vhost: string;
    version?: string;
    versionMajorMinor?: string;
  };
  timestamp: string;
  endpoints: Array<{
    endpoint: string;
    method: string;
    status: "success" | "error";
    error?: string;
    detection?: {
      unexpectedFields: string[];
      missingFields: string[];
    };
  }>;
  summary: {
    totalEndpoints: number;
    successfulEndpoints: number;
    failedEndpoints: number;
    totalUnexpectedFields: number;
    totalMissingFields: number;
    uniqueUnexpectedFields: Set<string>;
    uniqueMissingFields: Set<string>;
  };
}

/**
 * Get all endpoints to test
 */
function getEndpointsToTest(
  vhost: string
): Array<{ endpoint: string; method: string }> {
  const encodedVhost = encodeURIComponent(vhost);
  return [
    { endpoint: "/overview", method: "GET" },
    { endpoint: "/nodes", method: "GET" },
    { endpoint: "/connections", method: "GET" },
    { endpoint: "/channels", method: "GET" },
    { endpoint: `/exchanges/${encodedVhost}`, method: "GET" },
    { endpoint: `/queues/${encodedVhost}`, method: "GET" },
    { endpoint: `/bindings/${encodedVhost}`, method: "GET" },
    { endpoint: "/consumers", method: "GET" },
    { endpoint: "/vhosts", method: "GET" },
    { endpoint: `/vhosts/${encodedVhost}`, method: "GET" },
    { endpoint: "/users", method: "GET" },
  ];
}

/**
 * Discover fields for a specific endpoint
 */
async function discoverEndpoint(
  client: RabbitMQClient,
  endpoint: string,
  method: string,
  version?: string
): Promise<{
  status: "success" | "error";
  error?: string;
  detection?: {
    unexpectedFields: string[];
    missingFields: string[];
  };
}> {
  try {
    let response: unknown;

    // Handle different endpoints
    if (endpoint === "/overview") {
      response = await client.getOverview();
      const detection = ResponseValidator.validateOverview(response, version);
      return {
        status: "success",
        detection: {
          unexpectedFields: detection.unexpectedFields,
          missingFields: detection.missingFields,
        },
      };
    } else if (endpoint === "/nodes") {
      const nodes = await client.getNodes();
      if (nodes.length > 0) {
        const detection = ResponseValidator.validateNode(nodes[0], version);
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else if (
      endpoint.startsWith("/queues/") &&
      !endpoint.endsWith("/bindings")
    ) {
      const queues = await client.getQueues();
      if (queues.length > 0) {
        const detection = ResponseValidator.validateQueue(queues[0], version);
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else if (endpoint === "/connections") {
      const connections = await client.getConnections();
      if (connections.length > 0) {
        const detection = ResponseValidator.validateConnection(
          connections[0],
          version
        );
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else if (endpoint === "/channels") {
      const channels = await client.getChannels();
      if (channels.length > 0) {
        const detection = ResponseValidator.validateChannel(
          channels[0],
          version
        );
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else if (endpoint.startsWith("/exchanges/")) {
      const exchanges = await client.getExchanges();
      if (exchanges.length > 0) {
        const detection = ResponseValidator.validateExchange(
          exchanges[0],
          version
        );
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else if (endpoint.startsWith("/bindings/")) {
      const bindings = await client.getBindings();
      if (bindings.length > 0) {
        const detection = ResponseValidator.validateBinding(
          bindings[0],
          version
        );
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else if (endpoint === "/consumers") {
      const consumers = await client.getConsumers();
      if (consumers.length > 0) {
        const detection = ResponseValidator.validateConsumer(
          consumers[0],
          version
        );
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else if (endpoint === "/vhosts") {
      const vhosts = await client.getVHosts();
      if (vhosts.length > 0) {
        const detection = ResponseValidator.validateVHost(vhosts[0], version);
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else if (
      endpoint.startsWith("/vhosts/") &&
      !endpoint.endsWith("/permissions")
    ) {
      const vhostName = decodeURIComponent(endpoint.split("/").pop() || "");
      const vhost = await client.getVHost(vhostName);
      const detection = ResponseValidator.validateVHost(vhost, version);
      return {
        status: "success",
        detection: {
          unexpectedFields: detection.unexpectedFields,
          missingFields: detection.missingFields,
        },
      };
    } else if (endpoint === "/users") {
      const users = await client.getUsers();
      if (users.length > 0) {
        const detection = ResponseValidator.validateUser(users[0], version);
        return {
          status: "success",
          detection: {
            unexpectedFields: detection.unexpectedFields,
            missingFields: detection.missingFields,
          },
        };
      }
      return { status: "success" };
    } else {
      return {
        status: "error",
        error: "Unknown endpoint",
      };
    }
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main discovery function
 */
async function discoverFields(
  credentials: RabbitMQCredentials
): Promise<DiscoveryReport> {
  console.log("🔍 Starting RabbitMQ field discovery...");
  console.log(`   Host: ${credentials.host}:${credentials.port}`);
  console.log(`   VHost: ${credentials.vhost}`);

  const client = new RabbitMQClient(credentials);

  // Get version from overview
  let version: string | undefined;
  let versionMajorMinor: string | undefined;
  try {
    const overview = await client.getOverview();
    version = overview.rabbitmq_version;
    console.log(`   Version: ${version}`);

    if (!version) {
      throw new Error("Version not found in overview");
    }

    // Extract major.minor version
    const versionMatch = version.match(/^(\d+)\.(\d+)/);
    if (versionMatch) {
      versionMajorMinor = `${versionMatch[1]}.${versionMatch[2]}`;
    }
  } catch (error) {
    console.warn(
      `   ⚠️  Could not fetch version: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const endpoints = getEndpointsToTest(credentials.vhost);
  const report: DiscoveryReport = {
    server: {
      host: credentials.host,
      port: credentials.port,
      vhost: credentials.vhost,
      version,
      versionMajorMinor,
    },
    timestamp: new Date().toISOString(),
    endpoints: [],
    summary: {
      totalEndpoints: endpoints.length,
      successfulEndpoints: 0,
      failedEndpoints: 0,
      totalUnexpectedFields: 0,
      totalMissingFields: 0,
      uniqueUnexpectedFields: new Set<string>(),
      uniqueMissingFields: new Set<string>(),
    },
  };

  console.log(`\n📡 Testing ${endpoints.length} endpoints...\n`);

  for (const { endpoint, method } of endpoints) {
    console.log(`   Testing ${method} ${endpoint}...`);
    const result = await discoverEndpoint(client, endpoint, method, version);

    if (result.status === "success") {
      report.summary.successfulEndpoints++;
      if (result.detection) {
        report.summary.totalUnexpectedFields +=
          result.detection.unexpectedFields.length;
        report.summary.totalMissingFields +=
          result.detection.missingFields.length;
        result.detection.unexpectedFields.forEach((f) =>
          report.summary.uniqueUnexpectedFields.add(f)
        );
        result.detection.missingFields.forEach((f) =>
          report.summary.uniqueMissingFields.add(f)
        );
      }
      console.log(`      ✅ Success`);
      if (result.detection) {
        if (result.detection.unexpectedFields.length > 0) {
          console.log(
            `         ⚠️  Unexpected fields: ${result.detection.unexpectedFields.join(", ")}`
          );
        }
        if (result.detection.missingFields.length > 0) {
          console.log(
            `         ⚠️  Missing fields: ${result.detection.missingFields.join(", ")}`
          );
        }
      }
    } else {
      report.summary.failedEndpoints++;
      console.log(`      ❌ Error: ${result.error}`);
    }

    report.endpoints.push({
      endpoint,
      method,
      ...result,
    });
  }

  return report;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report: DiscoveryReport): string {
  const lines: string[] = [];

  lines.push("# RabbitMQ Field Discovery Report");
  lines.push("");
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push("");
  lines.push("## Server Information");
  lines.push("");
  lines.push(`- **Host:** ${report.server.host}:${report.server.port}`);
  lines.push(`- **VHost:** ${report.server.vhost}`);
  if (report.server.version) {
    lines.push(`- **Version:** ${report.server.version}`);
  }
  if (report.server.versionMajorMinor) {
    lines.push(
      `- **Version (Major.Minor):** ${report.server.versionMajorMinor}`
    );
  }
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total Endpoints Tested:** ${report.summary.totalEndpoints}`);
  lines.push(`- **Successful:** ${report.summary.successfulEndpoints}`);
  lines.push(`- **Failed:** ${report.summary.failedEndpoints}`);
  lines.push(
    `- **Total Unexpected Fields:** ${report.summary.totalUnexpectedFields}`
  );
  lines.push(
    `- **Total Missing Fields:** ${report.summary.totalMissingFields}`
  );
  lines.push(
    `- **Unique Unexpected Fields:** ${report.summary.uniqueUnexpectedFields.size}`
  );
  lines.push(
    `- **Unique Missing Fields:** ${report.summary.uniqueMissingFields.size}`
  );
  lines.push("");

  if (report.summary.uniqueUnexpectedFields.size > 0) {
    lines.push("## Unexpected Fields (in response but not in types)");
    lines.push("");
    lines.push(
      "These fields were found in API responses but are not defined in our TypeScript types:"
    );
    lines.push("");
    Array.from(report.summary.uniqueUnexpectedFields)
      .sort()
      .forEach((field) => {
        lines.push(`- \`${field}\``);
      });
    lines.push("");
  }

  if (report.summary.uniqueMissingFields.size > 0) {
    lines.push("## Missing Fields (in types but not in response)");
    lines.push("");
    lines.push(
      "These fields are defined in our TypeScript types but were not found in API responses:"
    );
    lines.push("");
    Array.from(report.summary.uniqueMissingFields)
      .sort()
      .forEach((field) => {
        lines.push(`- \`${field}\``);
      });
    lines.push("");
  }

  lines.push("## Endpoint Details");
  lines.push("");
  lines.push(
    "| Endpoint | Method | Status | Unexpected Fields | Missing Fields |"
  );
  lines.push(
    "|----------|--------|--------|-------------------|----------------|"
  );
  report.endpoints.forEach((ep) => {
    const unexpected = ep.detection?.unexpectedFields.length || 0;
    const missing = ep.detection?.missingFields.length || 0;
    const status = ep.status === "success" ? "✅" : "❌";
    lines.push(
      `| ${ep.endpoint} | ${ep.method} | ${status} | ${unexpected} | ${missing} |`
    );
  });

  return lines.join("\n");
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 5) {
    console.error(
      "Usage: tsx scripts/rabbitmq/discover-rabbitmq-fields.ts <host> <port> <username> <password> <vhost> [useHttps]"
    );
    console.error("");
    console.error("Example:");
    console.error(
      "  tsx scripts/rabbitmq/discover-rabbitmq-fields.ts localhost 15672 guest guest / false"
    );
    process.exit(1);
  }

  const [host, portStr, username, password, vhost, useHttpsStr] = args;
  const port = parseInt(portStr, 10);
  const useHttps = useHttpsStr === "true" || useHttpsStr === "1";

  if (isNaN(port)) {
    console.error(`Invalid port: ${portStr}`);
    process.exit(1);
  }

  const credentials: RabbitMQCredentials = {
    host,
    port,
    amqpPort: 5672, // Default AMQP port
    username,
    password,
    vhost: vhost || "/",
    useHttps,
  };

  try {
    const report = await discoverFields(credentials);

    // Save JSON report
    const jsonPath = join(
      process.cwd(),
      "src/core/rabbitmq/discovery",
      `rabbitmq-discovery-${report.server.versionMajorMinor || "unknown"}-${Date.now()}.json`
    );
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 JSON report saved to: ${jsonPath}`);

    // Save Markdown report
    const mdReport = generateMarkdownReport(report);
    const mdPath = join(
      process.cwd(),
      "src/core/rabbitmq/discovery",
      `rabbitmq-discovery-${report.server.versionMajorMinor || "unknown"}-${Date.now()}.md`
    );
    writeFileSync(mdPath, mdReport);
    console.log(`💾 Markdown report saved to: ${mdPath}`);

    console.log("\n✨ Discovery complete!");
    console.log(`\nSummary:`);
    console.log(
      `  - Successful endpoints: ${report.summary.successfulEndpoints}/${report.summary.totalEndpoints}`
    );
    console.log(
      `  - Unexpected fields found: ${report.summary.uniqueUnexpectedFields.size}`
    );
    console.log(
      `  - Missing fields found: ${report.summary.uniqueMissingFields.size}`
    );
  } catch (error) {
    console.error("❌ Discovery failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { discoverFields, generateMarkdownReport };
