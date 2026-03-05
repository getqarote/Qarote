import { describe, expect, it } from "vitest";

import type { RabbitMQQueue } from "@/core/rabbitmq/rabbitmq.interfaces";

import { QueueMapper } from "../queue.mapper";

const baseQueue: RabbitMQQueue = {
  name: "test-queue",
  vhost: "/",
  node: "rabbit@node1",
  type: "classic",
  state: "running",
  arguments: {},
  auto_delete: false,
  durable: true,
  exclusive: false,
  consumers: 2,
  consumer_capacity: 0.75,
  consumer_utilisation: 0.75,
  exclusive_consumer_tag: null,
  messages: 100,
  messages_ready: 80,
  messages_unacknowledged: 20,
  memory: 1048576,
  message_stats: {
    publish: 500,
    publish_details: { rate: 10.5, samples: [] },
    deliver: 450,
    deliver_details: { rate: 9.0, samples: [] },
    ack: 440,
    ack_details: { rate: 8.5, samples: [] },
    deliver_get: 460,
    deliver_get_details: { rate: 9.2, samples: [] },
    redeliver: 5,
    redeliver_details: { rate: 0.1, samples: [] },
  },
  messages_details: { rate: 0, samples: [] },
  messages_ready_details: { rate: 0, samples: [] },
  messages_unacknowledged_details: { rate: 0, samples: [] },
  reductions: 12345,
  reductions_details: { rate: 100, samples: [] },
  message_bytes: 2048,
  message_bytes_persistent: 1024,
  message_bytes_ram: 512,
  message_bytes_ready: 1536,
  message_bytes_unacknowledged: 512,
  garbage_collection: {
    fullsweep_after: 65535,
    max_heap_size: 0,
    min_bin_vheap_size: 46422,
    min_heap_size: 233,
    minor_gcs: 10,
  },
};

describe("QueueMapper", () => {
  it("maps basic fields correctly", () => {
    const result = QueueMapper.toApiResponse(baseQueue);

    expect(result.name).toBe("test-queue");
    expect(result.vhost).toBe("/");
    expect(result.node).toBe("rabbit@node1");
    expect(result.type).toBe("classic");
    expect(result.state).toBe("running");
  });

  it("passes through state field as-is", () => {
    const crashed = { ...baseQueue, state: "crashed" };
    expect(QueueMapper.toApiResponse(crashed).state).toBe("crashed");

    const minority = { ...baseQueue, state: "minority" };
    expect(QueueMapper.toApiResponse(minority).state).toBe("minority");

    const stopped = { ...baseQueue, state: "stopped" };
    expect(QueueMapper.toApiResponse(stopped).state).toBe("stopped");
  });

  it("passes through consumer_capacity correctly", () => {
    const result = QueueMapper.toApiResponse(baseQueue);
    expect(result.consumer_capacity).toBe(0.75);
  });

  it("maps all rate details when present", () => {
    const result = QueueMapper.toApiResponse(baseQueue);

    expect(result.message_stats).toBeDefined();
    expect(result.message_stats!.publish_details).toEqual({ rate: 10.5 });
    expect(result.message_stats!.deliver_details).toEqual({ rate: 9.0 });
    expect(result.message_stats!.ack_details).toEqual({ rate: 8.5 });
    expect(result.message_stats!.deliver_get_details).toEqual({ rate: 9.2 });
    expect(result.message_stats!.redeliver_details).toEqual({ rate: 0.1 });
  });

  it("handles missing rate details gracefully", () => {
    const queue: RabbitMQQueue = {
      ...baseQueue,
      message_stats: {
        publish: 10,
        publish_details: { rate: 1.0, samples: [] },
      },
    };

    const result = QueueMapper.toApiResponse(queue);

    expect(result.message_stats).toBeDefined();
    expect(result.message_stats!.publish_details).toEqual({ rate: 1.0 });
    expect(result.message_stats!.deliver_details).toBeUndefined();
    expect(result.message_stats!.ack_details).toBeUndefined();
    expect(result.message_stats!.deliver_get_details).toBeUndefined();
    expect(result.message_stats!.redeliver_details).toBeUndefined();
  });

  it("handles undefined message_stats", () => {
    const queue: RabbitMQQueue = {
      ...baseQueue,
      message_stats: undefined as unknown as RabbitMQQueue["message_stats"],
    };

    const result = QueueMapper.toApiResponse(queue);
    expect(result.message_stats).toBeUndefined();
  });

  it("maps array correctly with toApiResponseArray", () => {
    const queues = [
      { ...baseQueue, name: "q1" },
      { ...baseQueue, name: "q2", state: "stopped" },
    ];

    const results = QueueMapper.toApiResponseArray(queues);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("q1");
    expect(results[0].state).toBe("running");
    expect(results[1].name).toBe("q2");
    expect(results[1].state).toBe("stopped");
  });
});
