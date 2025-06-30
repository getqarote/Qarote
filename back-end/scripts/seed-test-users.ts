#!/usr/bin/env bun
/**
 * Seed Test Users for Different Plan Types
 *
 * This script creates realistic test scenarios for each plan type:
 * - FREE: Single user, basic workspace
 * - FREELANCE: Single user with more resources
 * - STARTUP: Small team scenario
 * - BUSINESS: Large team with full features
 */

import { PrismaClient, WorkspacePlan, UserRole } from "@prisma/client";
import { hashPassword } from "../src/core/auth";
import { logger } from "../src/core/logger";

const prisma = new PrismaClient();

interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface TestScenario {
  workspaceName: string;
  plan: WorkspacePlan;
  contactEmail: string;
  users: TestUser[];
  serverCount: number;
  queueCount: number;
  description: string;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    workspaceName: "Solo Developer - Free",
    plan: WorkspacePlan.FREE,
    contactEmail: "free@test.com",
    description: "Single developer testing the waters",
    users: [
      {
        email: "free@test.com",
        password: "password123",
        firstName: "Alex",
        lastName: "Free",
        role: UserRole.ADMIN,
      },
    ],
    serverCount: 1,
    queueCount: 1, // At the limit
  },
  {
    workspaceName: "Freelancer Studio",
    plan: WorkspacePlan.FREELANCE,
    contactEmail: "freelancer@test.com",
    description: "Solo freelancer with multiple projects",
    users: [
      {
        email: "freelancer@test.com",
        password: "password123",
        firstName: "Jamie",
        lastName: "Freelancer",
        role: UserRole.ADMIN,
      },
      {
        email: "freelancer.assistant@test.com",
        password: "password123",
        firstName: "Sam",
        lastName: "Assistant",
        role: UserRole.USER,
      },
    ],
    serverCount: 2, // At the limit
    queueCount: 8, // Near the limit (10 max)
  },
  {
    workspaceName: "TechStart Inc",
    plan: WorkspacePlan.STARTUP,
    contactEmail: "admin@techstart.com",
    description: "Growing startup with development team",
    users: [
      {
        email: "admin@techstart.com",
        password: "password123",
        firstName: "Jordan",
        lastName: "CTO",
        role: UserRole.ADMIN,
      },
      {
        email: "dev1@techstart.com",
        password: "password123",
        firstName: "Morgan",
        lastName: "Developer",
        role: UserRole.USER,
      },
      {
        email: "dev2@techstart.com",
        password: "password123",
        firstName: "Casey",
        lastName: "DevOps",
        role: UserRole.USER,
      },
      {
        email: "qa@techstart.com",
        password: "password123",
        firstName: "Taylor",
        lastName: "QA",
        role: UserRole.USER,
      },
      {
        email: "readonly@techstart.com",
        password: "password123",
        firstName: "Viewer",
        lastName: "Manager",
        role: UserRole.READONLY,
      },
    ],
    serverCount: 6, // Moderate usage (10 max)
    queueCount: 35, // Moderate usage (50 max)
  },
  {
    workspaceName: "Enterprise Corp",
    plan: WorkspacePlan.BUSINESS,
    contactEmail: "admin@enterprise.com",
    description: "Large enterprise with multiple teams",
    users: [
      {
        email: "admin@enterprise.com",
        password: "password123",
        firstName: "Admin",
        lastName: "Enterprise",
        role: UserRole.ADMIN,
      },
      {
        email: "team.lead1@enterprise.com",
        password: "password123",
        firstName: "Lead",
        lastName: "Team1",
        role: UserRole.ADMIN,
      },
      {
        email: "team.lead2@enterprise.com",
        password: "password123",
        firstName: "Lead",
        lastName: "Team2",
        role: UserRole.ADMIN,
      },
      {
        email: "dev1@enterprise.com",
        password: "password123",
        firstName: "Dev",
        lastName: "Backend",
        role: UserRole.USER,
      },
      {
        email: "dev2@enterprise.com",
        password: "password123",
        firstName: "Dev",
        lastName: "Frontend",
        role: UserRole.USER,
      },
      {
        email: "devops1@enterprise.com",
        password: "password123",
        firstName: "DevOps",
        lastName: "Prod",
        role: UserRole.USER,
      },
      {
        email: "devops2@enterprise.com",
        password: "password123",
        firstName: "DevOps",
        lastName: "Staging",
        role: UserRole.USER,
      },
      {
        email: "qa1@enterprise.com",
        password: "password123",
        firstName: "QA",
        lastName: "Lead",
        role: UserRole.USER,
      },
      {
        email: "qa2@enterprise.com",
        password: "password123",
        firstName: "QA",
        lastName: "Automation",
        role: UserRole.USER,
      },
      {
        email: "readonly1@enterprise.com",
        password: "password123",
        firstName: "Manager",
        lastName: "Product",
        role: UserRole.READONLY,
      },
      {
        email: "readonly2@enterprise.com",
        password: "password123",
        firstName: "Manager",
        lastName: "Engineering",
        role: UserRole.READONLY,
      },
    ],
    serverCount: 25, // Heavy usage (50 max)
    queueCount: 150, // Heavy usage (200 max)
  },
];

// Test scenarios for edge cases
const EDGE_CASE_SCENARIOS: TestScenario[] = [
  {
    workspaceName: "FREE Plan - At Limits",
    plan: WorkspacePlan.FREE,
    contactEmail: "free.limits@test.com",
    description: "FREE user at all limits to test upgrade prompts",
    users: [
      {
        email: "free.limits@test.com",
        password: "password123",
        firstName: "Limited",
        lastName: "Free",
        role: UserRole.ADMIN,
      },
    ],
    serverCount: 1, // At limit
    queueCount: 1, // At limit
  },
  {
    workspaceName: "FREELANCE - Near Limits",
    plan: WorkspacePlan.FREELANCE,
    contactEmail: "freelance.limits@test.com",
    description: "FREELANCE user near limits to test UX warnings",
    users: [
      {
        email: "freelance.limits@test.com",
        password: "password123",
        firstName: "Near",
        lastName: "Limit",
        role: UserRole.ADMIN,
      },
      {
        email: "freelance.user2@test.com",
        password: "password123",
        firstName: "Second",
        lastName: "User",
        role: UserRole.USER,
      },
    ],
    serverCount: 2, // At limit
    queueCount: 10, // At limit
  },
  {
    workspaceName: "STARTUP - Over Historical Limits",
    plan: WorkspacePlan.STARTUP,
    contactEmail: "startup.legacy@test.com",
    description: "STARTUP user who was upgraded but has legacy high usage",
    users: [
      {
        email: "startup.legacy@test.com",
        password: "password123",
        firstName: "Legacy",
        lastName: "User",
        role: UserRole.ADMIN,
      },
    ],
    serverCount: 8,
    queueCount: 45, // Close to limit
  },
];

async function createTestScenario(scenario: TestScenario): Promise<void> {
  logger.info(`Creating test scenario: ${scenario.workspaceName}`);

  try {
    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: scenario.workspaceName,
        contactEmail: scenario.contactEmail,
        plan: scenario.plan,
        consentGiven: true,
        consentDate: new Date(),
      },
    });

    logger.info(`Created workspace: ${workspace.name} (${workspace.id})`);

    // Create users
    for (const userData of scenario.users) {
      const hashedPassword = await hashPassword(userData.password);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          workspaceId: workspace.id,
          emailVerified: true, // For testing purposes
          emailVerifiedAt: new Date(),
          isActive: true,
        },
      });

      logger.info(`Created user: ${user.email} (${user.role})`);
    }

    // Create RabbitMQ servers
    const servers: any[] = [];
    for (let i = 0; i < scenario.serverCount; i++) {
      const server = await prisma.rabbitMQServer.create({
        data: {
          name: `Test Server ${i + 1}`,
          host: `rabbitmq-${i + 1}.test.local`,
          port: 5672,
          username: "test_user",
          password: "test_password",
          vhost: "/",
          workspaceId: workspace.id,
          version: "3.12.10",
          versionMajorMinor: "3.12",
          queueCountAtConnect: Math.floor(
            scenario.queueCount / scenario.serverCount
          ),
          isOverQueueLimit: false,
        },
      });
      servers.push(server);
      logger.info(`Created server: ${server.name}`);
    }

    // Create queues distributed across servers
    const queuesPerServer = Math.ceil(
      scenario.queueCount / scenario.serverCount
    );
    for (let serverIndex = 0; serverIndex < servers.length; serverIndex++) {
      const server = servers[serverIndex];
      const queueCount = Math.min(
        queuesPerServer,
        scenario.queueCount - serverIndex * queuesPerServer
      );

      for (let i = 0; i < queueCount; i++) {
        await prisma.queue.create({
          data: {
            name: `queue_${serverIndex + 1}_${i + 1}`,
            vhost: "/",
            serverId: server.id,
            messages: Math.floor(Math.random() * 1000),
            messagesReady: Math.floor(Math.random() * 500),
            messagesUnack: Math.floor(Math.random() * 100),
            lastFetched: new Date(),
          },
        });
      }
      logger.info(`Created ${queueCount} queues for ${server.name}`);
    }

    logger.info(`✅ Successfully created scenario: ${scenario.workspaceName}`);
    logger.info(`   Plan: ${scenario.plan}`);
    logger.info(`   Users: ${scenario.users.length}`);
    logger.info(`   Servers: ${scenario.serverCount}`);
    logger.info(`   Queues: ${scenario.queueCount}`);
    logger.info(`   Description: ${scenario.description}\n`);
  } catch (error) {
    logger.error(
      `❌ Failed to create scenario ${scenario.workspaceName}:`,
      error
    );
    throw error;
  }
}

async function seedTestUsers(): Promise<void> {
  try {
    logger.info("🌱 Starting test user seeding...\n");

    // Create main test scenarios
    logger.info("Creating main test scenarios...");
    for (const scenario of TEST_SCENARIOS) {
      await createTestScenario(scenario);
    }

    // Create edge case scenarios
    logger.info("Creating edge case scenarios...");
    for (const scenario of EDGE_CASE_SCENARIOS) {
      await createTestScenario(scenario);
    }

    logger.info("✅ All test scenarios created successfully!");
    logger.info("\n📋 Test User Summary:");
    logger.info("=====================");

    const allScenarios = [...TEST_SCENARIOS, ...EDGE_CASE_SCENARIOS];
    allScenarios.forEach((scenario) => {
      logger.info(`\n${scenario.workspaceName} (${scenario.plan}):`);
      scenario.users.forEach((user) => {
        logger.info(
          `  👤 ${user.email} (${user.role}) - password: ${user.password}`
        );
      });
      logger.info(
        `  📊 ${scenario.serverCount} servers, ${scenario.queueCount} queues`
      );
      logger.info(`  📝 ${scenario.description}`);
    });

    logger.info("\n🎯 Testing Recommendations:");
    logger.info("===========================");
    logger.info("1. FREE Plan Tests:");
    logger.info("   - Try creating a second server (should be blocked)");
    logger.info("   - Try creating a second queue (should be blocked)");
    logger.info("   - Test upgrade prompts and messaging");

    logger.info("\n2. FREELANCE Plan Tests:");
    logger.info("   - Try creating beyond limits (2 servers, 10 queues)");
    logger.info("   - Test user invitation (max 2 users)");
    logger.info("   - Test message sending limits");

    logger.info("\n3. STARTUP Plan Tests:");
    logger.info("   - Test team collaboration features");
    logger.info("   - Test advanced metrics access");
    logger.info("   - Test alert system");

    logger.info("\n4. BUSINESS Plan Tests:");
    logger.info("   - Test unlimited features");
    logger.info("   - Test priority support access");
    logger.info("   - Test expert memory metrics");
  } catch (error) {
    logger.error("❌ Failed to seed test users:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  seedTestUsers();
}

export { seedTestUsers };
