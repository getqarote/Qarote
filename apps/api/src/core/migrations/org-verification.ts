/**
 * Organization Migration Verification Script
 *
 * Checks production data integrity after org migration:
 * 1. Every workspace has a non-null organizationId
 * 2. Every organization has at least one OWNER member
 * 3. Every organization with workspaces has a Subscription (or is self-hosted)
 * 4. No orphaned org members (user exists)
 *
 * Run manually: npx tsx src/core/migrations/org-verification.ts
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { deploymentConfig } from "@/config";

interface CheckResult {
  name: string;
  passed: boolean;
  count: number;
  details?: string;
}

async function checkWorkspacesHaveOrg(): Promise<CheckResult> {
  const total = await prisma.workspace.count();

  // organizationId is required in schema now, but verify at data level via raw query
  // (Prisma won't let us query `organizationId: null` on a required field)
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "Workspace" WHERE "organizationId" IS NULL
  `;
  const missing = Number(result[0].count);

  return {
    name: "Every workspace has a non-null organizationId",
    passed: missing === 0,
    count: total,
    details:
      missing > 0
        ? `${missing} workspace(s) missing organizationId`
        : undefined,
  };
}

async function checkOrgsHaveOwner(): Promise<CheckResult> {
  // Single query: get all orgs with their OWNER members included
  const orgsWithOwnerCounts = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      members: {
        where: { role: "OWNER" },
        select: { id: true },
      },
    },
  });

  const orgsWithoutOwner = orgsWithOwnerCounts
    .filter((org) => org.members.length === 0)
    .map((org) => `${org.name} (${org.id})`);

  return {
    name: "Every organization has at least one OWNER member",
    passed: orgsWithoutOwner.length === 0,
    count: orgsWithOwnerCounts.length,
    details:
      orgsWithoutOwner.length > 0
        ? `${orgsWithoutOwner.length} org(s) without OWNER: ${orgsWithoutOwner.slice(0, 5).join(", ")}${orgsWithoutOwner.length > 5 ? "..." : ""}`
        : undefined,
  };
}

async function checkOrgsWithWorkspacesHaveSubscription(): Promise<CheckResult> {
  if (deploymentConfig.isSelfHosted()) {
    return {
      name: "Every organization with workspaces has a Subscription",
      passed: true,
      count: 0,
      details: "Skipped: self-hosted mode (subscriptions not required)",
    };
  }

  const orgsWithWorkspaces = await prisma.organization.findMany({
    where: {
      workspaces: { some: {} },
    },
    select: {
      id: true,
      name: true,
      subscription: { select: { id: true } },
    },
  });

  const missing = orgsWithWorkspaces.filter((org) => !org.subscription);

  return {
    name: "Every organization with workspaces has a Subscription",
    passed: missing.length === 0,
    count: orgsWithWorkspaces.length,
    details:
      missing.length > 0
        ? `${missing.length} org(s) with workspaces but no subscription: ${missing
            .slice(0, 5)
            .map((o) => `${o.name} (${o.id})`)
            .join(", ")}${missing.length > 5 ? "..." : ""}`
        : undefined,
  };
}

async function checkNoOrphanedMembers(): Promise<CheckResult> {
  const totalMembers = await prisma.organizationMember.count();

  // Find org members whose userId does not exist in User table via raw query
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "OrganizationMember" om
    LEFT JOIN "User" u ON om."userId" = u."id"
    WHERE u."id" IS NULL
  `;
  const orphanedCount = Number(result[0].count);

  return {
    name: "No orphaned organization members (all users exist)",
    passed: orphanedCount === 0,
    count: totalMembers,
    details:
      orphanedCount > 0 ? `${orphanedCount} orphaned member(s)` : undefined,
  };
}

async function runVerification() {
  logger.info("Starting organization migration verification...");

  const checks: CheckResult[] = await Promise.all([
    checkWorkspacesHaveOrg(),
    checkOrgsHaveOwner(),
    checkOrgsWithWorkspacesHaveSubscription(),
    checkNoOrphanedMembers(),
  ]);

  let allPassed = true;

  for (const check of checks) {
    const status = check.passed ? "PASS" : "FAIL";
    const icon = check.passed ? "[OK]" : "[!!]";

    logger.info(
      {
        check: check.name,
        status,
        count: check.count,
        details: check.details,
      },
      `${icon} ${check.name} — ${status} (${check.count} records)`
    );

    if (!check.passed) {
      allPassed = false;
    }
  }

  const summary = allPassed
    ? "All verification checks passed."
    : "Some verification checks FAILED. Review the output above.";

  logger.info({ allPassed, totalChecks: checks.length }, summary);

  return allPassed;
}

// Run if executed directly
runVerification()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    logger.error({ error }, "Verification script failed with error");
    process.exit(1);
  });
