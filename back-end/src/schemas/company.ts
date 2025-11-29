import { z } from "zod/v4";

// Schema for creating a workspace
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  contactEmail: z.email("Invalid email address").optional(),
  logoUrl: z.url("Invalid URL").optional(),
});

// Schema for updating a workspace
export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").optional(),
  contactEmail: z.email("Invalid email address").optional(),
  logoUrl: z.url("Invalid URL").optional(),
});

// Types derived from schemas
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
