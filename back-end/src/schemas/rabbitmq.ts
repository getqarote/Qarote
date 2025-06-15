import { z } from "zod";

// Schema for RabbitMQ server credentials
export const RabbitMQCredentialsSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().positive().default(15672),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  vhost: z.string().default("/"),
});

// Schema for creating a new RabbitMQ server
export const CreateServerSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.number().int().positive().default(15672),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  vhost: z.string().default("/"),
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
      headers: z.record(z.any()).optional(),
    })
    .default({}),
});

// Schema for creating a new queue
export const CreateQueueSchema = z.object({
  name: z.string().min(1, "Queue name is required"),
  durable: z.boolean().default(true),
  autoDelete: z.boolean().default(false),
  exclusive: z.boolean().default(false),
  arguments: z.record(z.any()).default({}),
  // Optional binding configuration
  bindToExchange: z.string().optional(),
  routingKey: z.string().default(""),
});

export type RabbitMQCredentials = z.infer<typeof RabbitMQCredentialsSchema>;
export type CreateServerInput = z.infer<typeof CreateServerSchema>;
export type UpdateServerInput = z.infer<typeof UpdateServerSchema>;
export type PublishMessageInput = z.infer<typeof PublishMessageSchema>;
export type CreateQueueInput = z.infer<typeof CreateQueueSchema>;
