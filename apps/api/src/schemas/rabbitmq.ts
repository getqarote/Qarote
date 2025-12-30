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
const RabbitMQCredentialsSchema = z.object({
  host: HostSchema,
  port: z.number().int().positive().default(15672), // Management API port
  amqpPort: z.number().int().positive().default(5672), // AMQP protocol port
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  vhost: z.string().default("/"),
  useHttps: z.boolean(),
});

// Schema for creating a new RabbitMQ server
const CreateServerSchema = z.object({
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
const UpdateServerSchema = CreateServerSchema.partial();

// Schema for vhost query parameter (required)
export const VHostRequiredQuerySchema = z.object({
  vhost: z.string().min(1, "vhost query parameter is required"),
});

// Schema for vhost query parameter (optional)
export const VHostOptionalQuerySchema = z.object({
  vhost: z.string().optional(),
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
const publishMessageToQueueSchema = z.object({
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

export const ServerWorkspaceWithVHostNameSchema =
  ServerWorkspaceInputSchema.extend({
    vhostName: z.string(),
  });

// Time range schema for metrics
const TimeRangeSchema = z.enum(["1m", "10m", "1h", "8h", "1d"]);

// Queue operation schemas
export const DeleteQueueSchema = z.object({
  queueName: z.string(),
  ifUnused: z.boolean().optional().default(false),
  ifEmpty: z.boolean().optional().default(false),
});

// Workspace-only schema
const WorkspaceIdOnlySchema = z.object({
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
