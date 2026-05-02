/**
 * Refresh orchestration: detect → diff → persist → emit events.
 *
 * One entry point used by every refresh trigger:
 *   - Server registration (`createServer` mutation).
 *   - Manual `recheckServerCapabilities` mutation.
 *   - Nightly cron with deterministic per-server jitter.
 *
 * Centralising the trigger logic keeps the snapshot lifecycle
 * (detection, diffing for observability, concurrency-safe write) in one
 * place — call sites only decide WHEN to refresh.
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { RabbitMQClient } from "@/core/rabbitmq";
import type { RabbitMQApiClient } from "@/core/rabbitmq/ApiClient";
import { detectServerCapabilities } from "@/core/rabbitmq/capabilities";

import { EncryptionService } from "@/services/encryption.service";
import { posthog } from "@/services/posthog";

import type { CapabilitySnapshot } from "./capability-snapshot";
import {
  parseCapabilitySnapshot,
  persistServerCapabilities,
} from "./capability-snapshot";

interface RefreshResult {
  /** True when persistence wrote new data; false when concurrency guard skipped. */
  persisted: boolean;
  /** True when the new snapshot differs from the previous one. */
  changed: boolean;
  /** Detected snapshot — null when detection failed (existing snapshot kept). */
  snapshot: CapabilitySnapshot | null;
}

/**
 * Refresh capabilities for a single server.
 *
 * `client` is optional — when omitted, we construct one from the
 * server's stored credentials. Callers that already hold a client (e.g.
 * the create-server flow) pass it in to avoid an extra Prisma read.
 *
 * Failure mode: any error short-circuits to a `null` snapshot (caller
 * sees `persisted: false, changed: false`) and is logged. The previous
 * snapshot is preserved.
 */
export async function refreshServerCapabilities(
  serverId: string,
  client?: RabbitMQApiClient
): Promise<RefreshResult> {
  const owned = !client;
  const apiClient = client ?? (await buildClientFromServerId(serverId));
  if (!apiClient) {
    return { persisted: false, changed: false, snapshot: null };
  }

  // Honour the documented null-snapshot contract for ANY failure inside
  // the read/detect/persist chain. Without this guard, a transient DB
  // hiccup or a Mgmt-API blip turns into a 500 at the tRPC layer for
  // recheckCapabilities — callers expect `{ persisted: false,
  // changed: false, snapshot: null }` and the previous snapshot to be
  // preserved untouched. The catch logs once so the failure is still
  // visible in observability.
  try {
    // Capture both the parsed snapshot AND the timestamp we'll CAS against
    // when persisting — `capabilitiesAt` is the optimistic version field.
    const previousRow = await prisma.rabbitMQServer.findUnique({
      where: { id: serverId },
      select: { capabilities: true, capabilitiesAt: true },
    });
    const previous = parseCapabilitySnapshot(previousRow?.capabilities);
    const previousCapabilitiesAt = previousRow?.capabilitiesAt ?? null;

    const { snapshot, scalars } = await detectServerCapabilities(apiClient, {
      serverId,
    });
    if (!snapshot) {
      return { persisted: false, changed: false, snapshot: null };
    }

    const changed = !previous || !snapshotsEqual(previous, snapshot);

    const persisted = await persistServerCapabilities(
      serverId,
      snapshot,
      scalars,
      previousCapabilitiesAt
    );

    if (changed && persisted) {
      const observability = {
        serverId,
        before: previous
          ? {
              hasFirehoseExchange: previous.hasFirehoseExchange,
              enabledPluginsCount: previous.enabledPlugins.length,
            }
          : null,
        after: {
          hasFirehoseExchange: snapshot.hasFirehoseExchange,
          enabledPluginsCount: snapshot.enabledPlugins.length,
        },
      };
      logger.info(observability, "capability.changed");

      // Per `version-and-capability-gating.md` — PostHog event so product
      // can answer "what % of brokers gained/lost capabilities last week"
      // without log-trawling. Distinct ID is the serverId because there is
      // no acting user (cron / lifecycle event).
      try {
        posthog?.capture({
          distinctId: serverId,
          event: "capability_changed",
          properties: {
            server_id: serverId,
            had_firehose_before:
              observability.before?.hasFirehoseExchange ?? null,
            has_firehose_after: snapshot.hasFirehoseExchange,
            plugin_count_before:
              observability.before?.enabledPluginsCount ?? null,
            plugin_count_after: snapshot.enabledPlugins.length,
          },
        });
      } catch (analyticsErr) {
        logger.warn(
          { error: analyticsErr, serverId },
          "capability.changed: posthog capture failed"
        );
      }
    }

    // `owned` flag exists so future per-call cleanup (e.g. closing tunnels)
    // can be added here without changing the signature for callers that
    // brought their own client.
    void owned;

    return { persisted, changed, snapshot };
  } catch (error) {
    logger.error(
      { error, serverId },
      "refreshServerCapabilities: read/detect/persist failed — preserving previous snapshot"
    );
    return { persisted: false, changed: false, snapshot: null };
  }
}

/**
 * Compare two snapshots for observability purposes — only the fields
 * whose changes are operationally interesting. `detectedAt` is excluded
 * (every refresh updates it).
 */
function snapshotsEqual(a: CapabilitySnapshot, b: CapabilitySnapshot): boolean {
  if (a.hasFirehoseExchange !== b.hasFirehoseExchange) return false;
  if (a.amqpReachable !== b.amqpReachable) return false;
  if (a.enabledPlugins.length !== b.enabledPlugins.length) return false;
  const aSorted = [...a.enabledPlugins].sort();
  const bSorted = [...b.enabledPlugins].sort();
  for (let i = 0; i < aSorted.length; i++) {
    if (aSorted[i] !== bSorted[i]) return false;
  }
  return true;
}

async function buildClientFromServerId(
  serverId: string
): Promise<RabbitMQClient | null> {
  const server = await prisma.rabbitMQServer.findUnique({
    where: { id: serverId },
    select: {
      host: true,
      port: true,
      amqpPort: true,
      username: true,
      password: true,
      vhost: true,
      useHttps: true,
    },
  });
  if (!server) {
    logger.warn({ serverId }, "capability refresh: server not found");
    return null;
  }

  try {
    return new RabbitMQClient({
      host: server.host,
      port: server.port,
      amqpPort: server.amqpPort,
      username: EncryptionService.decrypt(server.username),
      password: EncryptionService.decrypt(server.password),
      vhost: server.vhost,
      useHttps: server.useHttps,
    });
  } catch (error) {
    logger.error(
      { error, serverId },
      "capability refresh: failed to build client (decryption?)"
    );
    return null;
  }
}
