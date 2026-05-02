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
 * Plugin names whose presence on ANY node implies the firehose exchange
 * is available. `rabbitmq_tracing` is the canonical plugin; the
 * `rabbitmq_event_exchange` plugin offers a similar surface and is
 * accepted as a fallback so we don't lock customers into one plugin.
 */
const FIREHOSE_PLUGIN_NAMES = ["rabbitmq_tracing", "rabbitmq_event_exchange"];

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

  // Union enabled plugins across all nodes — a feature is "available" if
  // any node hosts it. This matches RabbitMQ's clustering semantics
  // (queues created on a node hosting the right plugin work cluster-wide
  // for federation/exchange-type concerns).
  const enabledPlugins = unionPlugins(nodes);

  const hasFirehoseExchange = FIREHOSE_PLUGIN_NAMES.some((name) =>
    enabledPlugins.includes(name)
  );

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
