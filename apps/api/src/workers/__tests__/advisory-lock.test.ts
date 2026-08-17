import type { Client } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { acquireSingletonLock } from "@/workers/advisory-lock";

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

/**
 * Regression cover for the deploy-breaking singleton yield.
 *
 * Every singleton worker used to exit the instant pg_try_advisory_lock came
 * back false. Dokku's rolling deploy starts the new container while the old one
 * is still running and only stops the old one ~60s later, so the new worker
 * always lost the race, exited, and failed its `uptime` healthcheck — which
 * failed the whole deploy, including the post-deploy hooks that attach app
 * networking. Waiting for the peer is what makes a rolling restart survivable.
 */

const LOCK_KEY = 1_634_625_398;

/** A pg.Client stub whose lock answers are scripted per call. */
const clientReturning = (answers: boolean[]) => {
  const query = vi.fn(async () => ({
    rows: [{ acquired: answers.shift() ?? true }],
  }));
  return { client: { query } as unknown as Client, query };
};

describe("acquireSingletonLock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns immediately when the lock is free", async () => {
    const { client, query } = clientReturning([true]);

    await expect(
      acquireSingletonLock(client, LOCK_KEY, "alert-monitor")
    ).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("waits for a departing peer instead of giving up on first refusal", async () => {
    // The rolling-deploy case: refused twice while the old container drains,
    // then granted. Previously this path exited and failed the deploy.
    const { client, query } = clientReturning([false, false, true]);

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(pending).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("gives up once the wait window closes", async () => {
    // A peer that never exits must not hold a deploy open forever.
    const { client } = clientReturning([]);
    (client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{ acquired: false }],
    });

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(95_000);

    await expect(pending).resolves.toBe(false);
  });

  it("keeps retrying for the whole window before yielding", async () => {
    const { client } = clientReturning([]);
    (client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{ acquired: false }],
    });

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    // Well inside the window — it must still be waiting, not resolved.
    await vi.advanceTimersByTimeAsync(30_000);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(65_000);
    await expect(pending).resolves.toBe(false);
  });

  it("yields when the database stops answering", async () => {
    // The bounded wait is the whole reason for not using the blocking
    // pg_advisory_lock. Checking the deadline only between probes would leave
    // it advisory: a probe that never resolves would wedge startup forever.
    const client = {
      query: vi.fn(() => new Promise(() => {})),
    } as unknown as Client;

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(95_000);

    await expect(pending).resolves.toBe(false);
  });

  it("takes over within a second of the peer letting go", async () => {
    // The handover is the moment that matters: every second spent unaware of a
    // freed lock is a second with no singleton running. Refused once, then
    // free — the worker must not sit on a long backoff before noticing.
    const { client } = clientReturning([false, true]);

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toBe(true);
  });

  it("polls at a steady interval across the whole window", async () => {
    const { client, query } = clientReturning([]);
    (client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{ acquired: false }],
    });

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(90_000);
    await pending;

    // ~90 in-memory lock probes on an already-open connection, only during a
    // deploy overlap. Cheap enough that trading handover latency for fewer
    // probes would be a bad deal.
    expect(query.mock.calls.length).toBeGreaterThan(80);
    expect(query.mock.calls.length).toBeLessThan(100);
  });
});
