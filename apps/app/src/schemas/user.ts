import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  tags: z.string().optional().default(""),
  vhost: z.string().default("/"),
});

export type CreateUserForm = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  password: z.string().optional(),
  tags: z.string().optional().default(""),
  removePassword: z.boolean().default(false),
});

export type EditUserForm = z.infer<typeof editUserSchema>;
