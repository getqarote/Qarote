#!/usr/bin/env tsx

/**
 * Seed All RabbitMQ Servers
 *
 * This script seeds all RabbitMQ server versions (3.12, 3.13, 4.0, 4.1, 4.2)
 * with test messages to populate queues for field discovery.
 *
 * Usage:
 *   tsx scripts/rabbitmq/seed-all-servers.ts [messageCount] [--consume]
 *
 * Example:
 *   tsx scripts/rabbitmq/seed-all-servers.ts 100
 *   tsx scripts/rabbitmq/seed-all-servers.ts 100 --consume
 */

import { TestMessageGenerator } from "./seed-publish-messages";
import { TestMessageConsumer } from "./seed-consume-messages";

interface ServerConfig {
  name: string;
  version: string;
  host: string;
  amqpPort: number;
  managementPort: number;
  username: string;
  password: string;
}

const SERVER_CONFIGS: ServerConfig[] = [
  {
    name: "RabbitMQ 3.12",
    version: "3.12",
    host: "localhost",
    amqpPort: 5676,
    managementPort: 15676,
    username: "admin",
    password: "admin123",
  },
  {
    name: "RabbitMQ 3.13",
    version: "3.13",
    host: "localhost",
    amqpPort: 5677,
    managementPort: 15677,
    username: "admin",
    password: "admin123",
  },
  {
    name: "RabbitMQ 4.0",
    version: "4.0",
    host: "localhost",
    amqpPort: 5678,
    managementPort: 15678,
    username: "admin",
    password: "admin123",
  },
  {
    name: "RabbitMQ 4.1",
    version: "4.1",
    host: "localhost",
    amqpPort: 5679,
    managementPort: 15679,
    username: "admin",
    password: "admin123",
  },
  {
    name: "RabbitMQ 4.2",
    version: "4.2",
    host: "localhost",
    amqpPort: 5680,
    managementPort: 15680,
    username: "admin",
    password: "admin123",
  },
];

async function seedServer(
  config: ServerConfig,
  messageCount: number,
  shouldConsume: boolean
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🌱 Seeding ${config.name} (${config.host}:${config.amqpPort})`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Publish messages
    const generator = new TestMessageGenerator({
      host: config.host,
      port: config.amqpPort,
      username: config.username,
      password: config.password,
      managementPort: config.managementPort,
    });

    await generator.run(messageCount);

    // Optionally consume some messages to create various queue states
    if (shouldConsume) {
      console.log(`\n📥 Consuming messages from ${config.name}...`);
      const consumer = new TestMessageConsumer({
        host: config.host,
        port: config.amqpPort,
        username: config.username,
        password: config.password,
        managementPort: config.managementPort,
      });

      // Consume about 30% of messages to leave some in queues
      const consumeCount = Math.floor(messageCount * 0.3);
      await consumer.run(consumeCount);
    }

    console.log(`\n✅ Successfully seeded ${config.name}`);
  } catch (error) {
    console.error(`\n❌ Failed to seed ${config.name}:`, error);
    throw error;
  }
}

async function seedAllServers(
  messageCount: number,
  shouldConsume: boolean,
  parallel: boolean = false
): Promise<void> {
  console.log("🚀 Starting Multi-Server Seeding");
  console.log(`📊 Target: ${messageCount} messages per server`);
  console.log(`🔄 Mode: ${parallel ? "Parallel" : "Sequential"}`);
  console.log(
    `📥 Consume: ${shouldConsume ? "Yes (30% of messages)" : "No"}\n`
  );

  if (parallel) {
    // Seed all servers in parallel
    const promises = SERVER_CONFIGS.map((config) =>
      seedServer(config, messageCount, shouldConsume).catch((error) => {
        console.error(`Failed to seed ${config.name}:`, error);
        return null;
      })
    );

    await Promise.all(promises);
  } else {
    // Seed servers sequentially
    for (const config of SERVER_CONFIGS) {
      try {
        await seedServer(config, messageCount, shouldConsume);
        // Small delay between servers
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to seed ${config.name}, continuing...`, error);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ All servers seeded successfully!");
  console.log("=".repeat(60));
  console.log("\n📋 Seeded servers:");
  SERVER_CONFIGS.forEach((config) => {
    console.log(`  ✅ ${config.name} - ${config.host}:${config.amqpPort}`);
  });
  console.log(
    "\n💡 You can now run the discovery script to see fields that appear when queues have messages."
  );
}

async function main() {
  const args = process.argv.slice(2);

  // Parse message count
  const messageCountArg = args.find((arg) => !arg.startsWith("--"));
  const messageCount = messageCountArg ? parseInt(messageCountArg, 10) : 100;

  if (isNaN(messageCount) || messageCount <= 0) {
    console.error(
      "❌ Invalid message count. Please provide a positive number."
    );
    process.exit(1);
  }

  // Parse flags
  const shouldConsume = args.includes("--consume");
  const parallel = args.includes("--parallel");

  console.log("🔧 Configuration:");
  console.log(`  📊 Messages per server: ${messageCount}`);
  console.log(`  📥 Consume messages: ${shouldConsume ? "Yes" : "No"}`);
  console.log(`  🔄 Execution mode: ${parallel ? "Parallel" : "Sequential"}`);
  console.log(`  🖥️  Servers to seed: ${SERVER_CONFIGS.length}\n`);

  try {
    await seedAllServers(messageCount, shouldConsume, parallel);
    console.log("\n🎉 All done! All RabbitMQ servers have been seeded.");
  } catch (error) {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM. Shutting down gracefully...");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Unhandled error:", error);
    process.exit(1);
  });
}

export { seedAllServers, SERVER_CONFIGS };
