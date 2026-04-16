#!/usr/bin/env tsx

/**
 * Alert Resolution Script
 *
 * Resolves alerts on RabbitMQ servers by consuming messages, purging queues,
 * or acknowledging unacked messages. This helps test the ResolvedAlert flow.
 *
 * Usage:
 *   CLOUDAMQP_URL="amqps://user:pass@host/vhost" tsx scripts/rabbitmq/resolve-alerts.ts consume alert-test-queue
 *   CLOUDAMQP_URL="amqps://user:pass@host/vhost" tsx scripts/rabbitmq/resolve-alerts.ts consume alert-test-queue 10000
 *   CLOUDAMQP_URL="amqps://user:pass@host/vhost" tsx scripts/rabbitmq/resolve-alerts.ts purge alert-test-queue
 *   CLOUDAMQP_URL="amqps://user:pass@host/vhost" tsx scripts/rabbitmq/resolve-alerts.ts ack unacked-queue
 *   CLOUDAMQP_URL="amqps://user:pass@host/vhost" tsx scripts/rabbitmq/resolve-alerts.ts consume-all
 */

import { fileURLToPath } from "node:url";

import amqp from "amqplib";

class AlertResolver {
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
   * Consume messages from a queue and acknowledge them
   * Resolves "High Queue Backlog" and "Queue Without Consumers" alerts
   */
  async consumeMessages(queueName: string, count?: number): Promise<void> {
    if (!this.channel) throw new Error("Not connected");

    console.log(`\n🔵 Consuming messages from queue...`);
    console.log(`   Queue: ${queueName}`);
    if (count) {
      console.log(`   Target: ${count} messages`);
    } else {
      console.log(`   Target: All messages`);
    }

    // Check queue exists and get initial count
    let queueInfo;
    try {
      queueInfo = await this.channel.checkQueue(queueName);
    } catch (error) {
      console.error(`❌ Queue "${queueName}" does not exist`);
      throw error;
    }

    const initialCount = queueInfo.messageCount;
    console.log(`   Initial message count: ${initialCount}`);

    if (initialCount === 0) {
      console.log(`✅ Queue is already empty`);
      return;
    }

    const targetCount = count || initialCount;
    const messagesToConsume = Math.min(targetCount, initialCount);
    let consumedCount = 0;
    let consumerTag: string | null = null;

    return new Promise<void>((resolve, reject) => {
      if (!this.channel) {
        reject(new Error("Channel not available"));
        return;
      }

      // Set up consumer
      this.channel
        .consume(
          queueName,
          (msg) => {
            if (!msg || !this.channel) return;

            try {
              // Acknowledge the message
              this.channel.ack(msg);
              consumedCount++;

              // Log progress
              if (
                consumedCount % 1000 === 0 ||
                consumedCount >= messagesToConsume
              ) {
                console.log(
                  `   Consumed ${consumedCount}/${messagesToConsume} messages...`
                );
              }

              // Stop when target reached
              if (consumedCount >= messagesToConsume) {
                if (consumerTag) {
                  this.channel.cancel(consumerTag).catch(() => {
                    // Ignore cancel errors
                  });
                }
                resolve();
              }
            } catch (error) {
              console.error(`❌ Error acknowledging message:`, error);
              this.channel.nack(msg, false, false);
            }
          },
          { noAck: false }
        )
        .then((result) => {
          consumerTag = result.consumerTag;
        })
        .catch(reject);

      // Timeout after 60 seconds
      setTimeout(() => {
        if (consumedCount < messagesToConsume) {
          console.log(
            `\n⏱️  Timeout reached. Consumed ${consumedCount}/${messagesToConsume} messages`
          );
          if (consumerTag && this.channel) {
            this.channel.cancel(consumerTag).catch(() => {});
          }
          resolve();
        }
      }, 60000);
    })
      .then(() => {
        // Verify final count
        return this.channel!.checkQueue(queueName);
      })
      .then((finalQueueInfo) => {
        console.log(`✅ Consumed ${consumedCount} messages`);
        console.log(`   Remaining: ${finalQueueInfo.messageCount} messages`);
        console.log(`   Consumers: ${finalQueueInfo.consumerCount}`);

        if (finalQueueInfo.messageCount === 0) {
          console.log(`✨ Queue is now empty - alerts should resolve`);
        } else if (finalQueueInfo.consumerCount > 0) {
          console.log(
            `✨ Consumer added - "Queue Without Consumers" alert should resolve`
          );
        }
      });
  }

  /**
   * Purge all messages from a queue
   * Resolves all queue-related alerts instantly
   */
  async purgeQueue(queueName: string): Promise<void> {
    if (!this.channel) throw new Error("Not connected");

    console.log(`\n🔵 Purging queue...`);
    console.log(`   Queue: ${queueName}`);

    // Check queue exists and get initial count
    let queueInfo;
    try {
      queueInfo = await this.channel.checkQueue(queueName);
    } catch (error) {
      console.error(`❌ Queue "${queueName}" does not exist`);
      throw error;
    }

    const initialCount = queueInfo.messageCount;
    console.log(`   Messages before purge: ${initialCount}`);

    if (initialCount === 0) {
      console.log(`✅ Queue is already empty`);
      return;
    }

    // Purge the queue
    const result = await this.channel.purgeQueue(queueName);
    const purgedCount = result.messageCount;

    console.log(`✅ Purged ${purgedCount} messages`);
    console.log(`✨ Queue is now empty - all queue alerts should resolve`);
  }

  /**
   * Acknowledge unacked messages
   * Resolves "High Unacknowledged Messages" alerts
   */
  async acknowledgeUnackedMessages(queueName: string): Promise<void> {
    if (!this.channel) throw new Error("Not connected");

    console.log(`\n🔵 Acknowledging unacked messages...`);
    console.log(`   Queue: ${queueName}`);

    // Check queue exists
    let queueInfo;
    try {
      queueInfo = await this.channel.checkQueue(queueName);
    } catch (error) {
      console.error(`❌ Queue "${queueName}" does not exist`);
      throw error;
    }

    // Note: checkQueue doesn't provide unacknowledged count via AMQP
    // We'll consume and acknowledge messages that are delivered but unacked
    console.log(`   Total messages in queue: ${queueInfo.messageCount}`);

    if (queueInfo.messageCount === 0) {
      console.log(`✅ Queue is empty, no messages to acknowledge`);
      return;
    }

    let ackedCount = 0;
    let consumerTag: string | null = null;

    return new Promise<void>((resolve, reject) => {
      if (!this.channel) {
        reject(new Error("Channel not available"));
        return;
      }

      // Consume messages (they're already delivered but unacked)
      this.channel
        .consume(
          queueName,
          (msg) => {
            if (!msg || !this.channel) return;

            try {
              // Acknowledge the message
              this.channel.ack(msg);
              ackedCount++;

              // Log progress
              if (ackedCount % 100 === 0) {
                console.log(`   Acknowledged ${ackedCount} messages...`);
              }

              // Check if we've acknowledged all unacked messages
              // Note: We can't know the exact count, so we'll continue until no more messages
            } catch (error) {
              console.error(`❌ Error acknowledging message:`, error);
              this.channel.nack(msg, false, false);
            }
          },
          { noAck: false }
        )
        .then((result) => {
          consumerTag = result.consumerTag;
        })
        .catch(reject);

      // Wait a bit then check if we're done
      setTimeout(async () => {
        try {
          if (consumerTag) {
            await this.channel!.cancel(consumerTag);
          }

          const finalQueueInfo = await this.channel!.checkQueue(queueName);

          console.log(`✅ Acknowledged ${ackedCount} messages`);
          console.log(
            `   Remaining messages in queue: ${finalQueueInfo.messageCount}`
          );

          if (finalQueueInfo.messageCount === 0) {
            console.log(`✨ All messages processed - alert should resolve`);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      }, 5000); // Wait 5 seconds to process messages
    });
  }

  /**
   * Consume messages from all known alert queues
   */
  async consumeAllAlertQueues(): Promise<void> {
    const alertQueues = [
      "alert-test-queue",
      "no-consumer-queue",
      "unacked-queue",
      "email.queue",
      "user.queue",
      "queue.notifications",
      "queue.analytics",
    ];

    console.log(`\n🔵 Consuming from all alert queues...`);
    console.log(`   Queues: ${alertQueues.join(", ")}`);

    for (const queueName of alertQueues) {
      try {
        const queueInfo = await this.channel!.checkQueue(queueName);
        if (queueInfo.messageCount > 0) {
          console.log(
            `\n📬 Processing ${queueName} (${queueInfo.messageCount} messages)...`
          );
          await this.consumeMessages(queueName);
        } else {
          console.log(`\n📭 ${queueName} is empty, skipping...`);
        }
      } catch (error) {
        // Queue doesn't exist, skip it
        console.log(`\n⚠️  ${queueName} does not exist, skipping...`);
      }
    }

    console.log(`\n✅ Finished processing all alert queues`);
  }
}

async function main() {
  // Get CloudAMQP URL from environment or use default
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
      "  CLOUDAMQP_URL=amqps://user:pass@host/vhost tsx scripts/rabbitmq/resolve-alerts.ts <action> [queue] [count]"
    );
    console.log("\nActions:");
    console.log(
      "  consume <queue> [count]  - Consume messages from queue (all or count)"
    );
    console.log("  purge <queue>            - Purge all messages from queue");
    console.log("  ack <queue>              - Acknowledge unacked messages");
    console.log(
      "  consume-all              - Consume from all known alert queues"
    );
    console.log("\nExamples:");
    console.log(
      "  CLOUDAMQP_URL=amqps://user:pass@host/vhost tsx scripts/rabbitmq/resolve-alerts.ts consume alert-test-queue 10000"
    );
    console.log(
      "  CLOUDAMQP_URL=amqps://user:pass@host/vhost tsx scripts/rabbitmq/resolve-alerts.ts purge alert-test-queue"
    );
    console.log(
      "  CLOUDAMQP_URL=amqps://user:pass@host/vhost tsx scripts/rabbitmq/resolve-alerts.ts ack unacked-queue"
    );
    console.log(
      "  CLOUDAMQP_URL=amqps://user:pass@host/vhost tsx scripts/rabbitmq/resolve-alerts.ts consume-all"
    );
    process.exit(1);
  }

  const resolver = new AlertResolver();
  const args = process.argv.slice(2);
  const action = args[0];
  const queueName = args[1];
  const count = args[2] ? parseInt(args[2]) : undefined;

  if (!action) {
    console.error("❌ Please specify an action");
    console.log("\nAvailable actions:");
    console.log("  consume <queue> [count]  - Consume messages from queue");
    console.log("  purge <queue>            - Purge all messages from queue");
    console.log("  ack <queue>              - Acknowledge unacked messages");
    console.log(
      "  consume-all              - Consume from all known alert queues"
    );
    process.exit(1);
  }

  try {
    await resolver.connect(amqpUrl);

    switch (action) {
      case "consume": {
        if (!queueName) {
          console.error("❌ Please specify a queue name");
          process.exit(1);
        }
        await resolver.consumeMessages(queueName, count);
        break;
      }
      case "purge": {
        if (!queueName) {
          console.error("❌ Please specify a queue name");
          process.exit(1);
        }
        await resolver.purgeQueue(queueName);
        break;
      }
      case "ack": {
        if (!queueName) {
          console.error("❌ Please specify a queue name");
          process.exit(1);
        }
        await resolver.acknowledgeUnackedMessages(queueName);
        break;
      }
      case "consume-all": {
        await resolver.consumeAllAlertQueues();
        break;
      }
      default:
        console.error(`❌ Unknown action: ${action}`);
        console.log("\nAvailable actions:");
        console.log("  consume <queue> [count]  - Consume messages from queue");
        console.log(
          "  purge <queue>            - Purge all messages from queue"
        );
        console.log(
          "  ack <queue>              - Acknowledge unacked messages"
        );
        console.log(
          "  consume-all              - Consume from all known alert queues"
        );
        process.exit(1);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✨ Alert resolution completed!");
    console.log("\n📋 Next steps:");
    console.log("   1. Wait for next alert check cycle (or trigger manually)");
    console.log("   2. Check 'Resolved Alerts' tab in Qarote");
    console.log("   3. Verify ResolvedAlert records in database");
  } catch (error) {
    console.error("\n💥 Error:", error);
    process.exit(1);
  } finally {
    await resolver.disconnect();
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  process.exit(0);
});

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  main().catch((error) => {
    console.error("💥 Unhandled error:", error);
    process.exit(1);
  });
}

export { AlertResolver };
