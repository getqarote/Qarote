/**
 * Deployment mode detection and validation
 */

import { deploymentConfig } from "./index";

/**
 * Check if running in cloud mode
 */
export const isCloudMode = () => deploymentConfig.isCloud();

/**
 * Check if running in self-hosted mode
 */
export const isSelfHostedMode = () => deploymentConfig.isSelfHosted();

/**
 * Validate that required services are available based on deployment mode
 * This should be called at application startup
 *
 * NOTE: Most validation is handled by the Zod schemas in config/schemas/*.
 * This function is kept for any additional runtime validations.
 */
export const validateDeploymentMode = () => {
  // Schema validation handles required fields for each deployment mode:
  // - Cloud mode: Requires Stripe, Sentry, Resend, Google OAuth, LICENSE_PRIVATE_KEY
  // - Self-hosted mode: Only requires base configuration
  // License activation is handled at runtime via the UI, not at startup
};
