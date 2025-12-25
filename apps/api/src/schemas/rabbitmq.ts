import { z } from "zod";
// import isValidHostname from "is-valid-hostname";

const HostSchema = z
  .string({
    message: "Host must be a string",
  })
  .min(1, "Host is required")
  .max(253, "Host must be 253 characters or less")
  .trim();

// Schema for RabbitMQ server credentials
export const RabbitMQCredentialsSchema = z.object({
  host: HostSchema,
  port: z.number().int().positive().default(15672), // Management API port
  amqpPort: z.number().int().positive().default(5672), // AMQP protocol port
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  vhost: z.string().default("/"),
  useHttps: z.boolean(),
});

// Schema for creating a new RabbitMQ server
export const CreateServerSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  host: HostSchema,
  port: z.number().int().positive().default(15672), // Management API port
  amqpPort: z.number().int().positive().default(5672), // AMQP protocol port
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  vhost: z.string().default("/"),
  useHttps: z.boolean(),
});

// Schema for updating a RabbitMQ server
export const UpdateServerSchema = CreateServerSchema.partial();

// Schema for vhost query parameter (required)
export const VHostRequiredQuerySchema = z.object({
  vhost: z.string().min(1, "vhost query parameter is required"),
});

// Schema for vhost query parameter (optional)
export const VHostOptionalQuerySchema = z.object({
  vhost: z.string().optional(),
});

// Type exports
export type VHostRequiredQuery = z.infer<typeof VHostRequiredQuerySchema>;
export type VHostOptionalQuery = z.infer<typeof VHostOptionalQuerySchema>;

// Schema for publishing a message to an exchange
export const PublishMessageSchema = z.object({
  exchange: z.string().min(1, "Exchange name is required"),
  routingKey: z.string().default(""),
  payload: z.string().min(1, "Message payload is required"),
  properties: z
    .object({
      delivery_mode: z.number().int().min(1).max(2).default(2),
      priority: z.number().int().min(0).max(255).optional(),
      expiration: z.string().optional(),
      user_id: z.string().optional(),
      app_id: z.string().optional(),
      content_type: z.string().optional(),
      content_encoding: z.string().optional(),
      correlation_id: z.string().optional(),
      reply_to: z.string().optional(),
      message_id: z.string().optional(),
      timestamp: z.number().optional(),
      type: z.string().optional(),
      headers: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional(),
    })
    .default(() => ({ delivery_mode: 2 })),
});

// Schema for creating a new queue
export const CreateQueueSchema = z.object({
  name: z.string().min(1, "Queue name is required"),
  durable: z.boolean().default(true),
  autoDelete: z.boolean().default(false),
  exclusive: z.boolean().default(false),
  arguments: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({}),
  // Optional binding configuration
  bindToExchange: z.string().optional(),
  routingKey: z.string().default(""),
});

// Schema for publishing a message to a queue (alternative to exchange publishing)
export const publishMessageToQueueSchema = z.object({
  message: z.string(),
  exchange: z.string().optional().default(""), // Default exchange for direct queue publishing
  routingKey: z.string().optional(), // Optional routing key, defaults to queue name
  properties: z
    .object({
      deliveryMode: z.number().optional(),
      priority: z.number().optional(),
      headers: z.record(z.string(), z.any()).optional(),
      expiration: z.string().optional(),
      appId: z.string().optional(),
      contentType: z.string().optional(),
      contentEncoding: z.string().optional(),
      correlationId: z.string().optional(),
      replyTo: z.string().optional(),
      messageId: z.string().optional(),
      timestamp: z.number().optional(),
      type: z.string().optional(),
    })
    .optional(),
});

export const CreateUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required").optional(),
  tags: z.string().optional().default(""),
});

export const UpdateUserSchema = z.object({
  password: z.string().optional(),
  tags: z.string().optional(),
  removePassword: z.boolean().optional(),
});

// Set user permissions schema
export const SetPermissionsSchema = z.object({
  vhost: z.string().min(1, "Virtual host is required"),
  configure: z.string().default(".*"),
  write: z.string().default(".*"),
  read: z.string().default(".*"),
});

// Base schema for server and workspace input
export const ServerWorkspaceInputSchema = z.object({
  serverId: z.string(),
  workspaceId: z.string(),
});

// Schema for creating an exchange
export const CreateExchangeSchema = z.object({
  name: z.string().min(1, "Exchange name is required"),
  type: z.enum(["direct", "fanout", "topic", "headers"]),
  durable: z.boolean().optional().default(true),
  auto_delete: z.boolean().optional().default(false),
  internal: z.boolean().optional().default(false),
  arguments: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .default({}),
});

// Schema for deleting an exchange
export const DeleteExchangeSchema = z.object({
  exchangeName: z.string(),
  ifUnused: z.boolean().optional().default(false),
});

// Extended schemas with additional fields
export const ServerWorkspaceWithQueueNameSchema =
  ServerWorkspaceInputSchema.extend({
    queueName: z.string(),
  });

export const ServerWorkspaceWithNodeNameSchema =
  ServerWorkspaceInputSchema.extend({
    nodeName: z.string(),
  });

export const ServerWorkspaceWithUsernameSchema =
  ServerWorkspaceInputSchema.extend({
    username: z.string(),
  });

export const ServerWorkspaceWithVHostNameSchema =
  ServerWorkspaceInputSchema.extend({
    vhostName: z.string(),
  });

// Time range schema for metrics
export const TimeRangeSchema = z.enum(["1m", "10m", "1h", "8h", "1d"]);

// Queue operation schemas
export const DeleteQueueSchema = z.object({
  queueName: z.string(),
  ifUnused: z.boolean().optional().default(false),
  ifEmpty: z.boolean().optional().default(false),
});

export const PauseQueueSchema = z.object({
  queueName: z.string(),
});

export const ResumeQueueSchema = z.object({
  queueName: z.string(),
});

export const GetQueueConsumersSchema = z.object({
  queueName: z.string(),
});

export const GetQueueBindingsSchema = z.object({
  queueName: z.string(),
});

export const PurgeQueueSchema = z.object({
  queueName: z.string(),
});

// User operation schemas
export const GetUserSchema = z.object({
  username: z.string(),
});

export const DeleteUserSchema = z.object({
  username: z.string(),
});

export const SetUserPermissionsWithVHostSchema = z.object({
  username: z.string(),
  vhost: z.string(),
});

// VHost operation schemas
export const GetVHostSchema = z.object({
  vhostName: z.string(),
});

export const DeleteVHostSchema = z.object({
  vhostName: z.string(),
});

export const SetVHostPermissionsSchema = z.object({
  vhostName: z.string(),
  username: z.string(),
});

export const SetVHostLimitSchema = z.object({
  vhostName: z.string(),
  limitType: z.enum(["max-connections", "max-queues", "max-channels"]),
  value: z.number().min(0, "Limit value must be non-negative"),
});

export const GetVHostLimitSchema = z.object({
  vhostName: z.string(),
  limitType: z.string(),
});

// Workspace-only schema
export const WorkspaceIdOnlySchema = z.object({
  workspaceId: z.string(),
});

// Server operation schemas
export const GetServersInputSchema = WorkspaceIdOnlySchema;

export const GetServerInputSchema = WorkspaceIdOnlySchema.extend({
  id: z.string(),
});

export const CreateServerWithWorkspaceSchema = CreateServerSchema.extend({
  workspaceId: z.string(),
});

// Schema for vhost with optional default
export const VHostOptionalWithDefaultSchema = z.object({
  vhost: z.string().optional().default("/"),
});

export const UpdateServerWithWorkspaceSchema = UpdateServerSchema.extend({
  workspaceId: z.string(),
  id: z.string(),
});

export const DeleteServerInputSchema = WorkspaceIdOnlySchema.extend({
  id: z.string(),
});

export const TestConnectionWithWorkspaceSchema =
  RabbitMQCredentialsSchema.extend({
    workspaceId: z.string(),
  });

// Metrics schemas
export const GetMetricsSchema = ServerWorkspaceInputSchema.extend({
  timeRange: TimeRangeSchema.optional().default("1m"),
});

export const GetQueueRatesSchema = ServerWorkspaceWithQueueNameSchema.extend({
  timeRange: TimeRangeSchema.optional().default("1m"),
});

// Publish message with queue schema
export const PublishMessageWithQueueSchema =
  ServerWorkspaceWithQueueNameSchema.merge(publishMessageToQueueSchema);

export type RabbitMQCredentials = z.infer<typeof RabbitMQCredentialsSchema>;
export type CreateServerInput = z.infer<typeof CreateServerSchema>;
export type UpdateServerInput = z.infer<typeof UpdateServerSchema>;
export type PublishMessageInput = z.infer<typeof PublishMessageSchema>;
export type PublishMessageToQueueInput = z.infer<
  typeof publishMessageToQueueSchema
>;
export type CreateQueueInput = z.infer<typeof CreateQueueSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type SetPermissionsInput = z.infer<typeof SetPermissionsSchema>;
export type ServerWorkspaceInput = z.infer<typeof ServerWorkspaceInputSchema>;
export type CreateExchangeInput = z.infer<typeof CreateExchangeSchema>;
export type DeleteExchangeInput = z.infer<typeof DeleteExchangeSchema>;
export type ServerWorkspaceWithQueueName = z.infer<
  typeof ServerWorkspaceWithQueueNameSchema
>;
export type ServerWorkspaceWithNodeName = z.infer<
  typeof ServerWorkspaceWithNodeNameSchema
>;
export type ServerWorkspaceWithUsername = z.infer<
  typeof ServerWorkspaceWithUsernameSchema
>;
export type ServerWorkspaceWithVHostName = z.infer<
  typeof ServerWorkspaceWithVHostNameSchema
>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type DeleteQueueInput = z.infer<typeof DeleteQueueSchema>;
export type PauseQueueInput = z.infer<typeof PauseQueueSchema>;
export type ResumeQueueInput = z.infer<typeof ResumeQueueSchema>;
export type GetQueueConsumersInput = z.infer<typeof GetQueueConsumersSchema>;
export type GetQueueBindingsInput = z.infer<typeof GetQueueBindingsSchema>;
export type PurgeQueueInput = z.infer<typeof PurgeQueueSchema>;
export type GetUserInput = z.infer<typeof GetUserSchema>;
export type DeleteUserInput = z.infer<typeof DeleteUserSchema>;
export type SetUserPermissionsWithVHostInput = z.infer<
  typeof SetUserPermissionsWithVHostSchema
>;
export type GetVHostInput = z.infer<typeof GetVHostSchema>;
export type DeleteVHostInput = z.infer<typeof DeleteVHostSchema>;
export type SetVHostPermissionsInput = z.infer<
  typeof SetVHostPermissionsSchema
>;
export type SetVHostLimitInput = z.infer<typeof SetVHostLimitSchema>;
export type GetVHostLimitInput = z.infer<typeof GetVHostLimitSchema>;
export type WorkspaceIdOnly = z.infer<typeof WorkspaceIdOnlySchema>;
export type GetMetricsInput = z.infer<typeof GetMetricsSchema>;
export type GetQueueRatesInput = z.infer<typeof GetQueueRatesSchema>;
export type PublishMessageWithQueueInput = z.infer<
  typeof PublishMessageWithQueueSchema
>;
