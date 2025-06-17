import { Context, Next } from "hono";

/**
 * Alerts Feature Flag
 *
 * Controls access to the alerts feature based on environment.
 * - Production: Alerts are disabled (coming soon)
 * - Development: Alerts are fully enabled
 */

/**
 * Check if alerts feature is enabled based on the current environment
 * @returns true if alerts are enabled, false otherwise
 */
export const isAlertsEnabled = (): boolean => {
  const nodeEnv = process.env.NODE_ENV || "development";

  // Enable alerts only in development
  return nodeEnv === "development";
};

/**
 * Get the environment name for debugging/logging
 * @returns current environment name
 */
export const getCurrentEnvironment = (): string => {
  return process.env.NODE_ENV || "development";
};

/**
 * Middleware to check if alerts feature is enabled
 * Returns 403 with appropriate message if disabled
 */
export const requireAlertsEnabled = () => {
  return async (c: Context, next: Next) => {
    if (!isAlertsEnabled()) {
      return c.json(
        {
          error: "Feature not available",
          message:
            "Alerts feature is coming soon. Currently available in development mode only.",
          environment: getCurrentEnvironment(),
        },
        403
      );
    }
    await next();
  };
};
