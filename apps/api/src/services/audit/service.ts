/**
 * Capability-recheck audit helper. Pre-existing thin wrapper from the
 * narrow v1 audit feature; now delegates to the broader
 * `recordAuditLog()` writer (`docs/internal/AUDIT_LOG.md`).
 *
 * Kept as a separate helper so the call-site at
 * `rabbitmq.recheckCapabilities` stays terse, and so the per-event
 * payload type (`CapabilityRecheckPayload`) keeps a single home.
 */

import { recordAuditLog } from "./audit-log.service";
import type { CapabilityRecheckPayload } from "./types";

interface RecordOptions {
  actorUserId: string | null;
  /** Denormalized for readability after user deletion (matches AuditLog schema). */
  actorEmail?: string | null;
  serverId?: string | null;
  workspaceId?: string | null;
}

/**
 * Record a capability recheck attempt. Called from the
 * `rabbitmq.recheckCapabilities` mutation regardless of outcome.
 */
export async function recordCapabilityRecheck(
  serverId: string,
  options: RecordOptions,
  payload: CapabilityRecheckPayload
): Promise<void> {
  await recordAuditLog({
    actorId: options.actorUserId,
    actorEmail: options.actorEmail ?? null,
    action: "system.capability.recheck",
    category: "system",
    entityType: "server",
    entityId: serverId,
    serverId,
    workspaceId: options.workspaceId ?? null,
    metadata: payload,
  });
}
