import { UserRole } from "@prisma/client";
import { z } from "zod/v4";

export const inviteUserSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum(UserRole).default(UserRole.MEMBER),
  message: z
    .string()
    .optional()
    .describe("Optional personal message from inviter"),
});

export type InviteUserRequest = z.infer<typeof inviteUserSchema>;
