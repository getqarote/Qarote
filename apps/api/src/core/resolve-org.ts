import type { OrgRole } from "@/generated/prisma/client";

interface OrgResolutionPrisma {
  workspace: {
    findUnique: (args: {
      where: { id: string };
      select: { organizationId: true };
    }) => Promise<{ organizationId: string | null } | null>;
  };
  organizationMember: {
    findUnique: (args: {
      where: {
        userId_organizationId: { userId: string; organizationId: string };
      };
      select: { organizationId: true; role: true };
    }) => Promise<{ organizationId: string; role: OrgRole } | null>;
    findFirst: (args: {
      where: { userId: string };
      select: { organizationId: true; role: true };
    }) => Promise<{ organizationId: string; role: OrgRole } | null>;
  };
}

interface OrgResolution {
  organizationId: string;
  role: OrgRole;
}

/**
 * Resolve the current organization from the user's active workspace.
 *
 * Resolution strategy:
 * 1. If workspaceId is provided, derive the org from workspace.organizationId
 *    and verify the user is a member of that org (scoped lookup).
 * 2. If workspaceId is null (onboarding — user has no workspace yet),
 *    fall back to the user's first org membership. This is safe because
 *    a user without a workspace can only be in one organization.
 *
 * For multi-org users with a workspace, (1) guarantees we always resolve
 * the org that matches the active workspace, never an arbitrary one.
 */
export async function resolveCurrentOrganization(
  prisma: OrgResolutionPrisma,
  userId: string,
  workspaceId: string | null
): Promise<OrgResolution | null> {
  if (workspaceId) {
    return resolveFromWorkspace(prisma, userId, workspaceId);
  }

  // No workspace — onboarding fallback.
  return prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true, role: true },
  });
}

/**
 * Resolve org from a specific workspace (scoped, multi-org safe).
 */
async function resolveFromWorkspace(
  prisma: OrgResolutionPrisma,
  userId: string,
  workspaceId: string
): Promise<OrgResolution | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });

  if (!workspace?.organizationId) {
    return null;
  }

  return prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: workspace.organizationId,
      },
    },
    select: { organizationId: true, role: true },
  });
}
