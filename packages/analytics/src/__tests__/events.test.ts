import { describe, expect, it } from "vitest";

import type { EventName, EventProperties } from "../events";

/**
 * Compile-time tests: the value of these tests is that `tsc` rejects mismatched
 * properties. We assert at runtime that names are stable strings to lock the
 * registry against accidental renames.
 */
describe("EventMap", () => {
  it("permits valid known events with expected properties", () => {
    const sub: EventProperties<"subscription_upgraded"> = {
      from_tier: "free",
      to_tier: "developer",
      mrr_delta: 29,
      revenue: 29,
      currency: "USD",
      billing_interval: "monthly",
    };
    const integ: EventProperties<"integration_connected"> = {
      provider: "slack",
    };

    expect(sub.to_tier).toBe("developer");
    expect(integ.provider).toBe("slack");
  });

  it("event names are snake_case past-tense (sample)", () => {
    const sample: EventName[] = [
      "user_registered",
      "rabbitmq_server_connected",
      "subscription_upgraded",
      "integration_connected",
    ];
    for (const e of sample) {
      expect(e).toMatch(/^[a-z][a-z0-9_]+$/);
    }
  });
});
