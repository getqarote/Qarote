import { z } from "zod";

// Validation schemas
export const submitFeedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "GENERAL", "IMPROVEMENT"]),
  category: z.enum([
    "UI_UX",
    "PERFORMANCE",
    "SECURITY",
    "FUNCTIONALITY",
    "DOCUMENTATION",
    "OTHER",
  ]),
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  email: z.string().email().optional(),
  metadata: z
    .object({
      url: z.string(),
      userAgent: z.string(),
      viewport: z.string(),
      timestamp: z.string(),
    })
    .optional(),
});

export const updateFeedbackSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  response: z.string().max(2000).optional(),
});

// ID parameter schemas
export const FeedbackIdSchema = z.object({
  id: z.string(),
});

// Query schemas
export const GetAllFeedbackQuerySchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(20),
  status: z.string().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  workspaceId: z.string().optional(),
});

export const GetFeedbackStatsQuerySchema = z.object({
  workspaceId: z.string().optional(),
});

// Update feedback with ID schema
export const UpdateFeedbackWithIdSchema = updateFeedbackSchema.extend({
  id: z.string(),
});
