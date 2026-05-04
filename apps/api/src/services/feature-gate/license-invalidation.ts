/**
 * Multi-process license cache coherency.
 *
 * The in-memory license cache in `license.ts` is per-process. The Procfile
 * declares multiple long-lived workers (`web` × N, `worker`,
 * `license-worker`, `release-notifier`, `digest-worker`, `metrics-worker`,
 * `firehose-worker`); each holds its own copy. Without coordination,
 * activate/deactivate on one process leaves up to `CACHE_TTL_MS` (60 s)
 * during which other processes can hand out stale answers — the
 * canonical example from issue #41 is the alert worker continuing to
 * send Slack/webhook notifications using a deactivated license.
 *
 * Implementation
 * --------------
 * Postgres LISTEN/NOTIFY on a dedicated `license_invalidated` channel.
 * Same shape as `trace-monitor.registry.ts`: a separate `pg.Client`
 * keeps the LISTEN connection open (Prisma's pooled async connections
 * don't keep a stable session), exponential backoff with jitter on
 * errors, idempotent setup/teardown, and a cleanup-on-shutdown hook
 * that workers can call from their SIGTERM handler.
 *
 * Failure-mode contract
 * ---------------------
 * The 60s `CACHE_TTL_MS` is the correctness floor. NOTIFY-based
 * coherency is an optimisation that closes the typical staleness
 * window from "up to 60s" down to "milliseconds." If NOTIFY fails or
 * the LISTEN connection is down on the receiving worker, peers will
 * still resync on the next cache miss after the TTL expires.
 * Concretely: the alert worker can deliver one or more
 * Slack/webhook notifications under a deactivated license for up to
 * 60s after deactivation if the broadcast doesn't reach it. This is
 * the documented behavior, not a bug.
 *
 * Why not Redis pub/sub?
 *   - Redis is not currently a dependency of the API. Adding it for one
 *     channel doubles the operator's infrastructure surface for
 *     self-hosted users.
 *   - Postgres LISTEN/NOTIFY already proves itself on
 *     `trace_config_changed` in trace-monitor. Same primitive, same
 *     deployment.
 *
 * Why not drop the cache entirely?
 *   - Every request through `protectedProcedure` reads at least one
 *     license-axis decision. A 60 s amortisation removes ~99% of those
 *     DB round-trips on a hot API.
 *
 * Operator note: PgBouncer in transaction-pooling mode breaks LISTEN
 * (the LISTEN session can be assigned to a different backend on each
 * query). Use session pooling or a direct connection if PgBouncer
 * fronts your database. See `docs/SELF_HOSTED_DEPLOYMENT.md`.
 */

import { Client as PgClient } from "pg";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { invalidateLicenseCache } from "./license";

const LISTEN_CHANNEL = "license_invalidated";
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;
// Must be shorter than the database's idle_session_timeout. 20 minutes is a
// safe default that survives typical cloud-hosted Postgres settings (often 30m).
export const KEEPALIVE_INTERVAL_MS = 20 * 60 * 1_000;

// Decorrelated jitter — half-to-full window. Without it, N workers all
// wake at exactly 1s after a Postgres restart, then 2s, 4s, …, hammering
// the recovering DB in a tight pattern. With jitter the herd spreads.
function jitter(delayMs: number): number {
  return delayMs * (0.5 + Math.random() * 0.5);
}

// Stable identifier on log lines so an operator can correlate "which
// replica missed the NOTIFY" across N web pods or workers.
const LOG_BINDINGS = {
  pid: process.pid,
  role: process.env.QAROTE_PROCESS_ROLE ?? "unknown",
} as const;

let listenClient: PgClient | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let keepaliveTimer: NodeJS.Timeout | null = null;
let backoffMs = INITIAL_BACKOFF_MS;
let stopped = false;
// Serialises concurrent `start()` calls so two callers don't each open
// a fresh client and overwrite the singleton mid-attach (leaks a socket
// and orphans the first listener's notification handler).
let startingPromise: Promise<void> | null = null;

/**
 * Start the LISTEN client. Idempotent — calling repeatedly is safe and
 * tears down any prior client before opening a new one.
 *
 * Workers should call this from their entry point after `prisma.$connect()`
 * and before they begin running cron / consumers. The API process should
 * call it during boot for the same reason — multi-replica web instances
 * need cache coherency between themselves too.
 */
export async function startLicenseInvalidationListener(): Promise<void> {
  // Cancel any pending reconnect timer first so the timer's queued
  // `setupClient()` call can't race with the new start. Without this,
  // calling start() while a reconnect is queued would have two
  // concurrent setupClient() runs, leaking pg.Client sockets and
  // orphaning the first listener's notification handler.
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  // Reset stopped on (re)start so a worker that called stop() and then
  // start() again works correctly. Reconnects MUST NOT come through
  // here — they hit `runSetup` directly, which routes through the same
  // startingPromise guard so concurrent setups are still serialised.
  stopped = false;
  return runSetup();
}

/**
 * Serialise concurrent setup attempts (whether triggered by the
 * public `start()` or by a reconnect timer) through a single
 * in-flight promise. Without this, two callers each open a fresh
 * pg.Client and the second overwrites the first.
 */
function runSetup(): Promise<void> {
  if (startingPromise) {
    return startingPromise;
  }
  startingPromise = (async () => {
    try {
      await teardownClient();
      await setupClient();
    } finally {
      startingPromise = null;
    }
  })();
  return startingPromise;
}

/**
 * Internal: open a fresh pg.Client, register handlers, and issue
 * LISTEN. Called once from `start()` and from the reconnect timer.
 * Reconnects MUST go through this, not the public `start()` — calling
 * `start()` from inside a reconnect would (a) reset `stopped` and
 * resurrect a torn-down listener, and (b) build up an unbounded async
 * stack on persistent failure.
 */
async function setupClient(): Promise<void> {
  if (stopped) return;

  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.warn(
      LOG_BINDINGS,
      "license-invalidation: DATABASE_URL not set — multi-process cache coherency disabled"
    );
    return;
  }

  let client: PgClient;
  try {
    client = new PgClient({ connectionString: url });
  } catch (err) {
    logger.warn(
      { ...LOG_BINDINGS, err },
      "license-invalidation: PgClient construction failed — scheduling reconnect"
    );
    scheduleReconnect();
    return;
  }

  // Register error handler BEFORE connect() so a connection failure
  // can't emit on an unhandled-error EventEmitter and crash the
  // process — and so a half-open client is still cleaned up below.
  client.on("error", (err) => {
    logger.warn(
      { ...LOG_BINDINGS, err },
      "license-invalidation: LISTEN client error — reconnecting"
    );
    void teardownClient().then(() => scheduleReconnect());
  });

  client.on("notification", (msg) => {
    if (msg.channel !== LISTEN_CHANNEL) return;
    // The notifying process has already invalidated its own cache
    // before issuing NOTIFY; we just clear ours. No payload — the
    // event is the signal.
    invalidateLicenseCache();
    logger.info(
      LOG_BINDINGS,
      "license-invalidation: cache cleared by external NOTIFY"
    );
  });

  try {
    await client.connect();
    await client.query(`LISTEN ${LISTEN_CHANNEL}`);
  } catch (err) {
    logger.warn(
      { ...LOG_BINDINGS, err },
      "license-invalidation: failed to set up LISTEN — scheduling reconnect"
    );
    // Best-effort cleanup of the half-opened client before we
    // abandon the reference.
    try {
      await client.end();
    } catch {
      // ignore — connection may already be in an error state
    }
    scheduleReconnect();
    return;
  }

  // Re-check stopped: stop() may have run while we were awaiting
  // connect() / LISTEN. If so, drop the just-opened client instead of
  // attaching it to the singleton.
  if (stopped) {
    try {
      await client.end();
    } catch {
      // ignore
    }
    return;
  }

  listenClient = client;
  backoffMs = INITIAL_BACKOFF_MS;
  // A LISTEN connection sends no traffic, so Postgres will close it with
  // code 57P05 once idle_session_timeout elapses. A periodic no-op query
  // resets the idle clock and keeps the connection alive.
  keepaliveTimer = setInterval(() => {
    listenClient?.query("SELECT 1").catch(() => {
      // The error handler on the client will fire and trigger reconnect.
    });
  }, KEEPALIVE_INTERVAL_MS);
  logger.info(
    { ...LOG_BINDINGS, channel: LISTEN_CHANNEL },
    "license-invalidation: LISTEN active"
  );
}

/**
 * Stop the LISTEN client and cancel any pending reconnect. Workers
 * should call this from their SIGTERM/SIGINT handler so the pg
 * connection drains cleanly on graceful shutdown.
 */
export async function stopLicenseInvalidationListener(): Promise<void> {
  stopped = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  await teardownClient();
}

/**
 * Invalidate the local cache AND notify every other listener so they
 * invalidate theirs. Use this from the API after a license activate /
 * deactivate; the in-process invalidation happens synchronously, the
 * NOTIFY is best-effort and is logged on failure (see the
 * Failure-mode contract at the top of this file).
 *
 * Caller contract: invoke this AFTER the underlying SystemSetting
 * write commits — Postgres delivers NOTIFY at the end of an autocommit
 * statement (or COMMIT inside a transaction), so callers that wrap
 * the write + this call in a single `$transaction` get correct
 * ordering automatically.
 */
export async function broadcastLicenseInvalidation(): Promise<void> {
  // Local clear first so the originating process is consistent
  // immediately, even if NOTIFY fails.
  invalidateLicenseCache();

  try {
    // Channel name is a literal const; no SQL injection surface.
    // `$executeRawUnsafe` (no result rows expected) is the right
    // Prisma verb here — `$queryRawUnsafe` expects a result set.
    // Do NOT wrap in `$transaction` unless the caller's write is
    // also inside it: otherwise the NOTIFY fires immediately
    // (autocommit) but the caller's write may not have committed
    // yet, and listeners would clear their cache then re-read the
    // pre-write value.
    await prisma.$executeRawUnsafe(`NOTIFY ${LISTEN_CHANNEL}`);
  } catch (err) {
    logger.warn(
      { ...LOG_BINDINGS, err },
      "license-invalidation: NOTIFY failed — peers will resync after the 60s TTL"
    );
  }
}

async function teardownClient(): Promise<void> {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
  if (!listenClient) return;
  const client = listenClient;
  listenClient = null;
  try {
    client.removeAllListeners();
    await client.end();
  } catch {
    // best-effort; the client may already be in an error state
  }
}

function scheduleReconnect(): void {
  if (stopped || reconnectTimer) return;
  const delay = jitter(backoffMs);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (stopped) return;
    logger.info(
      { ...LOG_BINDINGS, delayMs: Math.round(delay) },
      "license-invalidation: attempting LISTEN reconnect"
    );
    // Route through `runSetup` so a concurrent `start()` call is
    // serialised through the same startingPromise guard rather than
    // racing this reconnect.
    await runSetup();
  }, delay);
}
