/**
 * Deployment mode detection and validation
 */

import { deploymentConfig } from "./index";

/**
 * Check if running in cloud mode
 */
export const isCloudMode = () => deploymentConfig.isCloud();

/**
 * Check if running in community mode
 */
export const isCommunityMode = () => deploymentConfig.isCommunity();

/**
 * Check if running in enterprise mode
 */
export const isEnterpriseMode = () => deploymentConfig.isEnterprise();

/**
 * Validate that required services are available based on deployment mode
 * This should be called at application startup
 *
 * NOTE: As of the config schema refactor, most validation is now handled
 * by the Zod schemas in config/schemas/*. This function is kept for
 * backward compatibility and any additional runtime validations.
 */
export const validateDeploymentMode = () => {
  // Schema validation already handles required fields for each deployment mode:
  // - Cloud mode: Requires Stripe, Sentry, Resend, Google OAuth
  // - Enterprise mode: Requires LICENSE_FILE_PATH and LICENSE_PUBLIC_KEY
  // - Community mode: Only requires base configuration
  // Any additional runtime validation beyond schema checks can go here
  // For now, this is a no-op as the schemas handle all validation
};
