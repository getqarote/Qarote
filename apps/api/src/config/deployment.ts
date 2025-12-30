/**
 * Deployment mode detection and validation
 */

import { config, deploymentConfig, licenseConfig } from "./index";

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
 */
export const validateDeploymentMode = () => {
  if (isCloudMode()) {
    // Cloud mode requires all services
    const requiredServices: Array<{ name: string; envVar: string }> = [
      { name: "Stripe Secret Key", envVar: "STRIPE_SECRET_KEY" },
      { name: "Stripe Webhook Secret", envVar: "STRIPE_WEBHOOK_SECRET" },
      { name: "Sentry DSN", envVar: "SENTRY_DSN" },
      { name: "Resend API Key", envVar: "RESEND_API_KEY" },
      { name: "Google OAuth Client ID", envVar: "GOOGLE_CLIENT_ID" },
    ];

    const missingServices = requiredServices.filter(
      (service) =>
        !process.env[service.envVar] || process.env[service.envVar] === ""
    );

    if (missingServices.length > 0) {
      const missingNames = missingServices.map((s) => s.name).join(", ");
      throw new Error(
        `Cloud deployment mode requires the following services: ${missingNames}. ` +
          `Please set the corresponding environment variables or switch to self-hosted mode.`
      );
    }
  } else if (isEnterpriseMode()) {
    // Enterprise mode requires license file
    // Check raw config value (before default) to avoid false positives from default value
    const hasLicenseFilePath =
      config.LICENSE_FILE_PATH && config.LICENSE_FILE_PATH !== "";

    if (!hasLicenseFilePath) {
      throw new Error(
        "Enterprise deployment mode requires LICENSE_FILE_PATH. " +
          "Please set LICENSE_FILE_PATH environment variable to the path of your license file. " +
          "You can download your license file from the Customer Portal."
      );
    }

    // Enterprise mode requires public key for validation
    if (!licenseConfig.publicKey) {
      throw new Error(
        "Enterprise deployment mode requires LICENSE_PUBLIC_KEY. " +
          "Please set LICENSE_PUBLIC_KEY environment variable."
      );
    }
  } else if (isCommunityMode()) {
    // Community mode doesn't require license - all premium features disabled
    // No validation needed
  }
  // Self-hosted modes don't require other services (they're optional)
};
