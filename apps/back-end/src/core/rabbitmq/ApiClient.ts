import type {
  CreateVHostRequest,
  RabbitMQBinding,
  RabbitMQChannel,
  RabbitMQConnection,
  RabbitMQConsumer,
  RabbitMQExchange,
  RabbitMQNode,
  RabbitMQOverview,
  RabbitMQQueue,
  RabbitMQUser,
  RabbitMQUserPermission,
  RabbitMQVHost,
  SetVHostLimitRequest,
  SetVHostPermissionsRequest,
  UpdateUserData,
  UpdateVHostRequest,
  VHostLimits,
  VHostPermissions,
  VHostTopicPermissions,
} from "@/types/rabbitmq";

import { captureRabbitMQError } from "../../services/sentry";
import { logger } from "../logger";
import { RabbitMQBaseClient } from "./BaseClient";

export class RabbitMQApiClient extends RabbitMQBaseClient {
  async getOverview(): Promise<RabbitMQOverview> {
    try {
      logger.debug("Fetching RabbitMQ overview");
      const overview = await this.request<RabbitMQOverview>("/overview");
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

  async getOverviewWithTimeRange(timeRange: {
    age: number; // seconds (e.g., 60 for last minute, 600 for last 10 minutes, 3600 for last hour)
    increment: number; // seconds between samples (e.g., 10)
  }): Promise<RabbitMQOverview> {
    try {
      logger.debug(
        {
          age: timeRange.age,
          increment: timeRange.increment,
        },
        "Fetching RabbitMQ overview with time range"
      );

      const queryParams = new URLSearchParams({
        msg_rates_age: timeRange.age.toString(),
        msg_rates_incr: timeRange.increment.toString(),
        lengths_age: timeRange.age.toString(),
        lengths_incr: timeRange.increment.toString(),
        columns:
          "queue_totals.messages,queue_totals.messages_details,queue_totals.messages_ready,queue_totals.messages_ready_details,queue_totals.messages_unacknowledged,queue_totals.messages_unacknowledged_details,message_stats.publish,message_stats.publish_details,message_stats.deliver,message_stats.deliver_details,message_stats.ack,message_stats.ack_details,message_stats.deliver_get,message_stats.deliver_get_details,message_stats.confirm,message_stats.confirm_details,message_stats.get,message_stats.get_details,message_stats.get_no_ack,message_stats.get_no_ack_details,message_stats.redeliver,message_stats.redeliver_details,message_stats.reject,message_stats.reject_details,message_stats.return_unroutable,message_stats.return_unroutable_details,message_stats.disk_reads,message_stats.disk_reads_details,message_stats.disk_writes,message_stats.disk_writes_details",
      });

      const overview = await this.request<RabbitMQOverview>(
        `/overview?${queryParams.toString()}`
      );
      logger.debug("RabbitMQ overview with time range fetched successfully");
      return overview;
    } catch (error) {
      logger.error(
        { error },
        "Failed to fetch RabbitMQ overview with time range"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getOverviewWithTimeRange",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getQueues(vhost?: string): Promise<RabbitMQQueue[]> {
    try {
      // Follow RabbitMQ API: /api/queues for all, /api/queues/vhost for filtered
      const endpoint = vhost
        ? `/queues/${encodeURIComponent(vhost)}`
        : "/queues";
      logger.debug({ vhost: vhost || "all" }, "Fetching RabbitMQ queues");
      const queues = await this.request<RabbitMQQueue[]>(endpoint);
      logger.debug(
        {
          count: queues?.length || 0,
        },
        "RabbitMQ queues fetched successfully"
      );
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

  async getQueuesWithTimeRange(
    timeRange: {
      age: number; // seconds (e.g., 60 for last minute, 600 for last 10 minutes, 3600 for last hour)
      increment: number; // seconds between samples (e.g., 10)
    },
    vhost?: string
  ): Promise<RabbitMQQueue[]> {
    try {
      logger.debug(
        {
          vhost: vhost || "all",
          age: timeRange.age,
          increment: timeRange.increment,
        },
        "Fetching RabbitMQ queues with time range"
      );

      const queryParams = new URLSearchParams({
        msg_rates_age: timeRange.age.toString(),
        msg_rates_incr: timeRange.increment.toString(),
        columns:
          "name,message_stats.publish,message_stats.publish_details,message_stats.deliver,message_stats.deliver_details,message_stats.ack,message_stats.ack_details,message_stats.deliver_get,message_stats.deliver_get_details,message_stats.confirm,message_stats.confirm_details,message_stats.get,message_stats.get_details,message_stats.get_no_ack,message_stats.get_no_ack_details,message_stats.redeliver,message_stats.redeliver_details,message_stats.reject,message_stats.reject_details,message_stats.return_unroutable,message_stats.return_unroutable_details",
      });

      // Follow RabbitMQ API: /api/queues for all, /api/queues/vhost for filtered
      const endpoint = vhost
        ? `/queues/${encodeURIComponent(vhost)}`
        : "/queues";
      const queues = await this.request<RabbitMQQueue[]>(
        `${endpoint}?${queryParams.toString()}`
      );
      logger.debug(
        {
          count: queues?.length || 0,
        },
        "RabbitMQ queues with time range fetched successfully"
      );
      return queues;
    } catch (error) {
      logger.error(
        { error },
        "Failed to fetch RabbitMQ queues with time range"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getQueuesWithTimeRange",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getNodes(): Promise<RabbitMQNode[]> {
    try {
      logger.debug("Fetching RabbitMQ nodes");
      const nodes = await this.request<RabbitMQNode[]>("/nodes");
      logger.debug(
        {
          count: nodes?.length || 0,
        },
        "RabbitMQ nodes fetched successfully"
      );
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

  async getQueue(queueName: string, vhost: string): Promise<RabbitMQQueue> {
    try {
      logger.debug({ queueName, vhost }, "Fetching RabbitMQ queue");
      const encodedQueueName = encodeURIComponent(queueName);
      const encodedVhost = encodeURIComponent(vhost);
      const queue = await this.request<RabbitMQQueue>(
        `/queues/${encodedVhost}/${encodedQueueName}`
      );
      logger.debug({ queueName, vhost }, "RabbitMQ queue fetched successfully");
      return queue;
    } catch (error) {
      logger.error(
        { error, queueName, vhost },
        "Failed to fetch RabbitMQ queue:"
      );

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

  async getQueueWithTimeRange(
    queueName: string,
    timeRange: {
      age: number; // seconds (e.g., 60 for last minute, 600 for last 10 minutes, 3600 for last hour)
      increment: number; // seconds between samples (e.g., 10)
    },
    vhost: string
  ): Promise<RabbitMQQueue> {
    try {
      logger.debug(
        {
          queueName,
          vhost,
          age: timeRange.age,
          increment: timeRange.increment,
        },
        "Fetching RabbitMQ queue with time range"
      );

      const encodedQueueName = encodeURIComponent(queueName);
      const encodedVhost = encodeURIComponent(vhost);
      const queryParams = new URLSearchParams({
        msg_rates_age: timeRange.age.toString(),
        msg_rates_incr: timeRange.increment.toString(),
        lengths_age: timeRange.age.toString(),
        lengths_incr: timeRange.increment.toString(),
        columns:
          "name,messages,messages_details,messages_ready,messages_ready_details,messages_unacknowledged,messages_unacknowledged_details,message_stats.publish,message_stats.publish_details,message_stats.deliver,message_stats.deliver_details,message_stats.ack,message_stats.ack_details,message_stats.deliver_get,message_stats.deliver_get_details,message_stats.confirm,message_stats.confirm_details,message_stats.get,message_stats.get_details,message_stats.get_no_ack,message_stats.get_no_ack_details,message_stats.redeliver,message_stats.redeliver_details,message_stats.reject,message_stats.reject_details,message_stats.return_unroutable,message_stats.return_unroutable_details",
      });

      const queue = await this.request<RabbitMQQueue>(
        `/queues/${encodedVhost}/${encodedQueueName}?${queryParams.toString()}`
      );
      logger.debug(
        {
          queueName,
          vhost,
        },
        "RabbitMQ queue with time range fetched successfully"
      );
      return queue;
    } catch (error) {
      logger.error(
        { error, queueName, vhost },
        "Failed to fetch RabbitMQ queue with time range"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getQueueWithTimeRange",
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
      const connections =
        await this.request<RabbitMQConnection[]>("/connections");
      logger.debug(
        {
          count: connections?.length || 0,
        },
        "RabbitMQ connections fetched successfully"
      );
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
      const channels = await this.request<RabbitMQChannel[]>("/channels");
      logger.debug(
        {
          count: channels?.length || 0,
        },
        "RabbitMQ channels fetched successfully"
      );
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

  async getExchanges(vhost?: string): Promise<RabbitMQExchange[]> {
    try {
      // Follow RabbitMQ API: /api/exchanges for all, /api/exchanges/vhost for filtered
      const endpoint = vhost
        ? `/exchanges/${encodeURIComponent(vhost)}`
        : "/exchanges";
      logger.debug({ vhost: vhost || "all" }, "Fetching RabbitMQ exchanges");
      const exchanges = await this.request<RabbitMQExchange[]>(endpoint);
      logger.debug(
        {
          count: exchanges?.length || 0,
        },
        "RabbitMQ exchanges fetched successfully"
      );
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

  async getBindings(vhost?: string): Promise<RabbitMQBinding[]> {
    try {
      // Follow RabbitMQ API: /api/bindings for all, /api/bindings/vhost for filtered
      const endpoint = vhost
        ? `/bindings/${encodeURIComponent(vhost)}`
        : "/bindings";
      logger.debug({ vhost: vhost || "all" }, "Fetching RabbitMQ bindings");
      const bindings = await this.request<RabbitMQBinding[]>(endpoint);
      logger.debug(
        {
          count: bindings?.length || 0,
        },
        "RabbitMQ bindings fetched successfully"
      );
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
      const consumers = await this.request<RabbitMQConsumer[]>("/consumers");
      logger.debug(
        {
          count: consumers?.length || 0,
        },
        "RabbitMQ consumers fetched successfully"
      );
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

  async getQueueConsumers(
    queueName: string,
    vhost: string
  ): Promise<RabbitMQConsumer[]> {
    try {
      logger.debug({ queueName, vhost }, "Fetching RabbitMQ queue consumers");
      const encodedQueueName = encodeURIComponent(queueName);
      const consumers = await this.getConsumers();
      const queueConsumers = consumers.filter(
        (consumer) =>
          consumer.queue?.name === encodedQueueName &&
          consumer.queue?.vhost === vhost
      );
      logger.debug(
        {
          queueName,
          vhost,
          count: queueConsumers.length,
        },
        "RabbitMQ queue consumers fetched successfully"
      );
      return queueConsumers;
    } catch (error) {
      logger.error(
        { error, queueName, vhost },
        "Failed to fetch RabbitMQ queue consumers"
      );

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

  async getQueueBindings(
    queueName: string,
    vhost: string
  ): Promise<RabbitMQBinding[]> {
    try {
      logger.debug({ queueName, vhost }, "Fetching RabbitMQ queue bindings");
      const encodedQueueName = encodeURIComponent(queueName);
      const encodedVhost = encodeURIComponent(vhost);
      const bindings = await this.request<RabbitMQBinding[]>(
        `/queues/${encodedVhost}/${encodedQueueName}/bindings`
      );
      logger.debug(
        {
          queueName,
          vhost,
          count: bindings?.length || 0,
        },
        "RabbitMQ queue bindings fetched successfully"
      );
      return bindings;
    } catch (error) {
      logger.error(
        { error, queueName, vhost },
        "Failed to fetch RabbitMQ queue bindings"
      );

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getQueueBindings",
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
    vhost: string,
    options: {
      durable?: boolean;
      auto_delete?: boolean;
      internal?: boolean;
      arguments?: { [key: string]: unknown };
    } = {}
  ): Promise<void> {
    try {
      logger.debug(
        {
          exchangeName,
          exchangeType,
          vhost,
          options,
        },
        "Creating RabbitMQ exchange"
      );

      const exchangeDefinition = {
        type: exchangeType,
        durable: options.durable ?? true,
        auto_delete: options.auto_delete ?? false,
        internal: options.internal ?? false,
        arguments: options.arguments ?? {},
      };

      const encodedExchangeName = encodeURIComponent(exchangeName);
      const encodedVhost = encodeURIComponent(vhost);

      await this.request(`/exchanges/${encodedVhost}/${encodedExchangeName}`, {
        method: "PUT",
        body: JSON.stringify(exchangeDefinition),
      });

      logger.debug(
        {
          exchangeName,
          exchangeType,
          vhost,
        },
        "RabbitMQ exchange created successfully"
      );
    } catch (error) {
      logger.error(
        { error, exchangeName, exchangeType, vhost },
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
    vhost: string,
    options: {
      if_unused?: boolean;
    } = {}
  ): Promise<void> {
    try {
      logger.debug(
        {
          exchangeName,
          vhost,
          options,
        },
        "Deleting RabbitMQ exchange"
      );

      const encodedExchangeName = encodeURIComponent(exchangeName);
      const encodedVhost = encodeURIComponent(vhost);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.if_unused !== undefined) {
        queryParams.append("if-unused", options.if_unused.toString());
      }

      const queryString = queryParams.toString();
      const url = `/exchanges/${encodedVhost}/${encodedExchangeName}${queryString ? `?${queryString}` : ""}`;

      await this.request(url, { method: "DELETE" });

      logger.debug(
        {
          exchangeName,
          vhost,
        },
        "RabbitMQ exchange deleted successfully"
      );
    } catch (error) {
      logger.error(
        { error, exchangeName, vhost },
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
    vhost: string,
    options: {
      if_unused?: boolean;
      if_empty?: boolean;
    } = {}
  ): Promise<void> {
    try {
      logger.debug({ queueName, vhost, options }, "Deleting RabbitMQ queue");

      const encodedQueueName = encodeURIComponent(queueName);
      const encodedVhost = encodeURIComponent(vhost);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.if_unused !== undefined) {
        queryParams.append("if-unused", options.if_unused.toString());
      }
      if (options.if_empty !== undefined) {
        queryParams.append("if-empty", options.if_empty.toString());
      }

      const queryString = queryParams.toString();
      const url = `/queues/${encodedVhost}/${encodedQueueName}${queryString ? `?${queryString}` : ""}`;

      await this.request(url, {
        method: "DELETE",
      });

      logger.debug({ queueName, vhost }, "RabbitMQ queue deleted successfully");
    } catch (error) {
      logger.error(
        { error, queueName, vhost },
        "Failed to delete RabbitMQ queue"
      );

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
      const vhosts = await this.request<RabbitMQVHost[]>("/vhosts");
      logger.debug(
        {
          count: vhosts?.length || 0,
        },
        "RabbitMQ VHosts fetched successfully"
      );
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
      logger.debug({ vhostName }, "Fetching RabbitMQ VHost");
      const vhost = await this.request<RabbitMQVHost>(
        `/vhosts/${encodedVHostName}`
      );
      logger.debug({ vhostName }, "RabbitMQ VHost fetched successfully");
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
      logger.debug({ name: data.name }, "Creating RabbitMQ VHost");

      await this.request(`/vhosts/${encodedVHostName}`, {
        method: "PUT",
        body: JSON.stringify({
          description: data.description,
          tags: data.tags,
          tracing: data.tracing,
        }),
      });

      logger.debug({ name: data.name }, "RabbitMQ VHost created successfully");
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
      logger.debug({ vhostName }, "Updating RabbitMQ VHost");

      await this.request(`/vhosts/${encodedVHostName}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });

      logger.debug({ vhostName }, "RabbitMQ VHost updated successfully");
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
      logger.debug({ vhostName }, "Deleting RabbitMQ VHost");

      await this.request(`/vhosts/${encodedVHostName}`, {
        method: "DELETE",
      });

      logger.debug({ vhostName }, "RabbitMQ VHost deleted successfully");
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
      logger.debug({ vhostName }, "Fetching VHost permissions");
      const permissions = await this.request<VHostPermissions[]>(
        `/vhosts/${encodedVHostName}/permissions`
      );
      logger.debug(
        {
          vhostName,
          count: permissions?.length || 0,
        },
        "VHost permissions fetched successfully"
      );
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
      logger.debug({ vhostName, username }, "Setting user permissions");

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

      logger.debug(
        {
          vhostName,
          username,
        },
        "User permissions set successfully"
      );
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
      logger.debug({ vhostName, username }, "Deleting user permissions");

      await this.request(
        `/permissions/${encodedVHostName}/${encodedUsername}`,
        {
          method: "DELETE",
        }
      );

      logger.debug(
        {
          vhostName,
          username,
        },
        "User permissions deleted successfully"
      );
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
      logger.debug({ vhostName }, "Fetching VHost limits");
      const limits = await this.request<VHostLimits>(
        `/vhost-limits/${encodedVHostName}`
      );
      logger.debug({ vhostName }, "VHost limits fetched successfully");
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
      logger.debug(
        {
          vhostName,
          limitType,
          value: data.value,
        },
        "Setting VHost limit"
      );

      await this.request(`/vhost-limits/${encodedVHostName}/${limitType}`, {
        method: "PUT",
        body: JSON.stringify({ value: data.value }),
      });

      logger.debug({ vhostName, limitType }, "VHost limit set successfully");
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
      logger.debug({ vhostName, limitType }, "Deleting VHost limit");

      await this.request(`/vhosts/${encodedVHostName}/limits/${limitType}`, {
        method: "DELETE",
      });

      logger.debug(
        {
          vhostName,
          limitType,
        },
        "VHost limit deleted successfully"
      );
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
      logger.debug({ vhostName }, "Fetching VHost topic permissions");
      const permissions = await this.request<VHostTopicPermissions[]>(
        `/vhosts/${encodedVHostName}/topic-permissions`
      );
      logger.debug(
        {
          vhostName,
          count: permissions?.length || 0,
        },
        "VHost topic permissions fetched successfully"
      );
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
      logger.debug(
        {
          vhostName,
          username,
          exchange,
        },
        "Setting user topic permissions"
      );

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

      logger.debug(
        {
          vhostName,
          username,
          exchange,
        },
        "User topic permissions set successfully"
      );
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
      logger.debug(
        {
          vhostName,
          username,
          exchange,
        },
        "Deleting user topic permissions"
      );

      await this.request(
        `/topic-permissions/${encodedVHostName}/${encodedUsername}/${encodedExchange}`,
        {
          method: "DELETE",
        }
      );

      logger.debug(
        {
          vhostName,
          username,
          exchange,
        },
        "User topic permissions deleted successfully"
      );
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

  // User Management Methods
  async getUsers(): Promise<RabbitMQUser[]> {
    try {
      logger.debug("Fetching RabbitMQ users");
      const users = await this.request<RabbitMQUser[]>("/users");
      logger.debug(
        {
          count: users?.length || 0,
        },
        "RabbitMQ users fetched successfully"
      );
      return users;
    } catch (error) {
      logger.error({ error }, "Failed to fetch RabbitMQ users");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getUsers",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getUser(username: string): Promise<RabbitMQUser> {
    try {
      const encodedUsername = encodeURIComponent(username);
      logger.debug({ username }, "Fetching RabbitMQ user");
      const user = await this.request<RabbitMQUser>(
        `/users/${encodedUsername}`
      );
      logger.debug({ username }, "RabbitMQ user fetched successfully");
      return user;
    } catch (error) {
      logger.error({ error, username }, "Failed to fetch RabbitMQ user");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getUser",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getUserPermissions(
    username: string
  ): Promise<RabbitMQUserPermission[]> {
    try {
      const encodedUsername = encodeURIComponent(username);
      logger.debug({ username }, "Fetching user permissions");
      const permissions = await this.request<RabbitMQUserPermission[]>(
        `/users/${encodedUsername}/permissions`
      );
      logger.debug({ username }, "User permissions fetched successfully");
      return permissions;
    } catch (error) {
      logger.error({ error, username }, "Failed to fetch user permissions");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getUserPermissions",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async createUser(
    username: string,
    userData: { password?: string; tags: string }
  ): Promise<void> {
    try {
      const encodedUsername = encodeURIComponent(username);
      logger.debug({ username }, "Creating RabbitMQ user");

      await this.request(`/users/${encodedUsername}`, {
        method: "PUT",
        body: JSON.stringify({
          password: userData.password,
          tags: userData.tags,
        }),
      });

      logger.debug({ username }, "RabbitMQ user created successfully");
    } catch (error) {
      logger.error({ error, username }, "Failed to create RabbitMQ user");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "createUser",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async updateUser(username: string, userData: UpdateUserData): Promise<void> {
    try {
      const encodedUsername = encodeURIComponent(username);
      logger.debug({ username, userData }, "Updating RabbitMQ user");

      await this.request(`/users/${encodedUsername}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      logger.debug({ username }, "RabbitMQ user updated successfully");
    } catch (error) {
      // Enhanced error logging to capture RabbitMQ error details
      const errorDetails: {
        username: string;
        userData: UpdateUserData;
        operation: string;
        serverId: string;
        errorMessage?: string;
        errorStack?: string;
        rabbitMQReason?: unknown;
        responseStatus?: number;
        responseStatusText?: string;
        responseBody?: string;
      } = {
        username,
        userData,
        operation: "updateUser",
        serverId: this.baseUrl,
      };

      if (error instanceof Error) {
        errorDetails.errorMessage = error.message;
        errorDetails.errorStack = error.stack;

        // Extract error cause (RabbitMQ API reason) if available
        const errorWithCause = error as Error & { cause?: unknown };
        if (errorWithCause.cause) {
          errorDetails.rabbitMQReason = errorWithCause.cause;
        }

        // Try to extract response details if available
        const errorWithResponse = error as Error & {
          response?: { status?: number; statusText?: string };
        };
        if (errorWithResponse.response) {
          errorDetails.responseStatus = errorWithResponse.response?.status;
          errorDetails.responseStatusText =
            errorWithResponse.response?.statusText;
          try {
            const errorWithTextResponse = error as {
              response?: { text?: () => Promise<string> };
            };
            if (errorWithTextResponse.response?.text) {
              errorDetails.responseBody =
                await errorWithTextResponse.response.text();
            }
          } catch {
            // Ignore if we can't read the response body
          }
        }

        logger.error(
          { errorDetails },
          "Failed to update RabbitMQ user - detailed error"
        );

        captureRabbitMQError(error, {
          operation: "updateUser",
          serverId: this.baseUrl,
        });
      } else {
        logger.error(
          { errorDetails, error },
          "Failed to update RabbitMQ user - unknown error type"
        );
      }

      throw error;
    }
  }

  async deleteUser(username: string): Promise<void> {
    try {
      const encodedUsername = encodeURIComponent(username);
      logger.debug({ username }, "Deleting RabbitMQ user");

      await this.request(`/users/${encodedUsername}`, {
        method: "DELETE",
      });

      logger.debug({ username }, "RabbitMQ user deleted successfully");
    } catch (error) {
      logger.error({ error, username }, "Failed to delete RabbitMQ user");

      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "deleteUser",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }
}
