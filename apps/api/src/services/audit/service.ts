/**
 * AuditLog service — single writer surface for the operator-facing
 * audit table. Per-event helpers (`recordCapabilityRecheck`, etc.) keep
 * call sites ergonomic; `record()` is the underlying primitive.
 *
 * Writes are best-effort — an audit failure must NOT abort the action
 * being audited (capability recheck succeeded ⇒ user response succeeds
 * even if the audit insert fails). All errors are caught + logged.
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import type { CapabilityRecheckPayload } from "./types";

import { AuditLogKind, type Prisma } from "@/generated/prisma/client";

interface RecordOptions {
  actorUserId: string | null;
  serverId?: string | null;
}

async function record(
  kind: AuditLogKind,
  payload: Prisma.InputJsonValue,
  options: RecordOptions
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        kind,
        actorUserId: options.actorUserId,
        serverId: options.serverId ?? null,
        payload,
      },
    });
  } catch (error) {
    // Audit writes are best-effort. Log loudly — silent audit failure
    // is its own compliance issue — but do not throw.
    logger.error(
      {
        error,
        kind,
        actorUserId: options.actorUserId,
        serverId: options.serverId,
      },
      "audit log: write failed"
    );
  }
}

/**
 * Record a capability recheck attempt. Called from the
 * `rabbitmq.recheckCapabilities` mutation regardless of outcome.
 *
 * `payload` is a `type` (not interface) in `types.ts` so it's
 * structurally assignable to Prisma's `InputJsonValue` without a cast.
 */
export async function recordCapabilityRecheck(
  serverId: string,
  actorUserId: string,
  payload: CapabilityRecheckPayload
): Promise<void> {
  await record(AuditLogKind.CAPABILITY_RECHECK, payload, {
    actorUserId,
    serverId,
  });
}
