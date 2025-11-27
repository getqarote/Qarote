#!/usr/bin/env tsx

/**
 * Alert Generator Script
 *
 * Generates real alerts on RabbitMQ servers by creating conditions that
 * trigger alert thresholds (queue backlogs, no consumers, unacked messages, etc.)
 *
 * Usage:
 *   CLOUDAMQP_URL="amqps://user:pass@host/vhost" tsx scripts/rabbitmq/generate-alerts.ts
 *   tsx scripts/rabbitmq/generate-alerts.ts queue-backlog 15000
 *   tsx scripts/rabbitmq/generate-alerts.ts no-consumer 500
 */

import amqp from "amqplib";

class AlertGenerator {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  async connect(url: string): Promise<void> {
    try {
      this.connection = await amqp.connect(url);
      if (!this.connection) {
        throw new Error("Connection to RabbitMQ failed: connection is null");
      }
      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error("Connection to RabbitMQ failed: channel is null");
      }
      console.log("✅ Connected to RabbitMQ");
    } catch (error) {
      console.error("❌ Failed to connect:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log("✅ Disconnected");
    } catch (error) {
      console.error("❌ Error disconnecting:", error);
    }
  }

  /**
   * Generate queue backlog alert (Warning: 10,000+, Critical: 50,000+)
   */
  async generateQueueBacklogAlert(
    queueName: string,
    messageCount: number = 15000
  ): Promise<void> {
    if (!this.channel) throw new Error("Not connected");

    console.log(`\n🔵 Generating queue backlog alert...`);
    console.log(`   Queue: ${queueName}`);
    console.log(`   Messages: ${messageCount}`);

    await this.channel.assertQueue(queueName, { durable: true });

    for (let i = 0; i < messageCount; i++) {
      const published = this.channel.sendToQueue(
        queueName,
        Buffer.from(`Alert test message ${i}`),
        { persistent: true }
      );

      if (!published) {
        console.warn(`⚠️  Failed to publish message ${i + 1}`);
      }

      if ((i + 1) % 2000 === 0) {
        console.log(`   Published ${i + 1}/${messageCount} messages...`);
      }
    }

    const queueInfo = await this.channel.checkQueue(queueName);
    console.log(`✅ Queue now has ${queueInfo.messageCount} messages`);

    if (messageCount >= 50000) {
      console.log(`🚨 CRITICAL alert should trigger (threshold: 50,000)`);
    } else if (messageCount >= 10000) {
      console.log(`⚠️  WARNING alert should trigger (threshold: 10,000)`);
    }
  }

  /**
   * Generate "queue without consumers" alert
   */
  async generateNoConsumerAlert(
    queueName: string,
    messageCount: number = 500
  ): Promise<void> {
    if (!this.channel) throw new Error("Not connected");

    console.log(`\n🔵 Generating 'no consumers' alert...`);
    console.log(`   Queue: ${queueName}`);
    console.log(`   Messages: ${messageCount} (no consumers)`);

    await this.channel.assertQueue(queueName, { durable: true });

    for (let i = 0; i < messageCount; i++) {
      this.channel.sendToQueue(queueName, Buffer.from(`Message ${i}`), {
        persistent: true,
      });
    }

    const queueInfo = await this.channel.checkQueue(queueName);
    console.log(
      `✅ Published ${queueInfo.messageCount} messages with no consumers`
    );
    console.log(`⚠️  WARNING alert should trigger: "Queue Without Consumers"`);
  }

  /**
   * Generate high unacked messages alert (Warning: 1,000+, Critical: 5,000+)
   * Note: This requires keeping the connection open to consume messages
   */
  async generateUnackedMessagesAlert(
    queueName: string,
    messageCount: number = 2000
  ): Promise<void> {
    if (!this.channel) throw new Error("Not connected");

    console.log(`\n🔵 Generating unacked messages alert...`);
    console.log(`   Queue: ${queueName}`);
    console.log(
      `   Messages: ${messageCount} (will be consumed but not acked)`
    );

    await this.channel.assertQueue(queueName, { durable: true });

    // Publish messages
    for (let i = 0; i < messageCount; i++) {
      this.channel.sendToQueue(queueName, Buffer.from(`Unacked message ${i}`), {
        persistent: true,
      });
    }

    console.log(`✅ Published ${messageCount} messages`);
    console.log(
      `📥 Starting consumer (messages will accumulate as unacked)...`
    );
    console.log(`   Press CTRL+C to stop`);

    // Consume but don't acknowledge
    await this.channel.consume(
      queueName,
      (msg) => {
        if (msg) {
          // Receive but don't acknowledge - messages stay unacked
          // Just log every 100th message to avoid spam
          const messageNum = parseInt(
            msg.content.toString().split(" ")[2] || "0"
          );
          if (messageNum % 100 === 0) {
            console.log(
              `   Received ${messageNum} messages (not acknowledging)...`
            );
          }
        }
      },
      { noAck: false } // Important: don't auto-acknowledge
    );

    console.log(
      `⚠️  WARNING/CRITICAL alert should trigger for unacked messages`
    );
    console.log(`   Keeping connection open to maintain unacked messages...`);
  }
}

async function main() {
  // Get CloudAMQP URL from environment or use default
  // Format: amqps://snbebhdp:PASSWORD@healthy-pink-warthog.rmq2.cloudamqp.com/snbebhdp
  const amqpUrl =
    process.env.CLOUDAMQP_URL ||
    process.env.RABBITMQ_URL ||
    "amqps://snbebhdp:YOUR_PASSWORD@healthy-pink-warthog.rmq2.cloudamqp.com/snbebhdp";

  if (amqpUrl.includes("YOUR_PASSWORD")) {
    console.error(
      "❌ Please set CLOUDAMQP_URL or RABBITMQ_URL environment variable"
    );
    console.log("\nUsage:");
    console.log(
      "  CLOUDAMQP_URL=amqps://user:pass@host/vhost tsx scripts/rabbitmq/generate-alerts.ts"
    );
    console.log("\nOr:");
    console.log("  tsx scripts/rabbitmq/generate-alerts.ts <type> <count>");
    console.log("\nTypes:");
    console.log(
      "  queue-backlog <count>  - Generate queue backlog alert (default: 15000)"
    );
    console.log(
      "  no-consumer <count>    - Generate no consumer alert (default: 500)"
    );
    console.log(
      "  unacked <count>        - Generate unacked messages alert (default: 2000)"
    );
    console.log("\nExample:");
    console.log(
      "  CLOUDAMQP_URL=amqps://user:pass@host/vhost tsx scripts/rabbitmq/generate-alerts.ts queue-backlog 15000"
    );
    process.exit(1);
  }

  const generator = new AlertGenerator();
  const args = process.argv.slice(2);
  const alertType = args[0] || "queue-backlog";
  const count = args[1] ? parseInt(args[1]) : undefined;

  try {
    await generator.connect(amqpUrl);

    switch (alertType) {
      case "queue-backlog": {
        const messageCount = count || 15000;
        await generator.generateQueueBacklogAlert(
          "alert-test-queue",
          messageCount
        );
        break;
      }
      case "no-consumer": {
        const messageCount = count || 500;
        await generator.generateNoConsumerAlert(
          "no-consumer-queue",
          messageCount
        );
        break;
      }
      case "unacked": {
        const messageCount = count || 2000;
        await generator.generateUnackedMessagesAlert(
          "unacked-queue",
          messageCount
        );
        // Keep running for unacked messages
        await new Promise(() => {}); // Keep connection open
        break;
      }
      default:
        console.error(`❌ Unknown alert type: ${alertType}`);
        console.log("\nAvailable types:");
        console.log("  queue-backlog - Generate queue backlog alert");
        console.log("  no-consumer   - Generate no consumer alert");
        console.log("  unacked       - Generate unacked messages alert");
        process.exit(1);
    }

    if (alertType !== "unacked") {
      console.log("\n" + "=".repeat(60));
      console.log("✨ Alerts generated!");
      console.log("\n📋 Next steps:");
      console.log("   1. Visit your Alerts page in RabbitHQ");
      console.log("   2. Check webhook.site (if configured)");
      console.log("   3. Check Slack channel (if configured)");
      console.log("   4. Check email inbox (if configured)");
    }
  } catch (error) {
    console.error("\n💥 Error:", error);
    process.exit(1);
  } finally {
    if (alertType !== "unacked") {
      await generator.disconnect();
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Unhandled error:", error);
    process.exit(1);
  });
}

export { AlertGenerator };
