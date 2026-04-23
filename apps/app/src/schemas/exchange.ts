import { z } from "zod";

/**
 * RabbitMQ reserves the `amq.` prefix for its own internal exchanges.
 * Trying to declare `amq.foo` would fail server-side with a 403 access-refused
 * error — surface that as a validation error up front instead.
 */
const RESERVED_PREFIX = /^amq\./i;

export const EXCHANGE_TYPES = ["direct", "fanout", "topic", "headers"] as const;
export type ExchangeType = (typeof EXCHANGE_TYPES)[number];

export const addExchangeSchema = z.object({
  name: z
    .string()
    .min(1, "Exchange name is required")
    .max(255, "Exchange name must be 255 characters or fewer")
    .refine(
      (v) => !RESERVED_PREFIX.test(v),
      'Exchange names starting with "amq." are reserved by RabbitMQ'
    ),
  type: z.enum(EXCHANGE_TYPES, {
    errorMap: () => ({ message: "Exchange type is required" }),
  }),
  durable: z.boolean(),
  autoDelete: z.boolean(),
  internal: z.boolean(),
});

export type AddExchangeFormData = z.infer<typeof addExchangeSchema>;
