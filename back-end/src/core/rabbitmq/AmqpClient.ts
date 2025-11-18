import amqp from "amqplib";
import { logger } from "@/core/logger";
import { captureRabbitMQError } from "@/services/sentry";

export interface AMQPConnectionConfig {
  protocol: "amqp" | "amqps";
  hostname: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
  heartbeat?: number;
  connectionTimeout?: number;
  serverId?: string; // Add server ID for tracking
  serverName?: string; // Add server name for logging
}

export interface QueuePauseState {
  queueName: string;
  vhost: string;
  isPaused: boolean;
  pausedAt?: Date;
  resumedAt?: Date;
  pausedConsumers: string[];
  serverId?: string; // Track which server this relates to
}

/**
 * AMQP-based RabbitMQ client for direct protocol operations
 * This client handles operations that require AMQP protocol like consumer management
 * Supports dynamic connections to different RabbitMQ servers
 */
export class RabbitMQAmqpClient {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private config: AMQPConnectionConfig;
  private isConnected = false;
  private consumers: Map<string, amqp.Replies.Consume> = new Map();
  private pausedQueues: Map<string, QueuePauseState> = new Map();
  private persistenceCallback?: (
    serverId: string,
    pauseStates: QueuePauseState[]
  ) => Promise<void>;

  constructor(config: AMQPConnectionConfig) {
    this.config = config;
  }

  /**
   * Set callback for persisting pause states to database
   */
  setPersistenceCallback(
    callback: (
      serverId: string,
      pauseStates: QueuePauseState[]
    ) => Promise<void>
  ): void {
    this.persistenceCallback = callback;
  }

  /**
   * Load existing pause states from database
   */
  loadPauseStates(pauseStates: QueuePauseState[]): void {
    this.pausedQueues.clear();
    for (const state of pauseStates) {
      this.pausedQueues.set(state.queueName, state);
    }
  }

  /**
   * Persist pause states to database
   */
  private async persistPauseStates(): Promise<void> {
    if (this.persistenceCallback && this.config.serverId) {
      const states = Array.from(this.pausedQueues.values());
      try {
        await this.persistenceCallback(this.config.serverId, states);
      } catch (error) {
        logger.warn({ error }, "Failed to persist pause states to database:");
      }
    }
  }

  /**
   * Connect to RabbitMQ via AMQP protocol
   * Creates dynamic connection based on server configuration
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        return;
      }

      const connectionUrl = `${this.config.protocol}://${this.config.username}:${this.config.password}@${this.config.hostname}:${this.config.port}${this.config.vhost}`;

      logger.info(
        {
          serverId: this.config.serverId,
          serverName: this.config.serverName,
          hostname: this.config.hostname,
          port: this.config.port,
          vhost: this.config.vhost,
          protocol: this.config.protocol,
        },
        "Connecting to RabbitMQ via AMQP"
      );

      this.connection = await amqp.connect(connectionUrl, {
        heartbeat: this.config.heartbeat || 60,
        timeout: this.config.connectionTimeout || 30000,
      });

      this.channel = await this.connection.createChannel();

      // Set up connection event handlers
      this.connection.on("error", (error: Error) => {
        logger.error(
          {
            serverId: this.config.serverId,
            serverName: this.config.serverName,
            error: error.message,
          },
          "AMQP connection error:"
        );
        this.isConnected = false;
      });

      this.connection.on("close", () => {
        logger.info(
          {
            serverId: this.config.serverId,
            serverName: this.config.serverName,
          },
          "AMQP connection closed"
        );
        this.isConnected = false;
      });

      this.isConnected = true;
      logger.info(
        {
          serverId: this.config.serverId,
          serverName: this.config.serverName,
        },
        "Successfully connected to RabbitMQ via AMQP"
      );
    } catch (error) {
      logger.error(
        {
          serverId: this.config.serverId,
          serverName: this.config.serverName,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to connect to RabbitMQ via AMQP:"
      );
      this.isConnected = false;

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "amqp_connect",
          serverId: this.config.serverId || this.config.hostname,
        });
      }

      throw error;
    }
  }

  /**
   * Disconnect from RabbitMQ
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.isConnected = false;
      this.consumers.clear();

      logger.info("Disconnected from RabbitMQ AMQP");

      // Notify factory to decrement connection count (only if actually disconnected)
      if (this.config.serverId) {
        const { RabbitMQAmqpClientFactory } = await import("./AmqpFactory.js");
        await RabbitMQAmqpClientFactory.removeClient(this.config.serverId);
      }
    } catch (error) {
      logger.error({ error }, "Error disconnecting from RabbitMQ AMQP:");
      throw error;
    }
  }

  /**
   * Ensure we have an active connection and channel
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected || !this.connection || !this.channel) {
      await this.connect();
    }
  }

  /**
   * Pause a queue by creating a blocking consumer
   * This effectively pauses message processing
   */
  async pauseQueue(queueName: string): Promise<QueuePauseState> {
    try {
      await this.ensureConnection();

      if (!this.channel) {
        throw new Error("No AMQP channel available");
      }

      logger.info(`Pausing queue via AMQP: ${queueName}`);

      // Check if queue exists
      try {
        await this.channel.checkQueue(queueName);
      } catch (error) {
        throw new Error(`Queue "${queueName}" does not exist`);
      }

      // Create a blocking consumer with high priority that will consume but not ack messages
      // This effectively pauses the queue by preventing other consumers from processing
      const pauseConsumerTag = `pause-${queueName}-${Date.now()}`;

      const consumeResult = await this.channel.consume(
        queueName,
        (msg) => {
          if (msg) {
            // Don't acknowledge the message - this blocks the queue
            // The message will be redelivered when we cancel this consumer
            logger.debug(
              `Pause consumer received message on ${queueName}, holding without ack`
            );
          }
        },
        {
          consumerTag: pauseConsumerTag,
          priority: 255, // Highest priority to ensure this consumer gets messages first
          exclusive: false,
          noAck: false, // Important: we need manual ack control
        }
      );

      if (consumeResult) {
        this.consumers.set(pauseConsumerTag, consumeResult);
      }

      const pauseState: QueuePauseState = {
        queueName,
        vhost: this.config.vhost,
        isPaused: true,
        pausedAt: new Date(),
        pausedConsumers: [pauseConsumerTag],
        serverId: this.config.serverId,
      };

      this.pausedQueues.set(queueName, pauseState);

      // Persist to database
      await this.persistPauseStates();

      logger.info(`Queue ${queueName} paused successfully via AMQP`, {
        serverId: this.config.serverId,
        serverName: this.config.serverName,
        pauseConsumerTag,
        pausedAt: pauseState.pausedAt,
      });

      return pauseState;
    } catch (error) {
      logger.error(`Failed to pause queue ${queueName} via AMQP:`, error);

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "amqp_pause_queue",
          queueName,
        });
      }

      throw error;
    }
  }

  /**
   * Resume a queue by cancelling the blocking consumer
   */
  async resumeQueue(queueName: string): Promise<QueuePauseState> {
    try {
      await this.ensureConnection();

      if (!this.channel) {
        throw new Error("No AMQP channel available");
      }

      logger.info(`Resuming queue via AMQP: ${queueName}`);

      const pauseState = this.pausedQueues.get(queueName);
      if (!pauseState) {
        throw new Error(`Queue "${queueName}" is not currently paused`);
      }

      // Cancel all pause consumers for this queue
      for (const consumerTag of pauseState.pausedConsumers) {
        try {
          await this.channel.cancel(consumerTag);
          this.consumers.delete(consumerTag);
          logger.debug(`Cancelled pause consumer: ${consumerTag}`);
        } catch (error) {
          logger.warn(`Failed to cancel pause consumer ${consumerTag}:`, error);
        }
      }

      const resumedState: QueuePauseState = {
        ...pauseState,
        isPaused: false,
        resumedAt: new Date(),
        pausedConsumers: [],
      };

      this.pausedQueues.set(queueName, resumedState);

      // Persist to database
      await this.persistPauseStates();

      logger.info(`Queue ${queueName} resumed successfully via AMQP`, {
        serverId: this.config.serverId,
        serverName: this.config.serverName,
        resumedAt: resumedState.resumedAt,
        cancelledConsumers: pauseState.pausedConsumers.length,
      });

      return resumedState;
    } catch (error) {
      logger.error(`Failed to resume queue ${queueName} via AMQP:`, error);

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "amqp_resume_queue",
          queueName,
        });
      }

      throw error;
    }
  }

  /**
   * Get the pause state of a queue
   */
  getQueuePauseState(queueName: string): QueuePauseState | null {
    return this.pausedQueues.get(queueName) || null;
  }

  /**
   * Get all paused queues
   */
  getAllPausedQueues(): QueuePauseState[] {
    return Array.from(this.pausedQueues.values()).filter(
      (state) => state.isPaused
    );
  }

  /**
   * Check if a queue is currently paused
   */
  isQueuePaused(queueName: string): boolean {
    const state = this.pausedQueues.get(queueName);
    return state?.isPaused || false;
  }

  /**
   * Create a queue with specified options
   */
  async createQueue(
    queueName: string,
    options: amqp.Options.AssertQueue = {}
  ): Promise<void> {
    await this.ensureConnection();

    if (!this.channel) {
      throw new Error("No AMQP channel available");
    }

    await this.channel.assertQueue(queueName, options);
    logger.info(`Created queue: ${queueName}`, { options });
  }

  /**
   * Create a basic consumer for testing
   */
  async createConsumer(
    queueName: string,
    onMessage: (msg: amqp.ConsumeMessage | null) => void,
    options: amqp.Options.Consume = {}
  ): Promise<string> {
    await this.ensureConnection();

    if (!this.channel) {
      throw new Error("No AMQP channel available");
    }

    const result = await this.channel.consume(queueName, onMessage, options);
    const consumerTag = result.consumerTag;

    this.consumers.set(consumerTag, result);

    logger.info(`Created consumer for queue ${queueName}`, { consumerTag });

    return consumerTag;
  }

  /**
   * Cancel a consumer
   */
  async cancelConsumer(consumerTag: string): Promise<void> {
    await this.ensureConnection();

    if (!this.channel) {
      throw new Error("No AMQP channel available");
    }

    await this.channel.cancel(consumerTag);
    this.consumers.delete(consumerTag);

    logger.info(`Cancelled consumer: ${consumerTag}`);
  }

  /**
   * Acknowledge a message
   */
  async acknowledgeMessage(msg: amqp.ConsumeMessage): Promise<void> {
    if (!this.channel) {
      throw new Error("No AMQP channel available for acknowledgment");
    }

    try {
      this.channel.ack(msg);
      logger.debug(`Message acknowledged`, {
        deliveryTag: msg.fields.deliveryTag,
        consumerTag: msg.fields.consumerTag,
      });
    } catch (error) {
      logger.error({ error }, "Failed to acknowledge message");
      throw error;
    }
  }

  /**
   * Negative acknowledge a message (reject and requeue)
   */
  async negativeAcknowledgeMessage(
    msg: amqp.ConsumeMessage,
    requeue: boolean = false
  ): Promise<void> {
    if (!this.channel) {
      throw new Error("No AMQP channel available for negative acknowledgment");
    }

    try {
      this.channel.nack(msg, false, requeue);
      logger.debug(`Message negative acknowledged`, {
        deliveryTag: msg.fields.deliveryTag,
        consumerTag: msg.fields.consumerTag,
        requeue,
      });
    } catch (error) {
      logger.error({ error }, "Failed to negative acknowledge message");
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isConnectionActive(): boolean {
    return this.isConnected && !!this.connection && !!this.channel;
  }

  /**
   * Clean up resources when the client is destroyed
   */
  async cleanup(): Promise<void> {
    try {
      // Cancel all consumers
      for (const consumerTag of this.consumers.keys()) {
        try {
          await this.cancelConsumer(consumerTag);
        } catch (error) {
          logger.warn(
            `Failed to cancel consumer ${consumerTag} during cleanup:`,
            error
          );
        }
      }

      // Disconnect
      await this.disconnect();
    } catch (error) {
      logger.error({ error }, "Error during AMQP client cleanup:");
    }
  }
}
