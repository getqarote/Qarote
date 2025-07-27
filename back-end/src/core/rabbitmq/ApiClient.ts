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
  RabbitMQVHost,
  VHostPermissions,
  VHostLimits,
  VHostTopicPermissions,
  CreateVHostRequest,
  UpdateVHostRequest,
  SetVHostPermissionsRequest,
  SetVHostLimitRequest,
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

  // VHost Management Methods
  async getVHosts(): Promise<RabbitMQVHost[]> {
    try {
      logger.debug("Fetching RabbitMQ VHosts");
      const vhosts = await this.request("/vhosts");
      logger.debug("RabbitMQ VHosts fetched successfully", {
        count: vhosts?.length || 0,
      });
      return vhosts;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ VHosts");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getVHosts",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getVHost(vhostName: string): Promise<RabbitMQVHost> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      logger.debug("Fetching RabbitMQ VHost", { vhostName });
      const vhost = await this.request(`/vhosts/${encodedVHostName}`);
      logger.debug("RabbitMQ VHost fetched successfully", { vhostName });
      return vhost;
    } catch (error) {
      logger.error({ error, vhostName }, "Failed to fetch RabbitMQ VHost");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getVHost",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async createVHost(data: CreateVHostRequest): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(data.name);
      logger.debug("Creating RabbitMQ VHost", { name: data.name });

      await this.request(`/vhosts/${encodedVHostName}`, {
        method: "PUT",
        body: JSON.stringify({
          description: data.description,
          tags: data.tags,
          tracing: data.tracing,
        }),
      });

      logger.debug("RabbitMQ VHost created successfully", { name: data.name });
    } catch (error) {
      logger.error(
        { error, vhostName: data.name },
        "Failed to create RabbitMQ VHost"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "createVHost",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async updateVHost(
    vhostName: string,
    data: UpdateVHostRequest
  ): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      logger.debug("Updating RabbitMQ VHost", { vhostName });

      await this.request(`/vhosts/${encodedVHostName}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });

      logger.debug("RabbitMQ VHost updated successfully", { vhostName });
    } catch (error) {
      logger.error({ error, vhostName }, "Failed to update RabbitMQ VHost");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "updateVHost",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async deleteVHost(vhostName: string): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      logger.debug("Deleting RabbitMQ VHost", { vhostName });

      await this.request(`/vhosts/${encodedVHostName}`, {
        method: "DELETE",
      });

      logger.debug("RabbitMQ VHost deleted successfully", { vhostName });
    } catch (error) {
      logger.error({ error, vhostName }, "Failed to delete RabbitMQ VHost");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "deleteVHost",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  // VHost Permissions Management
  async getVHostPermissions(vhostName: string): Promise<VHostPermissions[]> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      logger.debug("Fetching VHost permissions", { vhostName });
      const permissions = await this.request(
        `/vhosts/${encodedVHostName}/permissions`
      );
      logger.debug("VHost permissions fetched successfully", {
        vhostName,
        count: permissions?.length || 0,
      });
      return permissions;
    } catch (error) {
      logger.error({ error, vhostName }, "Failed to fetch VHost permissions");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getVHostPermissions",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async setUserPermissions(
    vhostName: string,
    username: string,
    permissions: SetVHostPermissionsRequest
  ): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      const encodedUsername = encodeURIComponent(username);
      logger.debug("Setting user permissions", { vhostName, username });

      await this.request(
        `/permissions/${encodedVHostName}/${encodedUsername}`,
        {
          method: "PUT",
          body: JSON.stringify({
            configure: permissions.configure,
            write: permissions.write,
            read: permissions.read,
          }),
        }
      );

      logger.debug("User permissions set successfully", {
        vhostName,
        username,
      });
    } catch (error) {
      logger.error(
        { error, vhostName, username },
        "Failed to set user permissions"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "setUserPermissions",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async deleteUserPermissions(
    vhostName: string,
    username: string
  ): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      const encodedUsername = encodeURIComponent(username);
      logger.debug("Deleting user permissions", { vhostName, username });

      await this.request(
        `/permissions/${encodedVHostName}/${encodedUsername}`,
        {
          method: "DELETE",
        }
      );

      logger.debug("User permissions deleted successfully", {
        vhostName,
        username,
      });
    } catch (error) {
      logger.error(
        { error, vhostName, username },
        "Failed to delete user permissions"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "deleteUserPermissions",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  // VHost Limits Management
  async getVHostLimits(vhostName: string): Promise<VHostLimits> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      logger.debug("Fetching VHost limits", { vhostName });
      const limits = await this.request(`/vhosts/${encodedVHostName}/limits`);
      logger.debug("VHost limits fetched successfully", { vhostName });
      return limits;
    } catch (error) {
      logger.error({ error, vhostName }, "Failed to fetch VHost limits");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getVHostLimits",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async setVHostLimit(
    vhostName: string,
    limitType: string,
    data: SetVHostLimitRequest
  ): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      logger.debug("Setting VHost limit", {
        vhostName,
        limitType,
        value: data.value,
      });

      await this.request(`/vhosts/${encodedVHostName}/limits/${limitType}`, {
        method: "PUT",
        body: JSON.stringify({ value: data.value }),
      });

      logger.debug("VHost limit set successfully", { vhostName, limitType });
    } catch (error) {
      logger.error(
        { error, vhostName, limitType },
        "Failed to set VHost limit"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "setVHostLimit",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async deleteVHostLimit(vhostName: string, limitType: string): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      logger.debug("Deleting VHost limit", { vhostName, limitType });

      await this.request(`/vhosts/${encodedVHostName}/limits/${limitType}`, {
        method: "DELETE",
      });

      logger.debug("VHost limit deleted successfully", {
        vhostName,
        limitType,
      });
    } catch (error) {
      logger.error(
        { error, vhostName, limitType },
        "Failed to delete VHost limit"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "deleteVHostLimit",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  // VHost Topic Permissions Management
  async getVHostTopicPermissions(
    vhostName: string
  ): Promise<VHostTopicPermissions[]> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      logger.debug("Fetching VHost topic permissions", { vhostName });
      const permissions = await this.request(
        `/vhosts/${encodedVHostName}/topic-permissions`
      );
      logger.debug("VHost topic permissions fetched successfully", {
        vhostName,
        count: permissions?.length || 0,
      });
      return permissions;
    } catch (error) {
      logger.error(
        { error, vhostName },
        "Failed to fetch VHost topic permissions"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getVHostTopicPermissions",

          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async setUserTopicPermissions(
    vhostName: string,
    username: string,
    exchange: string,
    writePattern: string,
    readPattern: string
  ): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      const encodedUsername = encodeURIComponent(username);
      const encodedExchange = encodeURIComponent(exchange);
      logger.debug("Setting user topic permissions", {
        vhostName,
        username,
        exchange,
      });

      await this.request(
        `/topic-permissions/${encodedVHostName}/${encodedUsername}/${encodedExchange}`,
        {
          method: "PUT",
          body: JSON.stringify({
            write: writePattern,
            read: readPattern,
          }),
        }
      );

      logger.debug("User topic permissions set successfully", {
        vhostName,
        username,
        exchange,
      });
    } catch (error) {
      logger.error(
        { error, vhostName, username, exchange },
        "Failed to set user topic permissions"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "setUserTopicPermissions",

          exchange: exchange,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async deleteUserTopicPermissions(
    vhostName: string,
    username: string,
    exchange: string
  ): Promise<void> {
    try {
      const encodedVHostName = encodeURIComponent(vhostName);
      const encodedUsername = encodeURIComponent(username);
      const encodedExchange = encodeURIComponent(exchange);
      logger.debug("Deleting user topic permissions", {
        vhostName,
        username,
        exchange,
      });

      await this.request(
        `/topic-permissions/${encodedVHostName}/${encodedUsername}/${encodedExchange}`,
        {
          method: "DELETE",
        }
      );

      logger.debug("User topic permissions deleted successfully", {
        vhostName,
        username,
        exchange,
      });
    } catch (error) {
      logger.error(
        { error, vhostName, username, exchange },
        "Failed to delete user topic permissions"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "deleteUserTopicPermissions",

          exchange: exchange,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }
}
