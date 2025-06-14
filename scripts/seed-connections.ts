/**
 * RabbitMQ Connection Simulation Script
 *
 * This script creates multiple RabbitMQ connections to simulate a real-world environment
 * with producers, consumers, and idle connections for testing and demonstration purposes.
 */

import * as amqp from "amqplib";

// Types for better type safety
interface MessageContent {
  id: string;
  timestamp: string;
  producer: string;
  data: string;
  routing_key: string;
}

// Connection parameters
const RABBITMQ_URL = "amqp://admin:admin123@localhost:5672/";

// Store connections for cleanup - using the actual return types from amqplib
const connections: amqp.ChannelModel[] = [];
const channels: amqp.Channel[] = [];

/**
 * Creates a producer connection that publishes messages periodically
 * @param name - Name identifier for the producer connection
 * @param exchange - Exchange name to publish to
 * @param routingKeys - Array of routing keys to use for publishing
 * @param interval - Interval in milliseconds between message publications
 */
async function createProducerConnection(
  name: string,
  exchange: string,
  routingKeys: string[],
  interval: number = 10000
): Promise<void> {
  try {
    console.log(`Creating producer connection: ${name}`);
    const connection = await amqp.connect(RABBITMQ_URL, {
      clientProperties: {
        connection_name: name,
      },
    });

    const channel = await connection.createChannel();

    connections.push(connection);
    channels.push(channel);

    let counter = 0;

    // Send messages periodically
    const intervalId = setInterval(async () => {
      try {
        for (const routingKey of routingKeys) {
          const message: MessageContent = {
            id: `${name}-${counter}`,
            timestamp: new Date().toISOString(),
            producer: name,
            data: `Message ${counter} from ${name}`,
            routing_key: routingKey,
          };

          await channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(message)),
            {
              persistent: true,
              contentType: "application/json",
            }
          );

          console.log(
            `Producer ${name} sent message ${counter} to ${exchange}/${routingKey}`
          );
          counter++;
        }
      } catch (error) {
        console.error(`Error in producer ${name}:`, error);
      }
    }, interval + Math.random() * 5000); // Add some randomness

    // Handle connection close
    connection.on("close", () => {
      console.log(`Producer connection ${name} closed`);
      clearInterval(intervalId);
    });

    connection.on("error", (err) => {
      console.error(`Producer connection ${name} error:`, err);
      clearInterval(intervalId);
    });
  } catch (error) {
    console.error(`Failed to create producer ${name}:`, error);
  }
}

/**
 * Creates a consumer connection that processes messages from a queue
 * @param name - Name identifier for the consumer connection
 * @param queue - Queue name to consume from
 * @param prefetchCount - Number of unacknowledged messages that can be processed simultaneously
 */
async function createConsumerConnection(
  name: string,
  queue: string,
  prefetchCount: number = 1
): Promise<void> {
  try {
    console.log(`Creating consumer connection: ${name}`);
    const connection = await amqp.connect(RABBITMQ_URL, {
      clientProperties: {
        connection_name: name,
      },
    });

    const channel = await connection.createChannel();

    connections.push(connection);
    channels.push(channel);

    // Set prefetch count
    await channel.prefetch(prefetchCount);

    // Consume messages
    await channel.consume(queue, async (message) => {
      if (message) {
        try {
          const content: MessageContent = JSON.parse(
            message.content.toString()
          );
          console.log(
            `Consumer ${name} processing message: ${content.id || "unknown"}`
          );

          // Simulate processing time (1-5 seconds)
          const processingTime = 1000 + Math.random() * 4000;
          await new Promise((resolve) => setTimeout(resolve, processingTime));

          // Acknowledge message
          channel.ack(message);
          console.log(
            `Consumer ${name} completed processing: ${content.id || "unknown"}`
          );
        } catch (error) {
          console.error(`Consumer ${name} error processing message:`, error);
          // Reject and requeue
          channel.nack(message, false, true);
        }
      }
    });

    console.log(`Consumer ${name} waiting for messages from queue: ${queue}`);

    // Handle connection close
    connection.on("close", () => {
      console.log(`Consumer connection ${name} closed`);
    });

    connection.on("error", (err) => {
      console.error(`Consumer connection ${name} error:`, err);
    });
  } catch (error) {
    console.error(`Failed to create consumer ${name}:`, error);
  }
}

/**
 * Creates an idle connection for monitoring purposes
 * @param name - Name identifier for the idle connection
 */
async function createIdleConnection(name: string): Promise<void> {
  try {
    console.log(`Creating idle connection: ${name}`);
    const connection = await amqp.connect(RABBITMQ_URL, {
      clientProperties: {
        connection_name: name,
      },
    });

    const channel = await connection.createChannel();

    connections.push(connection);
    channels.push(channel);

    // Keep connection alive with periodic heartbeat checks
    const heartbeatInterval = setInterval(() => {
      try {
        if (connection && "connection" in connection && connection.connection) {
          // Connection is still alive
          console.log(`Idle connection ${name} heartbeat`);
        } else {
          clearInterval(heartbeatInterval);
        }
      } catch (error) {
        console.log(`Idle connection ${name} heartbeat check failed:`, error);
        clearInterval(heartbeatInterval);
      }
    }, 60000); // Check every minute

    // Handle connection close
    connection.on("close", () => {
      console.log(`Idle connection ${name} closed`);
      clearInterval(heartbeatInterval);
    });

    connection.on("error", (err) => {
      console.error(`Idle connection ${name} error:`, err);
      clearInterval(heartbeatInterval);
    });
  } catch (error) {
    console.error(`Failed to create idle connection ${name}:`, error);
  }
}

/**
 * Main function that orchestrates the creation of all RabbitMQ connections
 * Sets up producers, consumers, and idle connections for simulation
 */
async function main(): Promise<void> {
  console.log("Starting RabbitMQ connection simulation...");

  try {
    // Create producers
    await createProducerConnection(
      "EmailProducer",
      "notifications.direct",
      ["email"],
      8000
    );
    await createProducerConnection(
      "SMSProducer",
      "notifications.direct",
      ["sms"],
      15000
    );
    await createProducerConnection(
      "UserEventProducer",
      "user.events",
      ["user.registered", "user.login"],
      12000
    );
    await createProducerConnection(
      "OrderProducer",
      "events.topic",
      ["order.created", "order.updated", "order.shipped"],
      10000
    );
    await createProducerConnection(
      "PaymentProducer",
      "events.topic",
      ["payment.initiated", "payment.completed"],
      8000
    );
    await createProducerConnection(
      "AnalyticsProducer",
      "analytics.fanout",
      [""],
      3000
    );
    await createProducerConnection(
      "AlertProducer",
      "system.alerts",
      ["critical", "warning", "info"],
      20000
    );

    // Wait a bit before creating consumers
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create consumers
    await createConsumerConnection("EmailConsumer1", "email.notifications", 1);
    await createConsumerConnection("EmailConsumer2", "email.notifications", 2);
    await createConsumerConnection("SMSConsumer", "sms.notifications", 1);
    await createConsumerConnection("OrderConsumer1", "order.processing", 1);
    await createConsumerConnection("OrderConsumer2", "order.processing", 1);
    await createConsumerConnection("PaymentConsumer", "payment.processing", 3);
    await createConsumerConnection("AnalyticsConsumer1", "analytics.clicks", 5);
    await createConsumerConnection(
      "AnalyticsConsumer2",
      "analytics.pageviews",
      5
    );
    await createConsumerConnection(
      "AlertConsumerCritical",
      "critical.alerts",
      1
    );
    await createConsumerConnection("AlertConsumerWarning", "warning.alerts", 2);
    await createConsumerConnection(
      "UserEventConsumer",
      "user.registration.events",
      1
    );
    await createConsumerConnection(
      "LoginEventConsumer",
      "user.login.events",
      2
    );

    // Wait a bit before creating idle connections
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create idle connections for monitoring
    await createIdleConnection("MonitoringConnection1");
    await createIdleConnection("MonitoringConnection2");
    await createIdleConnection("HealthCheckConnection");

    console.log(
      `\nCreated ${connections.length} connections and ${channels.length} channels`
    );
    console.log(
      "Connections are active. You can now check the RabbitMQ Management UI at http://localhost:15672"
    );
    console.log("Username: admin, Password: admin123");
    console.log("\nPress Ctrl+C to stop all connections.");
  } catch (error) {
    console.error("Error setting up connections:", error);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down connections...");

  try {
    // Close all channels
    for (const channel of channels) {
      try {
        if (channel && typeof channel.close === "function") {
          await channel.close();
        }
      } catch (error) {
        console.error("Error closing channel:", error);
      }
    }

    // Close all connections
    for (const connection of connections) {
      try {
        if (connection && typeof connection.close === "function") {
          await connection.close();
        }
      } catch (error) {
        console.error("Error closing connection:", error);
      }
    }

    console.log("All connections closed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

main().catch(console.error);
