import { z } from "zod";

export const workspaceSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(50, "Name must be less than 50 characters"),
  contactEmail: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  tags: z
    .array(z.string().min(1).max(20))
    .max(10, "Maximum 10 tags allowed")
    .optional(),
});

export type WorkspaceFormData = z.infer<typeof workspaceSchema>;
