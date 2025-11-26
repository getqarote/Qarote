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
  browserNotificationsEnabled: z.boolean(),
  browserNotificationSeverities: z.array(AlertSeveritySchema).optional(), // Array of severities to receive browser notifications for
});

export const UpdateAlertNotificationSettingsRequestSchema = z.object({
  emailNotificationsEnabled: z.boolean().optional(),
  contactEmail: z.string().email().optional().nullable(),
  notificationSeverities: z.array(AlertSeveritySchema).optional(), // Array of severities to receive notifications for
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
