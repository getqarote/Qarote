/**
 * RabbitMQ API Client
 * Handles RabbitMQ-specific operations like queues, exchanges, connections
 */

import { BaseApiClient } from "./baseClient";
import { Queue } from "./types";
import {
  Overview,
  Node,
  EnhancedMetrics,
  Connection,
  Channel,
  TimeSeriesResponse,
  NodeMemoryDetailsResponse,
} from "./rabbitmqTypes";
import { Exchange, Binding, Consumer } from "./exchangeTypes";
import {
  BrowseMessagesResponse,
  PublishMessageRequest,
  PublishMessageResponse,
  CreateQueueRequest,
  CreateQueueResponse,
} from "./messageTypes";

export class RabbitMQApiClient extends BaseApiClient {
  // Overview and Metrics
  async getOverview(serverId: string): Promise<{ overview: Overview }> {
    return this.request<{ overview: Overview }>(
      `/rabbitmq/servers/${serverId}/overview`
    );
  }

  async getEnhancedMetrics(
    serverId: string
  ): Promise<{ metrics: EnhancedMetrics }> {
    return this.request<{ metrics: EnhancedMetrics }>(
      `/rabbitmq/servers/${serverId}/metrics`
    );
  }

  async getTimeSeriesMetrics(
    serverId: string,
    timeRange: string = "1h"
  ): Promise<TimeSeriesResponse> {
    return this.request<TimeSeriesResponse>(
      `/rabbitmq/servers/${serverId}/metrics/timeseries?timeRange=${timeRange}`
    );
  }

  // Queue Management
  async getQueues(serverId: string): Promise<{ queues: Queue[] }> {
    return this.request<{ queues: Queue[] }>(
      `/rabbitmq/servers/${serverId}/queues`
    );
  }

  async getQueue(
    serverId: string,
    queueName: string
  ): Promise<{ queue: Queue }> {
    return this.request<{ queue: Queue }>(
      `/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(queueName)}`
    );
  }

  async createQueue(params: CreateQueueRequest): Promise<CreateQueueResponse> {
    const { serverId, ...queueData } = params;
    return this.request<CreateQueueResponse>(
      `/rabbitmq/servers/${serverId}/queues`,
      {
        method: "POST",
        body: JSON.stringify(queueData),
      }
    );
  }

  async purgeQueue(
    serverId: string,
    queueName: string
  ): Promise<{ success: boolean; message: string; purged: number }> {
    return this.request<{ success: boolean; message: string; purged: number }>(
      `/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(
        queueName
      )}/messages`,
      {
        method: "DELETE",
      }
    );
  }

  async deleteQueue(
    serverId: string,
    queueName: string,
    options: {
      if_unused?: boolean;
      if_empty?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string }> {
    const queryParams = new URLSearchParams();
    if (options.if_unused !== undefined) {
      queryParams.append("if_unused", options.if_unused.toString());
    }
    if (options.if_empty !== undefined) {
      queryParams.append("if_empty", options.if_empty.toString());
    }

    const queryString = queryParams.toString();
    const url = `/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(queueName)}${queryString ? `?${queryString}` : ""}`;

    return this.request<{ success: boolean; message: string }>(url, {
      method: "DELETE",
    });
  }

  // Message Management
  async browseQueueMessages(
    serverId: string,
    queueName: string,
    count: number = 10,
    ackMode: string = "ack_requeue_true"
  ): Promise<BrowseMessagesResponse> {
    return this.request<BrowseMessagesResponse>(
      `/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(
        queueName
      )}/browse`,
      {
        method: "POST",
        body: JSON.stringify({ count, ackMode }),
      }
    );
  }

  async stopMessageStreaming(
    serverId: string,
    queueName: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(
        queueName
      )}/messages/browse/stop`,
      {
        method: "POST",
      }
    );
  }

  async publishMessage(
    params: PublishMessageRequest
  ): Promise<PublishMessageResponse> {
    const { serverId, queueName, ...publishData } = params;
    return this.request<PublishMessageResponse>(
      `/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(queueName)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(publishData),
      }
    );
  }

  // Node Management
  async getNodes(serverId: string): Promise<{ nodes: Node[] }> {
    return this.request<{ nodes: Node[] }>(
      `/rabbitmq/servers/${serverId}/nodes`
    );
  }

  async getNodeMemoryDetails(
    serverId: string,
    nodeName: string
  ): Promise<NodeMemoryDetailsResponse> {
    return this.request(
      `/rabbitmq/servers/${serverId}/nodes/${encodeURIComponent(
        nodeName
      )}/memory`
    );
  }

  // Connection and Channel Management
  async getConnections(serverId: string): Promise<{
    success: boolean;
    connections: Connection[];
    totalConnections: number;
    totalChannels: number;
  }> {
    return this.request<{
      success: boolean;
      connections: Connection[];
      totalConnections: number;
      totalChannels: number;
    }>(`/rabbitmq/servers/${serverId}/connections`);
  }

  async getChannels(serverId: string): Promise<{
    success: boolean;
    channels: Channel[];
    totalChannels: number;
  }> {
    return this.request<{
      success: boolean;
      channels: Channel[];
      totalChannels: number;
    }>(`/rabbitmq/servers/${serverId}/channels`);
  }

  // Exchange and Binding Management
  async getExchanges(serverId: string): Promise<{
    success: boolean;
    exchanges: Exchange[];
    bindings: Binding[];
    totalExchanges: number;
    totalBindings: number;
    exchangeTypes: {
      direct: number;
      fanout: number;
      topic: number;
      headers: number;
    };
  }> {
    return this.request<{
      success: boolean;
      exchanges: Exchange[];
      bindings: Binding[];
      totalExchanges: number;
      totalBindings: number;
      exchangeTypes: {
        direct: number;
        fanout: number;
        topic: number;
        headers: number;
      };
    }>(`/rabbitmq/servers/${serverId}/exchanges`);
  }

  async createExchange(
    serverId: string,
    exchangeData: {
      name: string;
      type: string;
      durable?: boolean;
      auto_delete?: boolean;
      internal?: boolean;
      arguments?: { [key: string]: unknown };
    }
  ): Promise<{
    success: boolean;
    message: string;
    exchange: {
      name: string;
      type: string;
      durable: boolean;
      auto_delete: boolean;
      internal: boolean;
      arguments: { [key: string]: unknown };
    };
  }> {
    return this.request<{
      success: boolean;
      message: string;
      exchange: {
        name: string;
        type: string;
        durable: boolean;
        auto_delete: boolean;
        internal: boolean;
        arguments: { [key: string]: unknown };
      };
    }>(`/rabbitmq/servers/${serverId}/exchanges`, {
      method: "POST",
      body: JSON.stringify(exchangeData),
    });
  }

  async deleteExchange(
    serverId: string,
    exchangeName: string,
    options: {
      if_unused?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const queryParams = new URLSearchParams();
    if (options.if_unused !== undefined) {
      queryParams.append("if_unused", options.if_unused.toString());
    }

    const queryString = queryParams.toString();
    const url = `/rabbitmq/servers/${serverId}/exchanges/${encodeURIComponent(exchangeName)}${queryString ? `?${queryString}` : ""}`;

    return this.request<{
      success: boolean;
      message: string;
    }>(url, {
      method: "DELETE",
    });
  }

  async getBindings(serverId: string): Promise<{
    success: boolean;
    bindings: Binding[];
    totalBindings: number;
  }> {
    return this.request<{
      success: boolean;
      bindings: Binding[];
      totalBindings: number;
    }>(`/rabbitmq/servers/${serverId}/bindings`);
  }

  // Consumer Management
  async getQueueConsumers(
    serverId: string,
    queueName: string
  ): Promise<{
    success: boolean;
    consumers: Consumer[];
    totalConsumers: number;
    queueName: string;
  }> {
    return this.request<{
      success: boolean;
      consumers: Consumer[];
      totalConsumers: number;
      queueName: string;
    }>(
      `/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(
        queueName
      )}/consumers`
    );
  }
}
