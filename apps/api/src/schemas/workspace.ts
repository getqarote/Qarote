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
  unackedWarnThreshold: z.number().int().min(0).max(100_000).optional(),
  vhostThresholds: z
    .record(z.string(), z.number().int().min(0).max(100_000))
    .optional(),
  // Trace retention window in hours. Validated server-side against the plan max.
  // FREE: not configurable (ignored / rejected by the router).
  // DEVELOPER: 1–168h. ENTERPRISE: 1–720h.
  // The absolute upper bound (720) matches the Enterprise plan max (30 days).
  traceRetentionHours: z.number().int().min(1).max(720).optional(),
});

// Schema for workspace ID parameter
export const WorkspaceIdParamSchema = z.object({
  workspaceId: z.string(),
});

// Schema for invitation ID parameter
export const InvitationIdParamSchema = z.object({
  invitationId: z.string(),
});
