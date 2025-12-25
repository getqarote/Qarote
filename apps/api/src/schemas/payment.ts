import { UserPlan } from "@prisma/client";
import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
  plan: z.nativeEnum(UserPlan),
  billingInterval: z.enum(["monthly", "yearly"]),
});

export const cancelSubscriptionSchema = z.object({
  cancelImmediately: z.boolean().optional().default(false),
  reason: z.string().optional().default(""),
  feedback: z.string().optional().default(""),
});

export const renewSubscriptionSchema = z.object({
  plan: z.nativeEnum(UserPlan),
  interval: z.enum(["monthly", "yearly"]).optional().default("monthly"),
});

export const getPaymentHistorySchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

export type CreateCheckoutSessionRequest = z.infer<
  typeof createCheckoutSessionSchema
>;
export type CancelSubscriptionRequest = z.infer<
  typeof cancelSubscriptionSchema
>;
export type RenewSubscriptionRequest = z.infer<typeof renewSubscriptionSchema>;
export type GetPaymentHistoryRequest = z.infer<typeof getPaymentHistorySchema>;
export type StripeWebhookRequest = z.infer<typeof stripeWebhookSchema>;
