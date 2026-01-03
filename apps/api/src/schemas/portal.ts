import { UserPlan } from "@prisma/client";
import { z } from "zod";

// Schema for license purchase
export const purchaseLicenseSchema = z.object({
  tier: z.enum([UserPlan.DEVELOPER, UserPlan.ENTERPRISE]),
  billingInterval: z.enum(["monthly", "yearly"]),
});

// Schema for license validation
export const validateLicenseSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
  instanceId: z.string().optional(),
});

// Schema for license download
export const downloadLicenseSchema = z.object({
  licenseId: z.string(),
});
