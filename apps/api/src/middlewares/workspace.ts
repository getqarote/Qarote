import { prisma } from "@/core/prisma";

/**
 * Check if a user has access to a workspace via WorkspaceMember.
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: { userId: true },
  });

  return !!member;
}
