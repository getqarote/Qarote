import { z } from "zod/v4";

export const WorkspacePlanSchema = z.enum([
  "FREE",
  "FREELANCE",
  "STARTUP",
  "BUSINESS",
]);

// Schema for creating a workspace
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  contactEmail: z.string().email("Invalid email address").optional(),
  logoUrl: z.url("Invalid URL").optional(),
  plan: WorkspacePlanSchema.default("FREE"),
});

// Schema for updating a workspace
export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").optional(),
  contactEmail: z.string().email("Invalid email address").optional(),
  logoUrl: z.url("Invalid URL").optional(),
  plan: WorkspacePlanSchema.optional(),
});

// Schema for updating workspace privacy settings
export const updateWorkspacePrivacySchema = z.object({
  storageMode: z.enum(["MEMORY_ONLY", "TEMPORARY", "HISTORICAL"]),
  retentionDays: z.number().min(0).max(365),
  encryptData: z.boolean(),
  autoDelete: z.boolean(),
  consentGiven: z.boolean(),
});

// Types derived from schemas
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type UpdateWorkspacePrivacyInput = z.infer<
  typeof updateWorkspacePrivacySchema
>;
export type WorkspacePlan = z.infer<typeof WorkspacePlanSchema>;
