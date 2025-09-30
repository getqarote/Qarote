import { z } from "zod";

export const workspacePlanEnum = z.enum([
  "FREE",
  "DEVELOPER",
  "STARTUP",
  "BUSINESS",
]);

export const UserPlanSchema = z.enum([
  "FREE",
  "DEVELOPER",
  "STARTUP",
  "BUSINESS",
]);

// Schema for creating a workspace
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  contactEmail: z.string().email("Invalid email address").optional(),
  logoUrl: z.string().url("Invalid URL").optional(),
});

// Schema for updating a workspace
export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").optional(),
  contactEmail: z.string().email("Invalid email address").optional(),
});

// Types derived from schemas
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type UserPlan = z.infer<typeof UserPlanSchema>;
