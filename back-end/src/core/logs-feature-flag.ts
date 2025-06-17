import { Context, Next } from "hono";

/**
 * Logs Feature Flag
 *
 * Controls access to the logs feature based on environment.
 * - Production: Logs are disabled (coming soon)
 * - Development: Logs are fully enabled
 */

/**
 * Check if logs feature is enabled based on the current environment
 * @returns true if logs are enabled, false otherwise
 */
export const isLogsEnabled = (): boolean => {
  const nodeEnv = process.env.NODE_ENV || "development";

  // Enable logs only in development
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
 * Middleware to check if logs feature is enabled
 * Returns 403 with appropriate message if disabled
 */
export const requireLogsEnabled = () => {
  return async (c: Context, next: Next) => {
    if (!isLogsEnabled()) {
      return c.json(
        {
          error: "Feature not available",
          message:
            "Logs feature is coming soon. Currently available in development mode only.",
          environment: getCurrentEnvironment(),
        },
        403
      );
    }
    await next();
  };
};
