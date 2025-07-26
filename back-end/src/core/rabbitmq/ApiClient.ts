import { RabbitMQBaseClient } from "./BaseClient";
import { logger } from "../logger";
import { captureRabbitMQError } from "../sentry";
import type {
  RabbitMQOverview,
  RabbitMQQueue,
  RabbitMQNode,
  RabbitMQConnection,
  RabbitMQChannel,
  RabbitMQExchange,
  RabbitMQBinding,
  RabbitMQConsumer,
} from "@/types/rabbitmq";

export class RabbitMQApiClient extends RabbitMQBaseClient {
  async getOverview(): Promise<RabbitMQOverview> {
    try {
      logger.debug("Fetching RabbitMQ overview");
      const overview = await this.request("/overview");
      logger.debug("RabbitMQ overview fetched successfully");
      return overview;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ overview");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getOverview",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getQueues(): Promise<RabbitMQQueue[]> {
    try {
      logger.debug("Fetching RabbitMQ queues", { vhost: this.vhost });
      const queues = await this.request(`/queues/${this.vhost}`);
      logger.debug("RabbitMQ queues fetched successfully", {
        count: queues?.length || 0,
      });
      return queues;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ queues");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getQueues",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getNodes(): Promise<RabbitMQNode[]> {
    try {
      logger.debug("Fetching RabbitMQ nodes");
      const nodes = await this.request("/nodes");
      logger.debug("RabbitMQ nodes fetched successfully", {
        count: nodes?.length || 0,
      });
      return nodes;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ nodes");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getNodes",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getQueue(queueName: string): Promise<RabbitMQQueue> {
    try {
      logger.debug("Fetching RabbitMQ queue", { queueName });
      const encodedQueueName = encodeURIComponent(queueName);
      const queue = await this.request(
        `/queues/${this.vhost}/${encodedQueueName}`
      );
      logger.debug("RabbitMQ queue fetched successfully", { queueName });
      return queue;
    } catch (error) {
      logger.error("Failed to fetch RabbitMQ queue:", { error, queueName });

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getQueue",
          queueName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getConnections(): Promise<RabbitMQConnection[]> {
    try {
      logger.debug("Fetching RabbitMQ connections");
      const connections = await this.request("/connections");
      logger.debug("RabbitMQ connections fetched successfully", {
        count: connections?.length || 0,
      });
      return connections;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ connections");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getConnections",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getChannels(): Promise<RabbitMQChannel[]> {
    try {
      logger.debug("Fetching RabbitMQ channels");
      const channels = await this.request("/channels");
      logger.debug("RabbitMQ channels fetched successfully", {
        count: channels?.length || 0,
      });
      return channels;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ channels");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getChannels",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getExchanges(): Promise<RabbitMQExchange[]> {
    try {
      logger.debug("Fetching RabbitMQ exchanges");
      const exchanges = await this.request(`/exchanges/${this.vhost}`);
      logger.debug("RabbitMQ exchanges fetched successfully", {
        count: exchanges?.length || 0,
      });
      return exchanges;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ exchanges");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getExchanges",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getBindings(): Promise<RabbitMQBinding[]> {
    try {
      logger.debug("Fetching RabbitMQ bindings");
      const bindings = await this.request(`/bindings/${this.vhost}`);
      logger.debug("RabbitMQ bindings fetched successfully", {
        count: bindings?.length || 0,
      });
      return bindings;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ bindings");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getBindings",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getConsumers(): Promise<RabbitMQConsumer[]> {
    try {
      logger.debug("Fetching RabbitMQ consumers");
      const consumers = await this.request("/consumers");
      logger.debug("RabbitMQ consumers fetched successfully", {
        count: consumers?.length || 0,
      });
      return consumers;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ consumers");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getConsumers",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getQueueConsumers(queueName: string): Promise<RabbitMQConsumer[]> {
    try {
      logger.debug("Fetching RabbitMQ queue consumers", { queueName });
      const encodedQueueName = encodeURIComponent(queueName);
      const consumers = await this.getConsumers();
      const queueConsumers = consumers.filter(
        (consumer) =>
          consumer.queue?.name === encodedQueueName &&
          consumer.queue?.vhost === decodeURIComponent(this.vhost)
      );
      logger.debug("RabbitMQ queue consumers fetched successfully", {
        queueName,
        count: queueConsumers.length,
      });
      return queueConsumers;
    } catch (error) {
      logger.error("Failed to fetch RabbitMQ queue consumers:", {
        error,
        queueName,
      });

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getQueueConsumers",
          queueName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async createExchange(
    exchangeName: string,
    exchangeType: string,
    options: {
      durable?: boolean;
      auto_delete?: boolean;
      internal?: boolean;
      arguments?: { [key: string]: unknown };
    } = {}
  ): Promise<void> {
    try {
      logger.debug("Creating RabbitMQ exchange", {
        exchangeName,
        exchangeType,
        options,
      });

      const exchangeDefinition = {
        type: exchangeType,
        durable: options.durable ?? true,
        auto_delete: options.auto_delete ?? false,
        internal: options.internal ?? false,
        arguments: options.arguments ?? {},
      };

      // const encodedExchangeName = exchangeName;
      const encodedExchangeName = encodeURIComponent(exchangeName);

      await this.request(`/exchanges/${this.vhost}/${encodedExchangeName}`, {
        method: "PUT",
        body: JSON.stringify(exchangeDefinition),
      });

      logger.debug("RabbitMQ exchange created successfully", {
        exchangeName,
        exchangeType,
      });
    } catch (error) {
      logger.error(
        { error, exchangeName, exchangeType },
        "Failed to create RabbitMQ exchange"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "createExchange",
          exchange: exchangeName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async deleteExchange(
    exchangeName: string,
    options: {
      if_unused?: boolean;
    } = {}
  ): Promise<void> {
    try {
      logger.debug("Deleting RabbitMQ exchange", { exchangeName, options });

      const encodedExchangeName = encodeURIComponent(exchangeName);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.if_unused !== undefined) {
        queryParams.append("if-unused", options.if_unused.toString());
      }

      const queryString = queryParams.toString();
      const url = `/exchanges/${this.vhost}/${encodedExchangeName}${queryString ? `?${queryString}` : ""}`;

      await this.request(url, { method: "DELETE" });

      logger.debug("RabbitMQ exchange deleted successfully", { exchangeName });
    } catch (error) {
      logger.error(
        { error, exchangeName },
        "Failed to delete RabbitMQ exchange"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "deleteExchange",
          exchange: exchangeName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async deleteQueue(
    queueName: string,
    options: {
      if_unused?: boolean;
      if_empty?: boolean;
    } = {}
  ): Promise<void> {
    try {
      logger.debug("Deleting RabbitMQ queue", { queueName, options });

      const encodedQueueName = encodeURIComponent(queueName);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.if_unused !== undefined) {
        queryParams.append("if-unused", options.if_unused.toString());
      }
      if (options.if_empty !== undefined) {
        queryParams.append("if-empty", options.if_empty.toString());
      }

      const queryString = queryParams.toString();
      const url = `/queues/${this.vhost}/${encodedQueueName}${queryString ? `?${queryString}` : ""}`;

      await this.request(url, {
        method: "DELETE",
      });

      logger.debug("RabbitMQ queue deleted successfully", { queueName });
    } catch (error) {
      logger.error({ error, queueName }, "Failed to delete RabbitMQ queue");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "deleteQueue",
          queueName: queueName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }
}
