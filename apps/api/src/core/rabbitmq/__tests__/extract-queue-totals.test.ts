import { describe, expect, it } from "vitest";

import { RabbitMQMetricsCalculator } from "@/core/rabbitmq/MetricsCalculator";
import type {
  RabbitMQOverview,
  RabbitMQQueue,
} from "@/core/rabbitmq/rabbitmq.interfaces";

/**
 * Regression cover for the empty depth chart on rates_mode=basic brokers.
 *
 * Sample arrays only exist under `detailed`. Under `basic` — RabbitMQ's default
 * and what AmazonMQ ships — extractQueueTotals returned [], so the cockpit drew
 * an empty "Queued messages" chart directly beside a depth tile reading 2,660.
 * extractMessageRates already fell back to a single instantaneous point in the
 * same situation, which is why the neighbouring rates card kept rendering.
 */

describe("extractQueueTotals — basic mode falls back to current depth", () => {
  it("returns the current depth for an overview with no samples", () => {
    const overview = {
      queue_totals: {
        messages: 2660,
        messages_ready: 2508,
        messages_unacknowledged: 152,
      },
    } as RabbitMQOverview;

    const result = RabbitMQMetricsCalculator.extractQueueTotals(overview);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      messages: 2660,
      messages_ready: 2508,
      messages_unacknowledged: 152,
    });
    expect(typeof result[0].timestamp).toBe("number");
  });

  it("returns the current depth for a queue with no samples", () => {
    const queue = {
      name: "orders.processing",
      messages: 900,
      messages_ready: 880,
      messages_unacknowledged: 20,
    } as RabbitMQQueue;

    const result = RabbitMQMetricsCalculator.extractQueueTotals(queue);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ messages: 900, messages_ready: 880 });
  });

  it("keeps a genuine zero depth rather than dropping the point", () => {
    // An idle-but-healthy broker reports 0, which is a real reading. Dropping
    // it would put us back to an empty chart for the most common case.
    const overview = {
      queue_totals: { messages: 0, messages_ready: 0 },
    } as RabbitMQOverview;

    const result = RabbitMQMetricsCalculator.extractQueueTotals(overview);

    expect(result).toHaveLength(1);
    expect(result[0].messages).toBe(0);
  });

  it("treats an empty samples array as no history, not as history", () => {
    // A detailed-mode broker returns `samples: []` while the retention window
    // is still empty — the exact moment a server is first connected. Truthiness
    // alone would send this into the sample path and back to a blank chart.
    const overview = {
      queue_totals: {
        messages: 2660,
        messages_ready: 2508,
        messages_details: { rate: 0, samples: [] },
        messages_ready_details: { rate: 0, samples: [] },
      },
    } as unknown as RabbitMQOverview;

    const result = RabbitMQMetricsCalculator.extractQueueTotals(overview);

    expect(result).toHaveLength(1);
    expect(result[0].messages).toBe(2660);
  });

  it("returns nothing when the broker reports no depth at all", () => {
    // Distinct from zero: the fields are absent, so we have nothing to plot
    // and must not invent a point.
    expect(
      RabbitMQMetricsCalculator.extractQueueTotals({
        queue_totals: {},
      } as RabbitMQOverview)
    ).toEqual([]);
  });
});

describe("extractQueueTotals — detailed mode still wins", () => {
  it("uses the sample arrays when the broker sends them", () => {
    const overview = {
      queue_totals: {
        messages: 999,
        messages_details: {
          rate: 0,
          samples: [
            { sample: 10, timestamp: 1_700_000_060_000 },
            { sample: 20, timestamp: 1_700_000_000_000 },
          ],
        },
        messages_ready_details: {
          rate: 0,
          samples: [
            { sample: 8, timestamp: 1_700_000_060_000 },
            { sample: 18, timestamp: 1_700_000_000_000 },
          ],
        },
      },
    } as unknown as RabbitMQOverview;

    const result = RabbitMQMetricsCalculator.extractQueueTotals(overview);

    // Two real samples, chronologically ordered — not the 999 current value.
    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBeLessThan(result[1].timestamp);
    expect(result.map((p) => p.messages)).toEqual([20, 10]);
    expect(result.map((p) => p.messages_ready)).toEqual([18, 8]);
  });

  it("prefers a single real sample over the current-depth fallback", () => {
    // The boundary immediately above the empty array: one sample is history,
    // so the fallback must not fire and the 999 must not appear.
    const overview = {
      queue_totals: {
        messages: 999,
        messages_details: {
          rate: 0,
          samples: [{ sample: 42, timestamp: 1_700_000_000_000 }],
        },
      },
    } as unknown as RabbitMQOverview;

    const result = RabbitMQMetricsCalculator.extractQueueTotals(overview);

    expect(result).toHaveLength(1);
    expect(result[0].messages).toBe(42);
    expect(result[0].timestamp).toBe(1_700_000_000_000);
  });
});
