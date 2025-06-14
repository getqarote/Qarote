import { PrismaClient } from "@prisma/client";
import amqp from "amqplib";

interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  managementPort: number;
}

class RabbitMQPopulator {
  private config: RabbitMQConfig;
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;
  private prisma = new PrismaClient();

  constructor(config: RabbitMQConfig) {
    this.config = config;
  }

  private async waitForRabbitMQ(): Promise<void> {
    console.log("Waiting for RabbitMQ to be ready...");
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
        console.log("RabbitMQ is ready!");
        return;
      } catch (error) {
        console.log("RabbitMQ is not ready yet. Waiting...");
        await this.sleep(2000);
        retries++;
      }
    }
    throw new Error("RabbitMQ failed to become ready within timeout");
  }

  private async waitForManagementAPI(): Promise<void> {
    console.log("Waiting for RabbitMQ Management API to be ready...");
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const credentials = Buffer.from(
          `${this.config.username}:${this.config.password}`
        ).toString("base64");
        const response = await fetch(
          `http://${this.config.host}:${this.config.managementPort}/api/overview`,
          {
            headers: {
              Authorization: `Basic ${credentials}`,
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (response.ok) {
          console.log("Management API is ready!");
          return;
        }
      } catch (error) {
        console.log("Management API is not ready yet. Waiting...");
        await this.sleep(2000);
        retries++;
      }
    }
    throw new Error("Management API failed to become ready within timeout");
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
      console.log("Connected to RabbitMQ");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
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
      console.log("Disconnected from RabbitMQ");
    } catch (error) {
      console.error("Error disconnecting from RabbitMQ:", error);
    }
  }

  private async publishMessage(
    exchange: string,
    routingKey: string,
    message: object | string,
    count: number = 1
  ): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    const messageContent =
      typeof message === "string" ? message : JSON.stringify(message);

    for (let i = 0; i < count; i++) {
      try {
        await this.channel.publish(
          exchange,
          routingKey,
          Buffer.from(messageContent),
          {
            contentType: "application/json",
            timestamp: Date.now(),
          }
        );
        await this.sleep(100); // Small delay between messages
      } catch (error) {
        console.error(`Failed to publish message ${i + 1}:`, error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async ensureExchanges(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    const exchanges = [
      { name: "notifications.direct", type: "direct" },
      { name: "user.events", type: "topic" },
      { name: "events.topic", type: "topic" },
      { name: "analytics.fanout", type: "fanout" },
      { name: "system.alerts", type: "direct" },
    ];

    for (const exchange of exchanges) {
      try {
        await this.channel.assertExchange(exchange.name, exchange.type, {
          durable: true,
        });
        console.log(`Exchange '${exchange.name}' (${exchange.type}) ensured`);
      } catch (error: any) {
        if (error.message && error.message.includes("PRECONDITION_FAILED")) {
          console.log(
            `Exchange '${exchange.name}' already exists with different configuration, skipping...`
          );
        } else {
          console.error(`Failed to ensure exchange '${exchange.name}':`, error);
          throw error;
        }
      }
    }
  }

  private async ensureQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    const queues = [
      {
        name: "email.notifications",
        exchange: "notifications.direct",
        routingKey: "email",
      },
      {
        name: "sms.notifications",
        exchange: "notifications.direct",
        routingKey: "sms",
      },
      {
        name: "user.registrations",
        exchange: "user.events",
        routingKey: "user.registered",
      },
      {
        name: "user.logins",
        exchange: "user.events",
        routingKey: "user.login",
      },
      {
        name: "order.processing",
        exchange: "events.topic",
        routingKey: "order.*",
      },
      {
        name: "payment.processing",
        exchange: "events.topic",
        routingKey: "payment.*",
      },
      {
        name: "analytics.clicks",
        exchange: "analytics.fanout",
        routingKey: "",
      },
      {
        name: "analytics.pageviews",
        exchange: "analytics.fanout",
        routingKey: "",
      },
      {
        name: "system.critical",
        exchange: "system.alerts",
        routingKey: "critical",
      },
      {
        name: "system.warnings",
        exchange: "system.alerts",
        routingKey: "warning",
      },
      { name: "system.info", exchange: "system.alerts", routingKey: "info" },
    ];

    for (const queue of queues) {
      try {
        let queueExists = false;

        // Check if queue exists first
        try {
          await this.channel.checkQueue(queue.name);
          queueExists = true;
          console.log(
            `Queue '${queue.name}' already exists, skipping creation`
          );
        } catch {
          // Queue doesn't exist, we'll create it
          console.log(`Queue '${queue.name}' doesn't exist, creating it`);
        }

        // If queue doesn't exist, create it
        if (!queueExists) {
          await this.channel.assertQueue(queue.name, { durable: true });
          console.log(`Queue '${queue.name}' created`);
        }

        // Try to bind the queue (whether it existed or was just created)
        try {
          await this.channel.bindQueue(
            queue.name,
            queue.exchange,
            queue.routingKey
          );
          console.log(`Queue '${queue.name}' bound to '${queue.exchange}'`);
        } catch (bindError: any) {
          console.log(
            `Binding for '${queue.name}' may already exist: ${bindError.message}`
          );
        }
      } catch (error: any) {
        if (error.message && error.message.includes("PRECONDITION_FAILED")) {
          console.log(
            `Queue '${queue.name}' already exists with different configuration, continuing...`
          );
        } else {
          console.error(`Failed to ensure queue '${queue.name}':`, error);
          // Don't throw here, just log and continue with other queues
          console.log(`Continuing with next queue...`);
        }
      }
    }
  }

  private async createTimeSeriesData(): Promise<void> {
    console.log("Creating time-series data in database...");

    try {
      // Get the first server (assuming there's at least one)
      const server = await this.prisma.rabbitMQServer.findFirst();
      if (!server) {
        console.log(
          "No RabbitMQ server found in database, skipping time-series creation"
        );
        return;
      }

      // Define the queues we're working with
      const queueNames = [
        "email.notifications",
        "sms.notifications",
        "user.registrations",
        "user.logins",
        "order.processing",
        "payment.processing",
        "analytics.clicks",
        "analytics.pageviews",
        "system.critical",
        "system.warnings",
        "system.info",
      ];

      // Create or find queues in database
      const queues: Array<{
        id: string;
        name: string;
        vhost: string;
        serverId: string;
      }> = [];

      for (const queueName of queueNames) {
        const queue = await this.prisma.queue.upsert({
          where: {
            name_vhost_serverId: {
              name: queueName,
              vhost: "/",
              serverId: server.id,
            },
          },
          update: {
            lastFetched: new Date(),
          },
          create: {
            name: queueName,
            vhost: "/",
            serverId: server.id,
            messages: 0,
            messagesReady: 0,
            messagesUnack: 0,
            lastFetched: new Date(),
          },
          select: {
            id: true,
            name: true,
            vhost: true,
            serverId: true,
          },
        });
        queues.push(queue);
      }

      // Create time-series data for the last hour (to see recent activity)
      const now = new Date();
      const metricsToCreate: Array<{
        queueId: string;
        timestamp: Date;
        messages: number;
        messagesReady: number;
        messagesUnack: number;
        publishRate: number;
        consumeRate: number;
      }> = [];

      for (let i = 60; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 1000); // Every minute for last hour

        for (const queue of queues) {
          // Simulate message counts and rates based on queue type
          let messages = 0;
          let publishRate = 0;
          let consumeRate = 0;

          // Higher activity for recent timestamps
          const recencyFactor = Math.max(0.1, (60 - i) / 60);

          if (queue.name.includes("email")) {
            messages = Math.floor(Math.random() * 50 * recencyFactor);
            publishRate = Math.random() * 5 * recencyFactor;
            consumeRate = publishRate * 0.8; // Slightly less consumption
          } else if (queue.name.includes("user")) {
            messages = Math.floor(Math.random() * 30 * recencyFactor);
            publishRate = Math.random() * 8 * recencyFactor;
            consumeRate = publishRate * 0.9;
          } else if (queue.name.includes("analytics")) {
            messages = Math.floor(Math.random() * 100 * recencyFactor);
            publishRate = Math.random() * 15 * recencyFactor;
            consumeRate = publishRate * 0.95;
          } else {
            messages = Math.floor(Math.random() * 20 * recencyFactor);
            publishRate = Math.random() * 3 * recencyFactor;
            consumeRate = publishRate * 0.7;
          }

          metricsToCreate.push({
            queueId: queue.id,
            timestamp,
            messages,
            messagesReady: Math.floor(messages * 0.8),
            messagesUnack: Math.floor(messages * 0.2),
            publishRate,
            consumeRate,
          });
        }
      }

      // Insert all metrics in batches
      const batchSize = 100;
      for (let i = 0; i < metricsToCreate.length; i += batchSize) {
        const batch = metricsToCreate.slice(i, i + batchSize);
        await this.prisma.queueMetric.createMany({
          data: batch,
          skipDuplicates: true,
        });
      }

      console.log(`Created ${metricsToCreate.length} time-series data points`);
    } catch (error) {
      console.error("Failed to create time-series data:", error);
    }
  }

  async populateData(skipSetup: boolean = false): Promise<void> {
    try {
      // Wait for services to be ready
      await this.waitForRabbitMQ();
      await this.waitForManagementAPI();

      // Connect and setup
      await this.connect();

      if (!skipSetup) {
        await this.ensureExchanges();
        await this.ensureQueues();
      } else {
        console.log("Skipping exchange and queue creation...");
      }

      // Create time-series data in database
      await this.createTimeSeriesData();

      console.log("Starting data population...");

      // Email notifications
      console.log("Publishing email notifications...");
      await this.publishMessage(
        "notifications.direct",
        "email",
        {
          type: "welcome",
          userId: "user123",
          email: "user@example.com",
          template: "welcome_email",
        },
        25
      );

      await this.publishMessage(
        "notifications.direct",
        "email",
        {
          type: "password_reset",
          userId: "user456",
          email: "admin@example.com",
          template: "reset_password",
        },
        15
      );

      await this.publishMessage(
        "notifications.direct",
        "email",
        {
          type: "order_confirmation",
          userId: "user789",
          email: "customer@example.com",
          orderId: "order123",
        },
        30
      );

      // SMS notifications
      console.log("Publishing SMS notifications...");
      await this.publishMessage(
        "notifications.direct",
        "sms",
        {
          type: "verification",
          userId: "user123",
          phone: "+1234567890",
          code: "123456",
        },
        10
      );

      await this.publishMessage(
        "notifications.direct",
        "sms",
        {
          type: "alert",
          userId: "user456",
          phone: "+0987654321",
          message: "Account locked",
        },
        5
      );

      // User events
      console.log("Publishing user events...");
      await this.publishMessage(
        "user.events",
        "user.registered",
        {
          userId: "user001",
          email: "new@example.com",
          timestamp: new Date().toISOString(),
        },
        12
      );

      await this.publishMessage(
        "user.events",
        "user.login",
        {
          userId: "user123",
          ip: "192.168.1.100",
          timestamp: new Date().toISOString(),
        },
        45
      );

      await this.publishMessage(
        "user.events",
        "user.login",
        {
          userId: "user456",
          ip: "10.0.0.50",
          timestamp: new Date().toISOString(),
        },
        23
      );

      // Order processing
      console.log("Publishing order events...");
      await this.publishMessage(
        "events.topic",
        "order.created",
        {
          orderId: "order123",
          userId: "user789",
          amount: 99.99,
          items: [{ id: "item1", quantity: 2 }],
        },
        18
      );

      await this.publishMessage(
        "events.topic",
        "order.updated",
        {
          orderId: "order124",
          status: "processing",
          updatedAt: new Date().toISOString(),
        },
        8
      );

      await this.publishMessage(
        "events.topic",
        "order.shipped",
        {
          orderId: "order125",
          trackingNumber: "TRACK123",
          carrier: "UPS",
        },
        22
      );

      // Payment processing
      console.log("Publishing payment events...");
      await this.publishMessage(
        "events.topic",
        "payment.initiated",
        {
          paymentId: "pay123",
          orderId: "order123",
          amount: 99.99,
          method: "credit_card",
        },
        15
      );

      await this.publishMessage(
        "events.topic",
        "payment.completed",
        {
          paymentId: "pay124",
          status: "success",
          transactionId: "txn456",
        },
        12
      );

      await this.publishMessage(
        "events.topic",
        "payment.failed",
        {
          paymentId: "pay125",
          status: "failed",
          reason: "insufficient_funds",
        },
        3
      );

      // Analytics data
      console.log("Publishing analytics events...");
      await this.publishMessage(
        "analytics.fanout",
        "",
        {
          event: "click",
          elementId: "button-signup",
          userId: "user123",
          timestamp: new Date().toISOString(),
        },
        120
      );

      await this.publishMessage(
        "analytics.fanout",
        "",
        {
          event: "pageview",
          page: "/dashboard",
          userId: "user456",
          sessionId: "sess789",
        },
        85
      );

      // System alerts
      console.log("Publishing system alerts...");
      await this.publishMessage(
        "system.alerts",
        "critical",
        {
          level: "critical",
          service: "database",
          message: "High CPU usage detected",
          timestamp: new Date().toISOString(),
        },
        3
      );

      await this.publishMessage(
        "system.alerts",
        "warning",
        {
          level: "warning",
          service: "api",
          message: "Response time above threshold",
          timestamp: new Date().toISOString(),
        },
        8
      );

      await this.publishMessage(
        "system.alerts",
        "info",
        {
          level: "info",
          service: "cache",
          message: "Cache cleared successfully",
          timestamp: new Date().toISOString(),
        },
        15
      );

      console.log("Sample data population completed!");
      console.log(
        `You can access RabbitMQ Management UI at http://${this.config.host}:${this.config.managementPort}`
      );
      console.log(
        `Username: ${this.config.username}, Password: ${this.config.password}`
      );
    } catch (error) {
      console.error("Error during data population:", error);
      throw error;
    } finally {
      await this.disconnect();
      await this.prisma.$disconnect();
    }
  }
}

// Main execution
async function main() {
  const config: RabbitMQConfig = {
    host: process.env.RABBITMQ_HOST || "localhost",
    port: parseInt(process.env.RABBITMQ_PORT || "5672"),
    username: process.env.RABBITMQ_USER || "admin",
    password: process.env.RABBITMQ_PASS || "admin123",
    managementPort: parseInt(process.env.RABBITMQ_MANAGEMENT_PORT || "15672"),
  };

  const populator = new RabbitMQPopulator(config);

  // Check if user wants to skip setup (exchanges and queues)
  const skipSetup = process.argv.includes("--skip-setup");

  try {
    await populator.populateData(skipSetup);
    console.log("Data population script completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Data population script failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
