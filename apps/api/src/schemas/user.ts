import { UserRole } from "@prisma/client";
import { z } from "zod/v4";

// Schema for updating a user
const UpdateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  role: z.enum(UserRole).optional(),
  isActive: z.boolean().optional(),
  workspaceId: z.uuid("Invalid workspace ID").optional(),
});

// Schema for updating user profile (by the user themselves)
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.email("Invalid email address").optional(),
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
