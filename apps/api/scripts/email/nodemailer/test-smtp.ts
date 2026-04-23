#!/usr/bin/env node

/**
 * SMTP Testing Script
 * Tests SMTP configuration with both Ethereal (fake) and real SMTP servers
 *
 * Usage (from project root):
 *   pnpm test:smtp                              - Test real SMTP from environment
 *   pnpm test:smtp --send admin@example.com     - Send test email via real SMTP
 *   pnpm test:smtp --template                   - Send with React Email template
 *   pnpm test:smtp:ethereal                     - Test with Ethereal fake SMTP
 *   pnpm test:smtp:ethereal --send any@test.com - Send via Ethereal and get preview URL
 *   pnpm test:smtp:ethereal --send test@example.com --template - Send with React Email template
 */

import nodemailer from "nodemailer";
import { render } from "@react-email/render";

import { emailConfig } from "../../../src/config/index.js";

async function testSMTP() {
  const args = process.argv.slice(2);
  const useEthereal = args.includes("--ethereal");
  const sendTest = args.includes("--send");
  const useTemplate = args.includes("--template");
  const recipient = sendTest ? args[args.indexOf("--send") + 1] : null;

  console.log("\n📧 Qarote SMTP Test");
  console.log("=".repeat(80));

  let config;
  let fromEmail: string;

  if (useEthereal) {
    console.log("🔧 Using Ethereal Email (test mode)...\n");

    try {
      // Generate Ethereal test account
      const testAccount = await nodemailer.createTestAccount();

      config = {
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      };

      fromEmail = testAccount.user;

      console.log("✅ Ethereal test account created");
      console.log(`   Email: ${testAccount.user}`);
      console.log(`   Host: ${testAccount.smtp.host}:${testAccount.smtp.port}`);
      console.log(
        `   Web: https://ethereal.email/login?user=${encodeURIComponent(testAccount.user)}&pass=${encodeURIComponent(testAccount.pass)}\n`
      );
    } catch (error) {
      console.error("❌ Failed to create Ethereal test account:", error);
      process.exit(1);
    }
  } else {
    console.log("🔧 Using real SMTP from environment variables...\n");

    if (!emailConfig.smtp.host) {
      console.error("❌ SMTP_HOST is not configured in environment variables");
      console.error(
        "\nPlease set the following environment variables in your .env file:"
      );
      console.error("  - SMTP_HOST");
      console.error("  - SMTP_PORT (default: 587)");
      console.error("  - SMTP_USER (optional)");
      console.error("  - SMTP_PASS (optional)");
      console.error("\nOr use --ethereal flag to test with fake SMTP");
      process.exit(1);
    }

    config = {
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port || 587,
      secure: (emailConfig.smtp.port || 587) === 465,
      auth: emailConfig.smtp.user
        ? {
            user: emailConfig.smtp.user,
            pass: emailConfig.smtp.pass,
          }
        : undefined,
    };

    fromEmail = emailConfig.fromEmail;

    console.log("✅ SMTP configuration loaded");
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Secure: ${config.secure ? "Yes (TLS)" : "No (STARTTLS)"}`);
    console.log(`   Auth: ${config.auth ? "Yes" : "No"}`);
    console.log(`   From: ${fromEmail}\n`);
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport(config);

    // Test 1: Verify connection
    console.log("⏳ Testing SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection successful!\n");

    // Test 2: Send test email (optional)
    if (sendTest) {
      if (!recipient) {
        console.error(
          "❌ Please provide an email address: --send your@email.com"
        );
        process.exit(1);
      }

      console.log(`⏳ Sending test email to ${recipient}...`);

      let emailHtml: string;
      let subject: string;

      if (useTemplate) {
        console.log("📧 Using React Email template (WelcomeEmail)...");
        // Import and render the React Email template
        const { default: WelcomeEmail } =
          await import("../../../src/services/email/templates/welcome-email.js");
        const template = WelcomeEmail({
          name: "Test User",
          workspaceName: "SMTP Test Workspace",
          plan: "DEVELOPER",
          frontendUrl: emailConfig.frontendUrl,
        });
        emailHtml = await render(template);
        subject = "Welcome to Qarote - SMTP Test";
      } else {
        subject = "Qarote SMTP Test";
        emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #4CAF50;">✅ SMTP Test Successful</h1>
            <p>If you receive this email, your SMTP configuration is working correctly!</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">
              This is a test email sent from Qarote SMTP testing script.
            </p>
          </div>
        `;
      }

      const info = await transporter.sendMail({
        from: fromEmail,
        to: recipient,
        subject,
        text: useTemplate
          ? "Welcome to Qarote! This is a test email using the production React Email template."
          : "If you receive this email, your SMTP configuration is working correctly!",
        html: emailHtml,
      });

      console.log("✅ Test email sent successfully!");
      console.log(`   Message ID: ${info.messageId}`);

      // Show Ethereal preview URL
      if (useEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info as any);
        if (previewUrl) {
          console.log(`\n🌐 Preview email in browser:\n   ${previewUrl}\n`);
        }
      }
    } else {
      console.log(
        "ℹ️  Connection verified. Use --send <email> to send a test email.\n"
      );
    }

    console.log("=".repeat(80));
    console.log("✨ SMTP test completed successfully!\n");
  } catch (error) {
    console.error("\n❌ SMTP test failed:");

    if (error instanceof Error) {
      console.error(`   ${error.message}`);

      // Provide helpful error messages
      if (error.message.includes("ECONNREFUSED")) {
        console.error(
          "\n💡 Connection refused. Check that SMTP_HOST and SMTP_PORT are correct."
        );
      } else if (error.message.includes("Invalid login")) {
        console.error(
          "\n💡 Authentication failed. Check your SMTP_USER and SMTP_PASS credentials."
        );
      } else if (error.message.includes("ENOTFOUND")) {
        console.error("\n💡 Host not found. Check your SMTP_HOST setting.");
      }
    } else {
      console.error(`   ${String(error)}`);
    }

    console.error("\n=".repeat(80));
    process.exit(1);
  }
}

testSMTP();
