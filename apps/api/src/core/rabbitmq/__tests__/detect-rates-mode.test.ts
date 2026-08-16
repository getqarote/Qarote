import { describe, expect, it } from "vitest";

import { RabbitMQMetricsCalculator } from "@/core/rabbitmq/MetricsCalculator";
import type {
  RabbitMQOverview,
  RabbitMQQueue,
} from "@/core/rabbitmq/rabbitmq.interfaces";

/**
 * Regression cover for the idle-broker misdiagnosis.
 *
 * detectRatesMode used to infer the mode purely from `message_stats`, which
 * RabbitMQ does not materialise until the first publish. An idle broker on the
 * default `rates_mode=basic` therefore reported "none", and the cockpit told
 * the operator their broker "isn't reporting message rates" — pointing them at
 * the rates-mode docs to fix a setting that was never wrong.
 *
 * The shapes below are taken from a real RabbitMQ 3.13.7: idle declares
 * `basic` with `message_stats: {}`; after five publishes the same broker still
 * declares `basic` and the stats appear.
 */

const overview = (patch: Partial<RabbitMQOverview>) =>
  ({ rates_mode: "basic", message_stats: {}, ...patch }) as RabbitMQOverview;

describe("detectRatesMode — declared mode wins", () => {
  it("reports basic for an idle broker that declares basic", () => {
    // The regression: no traffic yet, but the broker is perfectly capable.
    expect(RabbitMQMetricsCalculator.detectRatesMode(overview({}))).toBe(
      "basic"
    );
  });

  it("still reports basic once that same broker has published", () => {
    const withStats = overview({
      message_stats: { publish: 5, publish_details: { rate: 1 } },
    } as Partial<RabbitMQOverview>);
    expect(RabbitMQMetricsCalculator.detectRatesMode(withStats)).toBe("basic");
  });

  it("reports none only when the broker declares none", () => {
    expect(
      RabbitMQMetricsCalculator.detectRatesMode(
        overview({ rates_mode: "none" })
      )
    ).toBe("none");
  });

  it("keeps reporting none for a declared-none broker that has stats", () => {
    const odd = overview({
      rates_mode: "none",
      message_stats: { publish: 1, publish_details: { rate: 0.5 } },
    } as Partial<RabbitMQOverview>);
    expect(RabbitMQMetricsCalculator.detectRatesMode(odd)).toBe("none");
  });

  it("upgrades to detailed when sample arrays are present", () => {
    const detailed = overview({
      rates_mode: "detailed",
      message_stats: {
        publish: 10,
        publish_details: {
          rate: 2,
          samples: [{ sample: 10, timestamp: 1_700_000_000_000 }],
        },
      },
    } as Partial<RabbitMQOverview>);
    expect(RabbitMQMetricsCalculator.detectRatesMode(detailed)).toBe(
      "detailed"
    );
  });

  it("trusts samples over a stale basic declaration", () => {
    const mixed = overview({
      rates_mode: "basic",
      message_stats: {
        publish: 10,
        publish_details: {
          rate: 2,
          samples: [{ sample: 10, timestamp: 1_700_000_000_000 }],
        },
      },
    } as Partial<RabbitMQOverview>);
    expect(RabbitMQMetricsCalculator.detectRatesMode(mixed)).toBe("detailed");
  });
});

describe("detectRatesMode — queue payloads carry no declaration", () => {
  it("does not accuse an idle queue of having rates disabled", () => {
    // Queue objects have no rates_mode. "No stats" here means "nothing
    // published yet" at least as often as "rates off", and the series comes
    // back empty either way — so the non-alarming reading is the correct one.
    const idleQueue = { name: "q", message_stats: {} } as RabbitMQQueue;
    expect(RabbitMQMetricsCalculator.detectRatesMode(idleQueue)).toBe("basic");
  });

  it("reports detailed for a queue carrying sample arrays", () => {
    const busyQueue = {
      name: "q",
      message_stats: {
        publish: 3,
        publish_details: {
          rate: 1,
          samples: [{ sample: 3, timestamp: 1_700_000_000_000 }],
        },
      },
    } as unknown as RabbitMQQueue;
    expect(RabbitMQMetricsCalculator.detectRatesMode(busyQueue)).toBe(
      "detailed"
    );
  });
});
