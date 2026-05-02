import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, ".env.test") });

const AUTH_TOKENS_FILE = path.resolve(import.meta.dirname, ".auth-tokens.json");

async function globalTeardown() {
  // Clean up auth tokens file
  if (fs.existsSync(AUTH_TOKENS_FILE)) {
    fs.unlinkSync(AUTH_TOKENS_FILE);
  }
  // Only clean up if explicitly requested (useful for debugging)
  if (process.env.E2E_CLEANUP === "true") {
    const DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgres://postgres:password@localhost:5433/qarote_e2e";

    const { PrismaClient } =
      await import("../api/src/generated/prisma/client.js");
    const adapter = new PrismaPg({ connectionString: DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    try {
      const tables = [
        "QueueMetric",
        "Queue",
        "SeenAlert",
        "ResolvedAlert",
        "AlertRule",
        "Alert",
        "SlackConfig",
        "Webhook",
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
        try {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
        } catch (err: any) {
          const msg = err?.message ?? "";
          if (msg.includes("does not exist")) continue;
          throw err;
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

export default globalTeardown;
