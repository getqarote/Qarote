import { setTimeout as setTimeoutPromise } from "node:timers/promises";

import amqp from "amqplib";

interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  managementPort: number;
  vhost?: string;
}

class TestMessageGenerator {
  private config: RabbitMQConfig;
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(config: RabbitMQConfig) {
    this.config = config;
  }

  private getConnectionUrl(): string {
    // Use vhost from config or default to / (encoded as %2F)
    const vhost = this.config.vhost
      ? encodeURIComponent(this.config.vhost)
      : "%2F";
    // Use AMQPS URL format for encrypted connections (port 5671)
    if (this.config.port === 5671) {
      return `amqps://${this.config.username}:${encodeURIComponent(this.config.password)}@${this.config.host}:${this.config.port}/${vhost}`;
    }
    // Use AMQP URL format for unencrypted connections (port 5672)
    return `amqp://${this.config.username}:${encodeURIComponent(this.config.password)}@${this.config.host}:${this.config.port}/${vhost}`;
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
      const connectionUrl = this.getConnectionUrl();
      this.connection = await amqp.connect(connectionUrl);

      this.channel = await this.connection.createChannel();
      console.log("✅ Connected to RabbitMQ");
    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
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

    console.log("🔧 Setting up test infrastructure...");

    // Create test exchange
    await this.channel.assertExchange("test.messages", "direct", {
      durable: true,
    });

    // Create test queues
    const testQueues = [
      "email.queue",
      "user.queue",
      "queue.notifications",
      "queue.analytics",
    ];

    for (const queueName of testQueues) {
      await this.channel.assertQueue(queueName, {
        durable: true,
        autoDelete: false,
      });

      // Bind queue to exchange
      await this.channel.bindQueue(queueName, "test.messages", queueName);
    }

    console.log(`✅ Created ${testQueues.length} test queues`);
  }

  private async generateMessages(messageCount: number = 100): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    console.log(`🚀 Generating ${messageCount} test messages...`);

    const testQueues = [
      "email.queue",
      "user.queue",
      "queue.notifications",
      "queue.analytics",
    ];

    const messageTypes = [
      "user_registration",
      "order_created",
      "payment_processed",
      "notification_sent",
      "analytics_event",
      "system_alert",
    ];

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < messageCount; i++) {
      try {
        // Randomly select queue and message type
        const targetQueue =
          testQueues[Math.floor(Math.random() * testQueues.length)];
        const messageType =
          messageTypes[Math.floor(Math.random() * messageTypes.length)];

        const testMessage = {
          id: `msg_${i + 1}_${Date.now()}`,
          type: messageType,
          timestamp: new Date().toISOString(),
          data: {
            userId: Math.floor(Math.random() * 10000),
            action: messageType,
            metadata: {
              source: "test_generator",
              batch: Math.floor(i / 10) + 1,
              sequence: i + 1,
            },
          },
          correlationId: `test_correlation_${Math.floor(Math.random() * 1000)}`,
        };

        // Publish message
        const published = this.channel.publish(
          "test.messages",
          targetQueue,
          Buffer.from(JSON.stringify(testMessage)),
          {
            contentType: "application/json",
            timestamp: Date.now(),
            messageId: testMessage.id,
            correlationId: testMessage.correlationId,
            persistent: true,
          }
        );

        if (published) {
          successCount++;
          if ((i + 1) % 10 === 0) {
            console.log(`📤 Published ${i + 1}/${messageCount} messages...`);
          }
        } else {
          errorCount++;
          console.warn(`⚠️  Failed to publish message ${i + 1}`);
        }

        // Small delay to avoid overwhelming the server
        await setTimeoutPromise(50);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error publishing message ${i + 1}:`, error);
      }
    }

    console.log(`\n📊 Message Generation Summary:`);
    console.log(`✅ Successfully published: ${successCount} messages`);
    console.log(`❌ Failed to publish: ${errorCount} messages`);
    console.log(
      `📈 Success rate: ${((successCount / messageCount) * 100).toFixed(1)}%`
    );
  }

  private async getQueueStats(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    console.log("\n📊 Queue Statistics:");

    const testQueues = [
      "email.queue",
      "user.queue",
      "queue.notifications",
      "queue.analytics",
    ];

    let totalMessages = 0;

    for (const queueName of testQueues) {
      try {
        const queueInfo = await this.channel.checkQueue(queueName);
        console.log(`  📬 ${queueName}: ${queueInfo.messageCount} messages`);
        totalMessages += queueInfo.messageCount;
      } catch (error) {
        console.log(`  ❌ ${queueName}: Error checking queue`);
      }
    }

    console.log(`  📊 Total messages across all test queues: ${totalMessages}`);
  }

  public async run(messageCount: number = 100): Promise<void> {
    try {
      console.log("🚀 Starting Test Message Generator");
      console.log(`📊 Target: ${messageCount} messages\n`);

      await this.waitForRabbitMQ();
      await this.connect();
      await this.ensureTestInfrastructure();
      await this.generateMessages(messageCount);
      await this.getQueueStats();

      console.log("\n✅ Test message generation completed successfully!");
    } catch (error) {
      console.error("\n❌ Test message generation failed:", error);
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
    vhost: process.env.RABBITMQ_VHOST,
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
  console.log(`  📊 Messages to generate: ${messageCount}\n`);

  const generator = new TestMessageGenerator(config);

  try {
    await generator.run(messageCount);
    console.log(
      "\n🎉 All done! Check your RabbitMQ dashboard to see the messages."
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

export { TestMessageGenerator };
