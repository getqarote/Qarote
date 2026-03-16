import { prisma } from "@/core/prisma";

import { Prisma, UserRole } from "@/generated/prisma/client";

/**
 * Get user's role in a workspace from WorkspaceMember.
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<UserRole | null> {
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
