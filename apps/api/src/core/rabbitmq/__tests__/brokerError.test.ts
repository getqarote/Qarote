import { describe, expect, it } from "vitest";

import { classifyBrokerError } from "../brokerError";

describe("classifyBrokerError", () => {
  it.each([
    ["RabbitMQ API error: 401 Unauthorized", "auth"],
    ["RabbitMQ API error: 403 Forbidden", "auth"],
    ["RabbitMQ API error: 500 Internal Server Error", "error"],
    ["RabbitMQ API error: 404 Not Found", "error"],
    // The plain-language hint appended by BaseClient must not break the
    // status-based classification (the prefix + status stay intact).
    [
      "RabbitMQ API error: 401 Unauthorized — wrong username or password",
      "auth",
    ],
  ] as const)("maps HTTP %s → %s", (message, expected) => {
    expect(classifyBrokerError(new Error(message))).toBe(expected);
  });

  it("maps a network message to unreachable", () => {
    expect(classifyBrokerError(new Error("connect ETIMEDOUT 10.0.0.1"))).toBe(
      "unreachable"
    );
  });

  it("reads the undici code off error.cause for unreachable", () => {
    const err = new Error("fetch failed", { cause: { code: "ECONNREFUSED" } });
    expect(classifyBrokerError(err)).toBe("unreachable");
  });

  it("maps ENOTFOUND (DNS) to unreachable", () => {
    const err = new Error("fetch failed", { cause: { code: "ENOTFOUND" } });
    expect(classifyBrokerError(err)).toBe("unreachable");
  });

  it("falls back to error for an unrecognized failure", () => {
    expect(classifyBrokerError(new Error("boom"))).toBe("error");
  });

  it("falls back to error for non-Error values", () => {
    expect(classifyBrokerError("nope")).toBe("error");
    expect(classifyBrokerError(null)).toBe("error");
  });
});
