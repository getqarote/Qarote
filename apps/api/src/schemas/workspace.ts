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

// Schema for invitation ID parameter
export const InvitationIdParamSchema = z.object({
  invitationId: z.string(),
});
