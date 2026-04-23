import { logger } from "../logger";
import type {
  RabbitMQBinding,
  RabbitMQChannel,
  RabbitMQConnection,
  RabbitMQConsumer,
  RabbitMQExchange,
  RabbitMQNode,
  RabbitMQOverview,
  RabbitMQQueue,
  RabbitMQUser,
  RabbitMQVHost,
} from "./rabbitmq.interfaces";

/**
 * Field detection result for a single response
 */
export interface FieldDetectionResult {
  endpoint: string;
  version?: string;
  unexpectedFields: string[]; // Fields in response but not in type
  missingFields: string[]; // Fields in type but not in response
  timestamp: string;
}

/**
 * Response validator for RabbitMQ API responses
 * Compares actual responses against TypeScript type definitions
 * to detect missing or unexpected fields
 */
export class ResponseValidator {
  /**
   * Compare a response object against expected type structure
   * Returns fields that are unexpected (in response but not in type)
   * and fields that are missing (in type but not in response)
   *
   * Note: Only checks top-level fields. Nested structures require
   * more sophisticated comparison which can be added later.
   */
  static validateResponse<T extends Record<string, unknown>>(
    response: unknown,
    expectedType: T,
    endpoint: string,
    version?: string
  ): FieldDetectionResult {
    const result: FieldDetectionResult = {
      endpoint,
      version,
      unexpectedFields: [],
      missingFields: [],
      timestamp: new Date().toISOString(),
    };

    if (!response || typeof response !== "object") {
      return result;
    }

    const responseObj = response as Record<string, unknown>;
    const expectedKeys = new Set(Object.keys(expectedType));

    // Find unexpected fields (in response but not in type)
    for (const key of Object.keys(responseObj)) {
      if (!expectedKeys.has(key)) {
        result.unexpectedFields.push(key);
      }
    }

    // Find missing fields (in type but not in response)
    // Only check required fields (non-optional). Optional fields are expected
    // to be missing in some versions, so we don't flag them as missing.
    // This is a simplified check - in practice, we'd need to check TypeScript
    // type metadata to know which fields are truly optional.
    for (const key of expectedKeys) {
      if (!(key in responseObj)) {
        // For now, we'll flag all missing fields, but in practice
        // optional fields should be filtered out based on version
        result.missingFields.push(key);
      }
    }

    return result;
  }

  /**
   * Validate RabbitMQ Overview response
   */
  static validateOverview(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: RabbitMQOverview = {
      management_version: "",
      rates_mode: "",
      sample_retention_policies: {
        global: [],
        basic: [],
        detailed: [],
      },
      exchange_types: [],
      product_version: "",
      product_name: "",
      rabbitmq_version: "",
      cluster_name: "",
      erlang_version: "",
      erlang_full_version: "",
      release_series_support_status: "",
      disable_stats: false,
      is_op_policy_updating_enabled: false,
      enable_queue_totals: false,
      cluster_tags: [],
      node_tags: [],
      default_queue_type: "",
      message_stats: {
        disk_reads: 0,
        disk_reads_details: { rate: 0 },
        disk_writes: 0,
        disk_writes_details: { rate: 0 },
      },
      churn_rates: {
        channel_closed: 0,
        channel_closed_details: { rate: 0 },
        channel_created: 0,
        channel_created_details: { rate: 0 },
        connection_closed: 0,
        connection_closed_details: { rate: 0 },
        connection_created: 0,
        connection_created_details: { rate: 0 },
        queue_created: 0,
        queue_created_details: { rate: 0 },
        queue_declared: 0,
        queue_declared_details: { rate: 0 },
        queue_deleted: 0,
        queue_deleted_details: { rate: 0 },
      },
      queue_totals: {
        messages: 0,
        messages_details: { rate: 0 },
        messages_ready: 0,
        messages_ready_details: { rate: 0 },
        messages_unacknowledged: 0,
        messages_unacknowledged_details: { rate: 0 },
      },
      object_totals: {
        channels: 0,
        connections: 0,
        consumers: 0,
        exchanges: 0,
        queues: 0,
      },
      statistics_db_event_queue: 0,
      node: "",
      listeners: [],
      contexts: [],
    };

    return this.validateResponse(
      response,
      expectedType as unknown as Record<string, unknown>,
      "/overview",
      version
    );
  }

  /**
   * Validate RabbitMQ Node response
   */
  static validateNode(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQNode> = {
      name: "",
      type: "",
      running: false,
      being_drained: false,
      partitions: [],
      os_pid: "",
      uptime: 0,
      run_queue: 0,
      processors: 0,
      rates_mode: "",
      mem_used: 0,
      mem_used_details: { rate: 0 },
      mem_limit: 0,
      mem_alarm: false,
      mem_calculation_strategy: "",
      disk_free: 0,
      disk_free_details: { rate: 0 },
      disk_free_limit: 0,
      disk_free_alarm: false,
      fd_used: 0,
      fd_used_details: { rate: 0 },
      fd_total: 0,
      sockets_used: 0,
      sockets_used_details: { rate: 0 },
      sockets_total: 0,
      proc_used: 0,
      proc_used_details: { rate: 0 },
      proc_total: 0,
      gc_num: 0,
      gc_num_details: { rate: 0 },
      gc_bytes_reclaimed: 0,
      gc_bytes_reclaimed_details: { rate: 0 },
      context_switches: 0,
      context_switches_details: { rate: 0 },
      io_read_count: 0,
      io_read_count_details: { rate: 0 },
      io_read_bytes: 0,
      io_read_bytes_details: { rate: 0 },
      io_read_avg_time: 0,
      io_read_avg_time_details: { rate: 0 },
      io_write_count: 0,
      io_write_count_details: { rate: 0 },
      io_write_bytes: 0,
      io_write_bytes_details: { rate: 0 },
      io_write_avg_time: 0,
      io_write_avg_time_details: { rate: 0 },
      io_sync_count: 0,
      io_sync_count_details: { rate: 0 },
      io_sync_avg_time: 0,
      io_sync_avg_time_details: { rate: 0 },
      io_seek_count: 0,
      io_seek_count_details: { rate: 0 },
      io_seek_avg_time: 0,
      io_seek_avg_time_details: { rate: 0 },
      io_reopen_count: 0,
      io_reopen_count_details: { rate: 0 },
      mnesia_ram_tx_count: 0,
      mnesia_ram_tx_count_details: { rate: 0 },
      mnesia_disk_tx_count: 0,
      mnesia_disk_tx_count_details: { rate: 0 },
      msg_store_read_count: 0,
      msg_store_read_count_details: { rate: 0 },
      msg_store_write_count: 0,
      msg_store_write_count_details: { rate: 0 },
      queue_index_write_count: 0,
      queue_index_write_count_details: { rate: 0 },
      queue_index_read_count: 0,
      queue_index_read_count_details: { rate: 0 },
      connection_created: 0,
      connection_created_details: { rate: 0 },
      connection_closed: 0,
      connection_closed_details: { rate: 0 },
      channel_created: 0,
      channel_created_details: { rate: 0 },
      channel_closed: 0,
      channel_closed_details: { rate: 0 },
      queue_declared: 0,
      queue_declared_details: { rate: 0 },
      queue_created: 0,
      queue_created_details: { rate: 0 },
      queue_deleted: 0,
      queue_deleted_details: { rate: 0 },
      exchange_types: [],
      auth_mechanisms: [],
      applications: [],
      contexts: [],
      log_files: [],
      db_dir: "",
      config_files: [],
      net_ticktime: 0,
      enabled_plugins: [],
      ra_open_file_metrics: {
        ra_log_wal: 0,
        ra_log_segment_writer: 0,
      },
      cluster_links: [],
      metrics_gc_queue_length: {
        connection_closed: 0,
        channel_closed: 0,
        consumer_deleted: 0,
        exchange_deleted: 0,
        queue_deleted: 0,
        vhost_deleted: 0,
        node_node_deleted: 0,
        channel_consumer_deleted: 0,
      },
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/nodes",
      version
    );
  }

  /**
   * Validate RabbitMQ Queue response
   */
  static validateQueue(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQQueue> = {
      name: "",
      vhost: "",
      node: "",
      type: "",
      state: "",
      arguments: {},
      auto_delete: false,
      durable: false,
      exclusive: false,
      consumers: 0,
      messages: 0,
      messages_details: { rate: 0 },
      messages_ready: 0,
      messages_ready_details: { rate: 0 },
      messages_ready_ram: 0,
      messages_unacknowledged: 0,
      messages_unacknowledged_details: { rate: 0 },
      messages_unacknowledged_ram: 0,
      messages_paged_out: 0,
      messages_persistent: 0,
      messages_ram: 0,
      message_bytes: 0,
      message_bytes_paged_out: 0,
      message_bytes_persistent: 0,
      message_bytes_ram: 0,
      message_bytes_ready: 0,
      message_bytes_unacknowledged: 0,
      memory: 0,
      reductions: 0,
      reductions_details: { rate: 0 },
      garbage_collection: {
        fullsweep_after: 0,
        max_heap_size: 0,
        min_bin_vheap_size: 0,
        min_heap_size: 0,
        minor_gcs: 0,
      },
      head_message_timestamp: null,
      idle_since: "",
      policy: null,
      operator_policy: null,
      effective_policy_definition: null,
      consumer_capacity: 0,
      consumer_utilisation: 0,
      exclusive_consumer_tag: null,
      single_active_consumer_tag: null,
      slave_nodes: [],
      synchronised_slave_nodes: [],
      recoverable_slaves: null,
      storage_version: 1,
      internal: false,
      internal_owner: undefined,
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/queues",
      version
    );
  }

  /**
   * Validate RabbitMQ Connection response
   */
  static validateConnection(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQConnection> = {
      name: "",
      node: "",
      state: "",
      user: "",
      vhost: "",
      protocol: "",
      channels: 0,
      recv_cnt: 0,
      send_cnt: 0,
      recv_oct: 0,
      send_oct: 0,
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/connections",
      version
    );
  }

  /**
   * Validate RabbitMQ Channel response
   */
  static validateChannel(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQChannel> = {
      name: "",
      node: "",
      state: "",
      user: "",
      vhost: "",
      number: 0,
      connection_details: {
        name: "",
        peer_port: 0,
        peer_host: "",
      },
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/channels",
      version
    );
  }

  /**
   * Validate RabbitMQ Exchange response
   */
  static validateExchange(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQExchange> = {
      name: "",
      vhost: "",
      type: "",
      durable: false,
      auto_delete: false,
      internal: false,
      arguments: {},
      message_stats: {
        publish_in: 0,
        publish_in_details: { rate: 0 },
        publish_out: 0,
        publish_out_details: { rate: 0 },
      },
      policy: null,
      user_who_performed_action: undefined,
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/exchanges",
      version
    );
  }

  /**
   * Validate RabbitMQ Binding response
   */
  static validateBinding(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQBinding> = {
      source: "",
      vhost: "",
      destination: "",
      destination_type: "",
      routing_key: "",
      arguments: {},
      properties_key: "",
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/bindings",
      version
    );
  }

  /**
   * Validate RabbitMQ Consumer response
   */
  static validateConsumer(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQConsumer> = {
      consumer_tag: "",
      channel_details: {
        name: "",
        number: 0,
        connection_name: "",
        peer_host: "",
        peer_port: 0,
      },
      queue: {
        name: "",
        vhost: "",
      },
      ack_required: false,
      exclusive: false,
      prefetch_count: 0,
      arguments: {},
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/consumers",
      version
    );
  }

  /**
   * Validate RabbitMQ VHost response
   */
  static validateVHost(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQVHost> = {
      name: "",
      description: "",
      tags: [],
      default_queue_type: "",
      tracing: false,
      metadata: {
        description: "",
        tags: [],
      },
      cluster_state: {},
      recv_oct: 0,
      recv_oct_details: { rate: 0 },
      send_oct: 0,
      send_oct_details: { rate: 0 },
      messages: 0,
      messages_ready: 0,
      messages_unacknowledged: 0,
      messages_details: { rate: 0 },
      messages_ready_details: { rate: 0 },
      messages_unacknowledged_details: { rate: 0 },
      protected_from_deletion: false,
      message_stats: {
        publish: 0,
        publish_details: { rate: 0 },
        deliver: 0,
        deliver_details: { rate: 0 },
        ack: 0,
        ack_details: { rate: 0 },
      },
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/vhosts",
      version
    );
  }

  /**
   * Validate RabbitMQ User response
   */
  static validateUser(
    response: unknown,
    version?: string
  ): FieldDetectionResult {
    const expectedType: Partial<RabbitMQUser> = {
      name: "",
      password_hash: "",
      hashing_algorithm: "",
      tags: "",
      limits: {
        max_connections: 0,
        max_channels: 0,
      },
    };

    return this.validateResponse(
      response,
      expectedType as Record<string, unknown>,
      "/users",
      version
    );
  }

  /**
   * Log field detection results
   */
  static logDetectionResult(result: FieldDetectionResult): void {
    if (result.unexpectedFields.length > 0 || result.missingFields.length > 0) {
      logger.warn(
        {
          endpoint: result.endpoint,
          version: result.version,
          unexpectedFields: result.unexpectedFields,
          missingFields: result.missingFields,
        },
        "RabbitMQ API response field mismatch detected"
      );
    } else {
      logger.debug(
        {
          endpoint: result.endpoint,
          version: result.version,
        },
        "RabbitMQ API response matches expected type"
      );
    }
  }

  /**
   * Validate and log a response
   */
  static validateAndLog<T extends Record<string, unknown>>(
    response: unknown,
    expectedType: T,
    endpoint: string,
    version?: string
  ): FieldDetectionResult {
    const result = this.validateResponse(
      response,
      expectedType,
      endpoint,
      version
    );
    this.logDetectionResult(result);
    return result;
  }
}
