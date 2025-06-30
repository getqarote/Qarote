#!/usr/bin/env bun
/**
 * Seed Plan Limit Test Scenarios
 *
 * This script creates specific scenarios to test plan validation and UX bottlenecks:
 * - Users at their exact limits
 * - Users who exceed limits (for testing downgrade scenarios)
 * - Edge cases for plan validation
 */

import { PrismaClient, WorkspacePlan, UserRole } from "@prisma/client";
import { hashPassword } from "../src/core/auth";
import { logger } from "../src/core/logger";
import { PLAN_LIMITS } from "../src/services/plan-validation.service";

const prisma = new PrismaClient();

interface LimitTestScenario {
  name: string;
  plan: WorkspacePlan;
  description: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  targetServerCount: number;
  targetQueueCount: number;
  targetUserCount: number;
  expectOverLimit?: boolean;
}

const LIMIT_TEST_SCENARIOS: LimitTestScenario[] = [
  // FREE Plan Scenarios
  {
    name: "FREE - Exact Limits",
    plan: WorkspacePlan.FREE,
    description: "User at exact FREE plan limits",
    email: "free.exact@test.com",
    password: "password123",
    firstName: "Exact",
    lastName: "Free",
    targetServerCount: 1, // Limit is 1
    targetQueueCount: 1, // Limit is 1
    targetUserCount: 1, // Limit is 1
  },
  {
    name: "FREE - Over Limits (Legacy)",
    plan: WorkspacePlan.FREE,
    description: "FREE user with legacy over-limit resources",
    email: "free.over@test.com",
    password: "password123",
    firstName: "Over",
    lastName: "Free",
    targetServerCount: 2, // Over limit
    targetQueueCount: 5, // Over limit
    targetUserCount: 1,
    expectOverLimit: true,
  },

  // FREELANCE Plan Scenarios
  {
    name: "FREELANCE - Exact Limits",
    plan: WorkspacePlan.FREELANCE,
    description: "User at exact FREELANCE plan limits",
    email: "freelance.exact@test.com",
    password: "password123",
    firstName: "Exact",
    lastName: "Freelance",
    targetServerCount: 2, // Limit is 2
    targetQueueCount: 10, // Limit is 10
    targetUserCount: 2, // Limit is 2
  },
  {
    name: "FREELANCE - Near Limits",
    plan: WorkspacePlan.FREELANCE,
    description: "User near FREELANCE plan limits",
    email: "freelance.near@test.com",
    password: "password123",
    firstName: "Near",
    lastName: "Freelance",
    targetServerCount: 1, // 1 below limit
    targetQueueCount: 9, // 1 below limit
    targetUserCount: 1, // 1 below limit
  },
  {
    name: "FREELANCE - Over Limits (Legacy)",
    plan: WorkspacePlan.FREELANCE,
    description: "FREELANCE user with legacy over-limit resources",
    email: "freelance.over@test.com",
    password: "password123",
    firstName: "Over",
    lastName: "Freelance",
    targetServerCount: 4, // Over limit
    targetQueueCount: 15, // Over limit
    targetUserCount: 2,
    expectOverLimit: true,
  },

  // STARTUP Plan Scenarios
  {
    name: "STARTUP - Exact Limits",
    plan: WorkspacePlan.STARTUP,
    description: "User at exact STARTUP plan limits",
    email: "startup.exact@test.com",
    password: "password123",
    firstName: "Exact",
    lastName: "Startup",
    targetServerCount: 10, // Limit is 10
    targetQueueCount: 50, // Limit is 50
    targetUserCount: 6, // Limit is 6
  },
  {
    name: "STARTUP - Heavy Usage",
    plan: WorkspacePlan.STARTUP,
    description: "STARTUP user with heavy but allowed usage",
    email: "startup.heavy@test.com",
    password: "password123",
    firstName: "Heavy",
    lastName: "Startup",
    targetServerCount: 8, // High usage
    targetQueueCount: 45, // High usage
    targetUserCount: 5, // High usage
  },

  // BUSINESS Plan Scenarios
  {
    name: "BUSINESS - High Usage",
    plan: WorkspacePlan.BUSINESS,
    description: "BUSINESS user with very high usage",
    email: "business.high@test.com",
    password: "password123",
    firstName: "High",
    lastName: "Business",
    targetServerCount: 30, // High but allowed
    targetQueueCount: 150, // High but allowed
    targetUserCount: 15, // High but allowed
  },
  {
    name: "BUSINESS - Maximum Load",
    plan: WorkspacePlan.BUSINESS,
    description: "BUSINESS user testing maximum capacity",
    email: "business.max@test.com",
    password: "password123",
    firstName: "Maximum",
    lastName: "Business",
    targetServerCount: 45, // Near theoretical max
    targetQueueCount: 180, // Near limit
    targetUserCount: 20, // Many users
  },
];

async function createUser(
  scenario: LimitTestScenario,
  workspaceId: string,
  isAdmin: boolean = true
) {
  const hashedPassword = await hashPassword(scenario.password);

  return await prisma.user.create({
    data: {
      email: scenario.email,
      passwordHash: hashedPassword,
      firstName: scenario.firstName,
      lastName: scenario.lastName,
      role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      workspaceId: workspaceId,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });
}

async function createAdditionalUsers(
  workspaceId: string,
  count: number,
  baseName: string
) {
  const users: any[] = [];
  for (let i = 2; i <= count; i++) {
    const hashedPassword = await hashPassword("password123");
    const user = await prisma.user.create({
      data: {
        email: `${baseName}.user${i}@test.com`,
        passwordHash: hashedPassword,
        firstName: `User${i}`,
        lastName: "Test",
        role: i === count ? UserRole.READONLY : UserRole.USER,
        workspaceId: workspaceId,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
    users.push(user);
  }
  return users;
}

async function createLimitTestScenario(
  scenario: LimitTestScenario
): Promise<void> {
  logger.info(`Creating limit test scenario: ${scenario.name}`);

  try {
    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: `${scenario.name} Workspace`,
        contactEmail: scenario.email,
        plan: scenario.plan,
        consentGiven: true,
        consentDate: new Date(),
      },
    });

    // Create main user
    const mainUser = await createUser(scenario, workspace.id);
    logger.info(`Created main user: ${mainUser.email}`);

    // Create additional users if needed
    if (scenario.targetUserCount > 1) {
      const additionalUsers = await createAdditionalUsers(
        workspace.id,
        scenario.targetUserCount,
        scenario.firstName.toLowerCase()
      );
      logger.info(`Created ${additionalUsers.length} additional users`);
    }

    // Create servers
    const servers: any[] = [];
    for (let i = 0; i < scenario.targetServerCount; i++) {
      const server = await prisma.rabbitMQServer.create({
        data: {
          name: `${scenario.name} Server ${i + 1}`,
          host: `test-${i + 1}.rabbitmq.local`,
          port: 5672,
          username: "test_user",
          password: "test_password",
          vhost: "/",
          workspaceId: workspace.id,
          version: "3.12.10",
          versionMajorMinor: "3.12",
          queueCountAtConnect: Math.floor(
            scenario.targetQueueCount / scenario.targetServerCount
          ),
          isOverQueueLimit: scenario.expectOverLimit || false,
        },
      });
      servers.push(server);
    }
    logger.info(`Created ${servers.length} servers`);

    // Create queues distributed across servers
    let totalQueuesCreated = 0;
    const queuesPerServer = Math.ceil(
      scenario.targetQueueCount / scenario.targetServerCount
    );

    for (let serverIndex = 0; serverIndex < servers.length; serverIndex++) {
      const server = servers[serverIndex];
      const queueCount = Math.min(
        queuesPerServer,
        scenario.targetQueueCount - totalQueuesCreated
      );

      for (let i = 0; i < queueCount; i++) {
        await prisma.queue.create({
          data: {
            name: `${scenario.name.toLowerCase().replace(/\s+/g, "_")}_queue_${serverIndex + 1}_${i + 1}`,
            vhost: "/",
            serverId: server.id,
            messages: Math.floor(Math.random() * 1000),
            messagesReady: Math.floor(Math.random() * 500),
            messagesUnack: Math.floor(Math.random() * 100),
            lastFetched: new Date(),
          },
        });
        totalQueuesCreated++;
      }
    }
    logger.info(`Created ${totalQueuesCreated} queues`);

    // Get plan limits for comparison
    const planLimits = PLAN_LIMITS[scenario.plan];

    logger.info(`✅ Scenario created: ${scenario.name}`);
    logger.info(`   Plan: ${scenario.plan}`);
    logger.info(
      `   Servers: ${scenario.targetServerCount} / ${planLimits.maxServers} limit`
    );
    logger.info(
      `   Queues: ${scenario.targetQueueCount} / ${planLimits.maxQueues} limit`
    );
    logger.info(
      `   Users: ${scenario.targetUserCount} / ${planLimits.maxUsers || "unlimited"} limit`
    );

    if (scenario.expectOverLimit) {
      logger.info(`   🚨 This scenario is OVER LIMITS - test upgrade prompts!`);
    } else if (
      scenario.targetServerCount === planLimits.maxServers ||
      scenario.targetQueueCount === planLimits.maxQueues
    ) {
      logger.info(
        `   ⚠️  This scenario is AT LIMITS - test create buttons disabled!`
      );
    }

    logger.info(`   Description: ${scenario.description}\n`);
  } catch (error) {
    logger.error(`❌ Failed to create scenario ${scenario.name}:`, error);
    throw error;
  }
}

async function seedLimitTests(): Promise<void> {
  try {
    logger.info("🧪 Starting plan limit test scenarios...\n");

    for (const scenario of LIMIT_TEST_SCENARIOS) {
      await createLimitTestScenario(scenario);
    }

    logger.info("✅ All limit test scenarios created successfully!");
    logger.info("\n🧪 Limit Test Summary:");
    logger.info("=====================");

    LIMIT_TEST_SCENARIOS.forEach((scenario) => {
      const planLimits = PLAN_LIMITS[scenario.plan];
      logger.info(`\n${scenario.name}:`);
      logger.info(
        `  👤 Email: ${scenario.email} | Password: ${scenario.password}`
      );
      logger.info(
        `  📊 Servers: ${scenario.targetServerCount}/${planLimits.maxServers}`
      );
      logger.info(
        `  📊 Queues: ${scenario.targetQueueCount}/${planLimits.maxQueues}`
      );
      logger.info(
        `  📊 Users: ${scenario.targetUserCount}/${planLimits.maxUsers || "∞"}`
      );
      if (scenario.expectOverLimit) {
        logger.info(`  🚨 OVER LIMITS - Test upgrade prompts`);
      }
      logger.info(`  📝 ${scenario.description}`);
    });

    logger.info("\n🎯 Limit Testing Guide:");
    logger.info("=======================");
    logger.info("1. AT LIMITS scenarios:");
    logger.info("   - Buttons should be DISABLED");
    logger.info("   - Upgrade prompts should appear");
    logger.info("   - Clear messaging about limits");

    logger.info("\n2. OVER LIMITS scenarios:");
    logger.info("   - Warning banners should show");
    logger.info("   - Creation should be blocked");
    logger.info("   - Upgrade CTAs should be prominent");

    logger.info("\n3. NEAR LIMITS scenarios:");
    logger.info("   - Subtle warnings about approaching limits");
    logger.info("   - Preview of what happens at limits");

    logger.info("\n4. Test these UX flows:");
    logger.info("   - Try creating resources beyond limits");
    logger.info("   - Check upgrade modal content");
    logger.info("   - Verify limit counters are accurate");
    logger.info("   - Test plan downgrade behavior");
  } catch (error) {
    logger.error("❌ Failed to seed limit tests:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  seedLimitTests();
}

export { seedLimitTests };
