import { z } from "zod";

// Feedback form schema
export const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "IMPROVEMENT", "GENERAL"], {
    message: "Please select a feedback type",
  }),
  category: z.enum(
    [
      "UI_UX",
      "PERFORMANCE",
      "SECURITY",
      "FUNCTIONALITY",
      "DOCUMENTATION",
      "OTHER",
    ],
    {
      message: "Please select a category",
    }
  ),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;
