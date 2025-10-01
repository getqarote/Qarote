import { z } from "zod/v4";
// import isValidHostname from "is-valid-hostname";

const HostSchema = z
  .string({
    message: "Host must be a string",
  })
  .min(1, "Host is required")
  .max(253, "Host must be 253 characters or less")
  .trim();
// .refine((host) => isValidHostname(host), {
//   message:
//     "Host must be a valid hostname, IP address, or domain name (e.g., localhost, 192.168.1.1, example.com)",
// });

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
