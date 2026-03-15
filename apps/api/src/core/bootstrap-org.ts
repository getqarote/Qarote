/**
 * Organization Bootstrap
 *
 * Runs at startup (self-hosted only) to create a single "Default"
 * organization if none exists. This ensures self-hosted instances
 * always have an organization available.
 *
 * All operations are idempotent — safe to run on every startup.
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { isSelfHostedMode } from "@/config/deployment";

import { OrgRole } from "@/generated/prisma/client";

/**
 * Create a default organization for self-hosted instances.
 *
 * Only runs if:
 * 1. Running in self-hosted mode
 * 2. No organizations exist yet
 *
 * If a user exists (e.g. from bootstrap-admin), they are added as OWNER.
 */
async function seedDefaultOrganization(): Promise<void> {
  if (!isSelfHostedMode()) return;

  const existing = await prisma.organization.findFirst({
    select: { id: true },
  });

  if (existing) return;

  await prisma.$transaction(async (tx) => {
    // Double-check inside transaction to prevent races
    const existingInTx = await tx.organization.findFirst({
      select: { id: true },
    });
    if (existingInTx) return;

    const org = await tx.organization.create({
      data: {
        name: "Default Organization",
        slug: "default",
      },
    });

    // If there is an existing user (from admin bootstrap), make them the owner
    const firstUser = await tx.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (firstUser) {
      await tx.organizationMember.create({
        data: {
          userId: firstUser.id,
          organizationId: org.id,
          role: OrgRole.OWNER,
        },
      });
    }

    // Link any existing workspaces that have no organization
    await tx.workspace.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    });

    logger.info(
      { organizationId: org.id },
      "Default organization created for self-hosted instance"
    );
  });
}

/**
 * Run all organization bootstrap tasks.
 */
export async function bootstrapOrg(): Promise<void> {
  try {
    await seedDefaultOrganization();
  } catch (error) {
    logger.error(
      { error },
      "Organization bootstrap failed — organizations may not be available"
    );
  }
}
