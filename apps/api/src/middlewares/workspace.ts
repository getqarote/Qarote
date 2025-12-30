import { prisma } from "@/core/prisma";

/**
 * Check if a user has access to a workspace (either as a member or owner)
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  // Check if user is the workspace owner
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });

  if (workspace?.ownerId === userId) {
    return true;
  }

  // Check if user is a member via WorkspaceMember
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

  return !!member;
}
