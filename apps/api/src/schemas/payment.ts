import { z } from "zod";

import { UserPlan } from "@/generated/prisma/client";

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
