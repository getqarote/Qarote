import { z } from "zod";

// Validation schemas
export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(50, "Workspace name must be less than 50 characters"),
  contactEmail: z.string().email("Invalid email address").optional(),
  tags: z
    .array(z.string().min(1).max(20))
    .max(10, "Maximum 10 tags allowed")
    .optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(50, "Workspace name must be less than 50 characters")
    .optional(),
  contactEmail: z.string().email("Invalid email address").optional(),
  tags: z
    .array(z.string().min(1).max(20))
    .max(10, "Maximum 10 tags allowed")
    .optional(),
});

// Schema for workspace ID parameter
export const WorkspaceIdParamSchema = z.object({
  workspaceId: z.string(),
});

// Schema for updating workspace with ID
export const UpdateWorkspaceWithIdSchema = z.object({
  workspaceId: z.string(),
  workspace: UpdateWorkspaceSchema,
});

// Schema for invitation ID parameter
export const InvitationIdParamSchema = z.object({
  invitationId: z.string(),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type WorkspaceIdParam = z.infer<typeof WorkspaceIdParamSchema>;
export type UpdateWorkspaceWithIdInput = z.infer<
  typeof UpdateWorkspaceWithIdSchema
>;
export type InvitationIdParam = z.infer<typeof InvitationIdParamSchema>;
