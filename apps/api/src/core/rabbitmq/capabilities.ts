/**
 * Detect RabbitMQ broker capabilities by reading the Management API.
 *
 * **Boundary** (per architecture review): this file lives in
 * `core/rabbitmq` because it speaks the broker's protocols. Mapping
 * capabilities → product features is the resolver's job, in
 * `services/feature-gate/capability-axis.ts`.
 *
 * The detector is intentionally **read-only** against the broker — no
 * mutations, no probes that could affect production traffic. A failed
 * detection logs and returns `null` rather than corrupting an existing
 * snapshot; persistence is the caller's responsibility.
 */

import { logger } from "@/core/logger";

import {
  CAPABILITY_SCHEMA_VERSION,
  type CapabilitySnapshot,
} from "@/services/feature-gate/capability-snapshot";

import type { RabbitMQApiClient } from "./ApiClient";
import type { RabbitMQNode, RabbitMQOverview } from "./rabbitmq.interfaces";

/**
 * The firehose exchange (`amq.rabbitmq.trace`) is a core RabbitMQ
 * mechanism available on every standard broker since 2.7 — it is NOT
 * gated behind the `rabbitmq_tracing` plugin. Qarote enables tracing via
 * `PUT /api/vhosts/{name}` with `{ tracing: true }` (standard Management
 * API, equivalent to `rabbitmqctl trace_on`) and then binds to
 * `amq.rabbitmq.trace` via AMQP — both operations require no plugin.
 *
 * `rabbitmq_tracing` only adds Management UI + log-file storage, which
 * Qarote does not use. Detecting by plugin presence produced false
 * negatives on managed brokers (AWS MQ, CloudAMQP) that omit the plugin
 * from their `enabled_plugins` list while fully supporting the firehose.
 *
 * Detection: the firehose is available on any broker where `getNodes()`
 * succeeds — i.e., any broker reachable via the standard Management API.
 */

interface DetectionResult {
  /** Detected snapshot — `null` if the detector failed to read the broker. */
  snapshot: CapabilitySnapshot | null;
  /** Indexable scalar fields, persisted alongside the JSON snapshot. */
  scalars: {
    rabbitmqVersion?: string;
    productName?: string;
  };
}

const EMPTY_RESULT: DetectionResult = { snapshot: null, scalars: {} };

/**
 * Detect capabilities for a single broker.
 *
 * Steps:
 *   1. `GET /api/overview` — read product name + version.
 *   2. `GET /api/nodes` — collect `enabled_plugins` per node, union to
 *      cluster-wide enabled set. Single check, not per-vhost (a 200-vhost
 *      broker would generate 200 HTTPs/refresh; per-vhost detection is
 *      deferred to a follow-up).
 *   3. Compose snapshot. AMQP reachability defaults to `true` on first
 *      detection — the management API and AMQP port share the broker; if
 *      HTTP works the AMQP port is reachable in the overwhelming majority
 *      of cases. Real per-broker AMQP-reachability tracking is wired
 *      through downstream consumers (firehose / spy) in a follow-up.
 *
 * Returns `{ snapshot: null }` when any step throws — the caller must
 * NOT overwrite an existing snapshot with `null`.
 */
export async function detectServerCapabilities(
  client: RabbitMQApiClient,
  context: { serverId: string }
): Promise<DetectionResult> {
  let overview: RabbitMQOverview;
  try {
    overview = await client.getOverview();
  } catch (error) {
    logger.warn(
      { error, serverId: context.serverId },
      "capability detection: getOverview failed — keeping previous snapshot"
    );
    return EMPTY_RESULT;
  }

  let nodes: RabbitMQNode[];
  try {
    nodes = await client.getNodes();
  } catch (error) {
    logger.warn(
      { error, serverId: context.serverId },
      "capability detection: getNodes failed — keeping previous snapshot"
    );
    return EMPTY_RESULT;
  }

  // Union enabled plugins across all nodes — kept for diagnostics and
  // future per-plugin capability checks (e.g. federation, shovel).
  const enabledPlugins = unionPlugins(nodes);

  // The firehose is available on any broker reachable via the Management
  // API — no plugin required (see note above). Reachability is the only
  // gate: if we got here, `getNodes()` returned without throwing, which
  // is sufficient evidence even if the cluster returned zero nodes.
  const hasFirehoseExchange = true;

  const detectedAt = new Date().toISOString();

  // Note: `amqpReachable`/`amqpReachableAt` are optional in v1 and the
  // detector intentionally does NOT set them. There is no producer of
  // `false` today; populating with a constant `true` would be a
  // permanently-stale signal. Downstream AMQP consumers (firehose, spy)
  // will write back real values in a follow-up.
  const snapshot: CapabilitySnapshot = {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    enabledPlugins,
    hasFirehoseExchange,
    detectedAt,
  };

  return {
    snapshot,
    scalars: {
      rabbitmqVersion: overview.rabbitmq_version || undefined,
      productName: overview.product_name || undefined,
    },
  };
}

function unionPlugins(nodes: RabbitMQNode[]): string[] {
  const set = new Set<string>();
  for (const node of nodes) {
    if (Array.isArray(node.enabled_plugins)) {
      for (const plugin of node.enabled_plugins) set.add(plugin);
    }
  }
  return [...set].sort();
}
