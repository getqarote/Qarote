/**
 * The Management-API poll runs on a time budget (`METRICS_PER_SERVER_TIMEOUT_MS`)
 * and that budget is only real if it CANCELS the request. The previous
 * implementation raced a `setTimeout` against the promise, which freed the
 * concurrency slot while leaving the socket open and the response still
 * arriving — spending the very capacity the timeout existed to protect.
 *
 * These tests pin the mechanism, not the number: `getQueues` must hand its
 * signal to the underlying request, and an expired signal must reject.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/core/logger";

import { RabbitMQApiClient } from "../ApiClient";

function makeClient(): RabbitMQApiClient {
  return new RabbitMQApiClient({
    host: "broker.test",
    port: 15672,
    amqpPort: 5672,
    username: "u",
    password: "p",
    vhost: "/",
    useHttps: false,
  });
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("RabbitMQApiClient.getQueues — request cancellation", () => {
  it("forwards the caller's AbortSignal to the underlying request", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      // request() reads with text() then JSON.parse so transfer and parse are
      // timed separately (M4) — the mock must expose the same surface.
      text: async () => "[]",
      json: async () => [],
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const signal = AbortSignal.timeout(5_000);
    await makeClient().getQueues(undefined, signal);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0]!;
    // Without this the timeout is advisory only: the slot frees, the socket does not.
    expect(init.signal).toBe(signal);
  });

  it("rejects when the signal is already aborted (the budget is enforced)", async () => {
    // A real fetch honours an aborted signal by rejecting; emulate that contract.
    global.fetch = vi.fn().mockImplementation((_url, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        return Promise.reject(
          Object.assign(new Error("This operation was aborted"), {
            name: "AbortError",
          })
        );
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => "[]",
        json: async () => [],
      });
    }) as unknown as typeof fetch;

    await expect(
      makeClient().getQueues(undefined, AbortSignal.abort())
    ).rejects.toThrow();
  });

  it("emits the per-request cost breakdown M4 needs (size, wait, transfer, parse)", async () => {
    // The poll fan-out is the dominant cost at 100k brokers, and JSON parsing
    // shares the single thread with everything else — so a poll must be
    // attributable, not just timed as a whole. Without these fields M4 has no data.
    const debug = vi.spyOn(logger, "debug");
    const body = JSON.stringify([{ name: "q1", vhost: "/" }]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => body,
      json: async () => JSON.parse(body),
    }) as unknown as typeof fetch;

    await makeClient().getQueues();

    const call = debug.mock.calls.find(
      (c) => typeof c[1] === "string" && c[1].includes("rabbitmq api request")
    );
    expect(call).toBeDefined();
    const m = call![0] as Record<string, number>;
    expect(m.payloadBytes).toBe(Buffer.byteLength(body));
    // Transfer and parse are separated on purpose: one is network, the other CPU.
    for (const k of ["waitMs", "transferMs", "parseMs", "totalMs"]) {
      expect(typeof m[k]).toBe("number");
      expect(m[k]).toBeGreaterThanOrEqual(0);
    }
    expect(m.totalMs).toBeGreaterThanOrEqual(m.parseMs);
  });

  it("still works with no signal (callers without a time budget)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify([{ name: "q1", vhost: "/" }]),
      json: async () => [{ name: "q1", vhost: "/" }],
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const queues = await makeClient().getQueues();

    expect(queues).toHaveLength(1);
    const [, init] = fetchSpy.mock.calls[0]!;
    expect(init.signal).toBeUndefined();
  });
});
