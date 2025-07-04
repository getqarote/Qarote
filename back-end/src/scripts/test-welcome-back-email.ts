#!/usr/bin/env tsx

/**
 * Test script for the welcome back email functionality
 * Run with: npx tsx src/scripts/test-welcome-back-email.ts
 */

import { BillingEmailService } from "../services/email/billing-email.service";
import { WorkspacePlan } from "@prisma/client";

async function testWelcomeBackEmail() {
  console.log("🧪 Testing Welcome Back Email...");

  try {
    const result = await BillingEmailService.sendWelcomeBackEmail({
      to: "test@example.com", // Replace with your email for testing
      userName: "John Doe",
      workspaceName: "Test Workspace",
      plan: WorkspacePlan.DEVELOPER,
      billingInterval: "monthly",
      previousCancelDate: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString(), // 30 days ago
    });

    if (result.error) {
      console.error("❌ Failed to send welcome back email:", result.error);
    } else {
      console.log("✅ Welcome back email sent successfully!");
      console.log("📧 Message ID:", result.data?.id);
    }
  } catch (error) {
    console.error("❌ Error testing welcome back email:", error);
  }
}

async function testUpgradeConfirmationEmail() {
  console.log("🧪 Testing Upgrade Confirmation Email...");

  try {
    const result = await BillingEmailService.sendUpgradeConfirmationEmail({
      to: "test@example.com", // Replace with your email for testing
      userName: "Jane Smith",
      workspaceName: "Another Test Workspace",
      plan: WorkspacePlan.STARTUP,
      billingInterval: "yearly",
    });

    if (result.error) {
      console.error(
        "❌ Failed to send upgrade confirmation email:",
        result.error
      );
    } else {
      console.log("✅ Upgrade confirmation email sent successfully!");
      console.log("📧 Message ID:", result.data?.id);
    }
  } catch (error) {
    console.error("❌ Error testing upgrade confirmation email:", error);
  }
}

async function main() {
  console.log("🚀 Starting email tests...\n");

  await testWelcomeBackEmail();
  console.log();

  await testUpgradeConfirmationEmail();
  console.log();

  console.log("🎉 Email tests completed!");
}

if (require.main === module) {
  main().catch(console.error);
}
