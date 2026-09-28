import { Client } from "pg";

import { logger } from "@/core/logger";

/**
 * Poll interval while waiting. Fixed, not backed off.
 *
 * Each probe is a real round trip: client, socket, and a server-side call.
 * `pg_try_advisory_lock` is non-blocking only in that it never waits on the
 * lock — it still costs a query. One probe a second on an already-open
 * connection is nothing, and it is only paid while two containers overlap.
 * Backing off would save nothing measurable and charge the saving in dead
 * time at the handover — the one moment this code exists to get right.
 */
const LOCK_RETRY_MS = 1_000;

/**
 * How long a single probe may take before the process gives up on this
 * connection. Waiting forever is right when the lock is HELD — that is a peer
 * doing the work. It is wrong when the database stops ANSWERING: `pg` runs one
 * query per connection at a time, so a probe stuck on a dead socket queues
 * every later probe behind it and the loop could never recover on this
 * connection. A hung probe therefore throws; the entrypoint's catch exits
 * non-zero, and the supervisor restarts the worker on a fresh connection.
 */
const PROBE_TIMEOUT_MS = 30_000;

/** How often to say "still waiting" so a peer that never exits is visible. */
const WAIT_WARN_EVERY_MS = 60_000;

/**
 * The dedicated single-connection client a singleton worker holds its lock
 * on, so the lock's lifetime is the process's — not a pool connection's.
 *
 * Not connected yet: the caller attaches its `error`/`end` handlers first,
 * then connects, then waits for the lock. Both timeouts guard the same thing
 * — a database that stops answering — so they share one budget:
 * - `connectionTimeoutMillis`: a connect that never completes throws instead
 *   of hanging the startup forever (`pg` has no default).
 * - `keepAlive`: `pg` runs one query at a time per connection, so a probe
 *   stuck on a dead socket would queue every later probe behind it. TCP
 *   keepalive is what makes that socket error out, which exits 1 for a fresh
 *   restart.
 */
export function createLockClient(connectionString: string): Client {
  return new Client({
    connectionString,
    keepAlive: true,
    connectionTimeoutMillis: PROBE_TIMEOUT_MS,
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolve to `null` if `promise` has not settled within `ms`. */
async function withDeadline<T>(
  promise: Promise<T>,
  ms: number
): Promise<T | null> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Take a singleton worker's session-level advisory lock, waiting for a peer to
 * let go — for as long as it takes.
 *
 * This used to give up after 90 s and exit 0. Dokku's rolling deploy starts
 * the new container, health-checks it, and only then schedules the old one
 * for shutdown ~60 s later; with several workers deploying at once and a
 * graceful shutdown on the old side, the handover ran past 90 s. The new
 * worker yielded, exited 0 — which Dokku never restarts — and the deploy's
 * verify step had already passed while it was still waiting. Four singletons
 * were silently dead in production until someone looked (2026-09-28).
 *
 * So: never yield to a held lock. A singleton that waits does nothing and
 * harms nothing; it takes over within a second of the peer releasing. A peer
 * that never exits is an operator problem, made visible by a warning every
 * minute rather than hidden by a clean exit.
 *
 * Resolves once the lock is held. A probe that hangs, a query that rejects,
 * or a connection error all throw: the process exits non-zero, which the
 * restart policy does act on, and the next instance starts on a fresh
 * connection.
 */
export async function acquireSingletonLock(
  client: Client,
  lockKey: number,
  workerName: string
): Promise<void> {
  let waitedFrom: number | null = null;
  let lastWarnAt = 0;

  for (;;) {
    const result = await withDeadline(
      client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1::bigint) AS acquired",
        [lockKey]
      ),
      PROBE_TIMEOUT_MS
    );
    if (result === null) {
      throw new Error(
        `${workerName}: advisory lock probe did not answer within ${PROBE_TIMEOUT_MS}ms`
      );
    }
    const row = result.rows[0];
    if (!row) {
      throw new Error(`${workerName}: advisory lock probe returned no row`);
    }

    if (row.acquired) {
      if (waitedFrom !== null) {
        logger.info(
          { lockKey, waitedMs: Date.now() - waitedFrom },
          `${workerName}: advisory lock acquired after waiting for the previous instance`
        );
      }
      return;
    }

    const now = Date.now();
    if (waitedFrom === null) {
      waitedFrom = now;
      lastWarnAt = now;
      logger.info(
        { lockKey },
        `${workerName}: advisory lock held by another instance — waiting for it to exit`
      );
    } else if (now - lastWarnAt >= WAIT_WARN_EVERY_MS) {
      lastWarnAt = now;
      logger.warn(
        { lockKey, waitedMs: now - waitedFrom },
        `${workerName}: advisory lock still held by another instance — still waiting`
      );
    }

    await sleep(LOCK_RETRY_MS);
  }
}
