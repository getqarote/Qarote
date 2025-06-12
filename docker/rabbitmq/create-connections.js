const amqp = require("amqplib");

// Connection parameters
const RABBITMQ_URL = "amqp://admin:admin123@localhost:5672/";

// Store connections for cleanup
const connections = [];
const channels = [];

async function createProducerConnection(
  name,
  exchange,
  routingKeys,
  interval = 10000
) {
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
          const message = {
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

async function createConsumerConnection(name, queue, prefetchCount = 1) {
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
          const content = JSON.parse(message.content.toString());
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

async function createIdleConnection(name) {
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
      if (connection.connection && !connection.connection.stream.destroyed) {
        // Connection is still alive
        console.log(`Idle connection ${name} heartbeat`);
      } else {
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

async function main() {
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
      if (channel && !channel.connection.stream.destroyed) {
        await channel.close();
      }
    }

    // Close all connections
    for (const connection of connections) {
      if (connection && !connection.connection.stream.destroyed) {
        await connection.close();
      }
    }

    console.log("All connections closed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// Start the simulation
main().catch(console.error);
