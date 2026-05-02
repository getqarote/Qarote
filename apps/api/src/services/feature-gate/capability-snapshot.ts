/**
 * `CapabilitySnapshot` — wire shape for the JSON column on RabbitMQServer.
 *
 * Owned by the feature gate (this file) because the resolver consumes it.
 * Detection is in `core/rabbitmq/capabilities.ts` — the boundary is
 * deliberate: `core/rabbitmq` speaks the broker's protocol, `feature-gate`
 * speaks product policy.
 *
 * Schema versioning: every reader must check `caps.schemaVersion <= MAX`
 * and degrade gracefully on mismatch. This lets us add fields without
 * breaking rollback — old code reading new data treats it as "unknown",
 * never crashes.
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import type { Prisma } from "@/generated/prisma/client";

/**
 * Bump when the snapshot shape changes. Older readers seeing a higher
 * `schemaVersion` should treat the snapshot as "unknown" rather than
 * crash, mirroring the rollback contract.
 */
export const CAPABILITY_SCHEMA_VERSION = 1 as const;

/**
 * Largest schema version this codebase understands. Equal to
 * `CAPABILITY_SCHEMA_VERSION` today; left as a separate constant so a
 * future reader can declare "I support up to v2" without bumping the
 * write version.
 */
export const MAX_SUPPORTED_SCHEMA_VERSION = 1 as const;

export interface CapabilitySnapshot {
  /** See `CAPABILITY_SCHEMA_VERSION` for the version contract. */
  schemaVersion: number;

  /** Raw `enabled_plugins` from `/api/overview`. */
  enabledPlugins: string[];

  /**
   * `enabled_plugins` ⊇ {rabbitmq_tracing, rabbitmq_event_exchange} —
   * cluster-wide plugin presence, not per-vhost.
   *
   * **Per-vhost detection deferred** to a v2 schema bump. Today
   * `messages.recording.status` reads `/api/vhosts` directly when a
   * vhost-scoped page mounts (one HTTP per page load, not per vhost),
   * so the on-snapshot answer would only matter for proactive gate
   * evaluation. Adding it costs:
   *
   *   - `CAPABILITY_SCHEMA_VERSION` bump to 2 + reader-compat path,
   *   - new `vhost` arm on `GateSubject` (frontend mirror, Zod schema,
   *     all `<FeatureGate>` consumers),
   *   - one extra `/api/vhosts` call per detection cycle (bounded —
   *     a single HTTP returns all vhosts with their `tracing` flag).
   *
   * The trigger to do it: a page that needs to gate per-vhost
   * proactively (e.g. a vhost overview that hides "Recording" when
   * the plugin is enabled cluster-wide but tracing is off on this
   * specific vhost). Until that page exists, the cost is unjustified.
   */
  hasFirehoseExchange: boolean;

  /**
   * Last-known truthy result of an AMQP-side reachability probe.
   *
   * **Optional** because v1 has no producer for `false`: the detector
   * defaults to `true` if the management API works, and downstream AMQP
   * consumers (firehose, spy) do not yet write back failure signal.
   * Marked optional so a future schema can either populate this with
   * real signal or remove the field without bumping `schemaVersion`.
   */
  amqpReachable?: boolean;

  /** ISO timestamp when `amqpReachable` was last truthy. */
  amqpReachableAt?: string;

  /** ISO timestamp when this snapshot was produced. */
  detectedAt: string;
}

/**
 * Merge the detected snapshot with `capabilityOverride` (support escape
 * hatch). Override values WIN — they exist precisely so support can
 * unblock a customer when the detector misclassifies a broker.
 *
 * `null`/`undefined` inputs are tolerated; the function never throws.
 */
export function applyCapabilityOverride(
  detected: CapabilitySnapshot | null,
  override: Prisma.JsonValue | null | undefined
): CapabilitySnapshot | null {
  if (!detected) return null;
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return detected;
  }
  // Re-run the parser on the merged payload so a malformed override
  // (`hasFirehoseExchange: "true"`, `enabledPlugins: "rabbitmq_tracing"`)
  // can't poison gate decisions silently. The parser drops the merged
  // value if it fails validation; we fall back to the un-overridden
  // detected snapshot, which is the safe direction.
  //
  // `schemaVersion` and `detectedAt` are taken from the detected
  // snapshot — the override is for support unblocking, not schema
  // versioning or timestamping.
  const merged = parseCapabilitySnapshot({
    ...detected,
    ...(override as Prisma.JsonObject),
    schemaVersion: detected.schemaVersion,
    detectedAt: detected.detectedAt,
  });
  return merged ?? detected;
}

/**
 * Read a `CapabilitySnapshot` from a Prisma JSON value, defending
 * against:
 *  - shape evolution beyond what this reader understands
 *    (`schemaVersion` mismatch),
 *  - malformed payloads (returns null + logs, rather than throwing).
 */
export function parseCapabilitySnapshot(
  raw: Prisma.JsonValue | null | undefined
): CapabilitySnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const candidate = raw as Partial<CapabilitySnapshot>;
  if (
    typeof candidate.schemaVersion !== "number" ||
    candidate.schemaVersion > MAX_SUPPORTED_SCHEMA_VERSION
  ) {
    logger.warn(
      { schemaVersion: candidate.schemaVersion },
      "capability snapshot schema version unsupported — treating as unknown"
    );
    return null;
  }

  // Required fields: schemaVersion (above), enabledPlugins,
  // hasFirehoseExchange, detectedAt. The amqp* pair is optional in v1.
  if (
    !Array.isArray(candidate.enabledPlugins) ||
    typeof candidate.hasFirehoseExchange !== "boolean" ||
    typeof candidate.detectedAt !== "string"
  ) {
    logger.warn(
      { keys: Object.keys(candidate) },
      "capability snapshot missing required fields — treating as unknown"
    );
    return null;
  }

  return {
    schemaVersion: candidate.schemaVersion,
    enabledPlugins: candidate.enabledPlugins,
    hasFirehoseExchange: candidate.hasFirehoseExchange,
    ...(typeof candidate.amqpReachable === "boolean"
      ? { amqpReachable: candidate.amqpReachable }
      : {}),
    ...(typeof candidate.amqpReachableAt === "string"
      ? { amqpReachableAt: candidate.amqpReachableAt }
      : {}),
    detectedAt: candidate.detectedAt,
  };
}

/**
 * Read the resolved snapshot for a server (detected ∘ override). Returns
 * null when the server has no snapshot yet OR when the persisted JSON is
 * malformed/too-new for this reader.
 */
export async function getServerCapabilities(
  serverId: string
): Promise<CapabilitySnapshot | null> {
  const row = await prisma.rabbitMQServer.findUnique({
    where: { id: serverId },
    select: {
      capabilities: true,
      capabilityOverride: true,
    },
  });
  if (!row) return null;

  return applyCapabilityOverride(
    parseCapabilitySnapshot(row.capabilities),
    row.capabilityOverride
  );
}

/**
 * Persist a freshly detected snapshot using **optimistic compare-and-swap**.
 *
 * The caller passes the `capabilitiesAt` it observed when the detection
 * cycle started (`previousCapabilitiesAt`). The write only succeeds if
 * the row's `capabilitiesAt` still matches that value (or both are null
 * for first-time detection). Two writers racing on the same server
 * produce one win and one no-op — never a lost update.
 *
 * Returns `true` if the row was updated, `false` when CAS blocked it
 * because another writer already won.
 */
export async function persistServerCapabilities(
  serverId: string,
  snapshot: CapabilitySnapshot,
  scalars: { rabbitmqVersion?: string; productName?: string },
  previousCapabilitiesAt: Date | null
): Promise<boolean> {
  // CAS predicate: row must still have the `capabilitiesAt` we observed
  // before detection started. `previousCapabilitiesAt === null` matches
  // a row whose snapshot has never been persisted.
  const result = await prisma.rabbitMQServer.updateMany({
    where: {
      id: serverId,
      capabilitiesAt: previousCapabilitiesAt,
    },
    data: {
      capabilities: snapshot as unknown as Prisma.InputJsonValue,
      capabilitiesAt: new Date(snapshot.detectedAt),
      ...(scalars.rabbitmqVersion ? { version: scalars.rabbitmqVersion } : {}),
      ...(scalars.productName ? { productName: scalars.productName } : {}),
    },
  });

  return result.count > 0;
}
