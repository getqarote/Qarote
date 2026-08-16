import { describe, expect, it } from "vitest";

import { normalizePathname } from "../usePageTracking";

describe("normalizePathname", () => {
  it.each([
    ["/", "/"],
    ["/dashboard", "/dashboard"],
    ["/messages/550e8400-e29b-41d4-a716-446655440000", "/messages/:id"],
    ["/users/12345", "/users/:id"],
    ["/orgs/cm5xyz0123456789abcdef", "/orgs/:id"],
    // Static slug that's all-lowercase ≥ 12 chars — must NOT be masked
    // (regression for the over-permissive CUID2 rule).
    ["/organizations", "/organizations"],
    ["/notifications/settings", "/notifications/settings"],
  ])("normalizes %s → %s", (input, expected) => {
    expect(normalizePathname(input)).toBe(expected);
  });

  it("masks queue names containing dots as :param (PII)", () => {
    expect(normalizePathname("/queues/orders.dlq")).toBe("/queues/:param");
  });

  it("masks vhost names with encoded slashes", () => {
    expect(normalizePathname("/vhosts/%2F")).toBe("/vhosts/:param");
  });

  it("masks excessively long segments to avoid PII leakage", () => {
    const longName = "a".repeat(120);
    expect(normalizePathname(`/queues/${longName}`)).toBe("/queues/:id");
  });

  it("masks mixed-case or @-containing segments", () => {
    expect(normalizePathname("/users/Alice@Acme")).toBe("/users/:param");
  });
});
