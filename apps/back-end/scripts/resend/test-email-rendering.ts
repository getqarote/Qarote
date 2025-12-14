#!/usr/bin/env tsx

/**
 * Email Testing Script
 *
 * Quick script to test email rendering without starting the full preview server.
 * Useful for CI/CD or quick validation.
 */

import React from "react";
import { render } from "@react-email/render";

async function testEmailRendering() {
  console.log("🧪 Testing email template rendering...\n");

  try {
    // Dynamically import templates to avoid TypeScript issues
    const { default: EmailVerification } =
      await import("../../src/services/email/templates/email-verification");
    const { default: WelcomeEmail } =
      await import("../../src/services/email/templates/welcome-email");
    const { default: PasswordResetEmail } =
      await import("../../src/services/email/templates/password-reset-email");

    const tests = [
      {
        name: "Email Verification (Signup)",
        component: EmailVerification,
        props: {
          email: "test@example.com",
          userName: "Test User",
          verificationUrl: "https://app.rabbithq.io/verify?token=test123",
          type: "SIGNUP" as const,
          frontendUrl: "https://app.rabbithq.io",
          expiryHours: 24,
        },
      },
      {
        name: "Welcome Email",
        component: WelcomeEmail,
        props: {
          name: "Test User",
          workspaceName: "Test Workspace",
          plan: "DEVELOPER" as const,
          frontendUrl: "https://app.rabbithq.io",
        },
      },
      {
        name: "Password Reset",
        component: PasswordResetEmail,
        props: {
          userName: "Test User",
          resetUrl: "https://app.rabbithq.io/reset?token=reset123",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          frontendUrl: "https://app.rabbithq.io",
        },
      },
    ];

    for (const test of tests) {
      try {
        // @ts-ignore - Dynamic component creation for testing
        const html = await render(
          React.createElement(test.component as any, test.props)
        );

        if (html && html.length > 100) {
          console.log(`✅ ${test.name}: OK (${html.length} chars)`);
        } else {
          console.log(`❌ ${test.name}: Failed - HTML too short`);
        }
      } catch (error: any) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
      }
    }

    console.log("\n✨ Email rendering test complete!");
  } catch (error: any) {
    console.error("❌ Failed to load email templates:", error.message);
  }
}

// Support both direct execution and module import
if (require.main === module) {
  testEmailRendering().catch(console.error);
}

export { testEmailRendering };
