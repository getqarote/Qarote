import type { Client } from "pg";

import { logger } from "@/core/logger";

/**
 * How long a starting worker waits for its predecessor to release the lock.
 *
 * Sized against Dokku's rolling deploy: the new container is started and
 * health-checked while the old one is still running, and the old one is only
 * scheduled for shutdown ~60s later. A worker that gave up before then failed
 * its healthcheck (`state=exited`), which failed the whole deploy — including
 * the post-deploy hooks that wire up networking. 90s clears that window with
 * margin without letting a genuinely stuck peer hold a deploy open forever.
 */
const LOCK_WAIT_MS = 90_000;

/**
 * Poll interval while waiting. Fixed, not backed off.
 *
 * Each probe is a real round trip: client, socket, and a server-side call.
 * `pg_try_advisory_lock` is non-blocking only in that it never waits on the
 * lock — it still costs a query. But a full 90s wait is ~90 such probes on a
 * connection that is already open, and only while a deploy overlaps two
 * containers. Backing off to save those saves nothing measurable, and charges
 * up to the ceiling in dead time at the handover — the one moment this code
 * exists to get right.
 */
const LOCK_RETRY_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolve to `null` if `promise` has not settled within `ms`.
 *
 * The wait has to stay bounded even when Postgres stops answering, otherwise
 * the deadline below is only advisory and a hung probe wedges startup — the
 * exact failure this helper claims to avoid by not using the blocking
 * `pg_advisory_lock`. An abandoned probe is harmless: the process either
 * proceeds or exits, and the lock connection closes with it.
 */
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
 * let go rather than giving up on the first refusal.
 *
 * `pg_try_advisory_lock` is non-blocking by design — we keep it that way and
 * retry in userland instead of switching to the blocking `pg_advisory_lock`, so
 * the wait is bounded, observable in the logs, and cannot wedge a process
 * forever against a peer that never exits.
 *
 * Returns true once held. Returns false if the peer still holds it after
 * LOCK_WAIT_MS, at which point the caller should yield (exit 0) exactly as
 * before — a legitimately running peer is not an error.
 */
export async function acquireSingletonLock(
  client: Client,
  lockKey: number,
  workerName: string
): Promise<boolean> {
  const deadline = Date.now() + LOCK_WAIT_MS;
  let waitedFrom: number | null = null;

  for (;;) {
    const budget = deadline - Date.now();
    if (budget <= 0) {
      logger.warn(
        {
          lockKey,
          waitedMs: waitedFrom === null ? 0 : Date.now() - waitedFrom,
        },
        `${workerName}: advisory lock still held after the wait window — another instance is running. Exiting.`
      );
      return false;
    }

    // Bound the probe itself, not just the gap between probes: a database that
    // stops answering must not stretch the wait past the deadline.
    const result = await withDeadline(
      client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1::bigint) AS acquired",
        [lockKey]
      ),
      budget
    );

    if (result === null) {
      logger.warn(
        {
          lockKey,
          waitedMs: waitedFrom === null ? 0 : Date.now() - waitedFrom,
        },
        `${workerName}: advisory lock probe did not answer within the wait window. Exiting.`
      );
      return false;
    }

    if (result.rows[0].acquired) {
      if (waitedFrom !== null) {
        logger.info(
          { lockKey, waitedMs: Date.now() - waitedFrom },
          `${workerName}: advisory lock acquired after waiting for the previous instance`
        );
      }
      return true;
    }

    if (waitedFrom === null) {
      waitedFrom = Date.now();
      logger.info(
        { lockKey, waitMs: LOCK_WAIT_MS },
        `${workerName}: advisory lock held by another instance — waiting for it to exit`
      );
    }

    // The deadline is enforced at the top of the loop, so sleeping past it is
    // harmless — the next pass reports the expiry and yields.
    await sleep(LOCK_RETRY_MS);
  }
}
