import { describe, expect, it, vi } from "vitest";

import { RabbitMQMetricsCalculator } from "./MetricsCalculator";
import type {
  MessageRates,
  MessageStats,
  RabbitMQChannel,
  RabbitMQConnection,
  RabbitMQNode,
  RabbitMQOverview,
  RabbitMQQueue,
  RateSample,
} from "./rabbitmq.interfaces";

// Mock logger to avoid console output during tests
vi.mock("../logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RabbitMQMetricsCalculator", () => {
  describe("calculateRatesFromSamples", () => {
    it("should return empty array for empty samples", () => {
      const result = RabbitMQMetricsCalculator.calculateRatesFromSamples([]);
      expect(result).toEqual([]);
    });

    it("should return empty array for null/undefined samples", () => {
      expect(
        RabbitMQMetricsCalculator.calculateRatesFromSamples(
          null as unknown as Array<{ sample: number; timestamp: number }>
        )
      ).toEqual([]);
      expect(
        RabbitMQMetricsCalculator.calculateRatesFromSamples(
          undefined as unknown as Array<{ sample: number; timestamp: number }>
        )
      ).toEqual([]);
    });

    it("should return rate 0 for first sample", () => {
      const samples = [{ sample: 100, timestamp: 1000 }];
      const result =
        RabbitMQMetricsCalculator.calculateRatesFromSamples(samples);
      expect(result).toEqual([{ timestamp: 1000, rate: 0 }]);
    });

    it("should calculate rate correctly for two samples", () => {
      const samples = [
        { sample: 100, timestamp: 1000 },
        { sample: 200, timestamp: 2000 }, // 100 units in 1 second = 100/s
      ];
      const result =
        RabbitMQMetricsCalculator.calculateRatesFromSamples(samples);
      expect(result).toEqual([
        { timestamp: 1000, rate: 0 },
        { timestamp: 2000, rate: 100 },
      ]);
    });

    it("should calculate rates for multiple samples", () => {
      const samples = [
        { sample: 100, timestamp: 1000 },
        { sample: 200, timestamp: 2000 }, // 100/s
        { sample: 350, timestamp: 3000 }, // 150/s
        { sample: 400, timestamp: 4000 }, // 50/s
      ];
      const result =
        RabbitMQMetricsCalculator.calculateRatesFromSamples(samples);
      expect(result).toEqual([
        { timestamp: 1000, rate: 0 },
        { timestamp: 2000, rate: 100 },
        { timestamp: 3000, rate: 150 },
        { timestamp: 4000, rate: 50 },
      ]);
    });

    it("should sort samples by timestamp before calculating", () => {
      const samples = [
        { sample: 300, timestamp: 3000 },
        { sample: 100, timestamp: 1000 },
        { sample: 200, timestamp: 2000 },
      ];
      const result =
        RabbitMQMetricsCalculator.calculateRatesFromSamples(samples);
      expect(result).toEqual([
        { timestamp: 1000, rate: 0 },
        { timestamp: 2000, rate: 100 },
        { timestamp: 3000, rate: 100 },
      ]);
    });

    it("should handle zero time difference", () => {
      const samples = [
        { sample: 100, timestamp: 1000 },
        { sample: 200, timestamp: 1000 }, // Same timestamp
      ];
      const result =
        RabbitMQMetricsCalculator.calculateRatesFromSamples(samples);
      expect(result).toEqual([
        { timestamp: 1000, rate: 0 },
        { timestamp: 1000, rate: 0 },
      ]);
    });

    it("should round rates to 2 decimal places", () => {
      const samples = [
        { sample: 100, timestamp: 1000 },
        { sample: 133, timestamp: 2000 }, // 33 units in 1 second = 33/s
      ];
      const result =
        RabbitMQMetricsCalculator.calculateRatesFromSamples(samples);
      expect(result[1].rate).toBe(33);
    });

    it("should handle negative value differences", () => {
      const samples = [
        { sample: 200, timestamp: 1000 },
        { sample: 100, timestamp: 2000 }, // Counter reset or decrease
      ];
      const result =
        RabbitMQMetricsCalculator.calculateRatesFromSamples(samples);
      expect(result).toEqual([
        { timestamp: 1000, rate: 0 },
        { timestamp: 2000, rate: -100 },
      ]);
    });
  });

  describe("processMetricSamples", () => {
    it("should process metric samples and populate messagesRates", () => {
      const metricSamples: Record<string, RateSample[]> = {
        publish: [
          { sample: 100, timestamp: 1000 },
          { sample: 200, timestamp: 2000 },
        ],
        deliver: [
          { sample: 50, timestamp: 1000 },
          { sample: 150, timestamp: 2000 },
        ],
      };
      const messagesRates: MessageRates[] = [];

      RabbitMQMetricsCalculator.processMetricSamples(
        metricSamples,
        messagesRates
      );

      expect(messagesRates).toHaveLength(2);
      expect(messagesRates[0]).toEqual({
        timestamp: 1000,
        publish: 0,
        deliver: 0,
      });
      expect(messagesRates[1]).toEqual({
        timestamp: 2000,
        publish: 100,
        deliver: 100,
      });
    });

    it("should handle empty metric samples", () => {
      const messagesRates: MessageRates[] = [];
      RabbitMQMetricsCalculator.processMetricSamples({}, messagesRates);
      expect(messagesRates).toEqual([]);
    });
  });

  describe("processQueueTotalSamples", () => {
    it("should process queue total samples correctly", () => {
      const samples: RateSample[] = [
        { sample: 100, timestamp: 1000 },
        { sample: 200, timestamp: 2000 },
      ];
      const readySamples: RateSample[] = [
        { sample: 50, timestamp: 1000 },
        { sample: 100, timestamp: 2000 },
      ];
      const unacknowledgedSamples: RateSample[] = [
        { sample: 25, timestamp: 1000 },
        { sample: 50, timestamp: 2000 },
      ];

      const result = RabbitMQMetricsCalculator.processQueueTotalSamples(
        samples,
        readySamples,
        unacknowledgedSamples
      );

      expect(result).toEqual([
        {
          timestamp: 1000,
          messages: 100,
          messages_ready: 50,
          messages_unacknowledged: 25,
        },
        {
          timestamp: 2000,
          messages: 200,
          messages_ready: 100,
          messages_unacknowledged: 50,
        },
      ]);
    });

    it("should handle missing ready or unacknowledged samples", () => {
      const samples: RateSample[] = [
        { sample: 100, timestamp: 1000 },
        { sample: 200, timestamp: 2000 },
      ];

      const result = RabbitMQMetricsCalculator.processQueueTotalSamples(
        samples,
        [],
        []
      );

      expect(result).toEqual([
        {
          timestamp: 1000,
          messages: 100,
          messages_ready: 0,
          messages_unacknowledged: 0,
        },
        {
          timestamp: 2000,
          messages: 200,
          messages_ready: 0,
          messages_unacknowledged: 0,
        },
      ]);
    });
  });

  describe("extractMessageRatesFromStats", () => {
    it("should extract message rates from message stats", () => {
      const messageStats: MessageStats = {
        publish_details: {
          samples: [
            { sample: 100, timestamp: 1000 },
            { sample: 200, timestamp: 2000 },
          ],
        },
        deliver_details: {
          samples: [
            { sample: 50, timestamp: 1000 },
            { sample: 150, timestamp: 2000 },
          ],
        },
        ack_details: {
          samples: [
            { sample: 45, timestamp: 1000 },
            { sample: 140, timestamp: 2000 },
          ],
        },
      } as MessageStats;

      const result =
        RabbitMQMetricsCalculator.extractMessageRatesFromStats(messageStats);

      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1000);
      expect(result[1].timestamp).toBe(2000);
      expect(result[1].publish).toBe(100);
      expect(result[1].deliver).toBe(100);
      expect(result[1].ack).toBe(95);
    });

    it("should include disk metrics when includeDiskMetrics is true", () => {
      const messageStats: MessageStats = {
        publish_details: {
          samples: [{ sample: 100, timestamp: 1000 }],
        },
        disk_reads_details: {
          samples: [{ sample: 10, timestamp: 1000 }],
        },
        disk_writes_details: {
          samples: [{ sample: 20, timestamp: 1000 }],
        },
      } as MessageStats;

      const result = RabbitMQMetricsCalculator.extractMessageRatesFromStats(
        messageStats,
        true
      );

      expect(result[0]).toHaveProperty("disk_reads");
      expect(result[0]).toHaveProperty("disk_writes");
    });

    it("should exclude disk metrics when includeDiskMetrics is false", () => {
      const messageStats: MessageStats = {
        publish_details: {
          samples: [{ sample: 100, timestamp: 1000 }],
        },
        disk_reads_details: {
          samples: [{ sample: 10, timestamp: 1000 }],
        },
        disk_writes_details: {
          samples: [{ sample: 20, timestamp: 1000 }],
        },
      } as MessageStats;

      const result = RabbitMQMetricsCalculator.extractMessageRatesFromStats(
        messageStats,
        false
      );

      expect(result[0]).not.toHaveProperty("disk_reads");
      expect(result[0]).not.toHaveProperty("disk_writes");
    });

    it("should return empty array when no samples are available", () => {
      const messageStats: MessageStats = {} as MessageStats;
      const result =
        RabbitMQMetricsCalculator.extractMessageRatesFromStats(messageStats);
      expect(result).toEqual([]);
    });
  });

  describe("extractMessageRates", () => {
    it("should extract message rates from RabbitMQOverview", () => {
      const overview: RabbitMQOverview = {
        message_stats: {
          publish_details: {
            samples: [
              { sample: 100, timestamp: 1000 },
              { sample: 200, timestamp: 2000 },
            ],
          },
        },
      } as RabbitMQOverview;

      const result = RabbitMQMetricsCalculator.extractMessageRates(overview);

      expect(result).toHaveLength(2);
    });

    it("should extract message rates from RabbitMQQueue", () => {
      const queue: RabbitMQQueue = {
        message_stats: {
          publish_details: {
            samples: [
              { sample: 100, timestamp: 1000 },
              { sample: 200, timestamp: 2000 },
            ],
          },
        },
      } as RabbitMQQueue;

      const result = RabbitMQMetricsCalculator.extractMessageRates(queue);

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no publish_details samples", () => {
      const overview: RabbitMQOverview = {
        message_stats: {},
      } as RabbitMQOverview;

      const result = RabbitMQMetricsCalculator.extractMessageRates(overview);

      expect(result).toEqual([]);
    });
  });

  describe("extractQueueTotals", () => {
    it("should extract queue totals from RabbitMQOverview", () => {
      const overview: RabbitMQOverview = {
        queue_totals: {
          messages_details: {
            samples: [
              { sample: 100, timestamp: 1000 },
              { sample: 200, timestamp: 2000 },
            ],
          },
          messages_ready_details: {
            samples: [
              { sample: 50, timestamp: 1000 },
              { sample: 100, timestamp: 2000 },
            ],
          },
          messages_unacknowledged_details: {
            samples: [
              { sample: 25, timestamp: 1000 },
              { sample: 50, timestamp: 2000 },
            ],
          },
        },
      } as RabbitMQOverview;

      const result = RabbitMQMetricsCalculator.extractQueueTotals(overview);

      expect(result).toHaveLength(2);
      expect(result[0].messages).toBe(100);
      expect(result[0].messages_ready).toBe(50);
      expect(result[0].messages_unacknowledged).toBe(25);
    });

    it("should extract queue totals from RabbitMQQueue", () => {
      const queue: RabbitMQQueue = {
        messages_details: {
          samples: [
            { sample: 100, timestamp: 1000 },
            { sample: 200, timestamp: 2000 },
          ],
        },
        messages_ready_details: {
          samples: [
            { sample: 50, timestamp: 1000 },
            { sample: 100, timestamp: 2000 },
          ],
        },
        messages_unacknowledged_details: {
          samples: [
            { sample: 25, timestamp: 1000 },
            { sample: 50, timestamp: 2000 },
          ],
        },
      } as RabbitMQQueue;

      const result = RabbitMQMetricsCalculator.extractQueueTotals(queue);

      expect(result).toHaveLength(2);
      expect(result[0].messages).toBe(100);
    });

    it("should return empty array when no samples are available", () => {
      const overview: RabbitMQOverview = {
        queue_totals: {},
      } as RabbitMQOverview;

      const result = RabbitMQMetricsCalculator.extractQueueTotals(overview);

      expect(result).toEqual([]);
    });
  });

  describe("calculateAverageLatency", () => {
    it("should calculate latency based on message rates", () => {
      const overview: RabbitMQOverview = {
        message_stats: {
          publish_details: { rate: 100 },
          deliver_details: { rate: 95 },
          ack_details: { rate: 90 },
        },
      } as RabbitMQOverview;
      const connections: RabbitMQConnection[] = [];
      const channels: RabbitMQChannel[] = [];

      const result = RabbitMQMetricsCalculator.calculateAverageLatency(
        overview,
        connections,
        channels
      );

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should use connection/channel count when no message flow", () => {
      const overview: RabbitMQOverview = {
        message_stats: {
          publish_details: { rate: 0 },
          deliver_details: { rate: 0 },
        },
      } as RabbitMQOverview;
      const connections: RabbitMQConnection[] = [
        { state: "running" } as RabbitMQConnection,
        { state: "running" } as RabbitMQConnection,
      ];
      const channels: RabbitMQChannel[] = [
        { state: "running" } as RabbitMQChannel,
      ];

      const result = RabbitMQMetricsCalculator.calculateAverageLatency(
        overview,
        connections,
        channels
      );

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(50);
    });

    it("should return default latency for idle system", () => {
      const overview: RabbitMQOverview = {
        message_stats: {
          publish_details: { rate: 0 },
          deliver_details: { rate: 0 },
        },
      } as RabbitMQOverview;
      const connections: RabbitMQConnection[] = [];
      const channels: RabbitMQChannel[] = [];

      const result = RabbitMQMetricsCalculator.calculateAverageLatency(
        overview,
        connections,
        channels
      );

      expect(result).toBe(1.2);
    });
  });

  describe("calculateDiskUsage", () => {
    it("should calculate disk usage from node disk stats", () => {
      const nodes: RabbitMQNode[] = [
        {
          disk_free: 1000000,
          disk_free_limit: 500000,
        } as RabbitMQNode,
      ];

      const result = RabbitMQMetricsCalculator.calculateDiskUsage(nodes);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should return 0 for empty nodes array", () => {
      const result = RabbitMQMetricsCalculator.calculateDiskUsage([]);
      expect(result).toBe(0);
    });

    it("should fallback to memory-based estimation when disk stats unavailable", () => {
      const nodes: RabbitMQNode[] = [
        {
          mem_used: 1000000,
          mem_limit: 2000000,
        } as RabbitMQNode,
      ];

      const result = RabbitMQMetricsCalculator.calculateDiskUsage(nodes);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe("calculateTotalMemoryBytes", () => {
    it("should calculate total memory from node mem_limit", () => {
      const nodes: RabbitMQNode[] = [
        {
          mem_limit: 1000000000, // 1GB limit
          mem_used: 500000000,
        } as RabbitMQNode,
      ];

      const result = RabbitMQMetricsCalculator.calculateTotalMemoryBytes(nodes);

      // mem_limit * 2.5 = 1GB * 2.5 = 2.5GB
      expect(result).toBe(2500000000);
    });

    it("should fallback to mem_used estimation when mem_limit unavailable", () => {
      const nodes: RabbitMQNode[] = [
        {
          mem_used: 1000000000, // 1GB used
        } as RabbitMQNode,
      ];

      const result = RabbitMQMetricsCalculator.calculateTotalMemoryBytes(nodes);

      // mem_used * 3.33 = 1GB * 3.33 = 3.33GB
      expect(result).toBeGreaterThan(3000000000);
    });

    it("should return 0 for empty nodes array", () => {
      const result = RabbitMQMetricsCalculator.calculateTotalMemoryBytes([]);
      expect(result).toBe(0);
    });

    it("should return default fallback on error", () => {
      const result = RabbitMQMetricsCalculator.calculateTotalMemoryBytes(
        null as unknown as RabbitMQNode[]
      );
      expect(result).toBe(8589934592); // 8GB default
    });
  });

  describe("calculateAverageCpuUsage", () => {
    it("should calculate CPU usage from node metrics", () => {
      const nodes: RabbitMQNode[] = [
        {
          mem_used: 1000000,
          mem_limit: 2000000,
          sockets_used: 10,
          sockets_total: 20,
          running: true,
        } as RabbitMQNode,
      ];

      const result = RabbitMQMetricsCalculator.calculateAverageCpuUsage(nodes);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should return 0 for empty nodes array", () => {
      const result = RabbitMQMetricsCalculator.calculateAverageCpuUsage([]);
      expect(result).toBe(0);
    });

    it("should include baseline CPU for running nodes", () => {
      const nodes: RabbitMQNode[] = [
        {
          mem_used: 0,
          mem_limit: 0,
          sockets_used: 0,
          sockets_total: 0,
          running: true,
        } as RabbitMQNode,
      ];

      const result = RabbitMQMetricsCalculator.calculateAverageCpuUsage(nodes);

      expect(result).toBeGreaterThanOrEqual(5); // Baseline for running node
    });
  });

  describe("calculateEnhancedMetrics", () => {
    it("should calculate all enhanced metrics", async () => {
      const overview: RabbitMQOverview = {
        message_stats: {
          publish_details: { rate: 100 },
          deliver_details: { rate: 95 },
        },
      } as RabbitMQOverview;
      const nodes: RabbitMQNode[] = [
        {
          mem_limit: 1000000000,
          mem_used: 500000000,
          disk_free: 1000000,
          disk_free_limit: 500000,
        } as RabbitMQNode,
      ];
      const connections: RabbitMQConnection[] = [];
      const channels: RabbitMQChannel[] = [];

      const result = await RabbitMQMetricsCalculator.calculateEnhancedMetrics(
        overview,
        nodes,
        connections,
        channels
      );

      expect(result).toHaveProperty("overview");
      expect(result).toHaveProperty("nodes");
      expect(result).toHaveProperty("connections");
      expect(result).toHaveProperty("channels");
      expect(result).toHaveProperty("avgLatency");
      expect(result).toHaveProperty("diskUsage");
      expect(result).toHaveProperty("totalMemoryBytes");
      expect(result).toHaveProperty("totalMemoryGB");
      expect(result).toHaveProperty("avgCpuUsage");
      expect(result).toHaveProperty("calculatedAt");
      expect(typeof result.totalMemoryGB).toBe("number");
      expect(result.totalMemoryGB).toBeGreaterThan(0);
    });
  });
});
