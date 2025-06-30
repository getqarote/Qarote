#!/usr/bin/env bun
/**
 * Master Test Data Seeder
 *
 * This script orchestrates all test data seeding scenarios.
 * It provides options to seed specific test types or all at once.
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../src/core/logger";
import { seedTestUsers } from "./seed-test-users";
import { seedLimitTests } from "./seed-limit-tests";
import { seedEmailVerificationTests } from "./seed-email-verification-tests";

const prisma = new PrismaClient();

enum SeedType {
  ALL = "all",
  USERS = "users",
  LIMITS = "limits",
  EMAIL = "email",
  CLEAN = "clean",
}

interface SeedOptions {
  type: SeedType;
  skipClean?: boolean;
  verbose?: boolean;
}

async function cleanDatabase(): Promise<void> {
  logger.info("🧹 Cleaning existing test data...");

  try {
    // Delete in correct order due to foreign key constraints
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.rabbitMQServer.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.workspace.deleteMany({
      where: {
        OR: [
          { name: { contains: "Test" } },
          { name: { contains: "FREE" } },
          { name: { contains: "FREELANCE" } },
          { name: { contains: "STARTUP" } },
          { name: { contains: "BUSINESS" } },
          { contactEmail: { endsWith: "@test.com" } },
        ],
      },
    });

    logger.info("✅ Database cleaned successfully");
  } catch (error) {
    logger.error("❌ Failed to clean database:", error);
    throw error;
  }
}

async function seedAll(): Promise<void> {
  logger.info("🌱 Starting comprehensive test data seeding...\n");

  try {
    // Seed main user scenarios
    logger.info("1️⃣ Creating main test user scenarios...");
    await seedTestUsers();

    // Seed limit test scenarios
    logger.info("\n2️⃣ Creating plan limit test scenarios...");
    await seedLimitTests();

    // Seed email verification scenarios
    logger.info("\n3️⃣ Creating email verification test scenarios...");
    await seedEmailVerificationTests();

    logger.info("\n🎉 All test scenarios created successfully!");
  } catch (error) {
    logger.error("❌ Failed to seed all scenarios:", error);
    throw error;
  }
}

async function printSummary(): Promise<void> {
  try {
    const workspaces = await prisma.workspace.count({
      where: {
        OR: [
          { name: { contains: "Test" } },
          { contactEmail: { endsWith: "@test.com" } },
        ],
      },
    });

    const users = await prisma.user.count({
      where: {
        email: { endsWith: "@test.com" },
      },
    });

    const servers = await prisma.rabbitMQServer.count({
      where: {
        workspace: {
          contactEmail: { endsWith: "@test.com" },
        },
      },
    });

    const queues = await prisma.queue.count({
      where: {
        server: {
          workspace: {
            contactEmail: { endsWith: "@test.com" },
          },
        },
      },
    });

    const tokens = await prisma.emailVerificationToken.count({
      where: {
        user: {
          email: { endsWith: "@test.com" },
        },
      },
    });

    logger.info("\n📊 Test Data Summary:");
    logger.info("===================");
    logger.info(`Workspaces: ${workspaces}`);
    logger.info(`Users: ${users}`);
    logger.info(`Servers: ${servers}`);
    logger.info(`Queues: ${queues}`);
    logger.info(`Verification Tokens: ${tokens}`);
  } catch (error) {
    logger.error("Failed to generate summary:", error);
  }
}

async function runSeeder(options: SeedOptions): Promise<void> {
  try {
    logger.info("🚀 Starting test data seeder...");
    logger.info(`Mode: ${options.type.toUpperCase()}`);

    // Clean database unless explicitly skipped
    if (!options.skipClean && options.type !== SeedType.CLEAN) {
      await cleanDatabase();
    }

    switch (options.type) {
      case SeedType.ALL:
        await seedAll();
        break;

      case SeedType.USERS:
        logger.info("Creating main test user scenarios...");
        await seedTestUsers();
        break;

      case SeedType.LIMITS:
        logger.info("Creating plan limit test scenarios...");
        await seedLimitTests();
        break;

      case SeedType.EMAIL:
        logger.info("Creating email verification test scenarios...");
        await seedEmailVerificationTests();
        break;

      case SeedType.CLEAN:
        await cleanDatabase();
        logger.info("✅ Database cleaned. No new data created.");
        return;

      default:
        throw new Error(`Unknown seed type: ${options.type}`);
    }

    await printSummary();

    logger.info("\n🎯 Next Steps:");
    logger.info("==============");
    logger.info("1. Start your frontend: cd front-end && npm run dev");
    logger.info("2. Start your backend: cd back-end && bun dev");
    logger.info("3. Visit: http://localhost:5173");
    logger.info("4. Use any test email/password combo from the output above");
    logger.info("5. Test UX flows for different plan types and scenarios");
  } catch (error) {
    logger.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  const typeArg = args.find((arg) => arg.startsWith("--type="))?.split("=")[1];
  const skipClean = args.includes("--skip-clean");
  const verbose = args.includes("--verbose");

  const type = (typeArg as SeedType) || SeedType.ALL;

  if (!Object.values(SeedType).includes(type)) {
    logger.error(`Invalid seed type: ${type}`);
    logger.info("Valid types: all, users, limits, email, clean");
    process.exit(1);
  }

  return { type, skipClean, verbose };
}

function printUsage(): void {
  logger.info("📚 Test Data Seeder Usage:");
  logger.info("==========================");
  logger.info("npm run scripts/seed-test-data.ts [options]");
  logger.info("");
  logger.info("Options:");
  logger.info("  --type=<type>    Seed type: all, users, limits, email, clean");
  logger.info("  --skip-clean     Skip database cleanup");
  logger.info("  --verbose        Verbose logging");
  logger.info("  --help           Show this help");
  logger.info("");
  logger.info("Examples:");
  logger.info(
    "  npm run scripts/seed-test-data.ts                    # Seed everything"
  );
  logger.info(
    "  npm run scripts/seed-test-data.ts --type=users       # Only user scenarios"
  );
  logger.info(
    "  npm run scripts/seed-test-data.ts --type=limits      # Only limit tests"
  );
  logger.info(
    "  npm run scripts/seed-test-data.ts --type=email       # Only email tests"
  );
  logger.info(
    "  npm run scripts/seed-test-data.ts --type=clean       # Clean database only"
  );
  logger.info(
    "  npm run scripts/seed-test-data.ts --skip-clean       # Don't clean first"
  );
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const options = parseArgs();
  runSeeder(options);
}

export { runSeeder, SeedType };
