import { z } from "zod/v4";

import { selfhostedBaseSchema } from "./selfhosted.js";

/**
 * Enterprise deployment mode schema
 * For licensed self-hosted deployments
 * Requires license file and public key for validation
 */
export const enterpriseSchema = selfhostedBaseSchema.extend({
  // Deployment Mode
  DEPLOYMENT_MODE: z.literal("enterprise"),

  // License Configuration - REQUIRED for enterprise
  LICENSE_FILE_PATH: z
    .string()
    .min(1, "LICENSE_FILE_PATH is required for enterprise mode")
    .describe("Path to license file (format: qarote-license-{uuid}.json)"),
  LICENSE_PUBLIC_KEY: z
    .string()
    .min(1, "LICENSE_PUBLIC_KEY is required for enterprise mode")
    .describe("Public key for license validation (provided with license)"),

  // License validation URL and key - Not used in self-hosted
  LICENSE_KEY: z.string().optional(),
  LICENSE_VALIDATION_URL: z.string().optional(),

  // License generation - Not used in self-hosted (only cloud generates licenses)
  LICENSE_PRIVATE_KEY: z.string().optional(),
});
