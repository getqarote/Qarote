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
const isSelfHostedMode = () => deploymentConfig.isSelfHosted();

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
  } else if (isSelfHostedMode()) {
    // Self-hosted mode requires license key
    if (!process.env.LICENSE_KEY || process.env.LICENSE_KEY === "") {
      throw new Error(
        "Self-hosted deployment mode requires LICENSE_KEY. " +
          "Please set LICENSE_KEY environment variable or purchase a license from the Customer Portal."
      );
    }
  }
  // Self-hosted mode doesn't require other services (they're optional)
};
