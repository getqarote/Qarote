import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  tags: z.string().optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
