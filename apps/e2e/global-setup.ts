import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashSync } from "bcryptjs";
import dotenv from "dotenv";

import type { PrismaClient } from "../api/src/generated/prisma/client.js";

dotenv.config({ path: path.resolve(import.meta.dirname, ".env.test") });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5433/qarote_e2e";

const API_URL = process.env.API_URL || "http://localhost:3001";
const AUTH_TOKENS_FILE = path.resolve(import.meta.dirname, ".auth-tokens.json");

async function globalSetup() {
  // Dynamically import PrismaClient (generated in the api package)
  const { PrismaClient } = await import(
    "../api/src/generated/prisma/client.js"
  );
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Wait for database
    await waitForDb(prisma);

    // 2. Run migrations
    const apiDir = path.resolve(import.meta.dirname, "../api");
    execSync("pnpm exec prisma migrate deploy", {
      cwd: apiDir,
      env: { ...process.env, DATABASE_URL },
      stdio: "pipe",
    });

    // 3. Clean all test data
    await cleanDatabase(prisma);

    // 4. Seed base data
    await seedBaseData(prisma);
  } finally {
    await prisma.$disconnect();
  }

  // 5. Pre-acquire auth tokens and save to file (avoids rate limiting across workers)
  await acquireAuthTokens();
}

async function waitForDb(prisma: PrismaClient, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$connect();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Database not available after 30 seconds");
}

async function cleanDatabase(prisma: PrismaClient) {
  // Truncate in reverse dependency order
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
    "Session",
    "Account",
    "Verification",
    "RabbitMQServer",
    "User",
    "Workspace",
    "SystemSetting",
    "SystemState",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${table}" CASCADE`
      );
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("does not exist")) continue;
      throw err;
    }
  }
}

async function seedBaseData(prisma: PrismaClient) {
  const passwordHash = hashSync("TestPassword123!", 1);

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "E2E Test Workspace",
      contactEmail: "admin@e2e-test.local",
    },
  });

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@e2e-test.local",
      passwordHash,
      name: "E2E Admin",
      firstName: "E2E",
      lastName: "Admin",
      role: "ADMIN",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      workspaceId: workspace.id,
    },
  });

  // Create Account record for better-auth
  await prisma.account.create({
    data: {
      userId: adminUser.id,
      accountId: adminUser.id,
      providerId: "credential",
      password: passwordHash,
    },
  });

  // Create workspace membership for admin
  await prisma.workspaceMember.create({
    data: {
      userId: adminUser.id,
      workspaceId: workspace.id,
      role: "ADMIN",
    },
  });

  // Set workspace owner
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { ownerId: adminUser.id },
  });

  // Create readonly user
  const readonlyUser = await prisma.user.create({
    data: {
      email: "readonly@e2e-test.local",
      passwordHash,
      name: "Read Only",
      firstName: "Read",
      lastName: "Only",
      role: "READONLY",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      workspaceId: workspace.id,
    },
  });

  // Create Account record for better-auth
  await prisma.account.create({
    data: {
      userId: readonlyUser.id,
      accountId: readonlyUser.id,
      providerId: "credential",
      password: passwordHash,
    },
  });

  await prisma.workspaceMember.create({
    data: {
      userId: readonlyUser.id,
      workspaceId: workspace.id,
      role: "READONLY",
    },
  });
}

async function loginViaApi(
  email: string,
  password: string,
  maxRetries = 5
): Promise<{ cookie: string; user: Record<string, unknown> }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(`${API_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
    });

    if (response.status === 429) {
      // Rate limited — wait and retry
      const waitMs = 2000 * (attempt + 1);
      console.log(`Rate limited on login for ${email}, waiting ${waitMs}ms...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Login failed for ${email}: ${response.status} ${body}`);
    }

    // Extract session cookie from Set-Cookie header
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    const cookie = setCookieHeaders
      .map((c: string) => c.split(";")[0])
      .join("; ");

    const data = await response.json();
    return { cookie, user: data.user || data };
  }
  throw new Error(`Login failed for ${email}: rate limited after ${maxRetries} retries`);
}

async function acquireAuthTokens() {
  const tokens: Record<string, { cookie: string; user: Record<string, unknown> }> = {};

  tokens["admin@e2e-test.local"] = await loginViaApi(
    "admin@e2e-test.local",
    "TestPassword123!"
  );
  tokens["readonly@e2e-test.local"] = await loginViaApi(
    "readonly@e2e-test.local",
    "TestPassword123!"
  );

  fs.writeFileSync(AUTH_TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export default globalSetup;
