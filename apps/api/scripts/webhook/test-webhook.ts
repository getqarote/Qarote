#!/usr/bin/env tsx

/**
 * Webhook Testing Script
 *
 * Test webhook functionality including:
 * - Sending webhooks with/without secrets
 * - Testing retry logic
 * - Testing alert notification payloads
 * - Verifying HMAC signatures
 */

import { WebhookPayload } from "../../src/ee/services/webhook/webhook.interfaces";
import { WebhookService } from "../../src/ee/services/webhook/webhook.service";
import {
  RabbitMQAlert,
  AlertSeverity,
  AlertCategory,
} from "../../src/ee/services/alerts/alert.interfaces";

// Mock alert data for testing
const createMockAlert = (
  severity: AlertSeverity,
  category: AlertCategory,
  sourceName: string
): RabbitMQAlert => {
  const alertId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const sourceType: "node" | "queue" | "cluster" =
    category === AlertCategory.QUEUE ? "queue" : "node";

  return {
    id: alertId,
    serverId: "test-server-id",
    serverName: "Test Server",
    severity,
    category,
    title: `${severity.charAt(0).toUpperCase() + severity.slice(1)} ${category} Alert`,
    description: `Test ${severity} alert for ${sourceName} - ${category} threshold exceeded`,
    details: {
      current: severity === AlertSeverity.CRITICAL ? 96 : 85,
      threshold: severity === AlertSeverity.CRITICAL ? 95 : 80,
      recommended:
        severity === AlertSeverity.CRITICAL
          ? "Immediate action required"
          : "Monitor closely",
      affected: [sourceName],
    },
    timestamp: new Date().toISOString(),
    resolved: false,
    source: {
      type: sourceType,
      name: sourceName,
    },
  };
};

async function testBasicWebhook() {
  console.log("🧪 Test 1: Basic webhook without secret\n");

  const testUrl = "https://webhook.site/unique-test-basic";
  const mockAlerts: RabbitMQAlert[] = [
    createMockAlert(AlertSeverity.CRITICAL, AlertCategory.MEMORY, "node1"),
    createMockAlert(AlertSeverity.WARNING, AlertCategory.DISK, "node1"),
  ];

  const payload: WebhookPayload = {
    version: "v1",
    event: "alert.notification",
    timestamp: new Date().toISOString(),
    workspace: {
      id: "test-workspace-id",
      name: "Test Workspace",
    },
    server: {
      id: "test-server-id",
      name: "Test Server",
    },
    alerts: mockAlerts,
    summary: {
      total: mockAlerts.length,
      critical: mockAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL)
        .length,
      warning: mockAlerts.filter((a) => a.severity === AlertSeverity.WARNING)
        .length,
      info: mockAlerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    },
  };

  console.log(`📤 Sending webhook to: ${testUrl}`);
  console.log(
    `📦 Payload summary: ${mockAlerts.length} alerts (${payload.summary.critical} critical, ${payload.summary.warning} warning)\n`
  );

  const result = await WebhookService.sendWebhook(testUrl, payload);

  if (result.success) {
    console.log(`✅ Webhook sent successfully!`);
    console.log(`   Status Code: ${result.statusCode}`);
    console.log(`   Retries: ${result.retries || 0}`);
  } else {
    console.log(`❌ Webhook failed:`);
    console.log(`   Error: ${result.error}`);
    console.log(`   Status Code: ${result.statusCode || "N/A"}`);
    console.log(`   Retries: ${result.retries || 0}`);
  }

  console.log("\n");
  return result;
}

async function testWebhookWithSecret() {
  console.log("🧪 Test 2: Webhook with HMAC signature\n");

  const testUrl = "https://webhook.site/unique-test-secret";
  const secret = process.env.WEBHOOK_SECRET || "test-secret-key-12345";
  const mockAlerts: RabbitMQAlert[] = [
    createMockAlert(AlertSeverity.CRITICAL, AlertCategory.QUEUE, "test-queue"),
  ];

  const payload: WebhookPayload = {
    version: "v1",
    event: "alert.notification",
    timestamp: new Date().toISOString(),
    workspace: {
      id: "test-workspace-id",
      name: "Test Workspace",
    },
    server: {
      id: "test-server-id",
      name: "Test Server",
    },
    alerts: mockAlerts,
    summary: {
      total: mockAlerts.length,
      critical: mockAlerts.filter((a) => a.severity === "critical").length,
      warning: 0,
      info: 0,
    },
  };

  console.log(`📤 Sending webhook to: ${testUrl}`);
  console.log(`🔐 Using secret: ${secret.substring(0, 10)}...`);
  console.log(`📦 Payload: ${mockAlerts.length} critical alert(s)\n`);

  const result = await WebhookService.sendWebhook(testUrl, payload, secret);

  if (result.success) {
    console.log(`✅ Webhook sent successfully with signature!`);
    console.log(`   Status Code: ${result.statusCode}`);
    console.log(`   Retries: ${result.retries || 0}`);
    console.log(`\n💡 Check the webhook.site page to verify:`);
    console.log(`   - X-Qarote-Signature header is present`);
    console.log(`   - Signature format: sha256=<hex-string>`);
  } else {
    console.log(`❌ Webhook failed:`);
    console.log(`   Error: ${result.error}`);
  }

  console.log("\n");
  return result;
}

async function testMultipleWebhooks() {
  console.log("🧪 Test 3: Sending to multiple webhooks\n");

  const webhooks = [
    {
      id: "webhook-1",
      url:
        process.env.WEBHOOK_TEST_URL_1 ||
        "https://webhook.site/unique-test-multi-1",
      secret: null,
      version: "v1",
    },
    {
      id: "webhook-2",
      url:
        process.env.WEBHOOK_TEST_URL_2 ||
        "https://webhook.site/unique-test-multi-2",
      secret: "test-secret-2",
      version: "v1",
    },
  ];

  const mockAlerts: RabbitMQAlert[] = [
    createMockAlert(AlertSeverity.CRITICAL, AlertCategory.MEMORY, "node1"),
    createMockAlert(AlertSeverity.WARNING, AlertCategory.DISK, "node1"),
    createMockAlert(AlertSeverity.INFO, AlertCategory.CONNECTION, "node1"),
  ];

  console.log(`📤 Sending to ${webhooks.length} webhooks in parallel`);
  console.log(`📦 Payload: ${mockAlerts.length} alerts\n`);

  const results = await WebhookService.sendAlertNotification(
    webhooks,
    "test-workspace-id",
    "Test Workspace",
    "test-server-id",
    "Test Server",
    mockAlerts
  );

  console.log("📊 Results:\n");
  for (const { webhookId, result } of results) {
    const webhook = webhooks.find((w) => w.id === webhookId);
    if (result.success) {
      console.log(
        `✅ ${webhookId} (${webhook?.url}): Success (${result.statusCode})`
      );
    } else {
      console.log(
        `❌ ${webhookId} (${webhook?.url}): Failed - ${result.error}`
      );
    }
  }

  console.log("\n");
  return results;
}

async function testRetryLogic() {
  console.log("🧪 Test 4: Retry logic with failing endpoint\n");

  // Use a URL that will return 500 error to test retry logic
  const testUrl = process.env.WEBHOOK_FAIL_URL || "https://httpstat.us/500";
  const mockAlerts: RabbitMQAlert[] = [
    createMockAlert(AlertSeverity.CRITICAL, AlertCategory.MEMORY, "node1"),
  ];

  const payload: WebhookPayload = {
    version: "v1",
    event: "alert.notification",
    timestamp: new Date().toISOString(),
    workspace: {
      id: "test-workspace-id",
      name: "Test Workspace",
    },
    server: {
      id: "test-server-id",
      name: "Test Server",
    },
    alerts: mockAlerts,
    summary: {
      total: 1,
      critical: 1,
      warning: 0,
      info: 0,
    },
  };

  console.log(`📤 Sending webhook to failing endpoint: ${testUrl}`);
  console.log(`🔄 This will test retry logic (max 3 retries)\n`);

  const startTime = Date.now();
  const result = await WebhookService.sendWebhook(testUrl, payload);
  const duration = Date.now() - startTime;

  console.log(`⏱️  Total time: ${duration}ms`);
  console.log(`🔄 Retries attempted: ${result.retries || 0}`);

  if (result.success) {
    console.log(`✅ Unexpected success (endpoint recovered)`);
  } else {
    console.log(`❌ Expected failure after retries`);
    console.log(`   Error: ${result.error}`);
    console.log(`   Status Code: ${result.statusCode}`);
  }

  console.log("\n");
  return result;
}

async function testTimeout() {
  console.log("🧪 Test 5: Timeout handling\n");

  // Use a URL that will delay response to test timeout
  const testUrl =
    process.env.WEBHOOK_TIMEOUT_URL || "https://httpstat.us/200?sleep=15000";
  const mockAlerts: RabbitMQAlert[] = [
    createMockAlert(AlertSeverity.WARNING, AlertCategory.DISK, "node1"),
  ];

  const payload: WebhookPayload = {
    version: "v1",
    event: "alert.notification",
    timestamp: new Date().toISOString(),
    workspace: {
      id: "test-workspace-id",
      name: "Test Workspace",
    },
    server: {
      id: "test-server-id",
      name: "Test Server",
    },
    alerts: mockAlerts,
    summary: {
      total: 1,
      critical: 0,
      warning: 1,
      info: 0,
    },
  };

  console.log(`📤 Sending webhook to slow endpoint: ${testUrl}`);
  console.log(`⏱️  Timeout: 10 seconds (request will timeout)\n`);

  const startTime = Date.now();
  const result = await WebhookService.sendWebhook(testUrl, payload);
  const duration = Date.now() - startTime;

  console.log(`⏱️  Total time: ${duration}ms`);
  console.log(`🔄 Retries attempted: ${result.retries || 0}`);

  if (result.success) {
    console.log(`✅ Request completed (unexpected)`);
  } else {
    console.log(`❌ Request timed out (expected)`);
    console.log(`   Error: ${result.error}`);
  }

  console.log("\n");
  return result;
}

async function testPayloadStructure() {
  console.log("🧪 Test 6: Payload structure validation\n");

  const mockAlerts: RabbitMQAlert[] = [
    createMockAlert(AlertSeverity.CRITICAL, AlertCategory.MEMORY, "node1"),
    createMockAlert(AlertSeverity.WARNING, AlertCategory.DISK, "node1"),
    createMockAlert(AlertSeverity.INFO, AlertCategory.CONNECTION, "node1"),
  ];

  const payload: WebhookPayload = {
    version: "v1",
    event: "alert.notification",
    timestamp: new Date().toISOString(),
    workspace: {
      id: "test-workspace-id",
      name: "Test Workspace",
    },
    server: {
      id: "test-server-id",
      name: "Test Server",
    },
    alerts: mockAlerts,
    summary: {
      total: mockAlerts.length,
      critical: mockAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL)
        .length,
      warning: mockAlerts.filter((a) => a.severity === AlertSeverity.WARNING)
        .length,
      info: mockAlerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    },
  };

  console.log("📋 Payload structure:\n");
  console.log(JSON.stringify(payload, null, 2));
  console.log("\n");

  // Validate structure
  const requiredFields = [
    "version",
    "event",
    "timestamp",
    "workspace",
    "server",
    "alerts",
    "summary",
  ];

  const missingFields = requiredFields.filter((field) => !(field in payload));
  if (missingFields.length > 0) {
    console.log(`❌ Missing required fields: ${missingFields.join(", ")}`);
  } else {
    console.log(`✅ All required fields present`);
  }

  // Validate summary matches alerts
  const actualSummary = {
    total: payload.alerts.length,
    critical: payload.alerts.filter((a) => a.severity === "critical").length,
    warning: payload.alerts.filter((a) => a.severity === "warning").length,
    info: payload.alerts.filter((a) => a.severity === "info").length,
  };

  const summaryMatches =
    JSON.stringify(actualSummary) === JSON.stringify(payload.summary);
  if (summaryMatches) {
    console.log(`✅ Summary matches alert counts`);
  } else {
    console.log(`❌ Summary mismatch:`);
    console.log(`   Expected: ${JSON.stringify(actualSummary)}`);
    console.log(`   Actual: ${JSON.stringify(payload.summary)}`);
  }

  console.log("\n");
  return { payload, valid: missingFields.length === 0 && summaryMatches };
}

async function main() {
  console.log("🚀 Starting Webhook Testing Suite\n");
  console.log("=".repeat(60) + "\n");

  const args = process.argv.slice(2);
  const testName = args[0];

  try {
    if (testName) {
      // Run specific test
      switch (testName) {
        case "basic":
          await testBasicWebhook();
          break;
        case "secret":
          await testWebhookWithSecret();
          break;
        case "multiple":
          await testMultipleWebhooks();
          break;
        case "retry":
          await testRetryLogic();
          break;
        case "timeout":
          await testTimeout();
          break;
        case "payload":
          await testPayloadStructure();
          break;
        default:
          console.log(`❌ Unknown test: ${testName}`);
          console.log("\nAvailable tests:");
          console.log("  basic    - Test basic webhook without secret");
          console.log("  secret   - Test webhook with HMAC signature");
          console.log("  multiple - Test sending to multiple webhooks");
          console.log("  retry    - Test retry logic with failing endpoint");
          console.log("  timeout  - Test timeout handling");
          console.log("  payload  - Test payload structure validation");
          console.log("\nOr run without arguments to run all tests.");
          process.exit(1);
      }
    } else {
      // Run all tests
      await testBasicWebhook();
      await testWebhookWithSecret();
      await testMultipleWebhooks();
      await testPayloadStructure();
      // Skip retry and timeout tests by default (they take longer)
      console.log("💡 Tip: Run specific tests for retry/timeout:");
      console.log("   tsx scripts/webhook/test-webhook.ts retry");
      console.log("   tsx scripts/webhook/test-webhook.ts timeout");
    }

    console.log("✨ Webhook testing complete!");
  } catch (error: any) {
    console.error("💥 Test suite failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Support both direct execution and module import
if (require.main === module) {
  main().catch(console.error);
}

export { main as testWebhook };
