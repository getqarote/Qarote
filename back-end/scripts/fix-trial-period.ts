#!/usr/bin/env tsx

import { execSync } from "child_process";
import { config } from "dotenv";

// Load environment variables
config();

interface PriceInfo {
  planName: string;
  interval: "month" | "year";
  amount: number;
  description: string;
}

const CLEAN_PRICES: PriceInfo[] = [
  {
    planName: "Developer",
    interval: "month",
    amount: 1000, // $10.00
    description: "Ideal for individual developers and small projects",
  },
  {
    planName: "Developer",
    interval: "year",
    amount: 10000, // $100.00
    description: "Ideal for individual developers and small projects",
  },
  {
    planName: "Enterprise",
    interval: "month",
    amount: 5000, // $50.00
    description: "Enterprise-grade features for mission-critical systems",
  },
  {
    planName: "Enterprise",
    interval: "year",
    amount: 50000, // $500.00
    description: "Enterprise-grade features for mission-critical systems",
  },
];

function executeStripeCommand(command: string): string {
  try {
    console.log(`Executing: ${command}`);
    const result = execSync(command, { encoding: "utf-8" });
    console.log(result);
    return result;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

function extractId(cliOutput: string): string {
  try {
    const parsed = JSON.parse(cliOutput);
    if (parsed.id) return parsed.id;
  } catch {
    // If not JSON, try to find ID in text output
    const idMatch = cliOutput.match(/id:\s*([a-zA-Z0-9_]+)/);
    if (idMatch) return idMatch[1];

    const quotedIdMatch = cliOutput.match(/"id":\s*"([^"]+)"/);
    if (quotedIdMatch) return quotedIdMatch[1];

    const prodMatch = cliOutput.match(/(prod_[a-zA-Z0-9]+)/);
    if (prodMatch) return prodMatch[1];

    const priceMatch = cliOutput.match(/(price_[a-zA-Z0-9]+)/);
    if (priceMatch) return priceMatch[1];
  }

  console.error("Could not extract ID from output:");
  console.error(cliOutput.substring(0, 200));
  throw new Error("Could not extract ID from Stripe CLI output");
}

function createCleanPrices() {
  console.log("🧹 Creating clean prices without trial periods...\n");

  const createdPrices: Array<{
    planName: string;
    interval: string;
    priceId: string;
  }> = [];

  // First, get existing products
  console.log("📦 Finding existing products...");
  const productsResult = executeStripeCommand(
    "stripe products list --limit=10"
  );
  const products = JSON.parse(productsResult);

  const developerProduct = products.data.find(
    (p: any) => p.name === "Developer Plan" && p.active
  );
  const enterpriseProduct = products.data.find(
    (p: any) => p.name === "Enterprise Plan" && p.active
  );

  if (!developerProduct || !enterpriseProduct) {
    console.error("❌ Could not find active Developer and Enterprise products");
    console.log("💡 Run 'npm run stripe:create' first to create products");
    process.exit(1);
  }

  console.log(`✅ Found Developer Product: ${developerProduct.id}`);
  console.log(`✅ Found Enterprise Product: ${enterpriseProduct.id}`);

  for (const price of CLEAN_PRICES) {
    const productId =
      price.planName === "Developer"
        ? developerProduct.id
        : enterpriseProduct.id;

    console.log(`\n🔨 Creating ${price.planName} ${price.interval}ly price...`);

    // Create price with explicit no trial period
    const command = `stripe prices create \\
      --unit-amount=${price.amount} \\
      --currency=usd \\
      --recurring.interval=${price.interval} \\
      --product=${productId}`;

    const result = executeStripeCommand(command);
    const priceId = extractId(result);

    createdPrices.push({
      planName: price.planName,
      interval: price.interval,
      priceId: priceId,
    });

    console.log(
      `✅ Created: ${priceId} ($${price.amount / 100}/${price.interval})`
    );
  }

  // Display environment variables to update
  console.log("\n📝 Update your .env file with these NEW price IDs:");
  console.log("=".repeat(70));

  createdPrices.forEach(({ planName, interval, priceId }) => {
    const envVarName = `STRIPE_${planName.toUpperCase()}_${interval.toUpperCase()}LY_PRICE_ID`;
    console.log(`${envVarName}=${priceId}`);
  });

  console.log("=".repeat(70));
  console.log("\n🔄 Next steps:");
  console.log("1. Update your .env file with the new price IDs above");
  console.log("2. Restart your backend server");
  console.log("3. Test the checkout flow - no more trial period!");
  console.log("4. Optionally deactivate old prices to avoid confusion");
}

function deactivateOldPrices() {
  console.log("🚫 Deactivating old prices...\n");

  const oldPriceIds = [
    process.env.STRIPE_DEVELOPER_MONTHLY_PRICE_ID,
    process.env.STRIPE_DEVELOPER_YEARLY_PRICE_ID,
    process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  ].filter(Boolean);

  for (const priceId of oldPriceIds) {
    try {
      console.log(`Deactivating: ${priceId}`);
      executeStripeCommand(`stripe prices update ${priceId} --active=false`);
      console.log(`✅ Deactivated: ${priceId}`);
    } catch (error) {
      console.log(`⚠️  Could not deactivate: ${priceId}`);
    }
  }
}

// Main execution
const command = process.argv[2];

switch (command) {
  case "create":
    createCleanPrices();
    break;
  case "deactivate":
    deactivateOldPrices();
    break;
  case "all":
    createCleanPrices();
    console.log("\n" + "=".repeat(50));
    deactivateOldPrices();
    break;
  default:
    console.log(`
🧹 Fix Trial Period Script

Usage: npm run stripe:fix-trial <command>

Commands:
  create      Create new prices without trial periods
  deactivate  Deactivate old prices  
  all         Create new prices and deactivate old ones

Examples:
  npm run stripe:fix-trial create
  npm run stripe:fix-trial all
`);
    break;
}
