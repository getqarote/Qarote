#!/usr/bin/env tsx

import amqp from "amqplib";

const SEEDED_QUEUES = [
  "alert-test-queue",
  "no-consumer-queue",
  "unacked-queue",
];

async function main() {
  const amqpUrl = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL;

  if (!amqpUrl) {
    console.error("❌ Please set CLOUDAMQP_URL or RABBITMQ_URL");
    process.exit(1);
  }

  const connection = await amqp.connect(amqpUrl);
  const channel = await connection.createChannel();

  console.log("✅ Connected to RabbitMQ");

  for (const queueName of SEEDED_QUEUES) {
    try {
      await channel.deleteQueue(queueName, { ifUnused: false, ifEmpty: false });
      console.log(`🧹 Deleted queue: ${queueName}`);
    } catch (error) {
      // Ignore "not found" errors; treat as already cleared.
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("NOT_FOUND") || message.includes("404")) {
        console.log(`ℹ️  Queue not found (already cleared): ${queueName}`);
        continue;
      }

      console.error(`❌ Failed to delete queue ${queueName}:`, error);
      throw error;
    }
  }

  await channel.close();
  await connection.close();
  console.log("✅ Disconnected");
}

main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
