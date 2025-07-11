#!/usr/bin/env tsx

import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const PLAN_CONFIG = {
  DEVELOPER: {
    name: "Developer Plan",
    description: "Perfect for individual developers and small teams",
    monthly: 4900, // $49.00
    yearly: 39000, // $390.00 (20% discount)
  },
  STARTUP: {
    name: "Startup Plan",
    description: "Ideal for growing startups and medium teams",
    monthly: 9900, // $99.00
    yearly: 79200, // $792.00 (20% discount)
  },
  BUSINESS: {
    name: "Business Plan",
    description: "Enterprise-grade solution for large organizations",
    monthly: 24900, // $249.00
    yearly: 199200, // $1992.00 (20% discount)
  },
};

class StripeSetup {
  private envPath = join(process.cwd(), ".env");

  async run() {
    const command = process.argv[2] || "create";

    console.log("🚀 RabbitHQ - Stripe Setup\n");

    try {
      switch (command) {
        case "create":
          await this.createAll();
          break;
        case "list":
          await this.listProducts();
          break;
        case "clean":
          await this.cleanUp();
          break;
        case "verify":
          await this.verify();
          break;
        case "webhook":
          this.startWebhook();
          break;
        case "test":
          await this.testStripeCli();
          break;
        case "mode":
          this.checkMode();
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error(
        "❌ Error:",
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  }

  private checkStripeCli() {
    try {
      const version = execSync("stripe --version", { encoding: "utf8" });
      console.log(`✅ Stripe CLI found: ${version.trim()}`);
    } catch {
      console.log(
        "❌ Stripe CLI not found. Install with: brew install stripe/stripe-cli/stripe"
      );
      process.exit(1);
    }
  }

  private checkLogin() {
    try {
      const result = execSync("stripe config --list", { encoding: "utf8" });
      if (result.includes("test_mode_api_key")) {
        console.log("✅ Logged into Stripe");
        return true;
      }
    } catch {
      // Not logged in
    }

    console.log("❌ Not logged into Stripe. Please run:");
    console.log("   stripe login");
    console.log("\nThen run this script again.");
    process.exit(1);
  }

  private checkMode() {
    try {
      const config = execSync("stripe config --list", { encoding: "utf8" });

      if (config.includes("test_mode_api_key")) {
        console.log("🧪 Currently in TEST mode");
        console.log("   - Safe for development");
        console.log("   - Use test cards (4242 4242 4242 4242)");
        console.log("   - No real money charged");
        return "test";
      } else if (config.includes("live_mode_api_key")) {
        console.log("🚀 Currently in LIVE mode");
        console.log("   - ⚠️  REAL MONEY WILL BE CHARGED");
        console.log("   - Use real payment methods");
        console.log("   - Production environment");
        return "live";
      } else {
        console.log("❓ Could not determine mode");
        console.log("   - Please run 'stripe login' first");
        return "unknown";
      }
    } catch (error) {
      console.log("❓ Could not determine mode");
      console.log("   - Stripe CLI may not be configured");
      return "error";
    }
  }

  private async createAll() {
    console.log("📦 Creating Stripe products and prices...\n");

    this.checkStripeCli();
    this.checkLogin();
    this.checkMode();
    this.checkMode();

    const envUpdates: Record<string, string> = {};

    for (const [planKey, config] of Object.entries(PLAN_CONFIG)) {
      console.log(`\n🏷️  Creating ${config.name}...`);

      try {
        // Create product (without metadata - use JSON approach instead)
        console.log(`  🔨 Creating product...`);
        const productResult = execSync(
          `stripe products create --name "${config.name}" --description "${config.description}"`,
          { encoding: "utf8" }
        );

        const productId = this.extractId(productResult);
        console.log(`  ✅ Product: ${productId}`);

        // Create monthly price (using correct recurring syntax)
        console.log(`  🔨 Creating monthly price...`);
        const monthlyResult = execSync(
          `stripe prices create --unit-amount ${config.monthly} --currency usd --recurring.interval month --product ${productId}`,
          { encoding: "utf8" }
        );

        const monthlyPriceId = this.extractId(monthlyResult);
        console.log(
          `  💰 Monthly: ${monthlyPriceId} ($${config.monthly / 100})`
        );

        // Create yearly price (using correct recurring syntax)
        console.log(`  🔨 Creating yearly price...`);
        const yearlyResult = execSync(
          `stripe prices create --unit-amount ${config.yearly} --currency usd --recurring.interval year --product ${productId}`,
          { encoding: "utf8" }
        );

        const yearlyPriceId = this.extractId(yearlyResult);
        console.log(`  💰 Yearly: ${yearlyPriceId} ($${config.yearly / 100})`);

        // Store for .env
        envUpdates[`STRIPE_${planKey}_MONTHLY_PRICE_ID`] = monthlyPriceId;
        envUpdates[`STRIPE_${planKey}_YEARLY_PRICE_ID`] = yearlyPriceId;
      } catch (error) {
        console.error(`  ❌ Failed to create ${config.name}:`);

        if (error instanceof Error) {
          console.error(`     Message: ${error.message}`);

          // Show CLI output if available
          const execError = error as any;
          if (execError.stdout) {
            console.error(`     CLI Output: ${execError.stdout}`);
          }
          if (execError.stderr) {
            console.error(`     CLI Error: ${execError.stderr}`);
          }
        }

        console.log(`  💡 You can try creating this manually:`);
        console.log(`     stripe products create --name "${config.name}"`);
        console.log(`     Then create prices for that product`);
      }
    }

    // Update .env file only if we have updates
    if (Object.keys(envUpdates).length > 0) {
      this.updateEnvFile(envUpdates);
      console.log("\n🎉 Setup completed!");
    } else {
      console.log("\n❌ No products were created successfully.");
      console.log("💡 Try running these commands manually to debug:");
      console.log('   stripe products create --name "Test Product"');
      console.log("   stripe prices create --help");
    }

    console.log("\n📋 Next steps:");
    console.log("1. Restart your development server");
    console.log("2. Test the payment flow");
    console.log("3. Set up webhooks with: npm run stripe:webhook");
  }

  private async listProducts() {
    this.checkStripeCli();
    this.checkLogin();

    console.log("📋 Current Stripe products:\n");

    try {
      const result = execSync("stripe products list --limit 20", {
        encoding: "utf8",
      });
      console.log(result);

      console.log("\n💰 Current prices:");
      const pricesResult = execSync("stripe prices list --limit 20", {
        encoding: "utf8",
      });
      console.log(pricesResult);
    } catch (error) {
      console.error("Failed to list products:", error);
    }
  }

  private async cleanUp() {
    this.checkStripeCli();
    this.checkLogin();

    console.log("🧹 Cleaning up RabbitHQ test products...\n");

    try {
      // List products with metadata
      const result = execSync("stripe products list --limit 100", {
        encoding: "utf8",
      });
      const products = JSON.parse(result);

      if (products.data) {
        const testProducts = products.data.filter(
          (p: any) =>
            p.metadata?.created_by === "rabbit_hq" ||
            p.name?.includes("Developer Plan") ||
            p.name?.includes("Startup Plan") ||
            p.name?.includes("Business Plan")
        );

        if (testProducts.length === 0) {
          console.log("No test products found to clean up.");
          return;
        }

        console.log(`Found ${testProducts.length} products to clean up:`);

        for (const product of testProducts) {
          console.log(`🗑️  Archiving: ${product.name} (${product.id})`);

          try {
            execSync(`stripe products update ${product.id} --active false`, {
              stdio: "ignore",
            });
            console.log(`  ✅ Archived ${product.id}`);
          } catch (error) {
            console.log(`  ❌ Failed to archive ${product.id}`);
          }
        }
      }

      console.log("\n✅ Cleanup completed!");
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }

  private async verify() {
    console.log("🔍 Verifying Stripe configuration...\n");

    // Check CLI and login
    this.checkStripeCli();
    this.checkLogin();

    // Check environment variables
    const requiredVars = [
      "STRIPE_SECRET_KEY",
      "STRIPE_DEVELOPER_MONTHLY_PRICE_ID",
      "STRIPE_DEVELOPER_YEARLY_PRICE_ID",
      "STRIPE_STARTUP_MONTHLY_PRICE_ID",
      "STRIPE_STARTUP_YEARLY_PRICE_ID",
      "STRIPE_BUSINESS_MONTHLY_PRICE_ID",
      "STRIPE_BUSINESS_YEARLY_PRICE_ID",
    ];

    // Load .env if it exists
    if (existsSync(this.envPath)) {
      const envContent = readFileSync(this.envPath, "utf8");
      const envLines = envContent.split("\n");

      for (const line of envLines) {
        if (line.includes("=") && !line.startsWith("#")) {
          const [key, ...valueParts] = line.split("=");
          if (key && valueParts.length > 0) {
            const value = valueParts.join("=").trim();
            process.env[key.trim()] = value;
          }
        }
      }
    }

    let allValid = true;

    console.log("📋 Environment variables:");
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);

        // Verify price IDs exist in Stripe
        if (varName.includes("PRICE_ID")) {
          try {
            execSync(`stripe prices retrieve ${value}`, { stdio: "ignore" });
            console.log(`   ✅ Price exists in Stripe`);
          } catch {
            console.log(`   ❌ Price not found in Stripe`);
            allValid = false;
          }
        }
      } else {
        console.log(`❌ ${varName}: Not set`);
        allValid = false;
      }
    }

    console.log(
      `\n${allValid ? "✅" : "❌"} Configuration ${allValid ? "valid" : "invalid"}`
    );

    if (!allValid) {
      console.log(
        "\n💡 Run 'npm run setup-stripe create' to fix missing configuration"
      );
    }
  }

  private startWebhook() {
    console.log("🔗 Starting webhook forwarding...\n");
    console.log("This will forward Stripe webhooks to your local server.");
    console.log("Keep this terminal open while developing.\n");
    console.log(
      "Copy the webhook signing secret and add it to your .env file:"
    );
    console.log("STRIPE_WEBHOOK_SECRET=whsec_xxxxx\n");

    try {
      execSync(
        "stripe listen --forward-to localhost:3000/api/payments/webhook",
        { stdio: "inherit" }
      );
    } catch (error) {
      console.error("Webhook forwarding failed:", error);
    }
  }

  private extractId(cliOutput: string): string {
    // Try different JSON parsing approaches
    try {
      const parsed = JSON.parse(cliOutput);
      if (parsed.id) return parsed.id;
    } catch {
      // If not JSON, try to find ID in text output
      const idMatch = cliOutput.match(/id:\s*([a-zA-Z0-9_]+)/);
      if (idMatch) return idMatch[1];

      // Try another pattern for ID extraction
      const quotedIdMatch = cliOutput.match(/"id":\s*"([^"]+)"/);
      if (quotedIdMatch) return quotedIdMatch[1];

      // Look for prod_ or price_ patterns
      const prodMatch = cliOutput.match(/(prod_[a-zA-Z0-9]+)/);
      if (prodMatch) return prodMatch[1];

      const priceMatch = cliOutput.match(/(price_[a-zA-Z0-9]+)/);
      if (priceMatch) return priceMatch[1];
    }

    console.error("  ⚠️  Could not extract ID from output:");
    console.error("     " + cliOutput.substring(0, 200));
    throw new Error("Could not extract ID from Stripe CLI output");
  }

  private updateEnvFile(updates: Record<string, string>) {
    console.log("\n📝 Updating .env file...");

    let envContent = existsSync(this.envPath)
      ? readFileSync(this.envPath, "utf8")
      : "";

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      const newLine = `${key}=${value}`;

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent += envContent.length > 0 ? `\n${newLine}` : newLine;
      }
    }

    writeFileSync(this.envPath, envContent.trim() + "\n");

    console.log(
      `✅ Updated ${Object.keys(updates).length} environment variables`
    );

    // Show what was updated
    console.log("\n📋 Added to .env:");
    for (const [key, value] of Object.entries(updates)) {
      console.log(`  ${key}=${value}`);
    }
  }

  private showHelp() {
    console.log(`
🎯 Stripe Setup for RabbitHQ

Usage: npm run setup-stripe [command]

Commands:
  create    Create all products and prices (default)
  list      List existing products and prices
  clean     Archive test products
  verify    Verify current configuration
  webhook   Start webhook forwarding
  test      Test Stripe CLI commands
  mode      Check current mode (test/live)
  help      Show this help

Examples:
  npm run setup-stripe create    # Create everything
  npm run setup-stripe mode      # Check current mode
  npm run setup-stripe test      # Test CLI commands first
  npm run setup-stripe list      # See what exists
  npm run setup-stripe webhook   # Start webhook forwarding

Prerequisites:
  - Stripe CLI installed (✅ you have this)
  - Run 'stripe login' (test) or 'stripe login --live' (production)
    `);
  }

  private async testStripeCli() {
    console.log("🧪 Testing Stripe CLI commands...\n");

    this.checkStripeCli();
    this.checkLogin();

    try {
      console.log("1. Testing products list...");
      const products = execSync("stripe products list --limit 1", {
        encoding: "utf8",
      });
      console.log("✅ Products list works");

      console.log("2. Testing help command...");
      const help = execSync("stripe products create --help", {
        encoding: "utf8",
      });
      console.log("✅ Help command works");

      console.log("3. Testing simple product creation...");
      const testProduct = execSync(
        'stripe products create --name "Test Product" --description "Test description"',
        { encoding: "utf8" }
      );
      console.log("✅ Simple product creation works");
      console.log("📝 Output:", testProduct);

      const testId = this.extractId(testProduct);
      console.log("✅ ID extraction works:", testId);

      console.log("4. Testing price creation...");
      const testPrice = execSync(
        `stripe prices create --unit-amount 999 --currency usd --recurring.interval month --product ${testId}`,
        { encoding: "utf8" }
      );
      console.log("✅ Price creation works");
      console.log("📝 Output:", testPrice);

      const priceId = this.extractId(testPrice);
      console.log("✅ Price ID extraction works:", priceId);

      console.log("\n🎉 All tests passed! The CLI is working correctly.");
    } catch (error) {
      console.error("❌ Test failed:", error);
      if (error instanceof Error) {
        const execError = error as any;
        if (execError.stdout) {
          console.error("CLI Output:", execError.stdout);
        }
        if (execError.stderr) {
          console.error("CLI Error:", execError.stderr);
        }
      }
    }
  }
}

// Run the script
if (require.main === module) {
  new StripeSetup().run();
}
