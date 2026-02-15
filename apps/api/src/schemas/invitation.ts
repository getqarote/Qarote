import { z } from "zod/v4";

import { UserRole } from "@/generated/prisma/client";

export const inviteUserSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum(UserRole).default(UserRole.MEMBER),
  message: z
    .string()
    .optional()
    .describe("Optional personal message from inviter"),
});
