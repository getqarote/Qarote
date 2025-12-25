import { z } from "zod";

// Enum schemas
export const AlertSeveritySchema = z.enum(["critical", "warning", "info"]);

export const AlertCategorySchema = z.enum([
  "memory",
  "disk",
  "connection",
  "queue",
  "node",
  "performance",
]);

export const HealthStatusSchema = z.enum(["healthy", "warning", "critical"]);

export const ClusterHealthSchema = z.enum(["healthy", "degraded", "critical"]);

export const SourceTypeSchema = z.enum(["node", "queue", "cluster"]);

// Alert threshold schemas
export const ThresholdLevelSchema = z.object({
  warning: z.number().min(0).max(100),
  critical: z.number().min(0).max(100),
});

export const ThresholdCountSchema = z.object({
  warning: z.number().min(0),
  critical: z.number().min(0),
});

export const ConsumerUtilizationThresholdSchema = z.object({
  warning: z.number().min(0).max(100),
});

export const AlertThresholdsSchema = z
  .object({
    memory: ThresholdLevelSchema,
    disk: ThresholdLevelSchema,
    fileDescriptors: ThresholdLevelSchema,
    sockets: ThresholdLevelSchema,
    processes: ThresholdLevelSchema,
    queueMessages: ThresholdCountSchema,
    unackedMessages: ThresholdCountSchema,
    consumerUtilization: ConsumerUtilizationThresholdSchema,
    connections: ThresholdLevelSchema,
    runQueue: ThresholdCountSchema,
  })
  .refine(
    (data) => {
      // Ensure critical thresholds are higher than warning thresholds for percentage-based metrics
      return (
        data.memory.critical > data.memory.warning &&
        data.disk.critical < data.disk.warning && // disk is % free, so critical should be lower
        data.fileDescriptors.critical > data.fileDescriptors.warning &&
        data.sockets.critical > data.sockets.warning &&
        data.processes.critical > data.processes.warning &&
        data.queueMessages.critical > data.queueMessages.warning &&
        data.unackedMessages.critical > data.unackedMessages.warning &&
        data.connections.critical > data.connections.warning &&
        data.runQueue.critical > data.runQueue.warning
      );
    },
    {
      message:
        "Critical thresholds must be higher than warning thresholds (except disk which uses free space)",
    }
  );

// Partial threshold schema for updates
export const UpdateAlertThresholdsSchema = z
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

// Alert detail schemas
export const AlertDetailsSchema = z.object({
  current: z.union([z.number(), z.string()]),
  threshold: z.number().optional(),
  recommended: z.string().optional(),
  affected: z.array(z.string()).optional(),
});

export const AlertSourceSchema = z.object({
  type: SourceTypeSchema,
  name: z.string().min(1),
});

// Main alert schema
export const RabbitMQAlertSchema = z.object({
  id: z.string().min(1),
  serverId: z.string().min(1),
  serverName: z.string().min(1),
  severity: AlertSeveritySchema,
  category: AlertCategorySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  details: AlertDetailsSchema,
  timestamp: z.string().datetime(),
  resolved: z.boolean(),
  resolvedAt: z.string().datetime().optional(),
  source: AlertSourceSchema,
});

// Summary schemas
export const AlertSummarySchema = z.object({
  total: z.number().min(0),
  critical: z.number().min(0),
  warning: z.number().min(0),
  info: z.number().min(0),
});

export const ClusterHealthSummarySchema = z.object({
  clusterHealth: ClusterHealthSchema,
  summary: AlertSummarySchema,
  issues: z.array(z.string()),
  timestamp: z.string().datetime(),
});

// Health check schemas
export const HealthCheckComponentSchema = z.object({
  status: HealthStatusSchema,
  message: z.string(),
  details: z.record(z.unknown()),
});

export const HealthCheckSchema = z.object({
  overall: HealthStatusSchema,
  checks: z.object({
    connectivity: HealthCheckComponentSchema,
    nodes: HealthCheckComponentSchema,
    memory: HealthCheckComponentSchema,
    disk: HealthCheckComponentSchema,
    queues: HealthCheckComponentSchema,
  }),
  timestamp: z.string().datetime(),
});

// Request/Response schemas for API endpoints

// GET /servers/:id/alerts query parameters
export const AlertsQuerySchema = z.object({
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

// GET /servers/:id/alerts response
export const AlertsResponseSchema = z.object({
  success: z.boolean(),
  alerts: z.array(RabbitMQAlertSchema),
  summary: AlertSummarySchema,
  thresholds: AlertThresholdsSchema,
  timestamp: z.string().datetime(),
});

// GET /servers/:id/alerts/summary response
export const AlertsSummaryResponseSchema = z.object({
  success: z.boolean(),
  clusterHealth: ClusterHealthSchema,
  summary: AlertSummarySchema,
  issues: z.array(z.string()),
  timestamp: z.string().datetime(),
});

// GET /servers/:id/health response
export const HealthResponseSchema = z.object({
  success: z.boolean(),
  health: HealthCheckSchema,
});

// GET /thresholds response
export const ThresholdsResponseSchema = z.object({
  success: z.boolean(),
  thresholds: AlertThresholdsSchema,
  canModify: z.boolean(),
  defaults: AlertThresholdsSchema,
});

// PUT /thresholds request body
export const UpdateThresholdsRequestSchema = z.object({
  thresholds: UpdateAlertThresholdsSchema,
});

// PUT /thresholds response
export const UpdateThresholdsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  thresholds: AlertThresholdsSchema,
});

// Error response schema
export const AlertErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.string().optional(),
});

// Server parameter validation
export const ServerParamSchema = z.object({
  id: z.string().uuid("Server ID must be a valid UUID"),
});

// Alert notification settings schemas
export const AlertNotificationSettingsSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
  contactEmail: z.string().email().optional().nullable(),
  notificationSeverities: z.array(AlertSeveritySchema).optional(), // Array of severities to receive notifications for
  notificationServerIds: z.array(z.string().uuid()).optional().nullable(), // Array of server IDs to receive notifications for (null/empty = all servers)
  browserNotificationsEnabled: z.boolean(),
  browserNotificationSeverities: z.array(AlertSeveritySchema).optional(), // Array of severities to receive browser notifications for
});

export const UpdateAlertNotificationSettingsRequestSchema = z.object({
  emailNotificationsEnabled: z.boolean().optional(),
  contactEmail: z.string().email().optional().nullable(),
  notificationSeverities: z.array(AlertSeveritySchema).optional(), // Array of severities to receive notifications for
  notificationServerIds: z.array(z.string().uuid()).optional().nullable(), // Array of server IDs to receive notifications for (null/empty = all servers)
  browserNotificationsEnabled: z.boolean().optional(),
  browserNotificationSeverities: z.array(AlertSeveritySchema).optional(), // Array of severities to receive browser notifications for
});

export const AlertNotificationSettingsResponseSchema = z.object({
  success: z.boolean(),
  settings: AlertNotificationSettingsSchema,
});

export type AlertNotificationSettings = z.infer<
  typeof AlertNotificationSettingsSchema
>;
export type UpdateAlertNotificationSettingsRequest = z.infer<
  typeof UpdateAlertNotificationSettingsRequestSchema
>;
export type AlertNotificationSettingsResponse = z.infer<
  typeof AlertNotificationSettingsResponseSchema
>;

// Export type definitions for TypeScript
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
export type AlertCategory = z.infer<typeof AlertCategorySchema>;
export type HealthStatus = z.infer<typeof HealthStatusSchema>;
export type ClusterHealth = z.infer<typeof ClusterHealthSchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type AlertThresholds = z.infer<typeof AlertThresholdsSchema>;
export type UpdateAlertThresholds = z.infer<typeof UpdateAlertThresholdsSchema>;
export type AlertDetails = z.infer<typeof AlertDetailsSchema>;
export type AlertSource = z.infer<typeof AlertSourceSchema>;
export type RabbitMQAlert = z.infer<typeof RabbitMQAlertSchema>;
export type AlertSummary = z.infer<typeof AlertSummarySchema>;
export type ClusterHealthSummary = z.infer<typeof ClusterHealthSummarySchema>;
export type HealthCheckComponent = z.infer<typeof HealthCheckComponentSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type AlertsQuery = z.infer<typeof AlertsQuerySchema>;
export type AlertsResponse = z.infer<typeof AlertsResponseSchema>;
export type AlertsSummaryResponse = z.infer<typeof AlertsSummaryResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ThresholdsResponse = z.infer<typeof ThresholdsResponseSchema>;
export type UpdateThresholdsRequest = z.infer<
  typeof UpdateThresholdsRequestSchema
>;
export type UpdateThresholdsResponse = z.infer<
  typeof UpdateThresholdsResponseSchema
>;
export type AlertErrorResponse = z.infer<typeof AlertErrorResponseSchema>;
export type ServerParam = z.infer<typeof ServerParamSchema>;

// ============================================================================
// Alert Rule Schemas (Legacy Custom Alert Rules)
// ============================================================================

export const AlertTypeSchema = z.enum([
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

export const LegacyAlertSeveritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const AlertStatusSchema = z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]);

export const ComparisonOperatorSchema = z.enum([
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
export const UpdateAlertRuleRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  type: AlertTypeSchema.optional(),
  threshold: z.number().min(0).optional(),
  operator: ComparisonOperatorSchema.optional(),
  severity: LegacyAlertSeveritySchema.optional(),
  enabled: z.boolean().optional(),
  serverId: z.string().uuid().optional(),
});

// Alert Rule Response
export const AlertRuleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: AlertTypeSchema,
  threshold: z.number(),
  operator: ComparisonOperatorSchema,
  severity: LegacyAlertSeveritySchema,
  enabled: z.boolean(),
  serverId: z.string(),
  workspaceId: z.string(),
  createdById: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  server: z.object({
    id: z.string(),
    name: z.string(),
    host: z.string(),
  }),
  createdBy: z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
  }),
  _count: z
    .object({
      alerts: z.number(),
    })
    .optional(),
});

// Alert Instance Response
export const AlertInstanceResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: LegacyAlertSeveritySchema,
  status: AlertStatusSchema,
  value: z.number().nullable(),
  threshold: z.number().nullable(),
  alertRuleId: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  acknowledgedAt: z.string().datetime().nullable(),
  alertRule: z
    .object({
      id: z.string(),
      name: z.string(),
      server: z.object({
        id: z.string(),
        name: z.string(),
        host: z.string(),
      }),
    })
    .optional(),
  createdBy: z
    .object({
      id: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
    })
    .optional(),
});

// Alert Query Schema (for listing alerts)
export const LegacyAlertsQuerySchema = z.object({
  status: z.union([AlertStatusSchema, z.array(AlertStatusSchema)]).optional(),
  severity: z
    .union([LegacyAlertSeveritySchema, z.array(LegacyAlertSeveritySchema)])
    .optional(),
  serverId: z.string().uuid().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Alerts Response (list of alert instances)
export const LegacyAlertsResponseSchema = z.object({
  alerts: z.array(AlertInstanceResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

// Alert Stats Response
export const AlertStatsResponseSchema = z.object({
  total: z.number(),
  active: z.number(),
  acknowledged: z.number(),
  resolved: z.number(),
  critical: z.number(),
  recent: z.array(AlertInstanceResponseSchema),
});

// Acknowledge/Resolve Alert Request
export const AcknowledgeAlertRequestSchema = z.object({
  note: z.string().max(500).optional(),
});

export const ResolveAlertRequestSchema = z.object({
  note: z.string().max(500).optional(),
});

// ID parameter schemas for tRPC
export const AlertRuleIdSchema = z.object({
  id: z.string(),
});

export const AlertIdSchema = z.object({
  id: z.string(),
});

export const SlackConfigIdSchema = z.object({
  id: z.string(),
});

export const WebhookIdSchema = z.object({
  id: z.string(),
});

// Type exports
export type AlertType = z.infer<typeof AlertTypeSchema>;
export type LegacyAlertSeverity = z.infer<typeof LegacyAlertSeveritySchema>;
export type AlertStatus = z.infer<typeof AlertStatusSchema>;
export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;
export type CreateAlertRuleRequest = z.infer<
  typeof CreateAlertRuleRequestSchema
>;
export type UpdateAlertRuleRequest = z.infer<
  typeof UpdateAlertRuleRequestSchema
>;
export type AlertRuleResponse = z.infer<typeof AlertRuleResponseSchema>;
export type AlertInstanceResponse = z.infer<typeof AlertInstanceResponseSchema>;
export type LegacyAlertsQuery = z.infer<typeof LegacyAlertsQuerySchema>;
export type LegacyAlertsResponse = z.infer<typeof LegacyAlertsResponseSchema>;
export type AlertStatsResponse = z.infer<typeof AlertStatsResponseSchema>;
export type AcknowledgeAlertRequest = z.infer<
  typeof AcknowledgeAlertRequestSchema
>;
export type ResolveAlertRequest = z.infer<typeof ResolveAlertRequestSchema>;

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
export const UpdateSlackConfigSchema = z.object({
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
export const UpdateWebhookSchema = z.object({
  url: webhookUrlSchema.optional(),
  enabled: z.boolean().optional(),
  secret: z.string().optional().nullable(),
});

/**
 * Schema for webhook response
 */
export const WebhookResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  url: z.string(),
  enabled: z.boolean(),
  secret: z.string().nullable(),
  version: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
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

// Type exports
export type CreateSlackConfig = z.infer<typeof CreateSlackConfigSchema>;
export type UpdateSlackConfig = z.infer<typeof UpdateSlackConfigSchema>;
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>;
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;
export type UpdateAlertRuleWithId = z.infer<typeof UpdateAlertRuleWithIdSchema>;
export type UpdateWebhookWithId = z.infer<typeof UpdateWebhookWithIdSchema>;
export type UpdateSlackConfigWithId = z.infer<
  typeof UpdateSlackConfigWithIdSchema
>;
