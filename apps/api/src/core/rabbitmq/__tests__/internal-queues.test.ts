import { describe, expect, it } from "vitest";

import {
  excludeInternalQueues,
  isQaroteInternalQueue,
} from "@/core/rabbitmq/internal-queues";

/**
 * The firehose declares `qarote.trace.v2.<serverId>.<vhost>` on the user's
 * broker. On staging it reached 598k messages while our own consumer drained a
 * backlog, and Qarote alerted the user about it — a CRITICAL depth alert on a
 * queue they never created.
 */

describe("isQaroteInternalQueue", () => {
  it("recognises the firehose consumer queue", () => {
    expect(
      isQaroteInternalQueue(
        "qarote.trace.v2.1dcf185b-94fc-42a0-b3ea-d438e4247a0d.%2F"
      )
    ).toBe(true);
  });

  it("recognises the retired v1 scheme too", () => {
    // The registry still deletes leftovers; they must not be alerted on while
    // they linger.
    expect(isQaroteInternalQueue("qarote.trace.v1.srv.%2F")).toBe(true);
  });

  it("leaves the user's queues alone", () => {
    for (const name of [
      "orders.processing",
      "payments.capture",
      "notifications.email",
      "qarote-orders", // a user queue that merely starts with our brand
      "trace.events",
    ]) {
      expect(isQaroteInternalQueue(name)).toBe(false);
    }
  });
});

describe("excludeInternalQueues", () => {
  it("drops only the internal ones and preserves order", () => {
    const queues = [
      { name: "orders.processing" },
      { name: "qarote.trace.v2.abc.%2F" },
      { name: "payments.capture" },
    ];

    expect(excludeInternalQueues(queues).map((q) => q.name)).toEqual([
      "orders.processing",
      "payments.capture",
    ]);
  });

  it("is a no-op when the broker has none of ours", () => {
    const queues = [{ name: "a" }, { name: "b" }];
    expect(excludeInternalQueues(queues)).toHaveLength(2);
  });
});
