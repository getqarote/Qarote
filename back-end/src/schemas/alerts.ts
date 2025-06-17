import { z } from "zod";

// Schema for creating an alert rule
export const createAlertRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum([
    "QUEUE_DEPTH",
    "MESSAGE_RATE",
    "CONSUMER_COUNT",
    "MEMORY_USAGE",
    "DISK_USAGE",
    "CONNECTION_COUNT",
    "CHANNEL_COUNT",
    "NODE_DOWN",
    "EXCHANGE_ERROR",
  ]),
  threshold: z.number().positive("Threshold must be positive"),
  operator: z.enum(["GREATER_THAN", "LESS_THAN", "EQUALS", "NOT_EQUALS"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  enabled: z.boolean().default(true),
  serverId: z.string().min(1, "Server ID is required"),
});

// Schema for updating an alert rule
export const updateAlertRuleSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  type: z
    .enum([
      "QUEUE_DEPTH",
      "MESSAGE_RATE",
      "CONSUMER_COUNT",
      "MEMORY_USAGE",
      "DISK_USAGE",
      "CONNECTION_COUNT",
      "CHANNEL_COUNT",
      "NODE_DOWN",
      "EXCHANGE_ERROR",
    ])
    .optional(),
  threshold: z.number().positive("Threshold must be positive").optional(),
  operator: z
    .enum(["GREATER_THAN", "LESS_THAN", "EQUALS", "NOT_EQUALS"])
    .optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  enabled: z.boolean().optional(),
  serverId: z.string().min(1, "Server ID is required").optional(),
});

// Schema for querying alerts
export const alertQuerySchema = z.object({
  status: z
    .union([
      z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]),
      z.array(z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"])),
    ])
    .optional(),
  severity: z
    .union([
      z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      z.array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])),
    ])
    .optional(),
  serverId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Schema for acknowledging/resolving alerts
export const acknowledgeAlertSchema = z.object({
  note: z.string().optional(),
});

// Legacy schemas for backward compatibility
export const CreateAlertSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]).default("ACTIVE"),
  workspaceId: z.string(),
  alertRuleId: z.string().optional(),
  value: z.number().optional(),
  threshold: z.number().optional(),
});

export const UpdateAlertSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  value: z.number().optional(),
  threshold: z.number().optional(),
});

export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
export type AlertQueryInput = z.infer<typeof alertQuerySchema>;
export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
export type UpdateAlertInput = z.infer<typeof UpdateAlertSchema>;
