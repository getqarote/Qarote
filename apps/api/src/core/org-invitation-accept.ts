import { z } from "zod";

import { ensureWorkspaceMember } from "@/core/workspace-access";

import { WorkspaceAssignmentSchema } from "@/schemas/organization";

import { UserRole } from "@/generated/prisma/client";

type PrismaTransaction = Parameters<typeof ensureWorkspaceMember>[3];

/**
 * Apply workspace assignments from an organization invitation.
 * If workspaceAssignments is non-empty, assigns user to those specific workspaces with given roles.
 * If empty, falls back to assigning user to ALL org workspaces as MEMBER.
 * Returns the first workspace ID (for setting as active workspace), or null.
 */
export async function applyWorkspaceAssignments(
  tx: NonNullable<PrismaTransaction>,
  userId: string,
  organizationId: string,
  rawAssignments: unknown
): Promise<string | null> {
  const parsed = z.array(WorkspaceAssignmentSchema).safeParse(rawAssignments);
  const assignments = parsed.success ? parsed.data : [];

  if (assignments.length > 0) {
    // Filter to workspaces that still exist in the org (handles stale IDs)
    const existing = await tx.workspace.findMany({
      where: {
        id: { in: assignments.map((a) => a.workspaceId) },
        organizationId,
      },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((w) => w.id));
    const validAssignments = assignments.filter((a) =>
      existingIds.has(a.workspaceId)
    );

    for (const { workspaceId, role } of validAssignments) {
      await ensureWorkspaceMember(userId, workspaceId, role, tx);
    }

    return validAssignments[0]?.workspaceId ?? null;
  }

  // Fall back: all org workspaces as MEMBER
  const orgWorkspaces = await tx.workspace.findMany({
    where: { organizationId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  for (const ws of orgWorkspaces) {
    await ensureWorkspaceMember(userId, ws.id, UserRole.MEMBER, tx);
  }

  return orgWorkspaces[0]?.id ?? null;
}
