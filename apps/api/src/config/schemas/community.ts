import { z } from "zod/v4";

import { selfhostedBaseSchema } from "./selfhosted.js";

/**
 * Community deployment mode schema
 * For open-source self-hosted deployments
 * No license required, premium features disabled
 */
export const communitySchema = selfhostedBaseSchema.extend({
  // Deployment Mode
  DEPLOYMENT_MODE: z.literal("community"),

  // License Configuration - All optional (not used in community)
  LICENSE_FILE_PATH: z.string().optional(),
  LICENSE_PUBLIC_KEY: z.string().optional(),
  LICENSE_KEY: z.string().optional(),
  LICENSE_VALIDATION_URL: z.string().optional(),
  LICENSE_PRIVATE_KEY: z.string().optional(),
});
