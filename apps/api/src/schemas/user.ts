import { UserRole } from "@prisma/client";
import { z } from "zod/v4";

// Schema for creating a user
export const CreateUserSchema = z.object({
  email: z.email("Invalid email address"),
  passwordHash: z.string().min(1, "Password hash is required").optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(UserRole).default(UserRole.MEMBER),
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
  email: z.email("Invalid email address").optional(),
});

// Schema for workspace ID parameter
export const WorkspaceIdParamSchema = z.object({
  workspaceId: z.string(),
});

// Schema for user ID parameter
export const UserIdParamSchema = z.object({
  userId: z.string(),
});

// Schema for getting workspace users
export const GetWorkspaceUsersSchema = z.object({
  workspaceId: z.string(),
});

// Schema for getting invitations
export const GetInvitationsSchema = z.object({
  workspaceId: z.string(),
});

// Schema for getting a user by ID
export const GetUserSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

// Schema for updating a user with ID
export const UpdateUserWithIdSchema = UpdateUserSchema.extend({
  workspaceId: z.string(),
  id: z.string(),
});

// Schema for removing user from workspace
export const RemoveUserFromWorkspaceSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
});

// Types derived from schemas
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type WorkspaceIdParam = z.infer<typeof WorkspaceIdParamSchema>;
export type UserIdParam = z.infer<typeof UserIdParamSchema>;
export type GetWorkspaceUsersInput = z.infer<typeof GetWorkspaceUsersSchema>;
export type GetInvitationsInput = z.infer<typeof GetInvitationsSchema>;
export type GetUserInput = z.infer<typeof GetUserSchema>;
export type UpdateUserWithIdInput = z.infer<typeof UpdateUserWithIdSchema>;
export type RemoveUserFromWorkspaceInput = z.infer<
  typeof RemoveUserFromWorkspaceSchema
>;
