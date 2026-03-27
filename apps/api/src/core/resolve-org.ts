import type { OrgRole } from "@/generated/prisma/client";

/**
 * Resolve the current organization from the user's active workspace.
 *
 * For multi-org users, the workspace determines which org is "active".
 * This helper looks up workspace.organizationId and finds the user's
 * OrganizationMember for that specific org.
 *
 * @returns { organizationId, role } or null if workspaceId is null,
 *          workspace not found, or user is not a member of the org.
 */
export async function resolveCurrentOrganization(
  prisma: {
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
    };
  },
  userId: string,
  workspaceId: string | null
): Promise<{ organizationId: string; role: OrgRole } | null> {
  if (!workspaceId) {
    return null;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });

  if (!workspace?.organizationId) {
    return null;
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: workspace.organizationId,
      },
    },
    select: { organizationId: true, role: true },
  });

  return membership;
}
