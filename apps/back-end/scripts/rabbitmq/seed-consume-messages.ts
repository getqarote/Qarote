import { setTimeout as setTimeoutPromise } from "node:timers/promises";

import amqp from "amqplib";

interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  managementPort: number;
}

class TestMessageConsumer {
  private config: RabbitMQConfig;
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private isConsuming: boolean = false;
  private consumedCount: number = 0;
  private targetCount: number = 0;
  private consumerTags: string[] = [];

  constructor(config: RabbitMQConfig) {
    this.config = config;
  }

  private getConnectionUrl(): string {
    // Use AMQPS URL format for encrypted connections (port 5671)
    if (this.config.port === 5671) {
      return `amqps://${this.config.username}:${encodeURIComponent(this.config.password)}@${this.config.host}:${this.config.port}/%2F`;
    }
    // Use AMQP URL format for unencrypted connections (port 5672)
    return `amqp://${this.config.username}:${encodeURIComponent(this.config.password)}@${this.config.host}:${this.config.port}/%2F`;
  }

  private async waitForRabbitMQ(): Promise<void> {
    console.log("Waiting for RabbitMQ to be ready...");
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const connectionUrl = this.getConnectionUrl();
        const connection = await amqp.connect(connectionUrl);
        await connection.close();
        console.log("✅ RabbitMQ is ready!");
        return;
      } catch (error) {
        console.log(
          `⏳ RabbitMQ is not ready yet. Retry ${retries + 1}/${maxRetries}...`
        );
        await setTimeoutPromise(2000);
        retries++;
      }
    }
    throw new Error("❌ RabbitMQ failed to become ready within timeout");
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect({
        hostname: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
      });

      this.channel = await this.connection.createChannel();

      // Set prefetch to control how many messages to process at once
      await this.channel.prefetch(10);

      console.log("✅ Connected to RabbitMQ");
    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      // Cancel all consumers
      if (this.channel && this.consumerTags.length > 0) {
        for (const tag of this.consumerTags) {
          try {
            await this.channel.cancel(tag);
          } catch (error) {
            console.warn(`⚠️  Failed to cancel consumer ${tag}:`, error);
          }
        }
      }

      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("✅ Disconnected from RabbitMQ");
    } catch (error) {
      console.error("❌ Error disconnecting from RabbitMQ:", error);
    }
  }

  private async ensureTestInfrastructure(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    console.log("🔧 Checking test infrastructure...");

    // Check test exchange exists
    try {
      await this.channel.checkExchange("test.messages");
    } catch (error) {
      console.log("📦 Test exchange not found, creating it...");
      await this.channel.assertExchange("test.messages", "direct", {
        durable: true,
      });
    }

    // Check test queues exist
    const testQueues = [
      "email.queue",
      "user.queue",
      "queue.notifications",
      "queue.analytics",
    ];

    for (const queueName of testQueues) {
      try {
        await this.channel.checkQueue(queueName);
      } catch (error) {
        console.log(`📭 Queue ${queueName} not found, creating it...`);
        await this.channel.assertQueue(queueName, {
          durable: true,
          autoDelete: false,
        });
        await this.channel.bindQueue(queueName, "test.messages", queueName);
      }
    }

    console.log(`✅ Test infrastructure is ready`);
  }

  private async getQueueStatsBefore(): Promise<{ [key: string]: number }> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    console.log("\n📊 Queue Statistics (Before Consumption):");

    const testQueues = [
      "email.queue",
      "user.queue",
      "queue.notifications",
      "queue.analytics",
    ];

    const stats: { [key: string]: number } = {};
    let totalMessages = 0;

    for (const queueName of testQueues) {
      try {
        const queueInfo = await this.channel.checkQueue(queueName);
        stats[queueName] = queueInfo.messageCount;
        console.log(`  📬 ${queueName}: ${queueInfo.messageCount} messages`);
        totalMessages += queueInfo.messageCount;
      } catch (error) {
        console.log(`  ❌ ${queueName}: Error checking queue`);
        stats[queueName] = 0;
      }
    }

    console.log(`  📊 Total messages available: ${totalMessages}`);
    return stats;
  }

  private async getQueueStatsAfter(beforeStats: {
    [key: string]: number;
  }): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    console.log("\n📊 Queue Statistics (After Consumption):");

    const testQueues = [
      "email.queue",
      "user.queue",
      "queue.notifications",
      "queue.analytics",
    ];

    let totalMessages = 0;
    let totalConsumed = 0;

    for (const queueName of testQueues) {
      try {
        const queueInfo = await this.channel.checkQueue(queueName);
        const consumed = beforeStats[queueName] - queueInfo.messageCount;
        console.log(
          `  📬 ${queueName}: ${queueInfo.messageCount} messages (consumed: ${consumed})`
        );
        totalMessages += queueInfo.messageCount;
        totalConsumed += consumed;
      } catch (error) {
        console.log(`  ❌ ${queueName}: Error checking queue`);
      }
    }

    console.log(`  📊 Total messages remaining: ${totalMessages}`);
    console.log(`  📊 Total messages consumed: ${totalConsumed}`);
  }

  private async consumeMessages(messageCount: number = 100): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    console.log(
      `🚀 Starting to consume up to ${messageCount} test messages...`
    );

    const testQueues = [
      "email.queue",
      "user.queue",
      "queue.notifications",
      "queue.analytics",
    ];

    this.targetCount = messageCount;
    this.consumedCount = 0;
    this.isConsuming = true;

    const startTime = Date.now();

    // Set up consumers for each queue
    for (const queueName of testQueues) {
      try {
        const consumer = await this.channel.consume(
          queueName,
          (msg) => {
            if (!msg || !this.isConsuming) return;

            try {
              // Parse message content
              const messageContent = JSON.parse(msg.content.toString());

              // Process the message (simulate some work)
              this.processMessage(messageContent, queueName);

              // Acknowledge the message
              this.channel?.ack(msg);

              this.consumedCount++;

              // Log progress
              if (
                this.consumedCount % 10 === 0 ||
                this.consumedCount >= this.targetCount
              ) {
                console.log(
                  `📥 Consumed ${this.consumedCount}/${this.targetCount} messages...`
                );
              }

              // Stop consuming when we reach the target
              if (this.consumedCount >= this.targetCount) {
                this.isConsuming = false;
                this.stopConsumers();
              }
            } catch (error) {
              console.error(
                `❌ Error processing message from ${queueName}:`,
                error
              );
              // Reject the message and don't requeue it
              this.channel?.nack(msg, false, false);
            }
          },
          {
            noAck: false, // We want to manually acknowledge messages
          }
        );

        if (consumer) {
          this.consumerTags.push(consumer.consumerTag);
        }
      } catch (error) {
        console.error(`❌ Error setting up consumer for ${queueName}:`, error);
      }
    }

    console.log(`✅ Set up consumers for ${testQueues.length} queues`);

    // Wait for consumption to complete or timeout
    const maxWaitTime = 60000; // 60 seconds
    const checkInterval = 1000; // 1 second
    let waitTime = 0;

    while (this.isConsuming && waitTime < maxWaitTime) {
      await setTimeoutPromise(checkInterval);
      waitTime += checkInterval;

      // Check if there are no more messages to consume
      if (this.consumedCount > 0 && waitTime % 5000 === 0) {
        const hasMessages = await this.checkForRemainingMessages(testQueues);
        if (!hasMessages) {
          console.log("📭 No more messages available in queues");
          break;
        }
      }
    }

    this.isConsuming = false;
    await this.stopConsumers();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n📊 Message Consumption Summary:`);
    console.log(`✅ Successfully consumed: ${this.consumedCount} messages`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(
      `📈 Rate: ${(this.consumedCount / duration).toFixed(2)} messages/second`
    );
  }

  private async checkForRemainingMessages(queues: string[]): Promise<boolean> {
    if (!this.channel) return false;

    for (const queueName of queues) {
      try {
        const queueInfo = await this.channel.checkQueue(queueName);
        if (queueInfo.messageCount > 0) {
          return true;
        }
      } catch (error) {
        // Ignore errors when checking queues
      }
    }
    return false;
  }

  private async stopConsumers(): Promise<void> {
    if (!this.channel) return;

    for (const tag of this.consumerTags) {
      try {
        await this.channel.cancel(tag);
      } catch (error) {
        console.warn(`⚠️  Failed to cancel consumer ${tag}:`, error);
      }
    }
    this.consumerTags = [];
  }

  private processMessage(message: any, queueName: string): void {
    // Simulate message processing
    const processingTime = Math.random() * 50; // 0-50ms processing time

    // Log interesting messages occasionally
    if (Math.random() < 0.1) {
      // 10% chance
      console.log(
        `🔍 Processing ${message.type} from ${queueName} (ID: ${message.id})`
      );
    }

    // Simulate some processing delay
    const start = Date.now();
    while (Date.now() - start < processingTime) {
      // Busy wait to simulate processing
    }
  }

  public async run(messageCount: number = 100): Promise<void> {
    try {
      console.log("🚀 Starting Test Message Consumer");
      console.log(`📊 Target: up to ${messageCount} messages\n`);

      await this.waitForRabbitMQ();
      await this.connect();
      await this.ensureTestInfrastructure();

      const beforeStats = await this.getQueueStatsBefore();
      await this.consumeMessages(messageCount);
      await this.getQueueStatsAfter(beforeStats);

      console.log("\n✅ Test message consumption completed successfully!");
    } catch (error) {
      console.error("\n❌ Test message consumption failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Main execution
async function main() {
  const config: RabbitMQConfig = {
    host: process.env.RABBITMQ_HOST || "localhost",
    port: parseInt(process.env.RABBITMQ_PORT || "5679"),
    username: process.env.RABBITMQ_USER || "admin",
    password: process.env.RABBITMQ_PASS || "admin123",
    managementPort: parseInt(process.env.RABBITMQ_MANAGEMENT_PORT || "15679"),
  };

  // Get message count from command line argument or default to 100
  const messageCount = process.argv[2] ? parseInt(process.argv[2]) : 100;

  if (isNaN(messageCount) || messageCount <= 0) {
    console.error(
      "❌ Invalid message count. Please provide a positive number."
    );
    process.exit(1);
  }

  console.log("🔧 Configuration:");
  console.log(`  🏠 Host: ${config.host}:${config.port}`);
  console.log(`  👤 User: ${config.username}`);
  console.log(`  🔒 Password: ${config.password}`);
  console.log(`  📊 Management Port: ${config.managementPort}`);
  console.log(`  📊 Messages to consume: up to ${messageCount}\n`);

  const consumer = new TestMessageConsumer(config);

  try {
    await consumer.run(messageCount);
    console.log(
      "\n🎉 All done! Messages have been consumed from your test queues."
    );
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

export { TestMessageConsumer };
