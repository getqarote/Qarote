import { z } from "zod";

export const onboardingSchema = z.object({
  orgName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: "Organization name is required",
    }),
  workspaceName: z
    .string()
    .trim()
    .min(1, "Workspace name is required")
    .max(50, "Workspace name must be 50 characters or less"),
  tags: z.array(z.string().trim().min(1).max(20)).max(10).optional(),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
