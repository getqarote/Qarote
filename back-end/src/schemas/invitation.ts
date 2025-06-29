import { z } from "zod/v4";

export const inviteUserSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  message: z
    .string()
    .optional()
    .describe("Optional personal message from inviter"),
});

export type InviteUserRequest = z.infer<typeof inviteUserSchema>;
