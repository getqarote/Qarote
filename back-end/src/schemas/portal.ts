import { UserPlan } from "@prisma/client";
import { z } from "zod/v4";

// Schema for license purchase
export const purchaseLicenseSchema = z.object({
  tier: z.enum([UserPlan.DEVELOPER, UserPlan.ENTERPRISE]),
  billingInterval: z.enum(["monthly", "yearly"]),
});

// Types derived from schemas
export type PurchaseLicenseRequest = z.infer<typeof purchaseLicenseSchema>;
