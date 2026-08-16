import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { StripeService } from "@/services/stripe/stripe.service";

import { SubscriptionStatus } from "@/generated/prisma/client";

/** Subscription states that are already terminal — nothing to cancel. */
const TERMINAL_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.CANCELED,
  SubscriptionStatus.INCOMPLETE_EXPIRED,
];

/** Raised when the Stripe cancel step fails, so callers abort before any DB write. */
export class SubscriptionCancelFailedError extends Error {
  constructor(public readonly organizationId: string) {
    super(`Failed to cancel subscription for organization ${organizationId}`);
    this.name = "SubscriptionCancelFailedError";
  }
}

/**
 * Hard-delete an organization and everything under it — workspaces, their
 * servers (incl. encrypted credentials), licenses, members, alerts — in a
 * transaction. `user.workspaceId` is SetNull'd by the workspace delete; product
 * Feedback is intentionally preserved (SetNull, anonymised).
 *
 * A live Stripe subscription is cancelled IMMEDIATELY *before* the DB delete:
 * if Stripe rejects, we throw and never touch the database, so billing and
 * data never drift (a deleted org must never leave a paying subscription
 * dangling, and a Stripe outage must not half-delete the org).
 *
 * Shared by the org-delete mutation and the account-delete cascade.
 */
export async function deleteOrganizationCascade(
  organizationId: string
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscription: {
        select: { stripeSubscriptionId: true, status: true },
      },
    },
  });
  if (!org) return; // already gone — idempotent

  const subId = org.subscription?.stripeSubscriptionId ?? null;
  // The Subscription is the single source of truth for billing state: cancel
  // only when a row exists and its status is not already terminal. No row
  // means there is nothing to cancel.
  const isLive = org.subscription
    ? !TERMINAL_STATUSES.includes(org.subscription.status)
    : false;

  if (subId && isLive) {
    try {
      // `false` => cancel immediately (not at period end): the org is leaving.
      await StripeService.cancelSubscription(subId, false);
    } catch (error) {
      logger.error(
        { error, organizationId, subId },
        "org delete: Stripe cancel failed — aborting before any DB write"
      );
      throw new SubscriptionCancelFailedError(organizationId);
    }
  }

  // The Workspace → Organization FK is RESTRICT, and several workspace
  // children (RabbitMQServer, License) are SET NULL — a naive
  // `organization.delete()` would fail, and even via the workspace those rows
  // would be *orphaned* (workspaceId nulled), leaving servers with encrypted
  // broker credentials dangling. So tear the subtree down explicitly, in a
  // transaction, bottom-up:
  //   1. delete servers + licenses (SET-NULL children that must not survive),
  //   2. delete the workspaces (their CASCADE children go with them; Feedback
  //      is intentionally SET-NULL'd — preserved as anonymous product signal),
  //   3. delete the now-childless org.
  await prisma.$transaction(async (tx) => {
    const workspaceIds = (
      await tx.workspace.findMany({
        where: { organizationId },
        select: { id: true },
      })
    ).map((w) => w.id);

    if (workspaceIds.length > 0) {
      await tx.rabbitMQServer.deleteMany({
        where: { workspaceId: { in: workspaceIds } },
      });
      await tx.license.deleteMany({
        where: { workspaceId: { in: workspaceIds } },
      });
    }

    await tx.workspace.deleteMany({ where: { organizationId } });
    await tx.organization.delete({ where: { id: organizationId } });
  });

  logger.info(
    { organizationId, cancelledSubscription: !!(subId && isLive) },
    "Organization deleted (cascade)"
  );
}
