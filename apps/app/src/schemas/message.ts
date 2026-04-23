import { z } from "zod";

// Send message form schema
export const sendMessageSchema = z.object({
  exchange: z.string().default(""),
  routingKey: z.string().default(""),
  payload: z.string().min(1, "Message payload is required"),
  deliveryMode: z.string().default("2"),
  priority: z.string().optional(),
  expiration: z.string().optional(),
  contentType: z.string().default("application/json"),
  contentEncoding: z.string().default("none"),
  correlationId: z.string().optional(),
  replyTo: z.string().optional(),
  messageId: z.string().optional(),
  appId: z.string().optional(),
  messageType: z.string().optional(),
  headers: z.string().optional(),
});

export type SendMessageFormData = z.infer<typeof sendMessageSchema>;
