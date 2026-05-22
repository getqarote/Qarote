import { z } from "zod/v4";

import { WorkspaceRole } from "@/generated/prisma/client";

// OWNER is intentionally excluded from invitation roles — ownership transfer
// is its own flow (see docs/plans/rbac.md §3.2).
const InvitationRoleEnum = z.enum([
  WorkspaceRole.ADMIN,
  WorkspaceRole.MEMBER,
  WorkspaceRole.READONLY,
]);

export const inviteUserSchema = z.object({
  email: z.email("Invalid email address"),
  role: InvitationRoleEnum.default(WorkspaceRole.MEMBER),
  message: z
    .string()
    .optional()
    .describe("Optional personal message from inviter"),
});
