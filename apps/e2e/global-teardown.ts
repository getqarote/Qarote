import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, ".env.test") });

async function globalTeardown() {
  // Only clean up if explicitly requested (useful for debugging)
  if (process.env.E2E_CLEANUP === "true") {
    const DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgres://postgres:password@localhost:5433/qarote_e2e";

    const { PrismaClient } = await import(
      "../api/src/generated/prisma/client.js"
    );
    const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });

    const tables = [
      "QueueMetric",
      "Queue",
      "SeenAlert",
      "ResolvedAlert",
      "AlertRule",
      "Alert",
      "SlackConfig",
      "Webhook",
      "WorkspaceAlertThresholds",
      "WorkspaceMember",
      "Payment",
      "Subscription",
      "License",
      "LicenseFileVersion",
      "LicenseRenewalEmail",
      "Invitation",
      "PasswordReset",
      "EmailVerificationToken",
      "Feedback",
      "StripeWebhookEvent",
      "SsoAuthCode",
      "SsoState",
      "RabbitMQServer",
      "User",
      "Workspace",
      "SystemState",
    ];

    for (const table of tables) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${table}" CASCADE`
      ).catch(() => {});
    }

    await prisma.$disconnect();
  }
}

export default globalTeardown;
