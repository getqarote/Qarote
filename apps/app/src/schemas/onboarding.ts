import { z } from "zod";

export const onboardingSchema = z.object({
  orgName: z.string().trim().min(2, "Organization name is required").max(100),
  workspaceName: z
    .string()
    .trim()
    .min(1, "Workspace name is required")
    .max(50, "Workspace name must be 50 characters or less"),
  tags: z.array(z.string().trim().min(1).max(20)).max(10).optional(),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
