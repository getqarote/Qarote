import { z } from "zod";

import { UserPlan } from "@/generated/prisma/client";

// Schema for license purchase
// Note: Self-hosted licenses are annual-only
export const purchaseLicenseSchema = z.object({
  tier: z.enum([UserPlan.DEVELOPER, UserPlan.ENTERPRISE]),
});

// Schema for license validation
export const validateLicenseSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
});

// Schema for license download
export const downloadLicenseSchema = z.object({
  licenseId: z.string(),
});
