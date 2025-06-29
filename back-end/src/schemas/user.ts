import { z } from "zod/v4";
import { UserRole } from "@prisma/client";

// Schema for creating a user
export const CreateUserSchema = z.object({
  email: z.email("Invalid email address"),
  passwordHash: z.string().min(1, "Password hash is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(UserRole).default(UserRole.USER),
  workspaceId: z.string().uuid("Invalid workspace ID"),
  isActive: z.boolean().default(true),
});

// Schema for updating a user
export const UpdateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  role: z.enum(UserRole).optional(),
  isActive: z.boolean().optional(),
  workspaceId: z.string().uuid("Invalid workspace ID").optional(),
});

// Schema for updating user profile (by the user themselves)
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
});

// Types derived from schemas
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
