import { z } from "zod";

// Enum schemas
const AlertSeveritySchema = z.enum(["critical", "warning", "info"]);

const AlertCategorySchema = z.enum([
  "memory",
  "disk",
  "connection",
  "queue",
  "node",
  "performance",
]);

// Partial threshold schema for updates
const UpdateAlertThresholdsSchema = z
  .object({
    memory: z
      .object({
        warning: z.number().min(0).max(100).optional(),
        critical: z.number().min(0).max(100).optional(),
      })
      .optional(),
    disk: z
      .object({
        warning: z.number().min(0).max(100).optional(),
        critical: z.number().min(0).max(100).optional(),
      })
      .optional(),
    fileDescriptors: z
      .object({
        warning: z.number().min(0).max(100).optional(),
        critical: z.number().min(0).max(100).optional(),
      })
      .optional(),
    sockets: z
      .object({
        warning: z.number().min(0).max(100).optional(),
        critical: z.number().min(0).max(100).optional(),
      })
      .optional(),
    processes: z
      .object({
        warning: z.number().min(0).max(100).optional(),
        critical: z.number().min(0).max(100).optional(),
      })
      .optional(),
    queueMessages: z
      .object({
        warning: z.number().min(0).optional(),
        critical: z.number().min(0).optional(),
      })
      .optional(),
    unackedMessages: z
      .object({
        warning: z.number().min(0).optional(),
        critical: z.number().min(0).optional(),
      })
      .optional(),
    consumerUtilization: z
      .object({
        warning: z.number().min(0).max(100).optional(),
      })
      .optional(),
    connections: z
      .object({
        warning: z.number().min(0).max(100).optional(),
        critical: z.number().min(0).max(100).optional(),
      })
      .optional(),
    runQueue: z
      .object({
        warning: z.number().min(0).optional(),
        critical: z.number().min(0).optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // Validate threshold relationships only when both values are provided
      const validations = [];

      if (data.memory?.warning && data.memory?.critical) {
        validations.push(data.memory.critical > data.memory.warning);
      }
      if (data.disk?.warning && data.disk?.critical) {
        validations.push(data.disk.critical < data.disk.warning); // disk is % free
      }
      if (data.fileDescriptors?.warning && data.fileDescriptors?.critical) {
        validations.push(
          data.fileDescriptors.critical > data.fileDescriptors.warning
        );
      }
      if (data.sockets?.warning && data.sockets?.critical) {
        validations.push(data.sockets.critical > data.sockets.warning);
      }
      if (data.processes?.warning && data.processes?.critical) {
        validations.push(data.processes.critical > data.processes.warning);
      }
      if (data.queueMessages?.warning && data.queueMessages?.critical) {
        validations.push(
          data.queueMessages.critical > data.queueMessages.warning
        );
      }
      if (data.unackedMessages?.warning && data.unackedMessages?.critical) {
        validations.push(
          data.unackedMessages.critical > data.unackedMessages.warning
        );
      }
      if (data.connections?.warning && data.connections?.critical) {
        validations.push(data.connections.critical > data.connections.warning);
      }
      if (data.runQueue?.warning && data.runQueue?.critical) {
        validations.push(data.runQueue.critical > data.runQueue.warning);
      }

      return validations.every(Boolean);
    },
    {
      message:
        "Critical thresholds must be higher than warning thresholds (except disk which uses free space)",
    }
  );

// Request/Response schemas for API endpoints

// GET /servers/:id/alerts query parameters
const AlertsQuerySchema = z.object({
  severity: AlertSeveritySchema.optional(),
  category: AlertCategorySchema.optional(),
  resolved: z.enum(["true", "false"]).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  vhost: z.string(),
});

// Schema for alerts query with optional vhost default
export const AlertsQueryWithOptionalVHostSchema = AlertsQuerySchema.omit({
  vhost: true,
}).extend({
  vhost: z.string().optional().default("/"),
});

// PUT /thresholds request body
export const UpdateThresholdsRequestSchema = z.object({
  thresholds: UpdateAlertThresholdsSchema,
});

export const UpdateAlertNotificationSettingsRequestSchema = z.object({
  emailNotificationsEnabled: z.boolean().optional(),
  contactEmail: z.string().email().optional().nullable(),
  notificationSeverities: z.array(AlertSeveritySchema).optional(), // Array of severities to receive notifications for
  notificationServerIds: z.array(z.string().uuid()).optional().nullable(), // Array of server IDs to receive notifications for (null/empty = all servers)
  browserNotificationsEnabled: z.boolean().optional(),
  browserNotificationSeverities: z.array(AlertSeveritySchema).optional(), // Array of severities to receive browser notifications for
});

// ============================================================================
// Alert Rule Schemas (Legacy Custom Alert Rules)
// ============================================================================

const AlertTypeSchema = z.enum([
  "QUEUE_DEPTH",
  "MESSAGE_RATE",
  "CONSUMER_COUNT",
  "MEMORY_USAGE",
  "DISK_USAGE",
  "CONNECTION_COUNT",
  "CHANNEL_COUNT",
  "NODE_DOWN",
  "EXCHANGE_ERROR",
]);

const LegacyAlertSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const ComparisonOperatorSchema = z.enum([
  "GREATER_THAN",
  "LESS_THAN",
  "EQUALS",
  "NOT_EQUALS",
]);

// Create Alert Rule Request
export const CreateAlertRuleRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.union([z.string().max(500), z.literal("")]).optional(),
  type: AlertTypeSchema,
  threshold: z.number().min(0),
  operator: ComparisonOperatorSchema,
  severity: LegacyAlertSeveritySchema,
  enabled: z.boolean().optional().default(true),
  serverId: z.string().uuid(),
});

// Update Alert Rule Request
const UpdateAlertRuleRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  type: AlertTypeSchema.optional(),
  threshold: z.number().min(0).optional(),
  operator: ComparisonOperatorSchema.optional(),
  severity: LegacyAlertSeveritySchema.optional(),
  enabled: z.boolean().optional(),
  serverId: z.string().uuid().optional(),
});

// ID parameter schemas for tRPC
export const AlertRuleIdSchema = z.object({
  id: z.string(),
});

export const SlackConfigIdSchema = z.object({
  id: z.string(),
});

export const WebhookIdSchema = z.object({
  id: z.string(),
});

// ============================================================================
// Alert Notification Configuration Schemas (Slack & Webhook)
// ============================================================================

/**
 * Validate Slack webhook URL format
 * Slack webhook URLs follow the pattern: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
 */
const slackWebhookUrlSchema = z
  .string()
  .url("Invalid webhook URL")
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url);
        return (
          urlObj.hostname === "hooks.slack.com" &&
          urlObj.pathname.startsWith("/services/") &&
          urlObj.pathname.split("/").length >= 4 // /services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
        );
      } catch {
        return false;
      }
    },
    {
      message:
        "Invalid Slack webhook URL. Must be in the format: https://hooks.slack.com/services/",
    }
  );

/**
 * Schema for creating a Slack configuration
 */
export const CreateSlackConfigSchema = z.object({
  webhookUrl: slackWebhookUrlSchema,
  customValue: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

/**
 * Schema for updating a Slack configuration
 */
const UpdateSlackConfigSchema = z.object({
  webhookUrl: slackWebhookUrlSchema.optional(),
  customValue: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
});

/**
 * Validate that the URL is not a Slack webhook URL
 * Slack webhooks should be configured through the Slack integration, not general webhooks
 */
const webhookUrlSchema = z
  .string()
  .url("Invalid webhook URL")
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname !== "hooks.slack.com";
      } catch {
        return false;
      }
    },
    {
      message:
        "Slack webhook URLs should be added in the Slack Notifications section, not here.",
    }
  );

/**
 * Schema for creating a webhook
 */
export const CreateWebhookSchema = z.object({
  url: webhookUrlSchema,
  enabled: z.boolean().optional().default(true),
  secret: z.string().optional().nullable(),
});

/**
 * Schema for updating a webhook
 */
const UpdateWebhookSchema = z.object({
  url: webhookUrlSchema.optional(),
  enabled: z.boolean().optional(),
  secret: z.string().optional().nullable(),
});

// Update schemas with ID for tRPC (must be after base schemas are defined)
export const UpdateAlertRuleWithIdSchema = UpdateAlertRuleRequestSchema.extend({
  id: z.string(),
});

export const UpdateWebhookWithIdSchema = UpdateWebhookSchema.extend({
  id: z.string(),
});

export const UpdateSlackConfigWithIdSchema = UpdateSlackConfigSchema.extend({
  id: z.string(),
});
