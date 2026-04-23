import { z } from "zod";

// Add queue form schema
export const addQueueSchema = z.object({
  name: z.string().min(1, "Queue name is required"),
  durable: z.boolean(),
  autoDelete: z.boolean(),
  exclusive: z.boolean(),
  bindToExchange: z.string().optional(),
  routingKey: z.string().optional(),
});

export type AddQueueFormData = z.infer<typeof addQueueSchema>;
