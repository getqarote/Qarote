import { z } from "zod/v4";
import { WorkspacePlan } from "@prisma/client";

export const createCheckoutSessionSchema = z.object({
  plan: z.enum(WorkspacePlan),
  billingInterval: z.enum(["monthly", "yearly"]),
  successUrl: z.url().optional(),
  cancelUrl: z.url().optional(),
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
export type StripeWebhookRequest = z.infer<typeof stripeWebhookSchema>;
