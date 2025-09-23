#!/usr/bin/env npx tsx
/**
 * Email Notifications Activity Generator
 *
 * This script generates realistic email notification activity in RabbitMQ to test
 * the Live Rates and Data Rates charts in RabbitHQ dashboard.
 *
 * Features:
 * - Creates email.notifications exchange and related queues
 * - Publishes realistic email messages (welcome, password-reset, order-confirmation, etc.)
 * - Consumes messages with realistic processing patterns (95% ack rate, 2% reject rate)
 * - Generates data that will show up in both Live Rates and Data Rates charts
 *
 * Usage:
 *   npx tsx seed-rates-activity.ts [duration_minutes] [messages_per_second]
 *
 * Examples:
 *   npx tsx seed-rates-activity.ts                    # 5 minutes, 20 msgs/sec
 *   npx tsx seed-rates-activity.ts 10                 # 10 minutes, 20 msgs/sec
 *   npx tsx seed-rates-activity.ts 5 50              # 5 minutes, 50 msgs/sec
 *
 * Environment Variables:
 *   RABBITMQ_HOST=localhost
 *   RABBITMQ_PORT=5676
 *   RABBITMQ_USER=admin
 *   RABBITMQ_PASS=admin123
 *   RABBITMQ_MANAGEMENT_PORT=15676
 */
import amqp from "amqplib";

interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  managementPort: number;
}

class EmailNotificationsActivityGenerator {
  private config: RabbitMQConfig;
  private publisherConnection: amqp.ChannelModel | null = null;
  private consumerConnection: amqp.ChannelModel | null = null;
  private publisherChannel: amqp.Channel | null = null;
  private consumerChannel: amqp.Channel | null = null;
  private isRunning: boolean = false;
  private stats = {
    published: 0,
    consumed: 0,
    acked: 0,
    rejected: 0,
    errors: 0,
  };

  constructor(config: RabbitMQConfig) {
    this.config = config;
  }

  private async waitForRabbitMQ(): Promise<void> {
    console.log("⏳ Waiting for RabbitMQ to be ready...");
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const connection = await amqp.connect({
          hostname: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
        });
        await connection.close();
        console.log("✅ RabbitMQ is ready!");
        return;
      } catch (error) {
        console.log(
          `⏳ RabbitMQ not ready. Retry ${retries + 1}/${maxRetries}...`
        );
        await this.sleep(2000);
        retries++;
      }
    }
    throw new Error("❌ RabbitMQ failed to become ready within timeout");
  }

  private async connect(): Promise<void> {
    try {
      // Create separate connections for publishing and consuming
      this.publisherConnection = await amqp.connect({
        hostname: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
      });

      this.consumerConnection = await amqp.connect({
        hostname: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
      });

      this.publisherChannel = await this.publisherConnection.createChannel();
      this.consumerChannel = await this.consumerConnection.createChannel();

      // Set prefetch for better consumer performance
      await this.consumerChannel.prefetch(10);

      console.log(
        "✅ Connected to RabbitMQ with separate publisher and consumer connections"
      );
    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.publisherChannel) await this.publisherChannel.close();
      if (this.consumerChannel) await this.consumerChannel.close();
      if (this.publisherConnection) await this.publisherConnection.close();
      if (this.consumerConnection) await this.consumerConnection.close();
      console.log("✅ Disconnected from RabbitMQ");
    } catch (error) {
      console.error("❌ Error disconnecting:", error);
    }
  }

  private async setupInfrastructure(): Promise<void> {
    if (!this.publisherChannel || !this.consumerChannel) {
      throw new Error("Channels not initialized");
    }

    console.log("🔧 Setting up email notifications testing infrastructure...");

    // Create email-specific exchange
    try {
      await this.publisherChannel.assertExchange(
        "email.notifications",
        "direct",
        {
          durable: true,
        }
      );
      console.log(`  ✅ Created exchange: email.notifications (direct)`);
    } catch (error) {
      console.log(
        `  📋 Exchange email.notifications already exists, using existing exchange`
      );
    }

    // Create email notification queue (this is the main queue we want to test)
    const emailQueue = "email.notifications";

    // Check if queue already exists and get its arguments
    let queueArgs = { durable: true, autoDelete: false };
    try {
      const existingQueue = await this.publisherChannel.checkQueue(emailQueue);
      console.log(
        `  📋 Queue ${emailQueue} already exists, using existing queue`
      );
      // If queue exists, we'll just bind it without recreating
    } catch (error) {
      // Queue doesn't exist, create it with default arguments
      await this.publisherChannel.assertQueue(emailQueue, queueArgs);
      console.log(`  ✅ Created queue: ${emailQueue}`);
    }

    // Bind email queue to email exchange (this will work whether queue was created or already existed)
    try {
      await this.publisherChannel.bindQueue(
        emailQueue,
        "email.notifications",
        "notification"
      );
      console.log(`  ✅ Bound queue: ${emailQueue}`);
    } catch (error) {
      console.log(`  ℹ️  Queue ${emailQueue} may already be bound to exchange`);
    }

    // Create additional test queues for more diverse activity
    const additionalQueues = [
      { name: "email.welcome", routingKey: "welcome" },
      { name: "email.password-reset", routingKey: "password-reset" },
      { name: "email.order-confirmation", routingKey: "order-confirmation" },
      { name: "email.marketing", routingKey: "marketing" },
    ];

    for (const queue of additionalQueues) {
      try {
        // Assert queue (creates if doesn't exist, uses existing if it does)
        await this.publisherChannel.assertQueue(queue.name, { durable: true });
        console.log(`  ✅ Ensured queue exists: ${queue.name}`);

        // Bind queue to exchange
        await this.publisherChannel.bindQueue(
          queue.name,
          "email.notifications",
          queue.routingKey
        );
        console.log(`  ✅ Bound queue: ${queue.name}`);
      } catch (error) {
        console.log(`  ⚠️  Error with queue ${queue.name}:`, error.message);
        // Continue with other queues
      }
    }

    console.log("✅ Email notifications infrastructure setup complete!");
  }

  private async startPublishing(messagesPerSecond: number = 10): Promise<void> {
    if (!this.publisherChannel)
      throw new Error("Publisher channel not initialized");

    const intervalMs = 1000 / messagesPerSecond;
    console.log(
      `🚀 Starting email notifications publisher: ${messagesPerSecond} msgs/sec (${intervalMs}ms interval)`
    );

    const publishInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(publishInterval);
        return;
      }

      try {
        const timestamp = new Date().toISOString();

        // Generate realistic email notification messages
        const emailTypes = [
          { type: "welcome", routingKey: "welcome", template: "welcome_email" },
          {
            type: "password-reset",
            routingKey: "password-reset",
            template: "password_reset_email",
          },
          {
            type: "order-confirmation",
            routingKey: "order-confirmation",
            template: "order_confirmation_email",
          },
          {
            type: "marketing",
            routingKey: "marketing",
            template: "marketing_email",
          },
          {
            type: "notification",
            routingKey: "notification",
            template: "general_notification",
          },
        ];

        // Publish to different email queues to generate various rates
        const publishTasks = emailTypes.map((emailType) =>
          this.publishEmailMessage(emailType.type, emailType.routingKey, {
            id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: emailType.type,
            template: emailType.template,
            timestamp,
            recipient: {
              email: `user${Math.floor(Math.random() * 10000)}@example.com`,
              name: `User ${Math.floor(Math.random() * 1000)}`,
            },
            data: {
              subject: this.generateEmailSubject(emailType.type),
              priority: Math.random() > 0.8 ? "high" : "normal",
              retryCount: 0,
              scheduledAt: timestamp,
            },
            metadata: {
              source: "test_generator",
              version: "1.0",
              environment: "test",
            },
          })
        );

        await Promise.all(publishTasks);
        this.stats.published += publishTasks.length;
      } catch (error) {
        this.stats.errors++;
        console.error("❌ Publishing error:", error);
      }
    }, intervalMs);
  }

  private async publishEmailMessage(
    emailType: string,
    routingKey: string,
    message: any
  ): Promise<void> {
    if (!this.publisherChannel)
      throw new Error("Publisher channel not initialized");

    const messageBuffer = Buffer.from(JSON.stringify(message));

    this.publisherChannel.publish(
      "email.notifications",
      routingKey,
      messageBuffer,
      {
        persistent: true,
        timestamp: Date.now(),
        messageId: message.id,
        contentType: "application/json",
        headers: {
          emailType: emailType,
          priority: message.data.priority,
        },
      }
    );
  }

  private generateEmailSubject(emailType: string): string {
    const subjects = {
      welcome: "Welcome to our platform!",
      "password-reset": "Reset your password",
      "order-confirmation": "Order confirmation",
      marketing: "Special offer just for you!",
      notification: "Important notification",
    };
    return subjects[emailType as keyof typeof subjects] || "Email notification";
  }

  private async startConsuming(): Promise<void> {
    if (!this.consumerChannel)
      throw new Error("Consumer channel not initialized");

    console.log("🔥 Starting email notification consumers...");

    const emailQueues = [
      "email.notifications",
      "email.welcome",
      "email.password-reset",
      "email.order-confirmation",
      "email.marketing",
    ];

    for (const queueName of emailQueues) {
      try {
        // First check if the queue exists
        await this.consumerChannel.checkQueue(queueName);

        await this.consumerChannel.consume(
          queueName,
          async (message) => {
            if (!message) return;

            try {
              // Parse email message
              const emailData = JSON.parse(message.content.toString());

              // Simulate email processing behaviors
              const shouldAck = Math.random() > 0.05; // 95% ack rate (emails are usually processed successfully)
              const shouldReject = Math.random() > 0.98; // 2% reject rate (occasional failures)
              const shouldDelay = Math.random() > 0.7; // 30% chance of processing delay

              // Simulate email processing time (sending emails takes time)
              const baseProcessingTime = 100; // Base 100ms for email processing
              const processingTime = shouldDelay
                ? baseProcessingTime + Math.random() * 200 // Up to 300ms for delayed emails
                : baseProcessingTime + Math.random() * 50; // Up to 150ms for normal emails

              await this.sleep(processingTime);

              // Log interesting email processing occasionally
              if (Math.random() < 0.05) {
                // 5% chance
                console.log(
                  `📧 Processing ${emailData.type} email to ${emailData.recipient.email} (${emailData.data.subject})`
                );
              }

              if (shouldReject) {
                // Reject and requeue sometimes to generate reject rates
                this.consumerChannel?.reject(message, Math.random() > 0.3); // 70% requeue on reject
                this.stats.rejected++;
              } else if (shouldAck) {
                this.consumerChannel?.ack(message);
                this.stats.acked++;
              } else {
                // Let some messages timeout to generate different patterns
                // Don't ack or reject (simulate timeout scenarios)
              }

              this.stats.consumed++;
            } catch (error) {
              this.stats.errors++;
              console.error(`❌ Error processing email message:`, error);
              this.consumerChannel?.reject(message, false); // Don't requeue on error
            }
          },
          {
            noAck: false, // We want to control acking for rate generation
          }
        );

        console.log(`  ✅ Started consumer for queue: ${queueName}`);
      } catch (error) {
        console.log(
          `  ⚠️  Queue ${queueName} not found, skipping consumer setup`
        );
        // Continue with other queues
      }
    }

    console.log(`✅ Consumer setup completed for email queues`);
  }

  private async printStats(): Promise<void> {
    const statsInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(statsInterval);
        return;
      }

      console.log(`\n📊 Email Notifications Live Stats:`);
      console.log(`  📤 Published: ${this.stats.published} email messages`);
      console.log(`  📥 Consumed: ${this.stats.consumed} email messages`);
      console.log(`  ✅ Acknowledged: ${this.stats.acked} email messages`);
      console.log(`  ❌ Rejected: ${this.stats.rejected} email messages`);
      console.log(`  💥 Errors: ${this.stats.errors} email messages`);
      console.log(
        `  🔄 Check your Live Rates and Data Rates charts in the dashboard!`
      );
      console.log(
        `  📧 Email queues: email.notifications, email.welcome, email.password-reset, etc.`
      );
    }, 5000); // Print stats every 5 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async run(
    durationMinutes: number = 5,
    messagesPerSecond: number = 20
  ): Promise<void> {
    try {
      console.log(`🚀 Starting Email Notifications Activity Generator`);
      console.log(`   Duration: ${durationMinutes} minutes`);
      console.log(`   Rate: ${messagesPerSecond} email messages/second`);
      console.log(
        `   Expected total: ~${durationMinutes * 60 * messagesPerSecond} email messages\n`
      );

      await this.waitForRabbitMQ();
      await this.connect();
      await this.setupInfrastructure();

      this.isRunning = true;

      // Start all activities
      await this.startPublishing(messagesPerSecond);

      // Small delay to ensure queues are fully set up
      await this.sleep(1000);

      await this.startConsuming();
      this.printStats();

      console.log(
        `\n🎯 Email notifications activity started! Check your RabbitHQ dashboard now!`
      );
      console.log(
        `   📊 Live Rates Chart: Should show publish, deliver, ack rates for email queues`
      );
      console.log(
        `   📊 Data Rates Chart: Should show send/receive data rates from connections`
      );
      console.log(
        `   🔄 Charts update every 5 seconds with time range selectors (1m, 10m, 1h)`
      );
      console.log(`   📧 Main queue: email.notifications`);
      console.log(`   Press Ctrl+C to stop early.\n`);

      // Run for specified duration
      await this.sleep(durationMinutes * 60 * 1000);

      console.log(`\n⏰ ${durationMinutes} minutes completed!`);
    } catch (error) {
      console.error(
        "💥 Error running email notifications activity generator:",
        error
      );
      throw error;
    } finally {
      this.isRunning = false;
      await this.sleep(2000); // Allow time for cleanup
      await this.disconnect();

      console.log(`\n📊 Final Email Notifications Stats:`);
      console.log(
        `  📤 Total Published: ${this.stats.published} email messages`
      );
      console.log(`  📥 Total Consumed: ${this.stats.consumed} email messages`);
      console.log(
        `  ✅ Total Acknowledged: ${this.stats.acked} email messages`
      );
      console.log(`  ❌ Total Rejected: ${this.stats.rejected} email messages`);
      console.log(`  💥 Total Errors: ${this.stats.errors} email messages`);
    }
  }
}

// Main execution
async function main() {
  const config: RabbitMQConfig = {
    host: process.env.RABBITMQ_HOST || "localhost",
    port: parseInt(process.env.RABBITMQ_PORT || "5676"),
    username: process.env.RABBITMQ_USER || "admin",
    password: process.env.RABBITMQ_PASS || "admin123",
    managementPort: parseInt(process.env.RABBITMQ_MANAGEMENT_PORT || "15676"),
  };

  // Parse command line arguments
  const durationArg = process.argv[2];
  const rateArg = process.argv[3];

  const durationMinutes = durationArg ? parseInt(durationArg) : 5;
  const messagesPerSecond = rateArg ? parseInt(rateArg) : 20;

  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    console.error(
      "❌ Invalid duration. Please provide a positive number of minutes."
    );
    process.exit(1);
  }

  if (isNaN(messagesPerSecond) || messagesPerSecond <= 0) {
    console.error(
      "❌ Invalid rate. Please provide a positive number of messages per second."
    );
    process.exit(1);
  }

  console.log("🔧 Configuration:");
  console.log(`  🏠 Host: ${config.host}:${config.port}`);
  console.log(`  👤 User: ${config.username}`);
  console.log(`  🔒 Password: ${config.password}`);
  console.log(`  📊 Management Port: ${config.managementPort}`);
  console.log(`  ⏱️  Duration: ${durationMinutes} minutes`);
  console.log(`  🚀 Rate: ${messagesPerSecond} messages/second\n`);

  const generator = new EmailNotificationsActivityGenerator(config);

  try {
    await generator.run(durationMinutes, messagesPerSecond);
    console.log("\n🎉 Email notifications activity generation completed!");
    console.log(
      "   Check your RabbitHQ dashboard to see if the Live Rates and Data Rates charts updated correctly."
    );
    console.log(
      "   📊 Live Rates Chart: Shows message rates (publish, deliver, ack, etc.)"
    );
    console.log(
      "   📊 Data Rates Chart: Shows data throughput (send/receive bytes)"
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

export { EmailNotificationsActivityGenerator };
