import type { Client } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  acquireSingletonLock,
  createLockClient,
} from "@/workers/advisory-lock";

const warn = vi.fn();
const clientCtor = vi.fn();
vi.mock("pg", () => ({
  Client: class {
    constructor(opts: unknown) {
      clientCtor(opts);
    }
  },
}));
vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: (...a: unknown[]) => warn(...a),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Regression cover for the two ways a singleton worker has died at deploy.
 *
 * First it exited on the first refused probe and failed Dokku's healthcheck,
 * failing the deploy. Then it waited 90 s and exited 0 — past the healthcheck,
 * so the deploy went green while the worker was dead, and Dokku never restarts
 * an exit 0. The rule now: a singleton waits for a HELD lock for as long as it
 * takes, visibly, and fails fast (exit non-zero) only when the connection
 * itself stops working.
 */

const LOCK_KEY = 1_634_625_398;

/** A pg.Client stub whose lock answers are scripted per call. */
const clientReturning = (answers: boolean[]) => {
  const query = vi.fn(async () => ({
    rows: [{ acquired: answers.shift() ?? true }],
  }));
  return { client: { query } as unknown as Client, query };
};

/** Whether a promise has settled, without awaiting it. */
const settled = async (p: Promise<unknown>): Promise<boolean> => {
  let done = false;
  void p.then(
    () => {
      done = true;
    },
    () => {
      done = true;
    }
  );
  await Promise.resolve();
  return done;
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
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("waits for a departing peer instead of giving up on first refusal", async () => {
    const { client, query } = clientReturning([false, false, true]);

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(pending).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("takes over within a second of the peer letting go", async () => {
    const { client } = clientReturning([false, true]);

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toBeUndefined();
  });

  it("never gives up on a peer that holds the lock — even well past 90 s", async () => {
    // The 2026-09-28 outage: the handover ran past the old 90 s window, the
    // worker exited 0, and production ran without it. Now it keeps waiting.
    const { client, query } = clientReturning([]);
    (client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{ acquired: false }],
    });

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(10 * 60_000);

    expect(await settled(pending)).toBe(false);
    // Still probing once a second the whole time — no backoff at the handover.
    expect(query.mock.calls.length).toBeGreaterThan(590);

    // The peer finally lets go: the worker takes over at the next probe.
    (client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{ acquired: true }],
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toBeUndefined();
  });

  it("says so once a minute while it waits, so a stuck peer is visible", async () => {
    const { client } = clientReturning([]);
    (client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{ acquired: false }],
    });

    const pending = acquireSingletonLock(client, LOCK_KEY, "alert-monitor");
    await vi.advanceTimersByTimeAsync(3 * 60_000 + 500);

    expect(warn).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenLastCalledWith(
      expect.objectContaining({ lockKey: LOCK_KEY }),
      expect.stringContaining("still waiting")
    );
    expect(await settled(pending)).toBe(false);
  });

  it("throws when a probe hangs, so the process restarts on a fresh connection", async () => {
    // `pg` runs one query per connection at a time: a probe stuck on a dead
    // socket would queue every later probe behind it. Waiting is only right
    // for a lock that is HELD; a database that stops ANSWERING must fail fast.
    const client = {
      query: vi.fn(() => new Promise(() => {})),
    } as unknown as Client;

    const outcome = acquireSingletonLock(
      client,
      LOCK_KEY,
      "alert-monitor"
    ).then(
      () => "resolved",
      (e: Error) => e.message
    );
    await vi.advanceTimersByTimeAsync(31_000);

    await expect(outcome).resolves.toContain("did not answer");
  });

  it("propagates a rejected probe instead of swallowing it", async () => {
    const client = {
      query: vi.fn().mockRejectedValue(new Error("connection terminated")),
    } as unknown as Client;

    await expect(
      acquireSingletonLock(client, LOCK_KEY, "alert-monitor")
    ).rejects.toThrow("connection terminated");
  });
});

describe("createLockClient", () => {
  // Both guard the same failure — a database that stops answering. Without
  // them a connect hangs forever (pg has no default timeout) and a dead
  // socket silently queues every later probe.
  it("fails fast on a silent database: connect timeout and TCP keepalive", () => {
    createLockClient("postgres://lock");
    expect(clientCtor).toHaveBeenCalledWith({
      connectionString: "postgres://lock",
      keepAlive: true,
      connectionTimeoutMillis: 30_000,
    });
  });
});
