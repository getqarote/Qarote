#!/usr/bin/env bun
/**
 * Seed Email Verification Test Scenarios
 *
 * This script creates users in different email verification states to test UX flows:
 * - Unverified users (just registered)
 * - Users with pending email changes
 * - Verified users
 * - Users with expired tokens
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { hashPassword } from "../../src/core/auth";
import { logger } from "../../src/core/logger";
import { EmailVerificationService } from "../../src/services/email/email-verification.service";
import { subHours } from "date-fns";
import { PrismaClient, UserPlan, UserRole } from "@prisma/client";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

// Prisma 7 requires a driver adapter
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface EmailVerificationScenario {
  name: string;
  plan: UserPlan;
  description: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  pendingEmail?: string;
  shouldCreateToken?: boolean;
  tokenType?: "SIGNUP" | "EMAIL_CHANGE";
  tokenExpired?: boolean;
}

const EMAIL_VERIFICATION_SCENARIOS: EmailVerificationScenario[] = [
  {
    name: "Fresh Signup - Unverified",
    plan: UserPlan.FREE,
    description: "User just signed up, email not verified yet",
    email: "unverified.fresh@test.com",
    password: "password123",
    firstName: "Fresh",
    lastName: "Signup",
    emailVerified: false,
    shouldCreateToken: true,
    tokenType: "SIGNUP",
  },
  {
    name: "Old Signup - Unverified",
    plan: UserPlan.DEVELOPER,
    description: "User signed up but never verified email",
    email: "unverified.old@test.com",
    password: "password123",
    firstName: "Old",
    lastName: "Signup",
    emailVerified: false,
    shouldCreateToken: true,
    tokenType: "SIGNUP",
  },
  {
    name: "Email Change - Pending",
    plan: UserPlan.DEVELOPER,
    description: "Verified user requesting email change",
    email: "verified.changing@test.com",
    password: "password123",
    firstName: "Email",
    lastName: "Changer",
    emailVerified: true,
    pendingEmail: "new.email@test.com",
    shouldCreateToken: true,
    tokenType: "EMAIL_CHANGE",
  },
  {
    name: "Verified User",
    plan: UserPlan.ENTERPRISE,
    description: "Fully verified user with no pending changes",
    email: "verified.user@test.com",
    password: "password123",
    firstName: "Verified",
    lastName: "User",
    emailVerified: true,
  },
  {
    name: "Expired Token - Signup",
    plan: UserPlan.FREE,
    description: "User with expired signup verification token",
    email: "expired.signup@test.com",
    password: "password123",
    firstName: "Expired",
    lastName: "Signup",
    emailVerified: false,
    shouldCreateToken: true,
    tokenType: "SIGNUP",
    tokenExpired: true,
  },
  {
    name: "Expired Token - Email Change",
    plan: UserPlan.DEVELOPER,
    description: "User with expired email change token",
    email: "expired.change@test.com",
    password: "password123",
    firstName: "Expired",
    lastName: "Change",
    emailVerified: true,
    pendingEmail: "expired.new@test.com",
    shouldCreateToken: true,
    tokenType: "EMAIL_CHANGE",
    tokenExpired: true,
  },
  {
    name: "Multiple Pending - Developer",
    plan: UserPlan.DEVELOPER,
    description: "Developer who tried multiple email changes",
    email: "multiple.pending@test.com",
    password: "password123",
    firstName: "Multiple",
    lastName: "Pending",
    emailVerified: true,
    pendingEmail: "latest.attempt@test.com",
    shouldCreateToken: true,
    tokenType: "EMAIL_CHANGE",
  },
  {
    name: "Business User - Team Admin",
    plan: UserPlan.ENTERPRISE,
    description: "Business plan admin managing team email verifications",
    email: "business.admin@test.com",
    password: "password123",
    firstName: "Business",
    lastName: "Admin",
    emailVerified: true,
  },
];

async function createEmailVerificationScenario(
  scenario: EmailVerificationScenario
): Promise<void> {
  logger.info(`Creating email verification scenario: ${scenario.name}`);

  try {
    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: `${scenario.name} Workspace`,
        contactEmail: scenario.email,
      },
    });

    // Create user
    const hashedPassword = await hashPassword(scenario.password);
    const user = await prisma.user.create({
      data: {
        email: scenario.email,
        passwordHash: hashedPassword,
        firstName: scenario.firstName,
        lastName: scenario.lastName,
        role: UserRole.ADMIN,
        workspaceId: workspace.id,
        emailVerified: scenario.emailVerified,
        emailVerifiedAt: scenario.emailVerified ? new Date() : null,
        pendingEmail: scenario.pendingEmail,
        isActive: true,
      },
    });

    logger.info(
      `Created user: ${user.email} (verified: ${user.emailVerified})`
    );

    // Create verification token if needed
    if (scenario.shouldCreateToken && scenario.tokenType) {
      try {
        const emailToVerify =
          scenario.tokenType === "EMAIL_CHANGE"
            ? scenario.pendingEmail!
            : scenario.email;

        const token = await EmailVerificationService.generateVerificationToken({
          userId: user.id,
          email: emailToVerify,
          type: scenario.tokenType,
        });

        // If token should be expired, update it
        if (scenario.tokenExpired) {
          await prisma.emailVerificationToken.updateMany({
            where: {
              userId: user.id,
              type: scenario.tokenType,
            },
            data: {
              expiresAt: subHours(new Date(), 25), // Expired 25 hours ago
            },
          });
          logger.info(
            `Created EXPIRED ${scenario.tokenType} token for ${user.email}`
          );
        } else {
          logger.info(`Created ${scenario.tokenType} token for ${user.email}`);
        }

        // Log the token for testing (in real scenarios, this would be sent via email)
        logger.info(
          `🔗 Verification URL: http://localhost:5173/verify-email?token=${token}`
        );
      } catch (tokenError) {
        logger.error(`Failed to create verification token:`, tokenError);
      }
    }

    // Add some additional users for multi-user scenarios
    if (
      scenario.plan === UserPlan.ENTERPRISE ||
      scenario.plan === UserPlan.DEVELOPER
    ) {
      // Create a few team members with different verification states
      const teamMembers = [
        {
          email: `team1.${scenario.email}`,
          verified: true,
          role: UserRole.USER,
          name: "Team Member 1",
        },
        {
          email: `team2.${scenario.email}`,
          verified: false,
          role: UserRole.USER,
          name: "Team Member 2",
        },
        {
          email: `readonly.${scenario.email}`,
          verified: true,
          role: UserRole.READONLY,
          name: "Readonly User",
        },
      ];

      for (const member of teamMembers) {
        const memberPassword = await hashPassword("password123");
        const memberUser = await prisma.user.create({
          data: {
            email: member.email,
            passwordHash: memberPassword,
            firstName: member.name.split(" ")[0],
            lastName: member.name.split(" ")[1] || "User",
            role: member.role,
            workspaceId: workspace.id,
            emailVerified: member.verified,
            emailVerifiedAt: member.verified ? new Date() : null,
            isActive: true,
          },
        });

        // Create verification token for unverified team members
        if (!member.verified) {
          try {
            const token =
              await EmailVerificationService.generateVerificationToken({
                userId: memberUser.id,
                email: memberUser.email,
                type: "SIGNUP",
              });
            logger.info(
              `Created signup token for team member: ${memberUser.email}`
            );
            logger.info(
              `🔗 Team verification URL: http://localhost:5173/verify-email?token=${token}`
            );
          } catch (error) {
            logger.error(`Failed to create token for team member:`, error);
          }
        }
      }

      logger.info(`Created ${teamMembers.length} team members`);
    }

    logger.info(`✅ Scenario created: ${scenario.name}`);
    logger.info(`   Plan: ${scenario.plan}`);
    logger.info(`   Email Verified: ${scenario.emailVerified}`);
    if (scenario.pendingEmail) {
      logger.info(`   Pending Email: ${scenario.pendingEmail}`);
    }
    if (scenario.shouldCreateToken) {
      logger.info(`   Token Type: ${scenario.tokenType}`);
      logger.info(`   Token Expired: ${scenario.tokenExpired || false}`);
    }
    logger.info(`   Description: ${scenario.description}\n`);
  } catch (error) {
    logger.error(`❌ Failed to create scenario ${scenario.name}:`, error);
    throw error;
  }
}

async function seedEmailVerificationTests(): Promise<void> {
  try {
    logger.info("📧 Starting email verification test scenarios...\n");

    for (const scenario of EMAIL_VERIFICATION_SCENARIOS) {
      await createEmailVerificationScenario(scenario);
    }

    logger.info("✅ All email verification scenarios created successfully!");
    logger.info("\n📧 Email Verification Test Summary:");
    logger.info("===================================");

    EMAIL_VERIFICATION_SCENARIOS.forEach((scenario) => {
      logger.info(`\n${scenario.name}:`);
      logger.info(
        `  👤 Email: ${scenario.email} | Password: ${scenario.password}`
      );
      logger.info(`  ✅ Verified: ${scenario.emailVerified}`);
      if (scenario.pendingEmail) {
        logger.info(`  📧 Pending: ${scenario.pendingEmail}`);
      }
      if (scenario.shouldCreateToken) {
        logger.info(
          `  🎫 Token: ${scenario.tokenType} ${scenario.tokenExpired ? "(EXPIRED)" : ""}`
        );
      }
      logger.info(`  📝 ${scenario.description}`);
    });

    logger.info("\n🎯 Email Verification Testing Guide:");
    logger.info("====================================");
    logger.info("1. Unverified Users:");
    logger.info("   - Should see verification banner");
    logger.info("   - Cannot access protected features");
    logger.info("   - Should be able to resend verification");

    logger.info("\n2. Email Change Flow:");
    logger.info("   - Should see pending email banner");
    logger.info("   - Can cancel email change");
    logger.info("   - Can resend verification to new email");

    logger.info("\n3. Expired Tokens:");
    logger.info("   - Should show expired message");
    logger.info("   - Should offer to resend verification");
    logger.info("   - Should generate new token");

    logger.info("\n4. Login Restrictions:");
    logger.info("   - Unverified users should be blocked from login");
    logger.info("   - Clear error messages about verification");
    logger.info("   - Link to verification page");

    logger.info("\n🧪 Test These Flows:");
    logger.info("===================");
    logger.info("1. Try logging in with unverified users");
    logger.info("2. Test verification banner visibility");
    logger.info("3. Test resend verification functionality");
    logger.info("4. Test email change approval flow");
    logger.info("5. Test expired token handling");
    logger.info("6. Test team member verification states");
  } catch (error) {
    logger.error("❌ Failed to seed email verification tests:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  seedEmailVerificationTests();
}

export { seedEmailVerificationTests };
