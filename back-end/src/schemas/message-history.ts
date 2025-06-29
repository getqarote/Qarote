import { z } from "zod/v4";

export const messageHistorySearchSchema = z.object({
  serverId: z.string().min(1),
  queueName: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid start date format",
    }),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid end date format",
    }),
  content: z.string().optional(),
  routingKey: z.string().optional(),
  exchange: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z
    .enum(["timestamp", "queue_name", "routing_key", "exchange"])
    .default("timestamp"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const messageHistoryStatsSchema = z.object({
  serverId: z.string().min(1),
  queueName: z.string().optional(),
  days: z.coerce.number().min(1).max(365).default(7),
});

export type MessageHistorySearchRequest = z.infer<
  typeof messageHistorySearchSchema
>;
export type MessageHistoryStatsRequest = z.infer<
  typeof messageHistoryStatsSchema
>;
