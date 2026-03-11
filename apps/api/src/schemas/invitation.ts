import { z } from "zod/v4";

import { INVITABLE_ROLES } from "@/core/workspace-roles";

import { WorkspaceRole } from "@/generated/prisma/client";

export const inviteUserSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum(INVITABLE_ROLES).default(WorkspaceRole.MEMBER),
  message: z
    .string()
    .optional()
    .describe("Optional personal message from inviter"),
});
