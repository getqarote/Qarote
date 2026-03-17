/**
 * Organization Data Migration
 *
 * Migrates existing data to the Organization model:
 * 1. For each distinct workspace owner, creates an Organization
 * 2. Copies stripe billing fields from User to Organization
 * 3. Creates OrganizationMember (OWNER) for the workspace owner
 * 4. Links all owned workspaces to the new Organization
 * 5. Creates OrganizationMember (MEMBER) for each WorkspaceMember
 * 6. Second pass: creates Organizations for users with Subscriptions
 *    who were not captured as workspace owners
 *
 * All operations use Prisma transactions for safety.
 * Idempotent — safe to run multiple times.
 */

import { randomBytes } from "node:crypto";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { OrgRole } from "@/generated/prisma/client";

/**
 * Generate a URL-safe slug from a name with a random suffix.
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomBytes(3).toString("hex");
  return `${base || "org"}-${suffix}`;
}

interface MigrationFailure {
  userId: string;
  error: string;
}

interface MigrationStats {
  orgsCreated: number;
  membersCreated: number;
  workspacesLinked: number;
  orphanSubscriptionsHandled: number;
  failures: MigrationFailure[];
}

export async function runOrgMigration(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    orgsCreated: 0,
    membersCreated: 0,
    workspacesLinked: 0,
    orphanSubscriptionsHandled: 0,
    failures: [],
  };

  // Track which users already have an org (from the workspace-owner pass)
  const usersWithOrg = new Set<string>();

  // ── Pass 1: Workspace owners ─────────────────────────────────────────

  // Find distinct owner IDs that have workspaces
  const ownedWorkspaces = await prisma.workspace.findMany({
    where: { ownerId: { not: null } },
    select: { ownerId: true },
    distinct: ["ownerId"],
  });

  for (const { ownerId } of ownedWorkspaces) {
    if (!ownerId) continue;

    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        subscription: {
          select: {
            stripeCustomerId: true,
            stripeSubscriptionId: true,
          },
        },
      },
    });

    if (!user) {
      logger.warn({ ownerId }, "Workspace owner not found — skipping");
      continue;
    }

    // Check if this user already has an organization (from bootstrap-org or prior run)
    const existingMembership = await prisma.organizationMember.findFirst({
      where: { userId: ownerId, role: OrgRole.OWNER },
      select: { organizationId: true },
    });

    const displayName =
      user.name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      "User";
    const orgName = `${displayName}'s Organization`;

    try {
      let txOrgs = 0;
      let txMembers = 0;
      let txWorkspaces = 0;

      await prisma.$transaction(async (tx) => {
        let orgId: string;

        if (existingMembership) {
          // Hydrate preexisting org with missing billing/contact fields
          orgId = existingMembership.organizationId;
          await tx.organization.update({
            where: { id: orgId },
            data: {
              contactEmail: user.email,
              stripeCustomerId: user.subscription?.stripeCustomerId ?? null,
              stripeSubscriptionId:
                user.subscription?.stripeSubscriptionId ?? null,
            },
          });
        } else {
          // Create the Organization with billing fields from the user's subscription
          const org = await tx.organization.create({
            data: {
              name: orgName,
              slug: generateSlug(displayName),
              contactEmail: user.email,
              stripeCustomerId: user.subscription?.stripeCustomerId ?? null,
              stripeSubscriptionId:
                user.subscription?.stripeSubscriptionId ?? null,
            },
          });
          orgId = org.id;
          txOrgs++;

          // Create OWNER membership
          await tx.organizationMember.create({
            data: {
              userId: user.id,
              organizationId: orgId,
              role: OrgRole.OWNER,
            },
          });
          txMembers++;
        }

        // Link all workspaces owned by this user that aren't yet linked
        const workspaces = await tx.workspace.findMany({
          where: { ownerId: user.id },
          select: { id: true, organizationId: true },
        });
        const unlinkedIds = workspaces
          .filter((ws) => ws.organizationId !== orgId)
          .map((ws) => ws.id);
        const allWorkspaceIds = workspaces.map((ws) => ws.id);

        if (unlinkedIds.length > 0) {
          const { count } = await tx.workspace.updateMany({
            where: { id: { in: unlinkedIds } },
            data: { organizationId: orgId },
          });
          txWorkspaces += count;
        }

        // Create MEMBER memberships for workspace members (deduplicated)
        const workspaceMembers = await tx.workspaceMember.findMany({
          where: {
            workspaceId: { in: allWorkspaceIds },
            userId: { not: user.id }, // Exclude the owner (already OWNER)
          },
          select: { userId: true },
          distinct: ["userId"],
        });

        for (const wm of workspaceMembers) {
          // Check for existing membership (idempotency within transaction)
          const existing = await tx.organizationMember.findUnique({
            where: {
              userId_organizationId: {
                userId: wm.userId,
                organizationId: orgId,
              },
            },
          });

          if (!existing) {
            await tx.organizationMember.create({
              data: {
                userId: wm.userId,
                organizationId: orgId,
                role: OrgRole.MEMBER,
              },
            });
            txMembers++;
          }
        }

        // Link the user's subscription to the organization
        const subscription = await tx.subscription.findUnique({
          where: { userId: user.id },
        });

        if (subscription && !subscription.organizationId) {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { organizationId: orgId },
          });
        }
      });

      stats.orgsCreated += txOrgs;
      stats.membersCreated += txMembers;
      stats.workspacesLinked += txWorkspaces;

      usersWithOrg.add(ownerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        { userId: ownerId, error },
        "Failed to create organization for workspace owner — skipping"
      );
      stats.failures.push({ userId: ownerId, error: message });
    }
  }

  // ── Pass 2: Orphan subscriptions ─────────────────────────────────────
  // Users who have a Subscription but were NOT workspace owners

  const subscriptions = await prisma.subscription.findMany({
    where: { organizationId: null },
    select: {
      id: true,
      userId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  for (const sub of subscriptions) {
    if (usersWithOrg.has(sub.userId)) continue;

    const user = await prisma.user.findUnique({
      where: { id: sub.userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    if (!user) continue;
    const displayName =
      user.name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      "User";
    const orgName = `${displayName}'s Organization`;

    try {
      let txOrgs = 0;
      let txMembers = 0;
      let txOrphans = 0;

      await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: generateSlug(displayName),
            contactEmail: user.email,
            stripeCustomerId: sub.stripeCustomerId ?? null,
            stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
          },
        });

        txOrgs++;

        await tx.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: OrgRole.OWNER,
          },
        });
        txMembers++;

        await tx.subscription.update({
          where: { id: sub.id },
          data: { organizationId: org.id },
        });

        txOrphans++;
      });

      stats.orgsCreated += txOrgs;
      stats.membersCreated += txMembers;
      stats.orphanSubscriptionsHandled += txOrphans;

      usersWithOrg.add(sub.userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        { userId: sub.userId, subscriptionId: sub.id, error },
        "Failed to create organization for orphan subscription — skipping"
      );
      stats.failures.push({ userId: sub.userId, error: message });
    }
  }

  if (stats.failures.length > 0) {
    logger.warn(
      { failureCount: stats.failures.length, failures: stats.failures },
      "Organization migration completed with failures"
    );
  }

  logger.info(
    {
      orgsCreated: stats.orgsCreated,
      membersCreated: stats.membersCreated,
      workspacesLinked: stats.workspacesLinked,
      orphanSubscriptionsHandled: stats.orphanSubscriptionsHandled,
      failureCount: stats.failures.length,
    },
    "Organization migration completed"
  );

  return stats;
}
