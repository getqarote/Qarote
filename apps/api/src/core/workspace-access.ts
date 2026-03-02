import { prisma } from "@/core/prisma";

import { Prisma, UserRole } from "@/generated/prisma/client";

/**
 * Get user's role in a workspace (from WorkspaceMember or ADMIN if owner)
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<UserRole | null> {
  // Check if user is the workspace owner
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });

  if (workspace?.ownerId === userId) {
    return UserRole.ADMIN;
  }

  // Get role from WorkspaceMember
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: { role: true },
  });

  return member?.role || null;
}

/**
 * Ensure a user is a member of a workspace (idempotent - won't create duplicate)
 * @param tx Optional transaction client. If provided, uses the transaction; otherwise uses prisma directly.
 */
export async function ensureWorkspaceMember(
  userId: string,
  workspaceId: string,
  role: UserRole,
  tx?: Omit<
    Prisma.TransactionClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >
): Promise<void> {
  const client = tx || prisma;
  await client.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    update: {
      role, // Update role if membership already exists
    },
    create: {
      userId,
      workspaceId,
      role,
    },
  });
}
